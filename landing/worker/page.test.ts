import { describe, expect, it } from 'vitest';
import { parseApps, renderPage } from './page.ts';

const app = { title: 'One', blurb: 'First app', url: 'https://one.example.workers.dev' };

describe('parseApps', () => {
  it('accepts a list of apps', () => {
    expect(parseApps(JSON.stringify([app]))).toEqual([app]);
  });

  it('rejects anything else', () => {
    expect(() => parseApps('{}')).toThrow(TypeError);
    expect(() => parseApps(JSON.stringify([{ title: 'One' }]))).toThrow(TypeError);
  });
});

describe('renderPage', () => {
  it("links to each app's demo page", () => {
    expect(renderPage([app])).toContain('href="https://one.example.workers.dev/demo"');
  });

  it('escapes text from state', () => {
    expect(renderPage([{ ...app, title: '<b>&</b>' }])).toContain('&lt;b&gt;&amp;&lt;/b&gt;');
  });

  it('says so when an app has no URL', () => {
    expect(renderPage([{ ...app, url: '' }])).toContain('Not deployed yet');
  });
});
