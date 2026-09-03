import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverScreen } from '../screens/DriverScreen';
import { MapScreen } from '../screens/MapScreen';
import { WeatherScreen } from '../screens/WeatherScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BottomBar, ToastHost, TopBar } from '../ui/Chrome';
import { SearchSheet } from '../ui/SearchSheet';
import { MarkerSheet } from '../ui/MarkerSheet';
import { IntelSheet } from '../ui/IntelSheet';
import { useStormPath } from '../state/StormPathStore';
import { SP_COLOR } from '../theme';

export type RootStackParamList = {
  driver: undefined;
  map: undefined;
  weather: undefined;
  settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.ReactElement {
  const { snapshot } = useStormPath();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate(snapshot.activeScreen);
    }
  }, [snapshot.activeScreen]);

  return (
    <View style={styles.shell}>
      <TopBar />
      <View style={styles.stage}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            navigationRef.current?.navigate(snapshot.activeScreen);
          }}
        >
          <Stack.Navigator initialRouteName="map" screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="map" component={MapScreen} />
            <Stack.Screen name="driver" component={DriverScreen} />
            <Stack.Screen name="weather" component={WeatherScreen} />
            <Stack.Screen name="settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
      <BottomBar />
      <SearchSheet />
      <MarkerSheet />
      <IntelSheet />
      <ToastHost />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: SP_COLOR.bg },
  stage: { flex: 1, backgroundColor: SP_COLOR.bg },
});
