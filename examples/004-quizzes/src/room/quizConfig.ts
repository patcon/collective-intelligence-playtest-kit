/** How the next quiz runs. Set from the host. */
export interface QuizConfig {
  /** N, how many of the 50 statements are asked: 1 to 50. Applies at the next Start. */
  statementCount: number;
  /** Whether someone who becomes ready mid-quiz waits for the next one, or joins at the first statement. */
  latecomers: Latecomers;
}

export type Latecomers = 'wait' | 'join';

export const MAX_STATEMENTS = 50;

export const DEFAULT_CONFIG: QuizConfig = { latecomers: 'wait', statementCount: MAX_STATEMENTS };

function isStatementCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_STATEMENTS;
}

export function isQuizConfig(value: unknown): value is QuizConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statementCount' in value &&
    isStatementCount(value.statementCount) &&
    'latecomers' in value &&
    (value.latecomers === 'wait' || value.latecomers === 'join')
  );
}
