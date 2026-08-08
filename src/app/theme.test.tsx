import TestRenderer, {act} from 'react-test-renderer';
import {Pressable, Text} from 'react-native';
import {ThemeProvider, useAppTheme} from './theme';

function ThemeProbe() {
  const {colors, palette, setPalette} = useAppTheme();
  return (
    <>
      <Text>{palette}</Text>
      <Text>{colors.accent}</Text>
      <Pressable accessibilityLabel="Choose plum" onPress={() => setPalette('plum')} />
    </>
  );
}

describe('theme palettes', () => {
  it('switches the active accent palette without touching workspace data', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      );
    });

    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual(['moss', '#16A37C']);

    act(() => {
      renderer!.root.findByProps({accessibilityLabel: 'Choose plum'}).props.onPress();
    });

    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual(['plum', '#8146C7']);
  });
});
