export type NoteMarkupStyle = 'plain' | 'bold' | 'italic' | 'code';

export interface NoteMarkupSegment {
  text: string;
  style: NoteMarkupStyle;
}

export interface NoteMarkupLine {
  isBullet: boolean;
  isHeading: boolean;
  segments: NoteMarkupSegment[];
}

export type NoteMarkupAction = 'bold' | 'italic' | 'code' | 'bullet' | 'heading';

export interface NoteTextSelection {
  start: number;
  end: number;
}

export interface NoteMarkupEdit {
  text: string;
  selection: NoteTextSelection;
}

const INLINE_MARKERS: Array<{marker: string; style: Exclude<NoteMarkupStyle, 'plain'>}> = [
  {marker: '**', style: 'bold'},
  {marker: '__', style: 'bold'},
  {marker: '`', style: 'code'},
  {marker: '*', style: 'italic'},
  {marker: '_', style: 'italic'},
];

function parseInlineMarkup(value: string): NoteMarkupSegment[] {
  const segments: NoteMarkupSegment[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    let match: {end: number; marker: string; start: number; style: Exclude<NoteMarkupStyle, 'plain'>} | null = null;
    for (const candidate of INLINE_MARKERS) {
      let start = value.indexOf(candidate.marker, cursor);
      while (start >= 0 && ((candidate.marker === '*' && value[start + 1] === '*') || (candidate.marker === '_' && value[start + 1] === '_'))) {
        start = value.indexOf(candidate.marker, start + candidate.marker.length);
      }
      if (start < 0) {
        continue;
      }
      const end = value.indexOf(candidate.marker, start + candidate.marker.length);
      if (end <= start + candidate.marker.length) {
        continue;
      }
      if (match === null || start < match.start || (start === match.start && candidate.marker.length > match.marker.length)) {
        match = {end, marker: candidate.marker, start, style: candidate.style};
      }
    }

    if (match === null) {
      segments.push({text: value.slice(cursor), style: 'plain'});
      break;
    }
    if (match.start > cursor) {
      segments.push({text: value.slice(cursor, match.start), style: 'plain'});
    }
    segments.push({text: value.slice(match.start + match.marker.length, match.end), style: match.style});
    cursor = match.end + match.marker.length;
  }

  return segments.length > 0 ? segments : [{text: '', style: 'plain'}];
}

export function parseNoteMarkup(body: string): NoteMarkupLine[] {
  return body.split('\n').map(line => {
    const heading = /^(#{1,3})[ \t]+(.*)$/.exec(line);
    const bullet = /^(?:[ \t]*[-*])[ \t]+(.*)$/.exec(line);
    const value = heading?.[2] ?? bullet?.[1] ?? line;
    return {
      isBullet: bullet !== null && heading === null,
      isHeading: heading !== null,
      segments: parseInlineMarkup(value),
    };
  });
}

function clampSelection(body: string, selection: NoteTextSelection): NoteTextSelection {
  const start = Math.max(0, Math.min(body.length, Math.min(selection.start, selection.end)));
  const end = Math.max(start, Math.min(body.length, Math.max(selection.start, selection.end)));
  return {start, end};
}

function applyInlineMarkup(body: string, selection: NoteTextSelection, prefix: string, suffix: string): NoteMarkupEdit {
  const selected = body.slice(selection.start, selection.end);
  const content = selected || 'text';
  const replacement = `${prefix}${content}${suffix}`;
  return {
    text: `${body.slice(0, selection.start)}${replacement}${body.slice(selection.end)}`,
    selection: {start: selection.start + prefix.length, end: selection.start + prefix.length + content.length},
  };
}

function applyLinePrefix(body: string, selection: NoteTextSelection, prefix: string): NoteMarkupEdit {
  const lineStart = body.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
  const lineEndIndex = body.indexOf('\n', Math.max(lineStart, selection.end - 1));
  const lineEnd = lineEndIndex < 0 ? body.length : lineEndIndex;
  const original = body.slice(lineStart, lineEnd);
  const updated = original.split('\n').map(line => line.startsWith(prefix) ? line : `${prefix}${line}`).join('\n');
  const text = `${body.slice(0, lineStart)}${updated}${body.slice(lineEnd)}`;
  return {
    text,
    selection: {start: lineStart + prefix.length, end: lineStart + updated.length},
  };
}

function applyHeading(body: string, selection: NoteTextSelection): NoteMarkupEdit {
  const lineStart = body.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
  const lineEndIndex = body.indexOf('\n', Math.max(lineStart, selection.end - 1));
  const lineEnd = lineEndIndex < 0 ? body.length : lineEndIndex;
  const original = body.slice(lineStart, lineEnd);
  const withoutHeading = original.replace(/^#{1,3}[ \t]+/, '');
  const hasHeading = withoutHeading !== original;
  const updated = hasHeading ? withoutHeading : `# ${original}`;
  const text = `${body.slice(0, lineStart)}${updated}${body.slice(lineEnd)}`;
  const contentStart = lineStart + (hasHeading ? 0 : 2);
  return {
    text,
    selection: {start: contentStart, end: contentStart + withoutHeading.length},
  };
}

export function applyNoteMarkup(body: string, rawSelection: NoteTextSelection, action: NoteMarkupAction): NoteMarkupEdit {
  const selection = clampSelection(body, rawSelection);
  switch (action) {
    case 'bold':
      return applyInlineMarkup(body, selection, '**', '**');
    case 'italic':
      return applyInlineMarkup(body, selection, '*', '*');
    case 'code':
      return applyInlineMarkup(body, selection, '`', '`');
    case 'bullet':
      return applyLinePrefix(body, selection, '- ');
    case 'heading':
      return applyHeading(body, selection);
  }
}
