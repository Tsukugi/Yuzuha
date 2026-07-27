import {applyNoteMarkup, parseNoteMarkup} from './noteMarkup';

describe('note markup', () => {
  it('parses supported inline styles, headings, and bullets', () => {
    expect(parseNoteMarkup('# Release plan\n- **Ship** `v1` with _care_')).toEqual([
      {
        isBullet: false,
        isHeading: true,
        segments: [{text: 'Release plan', style: 'plain'}],
      },
      {
        isBullet: true,
        isHeading: false,
        segments: [
          {text: 'Ship', style: 'bold'},
          {text: ' ', style: 'plain'},
          {text: 'v1', style: 'code'},
          {text: ' with ', style: 'plain'},
          {text: 'care', style: 'italic'},
        ],
      },
    ]);
  });

  it('keeps unsupported or incomplete markup as readable plain text', () => {
    expect(parseNoteMarkup('Use [the app](https://example.test) and *unfinished')).toEqual([
      {
        isBullet: false,
        isHeading: false,
        segments: [{text: 'Use [the app](https://example.test) and *unfinished', style: 'plain'}],
      },
    ]);
  });

  it('wraps a selection with inline markup and returns the new selection', () => {
    expect(applyNoteMarkup('Ship the release', {start: 9, end: 16}, 'bold')).toEqual({
      text: 'Ship the **release**',
      selection: {start: 11, end: 18},
    });
  });

  it('adds bullets to every selected line', () => {
    expect(applyNoteMarkup('First\nSecond', {start: 0, end: 12}, 'bullet')).toEqual({
      text: '- First\n- Second',
      selection: {start: 2, end: 16},
    });
  });

  it('toggles a heading prefix instead of stacking heading markers', () => {
    expect(applyNoteMarkup('# Existing heading', {start: 4, end: 4}, 'heading')).toEqual({
      text: 'Existing heading',
      selection: {start: 0, end: 16},
    });
  });
});
