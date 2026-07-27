import {QUICK_CAPTURE_OPTIONS, quickCaptureLabel, type QuickCaptureTarget} from './quickCapture';

describe('quick capture targets', () => {
  it('keeps the capture menu limited to existing local record forms', () => {
    expect(QUICK_CAPTURE_OPTIONS).toEqual([
      {target: 'money', label: 'Add money'},
      {target: 'notes', label: 'Add note'},
      {target: 'tasks', label: 'Add task'},
    ]);
    const targets: QuickCaptureTarget[] = ['money', 'notes', 'tasks'];
    expect(targets.map(quickCaptureLabel)).toEqual(['Add money', 'Add note', 'Add task']);
  });
});
