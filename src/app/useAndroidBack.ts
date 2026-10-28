import {useEffect, useRef} from 'react';
import {Alert, BackHandler} from 'react-native';

type BackAction = {priority: number; run: () => void};
const actions = new Set<BackAction>();

// Explicit priority keeps a parent rerender from outranking its open menu.
export function useAndroidBack(enabled: boolean, priority: number, onBack: () => void) {
  const latest = useRef(onBack);
  latest.current = onBack;
  useEffect(() => {
    if (!enabled) return;
    const action = {priority, run: () => latest.current()};
    actions.add(action);
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const first = [...actions].sort((a, b) => b.priority - a.priority)[0];
      if (!first) return false;
      first.run();
      return true;
    });
    return () => {actions.delete(action); subscription.remove();};
  }, [enabled, priority]);
}

export function confirmDiscard(onDiscard: () => void) {
  Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
    {text: 'Keep editing', style: 'cancel'},
    {text: 'Discard', style: 'destructive', onPress: onDiscard},
  ]);
}
