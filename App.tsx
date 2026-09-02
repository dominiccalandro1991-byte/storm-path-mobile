import React, { useEffect } from 'react';
import { installVoltcoreTelemetry } from './src/telemetry';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StormPathProvider } from './src/state/StormPathStore';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App(): React.ReactElement {
  useEffect(() => {
    installVoltcoreTelemetry();
  }, []);
  return (
    <SafeAreaProvider>
      <StormPathProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </StormPathProvider>
    </SafeAreaProvider>
  );
}
