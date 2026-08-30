import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverScreen } from '../screens/DriverScreen';
import { MapScreen } from '../screens/MapScreen';
import { WeatherScreen } from '../screens/WeatherScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useStormPath } from '../state/StormPathStore';
import type { SpScreenName } from '../core/spTypes';

export type RootStackParamList = {
  driver: undefined;
  map: undefined;
  weather: undefined;
  settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function NavBar(): React.ReactElement {
  const { snapshot, switchScreen } = useStormPath();
  const items: SpScreenName[] = ['driver', 'map', 'weather', 'settings'];
  return (
    <View style={styles.bar}>
      {items.map((name) => {
        const active = snapshot.activeScreen === name;
        return (
          <Pressable key={name} onPress={() => switchScreen(name)} style={styles.item}>
            <Text style={[styles.label, active && styles.active]}>{name.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
      <NavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0b0f14' },
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1d2a38',
    backgroundColor: '#10161d',
  },
  item: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  label: { color: '#6f8296', fontSize: 11, letterSpacing: 1 },
  active: { color: '#f4f7fb', fontWeight: '700' },
});
