export type QuickCaptureTarget = 'money' | 'notes' | 'tasks';

export interface QuickCaptureOption {
  target: QuickCaptureTarget;
  label: string;
}

export const QUICK_CAPTURE_OPTIONS: readonly QuickCaptureOption[] = [
  {target: 'money', label: 'Add money'},
  {target: 'notes', label: 'Add note'},
  {target: 'tasks', label: 'Add task'},
];

export function quickCaptureLabel(target: QuickCaptureTarget): string {
  return QUICK_CAPTURE_OPTIONS.find(option => option.target === target)?.label ?? 'Quick capture';
}
