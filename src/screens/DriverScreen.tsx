import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStormPath } from '../state/StormPathStore';
import { SP_SOURCE_KEYS } from '../core/spTypes';

export function DriverScreen(): React.ReactElement {
  const { snapshot } = useStormPath();
  const rec = snapshot.record;
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>DRIVER</Text>
      <Text style={styles.state}>{rec.label}</Text>
      <Text style={styles.action}>{rec.action}</Text>
      <Text style={styles.reason}>{rec.reason}</Text>
      <View style={styles.row}>
        <Text style={styles.chip}>{snapshot.weatherMirrorConf}</Text>
        <Text style={styles.chip}>GPS {snapshot.gpsAvailable ? 'LIVE' : 'WAIT'}</Text>
        <Text style={styles.chip}>WX {snapshot.weatherOK ? 'LIVE' : 'WAIT'}</Text>
        <Text style={styles.chip}>RADAR {snapshot.radarOK ? 'LIVE' : 'WAIT'}</Text>
      </View>
      <Text style={styles.section}>SOURCES</Text>
      {SP_SOURCE_KEYS.map((key) => (
        <Text key={key} style={styles.source}>
          {key}: {snapshot.validated.sources[key]}
        </Text>
      ))}
      {snapshot.startupSafe ? (
        <Text style={styles.warn}>STARTUP SAFE MODE · {snapshot.startupCodes.join(', ')}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b0f14' },
  content: { padding: 20, paddingBottom: 40 },
  kicker: { color: '#8aa0b8', letterSpacing: 2, fontSize: 12 },
  state: { color: '#f4f7fb', fontSize: 32, fontWeight: '700', marginTop: 8 },
  action: { color: '#d7e3f2', fontSize: 18, marginTop: 8 },
  reason: { color: '#9eb1c6', fontSize: 14, marginTop: 10, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    color: '#d7e3f2',
    borderColor: '#2a3a4d',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    fontSize: 11,
  },
  section: { color: '#8aa0b8', marginTop: 24, letterSpacing: 1.5, fontSize: 12 },
  source: { color: '#c5d4e4', marginTop: 6, fontSize: 13 },
  warn: { color: '#e8b07a', marginTop: 18, fontSize: 12 },
});
