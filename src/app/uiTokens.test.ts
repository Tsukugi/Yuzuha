import {UI_TOKENS} from './uiTokens';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

describe('shared UI tokens', () => {
  it('keeps interactive controls at the standard touch sizes', () => {
    expect(UI_TOKENS.target.touch).toBe(44);
    expect(UI_TOKENS.target.control).toBe(44);
    expect(UI_TOKENS.target.primary).toBe(48);
    expect(UI_TOKENS.target.fab).toBe(56);
    expect(UI_TOKENS.target.tab).toBe(48);
  });

  it('keeps the page and card spacing scale stable', () => {
    expect(UI_TOKENS.spacing).toEqual({micro: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, fabClearance: 96, menuBottom: 80});
    expect(UI_TOKENS.radius).toEqual({control: 10, panel: 14, card: 16, hero: 18, fab: 28});
  });

  it('does not allow raw numeric spacing in the app styles', () => {
    const spacingPattern = /(?:padding(?:Top|Bottom|Left|Right|Horizontal|Vertical)?|margin(?:Top|Bottom|Left|Right|Horizontal|Vertical)?|gap)\s*:\s*\d+/;
    for (const file of ['MainApp.tsx', 'App.tsx']) {
      expect(readFileSync(join(process.cwd(), 'src', 'app', file), 'utf8')).not.toMatch(spacingPattern);
    }
  });
});
