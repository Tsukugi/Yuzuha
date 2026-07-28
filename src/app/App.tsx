import {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {AppStoreProvider} from '../data/AppStore';
import {NativeBundleInstaller, type LaunchDecision} from '../installer/BundleInstaller';
import {MainApp} from './MainApp';

const installer = new NativeBundleInstaller();

export function App() {
  const [decision, setDecision] = useState<LaunchDecision | null>(null);

  useEffect(() => {
    installer.launch().then(setDecision);
  }, []);

  if (!decision) {
    return (
      <SafeAreaProvider>
        <StartupScreen message="Checking the verified bundle..." />
      </SafeAreaProvider>
    );
  }

  if (decision.kind === 'blocked') {
    return (
      <SafeAreaProvider>
        <StartupScreen message={decision.reason} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <MainApp />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}

function StartupScreen({message}: {message: string}) {
  return (
    <SafeAreaView style={styles.startup}>
      <View>
        <Text style={styles.message}>{message}</Text>
        <ActivityIndicator color="#8be9c1" style={styles.spinner} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  startup: {flex: 1, backgroundColor: '#101820', justifyContent: 'center', padding: 28},
  message: {color: '#aebdb7', fontSize: 16, lineHeight: 24, marginTop: 12},
  spinner: {alignSelf: 'flex-start', marginTop: 24},
});
