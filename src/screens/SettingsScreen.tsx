import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStormPath } from '../state/StormPathStore';
import { spHwFormatSettingsDump } from '../diagnostics/spHardwareLog';

export function SettingsScreen(): React.ReactElement {
  const { snapshot } = useStormPath();
  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>SETTINGS</Text>
      <Text style={styles.body}>Isolated repository: storm-path-mobile</Text>
      <Text style={styles.body}>Web core mutation: forbidden</Text>
      <Text style={styles.body}>Default screen: MAP</Text>
      <Text style={styles.body}>Startup payload: {snapshot.startupSafe ? 'SAFE FALLBACK' : 'PASS'}</Text>
      <Text style={styles.body}>
        Live fix: {snapshot.coords ? `${snapshot.coords.latitude.toFixed(4)}, ${snapshot.coords.longitude.toFixed(4)}` : 'null'}
      </Text>
      <Text style={styles.body}>AND-gate GPS={String(snapshot.gpsAvailable)} WX={String(snapshot.weatherOK)} RADAR={String(snapshot.radarOK)}</Text>
      <Text style={styles.body}>HW probe: {spHwFormatSettingsDump()}</Text>
      <Text style={styles.note}>
        Zero-cost origins only. No API keys. DOT / EMERG MGMT / ROAD CLOSURES / SHELTERS remain
        prototype until those feeds exist. First finite GPS fix is the only NWS / NOAA WMS trigger.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b0f14', padding: 20 },
  kicker: { color: '#8aa0b8', letterSpacing: 2, fontSize: 12 },
  body: { color: '#d7e3f2', marginTop: 12, fontSize: 15 },
  note: { color: '#6f8296', marginTop: 24, fontSize: 12, lineHeight: 18 },
});
