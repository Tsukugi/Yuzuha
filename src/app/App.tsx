import {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {AppStoreProvider} from '../data/AppStore';
import {nativeBundleInstaller, type LaunchDecision} from '../installer/BundleInstaller';
import {MainApp} from './MainApp';
import {ThemeProvider, useAppTheme} from './theme';

export function App() {
  const [decision, setDecision] = useState<LaunchDecision | null>(null);
  const launchHealthReported = useRef(false);

  useEffect(() => {
    nativeBundleInstaller.launch().then(setDecision);
  }, []);

  useEffect(() => {
    if (!decision || decision.kind === 'blocked' || launchHealthReported.current) {
      return;
    }
    launchHealthReported.current = true;
    void nativeBundleInstaller.markLaunchSuccessful().catch(() => undefined);
  }, [decision]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {!decision ? (
          <StartupScreen message="Checking the verified bundle..." />
        ) : decision.kind === 'blocked' ? (
          <StartupScreen message={decision.reason} />
        ) : (
          <AppStoreProvider>
            <MainApp bundleVersion={decision.version} />
          </AppStoreProvider>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function StartupScreen({message}: {message: string}) {
  const {colors} = useAppTheme();
  return (
    <SafeAreaView style={[styles.startup, {backgroundColor: colors.background}]}>
      <View>
        <Text style={[styles.message, {color: colors.muted}]}>{message}</Text>
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  startup: {flex: 1, justifyContent: 'center', padding: 28},
  message: {fontSize: 16, lineHeight: 24, marginTop: 12},
  spinner: {alignSelf: 'flex-start', marginTop: 24},
});
