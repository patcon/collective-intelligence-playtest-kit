import { describe, expect, it } from 'vitest';
import type { ItemId } from '../items/items.ts';
import { DEFAULT_CONFIG } from './quizConfig.ts';
import { INITIAL_ROOM_STATE, reduce } from './quizRoom.ts';
import type { RoomEvent, RoomState } from './quizRoom.ts';
import { seededRng } from './rng.ts';
import type { Answer } from './roomViews.ts';
import { snapshotOf, viewFor } from './roomSelectors.ts';

function run(events: ReadonlyArray<RoomEvent>, from: RoomState = INITIAL_ROOM_STATE): RoomState {
  const rng = seededRng(1);
  return events.reduce((state, event) => reduce(state, event, rng), from);
}

/** `ids` joined and tapped Start. */
const readied = (...ids: Array<string>): Array<RoomEvent> =>
  ids.flatMap((id) => [
    { id, type: 'join' },
    { id, type: 'ready' },
  ]);

const config = (statementCount: number, latecomers: 'wait' | 'join' = 'wait'): RoomEvent => ({ config: { latecomers, statementCount }, type: 'config' });

/** A quiz of `n` statements, started with `ids` ready. */
const quizOf = (n: number, ...ids: Array<string>): RoomState => run([config(n), ...readied(...ids), { type: 'start' }]);

/** The statement `id` is on. */
function current(state: RoomState, id: string): ItemId {
  const { position, statements } = viewFor(state, id);
  const item = statements[position];
  if (item === undefined) {
    throw new Error(`${id} isn't on a statement`);
  }
  return item;
}

/** `id` answers the statement they're on. */
function answerNext(state: RoomState, id: string, answer: Answer = 3): RoomState {
  return run([{ answer, id, item: current(state, id), type: 'answer' }], state);
}

describe('reduce', () => {
  it('refuses Start with no one ready', () => {
    const state = run([{ id: 'a', type: 'join' }]);
    expect(run([{ type: 'start' }], state)).toBe(state);
  });

  it('starts with N statements, and everyone ready answering the first', () => {
    const state = run([config(10), ...readied('a', 'b'), { id: 'c', type: 'join' }, { type: 'start' }]);
    expect(state.phase).toBe('quiz');
    expect(state.statements).toHaveLength(10);
    expect(viewFor(state, 'a')).toEqual({ answers: {}, position: 0, statements: state.statements, status: 'answering' });
    expect(viewFor(state, 'c').status).toBe('joined');
  });

  it('records an answer only for the statement the sender is on', () => {
    const state = quizOf(5, 'a');
    const [, second] = state.statements;
    expect(run([{ answer: 4, id: 'a', item: second ?? 'EXT1', type: 'answer' }], state)).toBe(state);
    const answered = answerNext(state, 'a', 4);
    expect(viewFor(answered, 'a').position).toBe(1);
    expect(viewFor(answered, 'a').answers).toEqual({ [state.statements[0] ?? '']: 4 });
    const first = state.statements[0] ?? 'EXT1';
    expect(run([{ answer: 2, id: 'a', item: first, type: 'answer' }], answered)).toBe(answered);
  });

  it('records a skip as null, and reaches done after the last statement', () => {
    let state = quizOf(2, 'a');
    state = answerNext(state, 'a', null);
    state = answerNext(state, 'a', 5);
    expect(viewFor(state, 'a').status).toBe('done');
    expect(Object.values(viewFor(state, 'a').answers)).toEqual([null, 5]);
  });

  it('undoes nothing at the first statement', () => {
    const state = quizOf(3, 'a');
    expect(run([{ id: 'a', type: 'undo' }], state)).toBe(state);
  });

  it('undoes back one statement, clearing that answer, mid-quiz and from done', () => {
    let state = answerNext(answerNext(quizOf(2, 'a'), 'a', 1), 'a', 2);
    state = run([{ id: 'a', type: 'undo' }], state);
    expect(viewFor(state, 'a')).toMatchObject({ answers: { [state.statements[0] ?? '']: 1 }, position: 1, status: 'answering' });
    state = run([{ id: 'a', type: 'undo' }], state);
    expect(viewFor(state, 'a')).toMatchObject({ answers: {}, position: 0 });
  });

  it('keeps latecomers waiting, then includes them at the next Start', () => {
    let state = run([...readied('late')], quizOf(3, 'a'));
    expect(viewFor(state, 'late')).toMatchObject({ statements: [], status: 'late' });
    expect(run([{ answer: 3, id: 'late', item: state.statements[0] ?? 'EXT1', type: 'answer' }], state)).toBe(state);
    state = run([{ type: 'reset' }, { type: 'start' }], state);
    expect(viewFor(state, 'late').status).toBe('answering');
  });

  it('starts latecomers at the first statement when they join', () => {
    let state = answerNext(quizOf(3, 'a'), 'a');
    state = run([config(3, 'join'), ...readied('late')], state);
    expect(viewFor(state, 'late')).toMatchObject({ position: 0, status: 'answering' });
    expect(viewFor(state, 'a').position).toBe(1);
  });

  it('keeps answers through a leave and a reconnect, and says who is gone', () => {
    let state = answerNext(quizOf(3, 'a'), 'a', 2);
    state = run([{ id: 'a', type: 'leave' }], state);
    expect(snapshotOf(state).participants).toMatchObject([{ connected: false, id: 'a' }]);
    state = run([{ id: 'a', type: 'join' }, { id: 'a', type: 'ready' }], state);
    expect(viewFor(state, 'a')).toMatchObject({ position: 1, status: 'answering' });
    expect(Object.values(viewFor(state, 'a').answers)).toEqual([2]);
  });

  it('forgets someone who leaves the lobby', () => {
    const state = run([...readied('a'), { id: 'a', type: 'leave' }]);
    expect(state.participants).toEqual([]);
  });

  it('resets: answers and statements cleared, everyone here waiting, anyone gone forgotten', () => {
    let state = answerNext(quizOf(3, 'a', 'b'), 'a');
    state = run([{ id: 'b', type: 'leave' }, { type: 'reset' }], state);
    expect(state).toMatchObject({ phase: 'lobby', statements: [] });
    expect(snapshotOf(state).participants).toEqual([{ answers: {}, connected: true, id: 'a', status: 'waiting' }]);
  });

  it('applies a config change at the next Start', () => {
    let state = quizOf(3, 'a');
    state = run([config(7)], state);
    expect(state.statements).toHaveLength(3);
    state = run([{ type: 'reset' }, { type: 'start' }], state);
    expect(state.statements).toHaveLength(7);
    expect(state.config).toEqual({ ...DEFAULT_CONFIG, statementCount: 7 });
  });
});
