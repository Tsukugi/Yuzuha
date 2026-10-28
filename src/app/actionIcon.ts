// One shared vocabulary; every icon retains its visible action label.
export function actionIcon(label: string): string | undefined {
  if (/^(save|update|saving)/i.test(label)) return 'content-save-outline';
  if (/^(cancel|close)/i.test(label)) return 'close';
  if (/^(delete|remove|clear)/i.test(label)) return 'delete-outline';
  if (/^unpin/i.test(label)) return 'pin-off-outline';
  if (/^pin/i.test(label)) return 'pin-outline';
  if (/^archive/i.test(label)) return 'archive-outline';
  if (/^restore/i.test(label)) return 'backup-restore';
  if (/^edit/i.test(label)) return 'pencil-outline';
  if (/^add money/i.test(label)) return 'wallet-plus-outline';
  if (/^add note/i.test(label)) return 'note-plus-outline';
  if (/^(add task|convert.*task|make task)/i.test(label)) return 'playlist-plus';
  if (/^(add|create|generate)/i.test(label)) return 'plus';
  if (/^(choose.*date|calendar)/i.test(label)) return 'calendar-outline';
  if (/^choose.*(time|start|end)/i.test(label)) return 'clock-outline';
  if (/^(refresh|check)/i.test(label)) return 'refresh';
  if (/^(open|preview)/i.test(label)) return 'open-in-new';
  if (/^share/i.test(label)) return 'share-variant-outline';
  if (/^pause/i.test(label)) return 'pause';
  if (/^(resume|start)/i.test(label)) return 'play-outline';
  if (/^complete/i.test(label)) return 'check';
  if (/^(attach|link)/i.test(label)) return 'paperclip';
  return undefined;
}
