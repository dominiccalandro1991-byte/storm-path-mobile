import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStormPath } from '../state/StormPathStore';

export function WeatherScreen(): React.ReactElement {
  const { snapshot } = useStormPath();
  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>WEATHER</Text>
      <Text style={styles.mirror} accessibilityLabel="wx-state-mirror">
        {snapshot.weatherMirrorState}
      </Text>
      <Text style={styles.conf} accessibilityLabel="wx-conf-mirror">
        {snapshot.weatherMirrorConf}
      </Text>
      <View style={styles.grid}>
        <Chip label="TEMP" value={snapshot.hourly?.temperature ?? 'N/A'} />
        <Chip label="WIND" value={snapshot.hourly?.wind ?? 'N/A'} />
        <Chip label="HUMIDITY" value={snapshot.hourly?.humidity ?? 'N/A'} />
        <Chip label="PRESSURE" value={snapshot.pressureChip} />
        <Chip label="VISIBILITY" value={snapshot.visibilityChip} />
        <Chip label="CAPE" value={snapshot.capeChip} />
      </View>
      <Text style={styles.note}>
        Pressure, visibility, and CAPE stay N/A. Those fields are not on the NWS hourly period used
        by the decision engine.
      </Text>
    </View>
  );
}

function Chip({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b0f14', padding: 20 },
  kicker: { color: '#8aa0b8', letterSpacing: 2, fontSize: 12 },
  mirror: { color: '#f4f7fb', fontSize: 28, fontWeight: '700', marginTop: 10 },
  conf: { color: '#9eb1c6', fontSize: 16, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  chip: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#2a3a4d',
    padding: 12,
    borderRadius: 8,
  },
  chipLabel: { color: '#8aa0b8', fontSize: 11, letterSpacing: 1 },
  chipValue: { color: '#f4f7fb', fontSize: 16, marginTop: 6 },
  note: { color: '#6f8296', marginTop: 22, fontSize: 12, lineHeight: 18 },
});
