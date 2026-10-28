import {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Button, List, Menu} from 'react-native-paper';
import {useAndroidBack} from './useAndroidBack';
import {UI_TOKENS} from './uiTokens';

export const PERIOD_CHOICES = [
  {value: 'day', label: 'Today'},
  {value: 'week', label: 'This week'},
  {value: 'month', label: 'This month'},
] as const;

export function ChoiceMenu<T extends string>({label, value, options, onSelect}: {
  label: string;
  value: T;
  options: ReadonlyArray<{value: T; label: string}>;
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<number>();
  useAndroidBack(open, 100, () => setOpen(false));
  const selected = options.find(option => option.value === value);
  return (
    <View style={styles.container} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <Menu visible={open} onDismiss={() => setOpen(false)} contentStyle={{width}}
        anchor={<Button mode="outlined" icon="chevron-down" accessibilityLabel={`Choose ${label.toLowerCase()}`}
          accessibilityState={{expanded: open}} contentStyle={styles.choice} onPress={() => setOpen(true)}>
          {`${label} · ${selected?.label ?? 'Choose'}`}
        </Button>}>
        <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
          {options.map(option => <Menu.Item key={option.value} title={option.label}
            accessibilityLabel={`Select ${option.label}`} accessibilityState={{selected: option.value === value}}
            leadingIcon={option.value === value ? 'check' : undefined}
            onPress={() => {setOpen(false); onSelect(option.value);}} />)}
        </ScrollView>
      </Menu>
    </View>
  );
}

// Parent-owned drafts survive collapsing. A new edit target reveals its form.
export function DeferredSection({title, subtitle, revealKey, children}: {
  title: string;
  subtitle?: string;
  revealKey?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(revealKey));
  const previousKey = useRef(revealKey);
  useEffect(() => {
    if (revealKey !== previousKey.current) {
      setOpen(Boolean(revealKey));
      previousKey.current = revealKey;
    }
  }, [revealKey]);
  useAndroidBack(open, 60, () => setOpen(false));
  return <List.Accordion title={title} description={subtitle} expanded={open}
    accessibilityLabel={`${open ? 'Hide' : 'Show'} ${title}`} onPress={() => setOpen(current => !current)}>
    <View style={styles.section}>{children}</View>
  </List.Accordion>;
}

const styles = StyleSheet.create({
  container: {marginVertical: UI_TOKENS.spacing.xs},
  choice: {minHeight: UI_TOKENS.target.control},
  options: {maxHeight: 320},
  section: {gap: UI_TOKENS.spacing.sm, paddingVertical: UI_TOKENS.spacing.sm},
});
