import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SP_COLOR } from '../theme';
import { useStormPath } from '../state/StormPathStore';
import { SP_SOURCE_KEYS } from '../core/spTypes';

export function WeatherScreen(): React.ReactElement {
  const { snapshot } = useStormPath();
  const temp = snapshot.hourly?.temperature ?? '--';
  const wind = snapshot.hourly?.wind ?? '--';
  const rh = snapshot.hourly?.humidity ?? '--';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>WEATHER</Text>
      <Text style={styles.mirror} accessibilityLabel="wx-state-mirror">
        {snapshot.weatherMirrorState}
      </Text>
      <Text style={styles.conf} accessibilityLabel="wx-conf-mirror">
        {snapshot.weatherMirrorConf}
      </Text>

      <Text style={styles.section}>RADAR SCOPE</Text>
      <View style={styles.scopeWrap}>
        {snapshot.radarUrl ? (
          <Image source={{ uri: snapshot.radarUrl }} style={styles.scope} />
        ) : (
          <View style={styles.scopeEmpty}>
            <Text style={styles.scopeWait}>
              {snapshot.gpsAvailable ? 'RADAR WAIT' : 'AWAITING GPS'}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.note}>
        NWS BASE REFLECTIVITY — {snapshot.radarOK ? 'LIVE' : snapshot.gpsAvailable ? 'WAIT' : 'AWAITING GPS'}
      </Text>

      <Text style={styles.section}>CURRENT CONDITIONS</Text>
      <View style={styles.grid}>
        <Chip label="TEMP" value={temp} />
        <Chip label="WIND" value={wind} />
        <Chip label="RH" value={rh} />
        <Chip label="PRESSURE" value={snapshot.pressureChip} />
        <Chip label="VIS" value={snapshot.visibilityChip} />
        <Chip label="CAPE" value={snapshot.capeChip} />
      </View>

      <Text style={styles.section}>LIVE NWS ALERTS</Text>
      {!snapshot.gpsAvailable ? (
        <AlertRow name="AWAITING GPS FIX FOR LIVE NWS ALERTS" desc="The first finite device fix is the only legal NWS trigger." tone="med" />
      ) : snapshot.alerts.length === 0 ? (
        <AlertRow
          name={snapshot.weatherOK ? 'No active alerts at the live fix' : 'NWS wait'}
          desc="Empty alert list evaluates to NORMAL once the AND-gate opens."
          tone="low"
        />
      ) : (
        snapshot.alerts.map((alert, i) => (
          <AlertRow
            key={`${alert.event}-${i}`}
            name={alert.event || 'Active alert'}
            desc={`${alert.severity} · ${alert.urgency}`}
            tone="high"
          />
        ))
      )}

      <Text style={styles.section}>SOURCE STATUS</Text>
      {SP_SOURCE_KEYS.map((key) => (
        <Text key={key} style={styles.source}>
          {key} · {snapshot.validated.sources[key].toUpperCase()}
        </Text>
      ))}
      <Text style={styles.foot}>PRESSURE / VIS / CAPE · NOT ON NWS HOURLY PERIOD · NOT LIVE</Text>
    </ScrollView>
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

function AlertRow({ name, desc, tone }: { name: string; desc: string; tone: 'high' | 'med' | 'low' }): React.ReactElement {
  const color = tone === 'high' ? SP_COLOR.red : tone === 'med' ? SP_COLOR.amber : SP_COLOR.green;
  return (
    <View style={styles.alert}>
      <View style={[styles.sev, { backgroundColor: color }]} />
      <View style={styles.alertCopy}>
        <Text style={styles.alertName}>{name}</Text>
        <Text style={styles.alertDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: SP_COLOR.bg },
  content: { padding: 20, paddingBottom: 48 },
  kicker: { color: SP_COLOR.cyan, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  mirror: { color: SP_COLOR.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  conf: { color: SP_COLOR.purple, fontSize: 13, marginTop: 4, fontFamily: 'Courier New' },
  section: { color: SP_COLOR.dim, letterSpacing: 1.5, fontSize: 11, marginTop: 22, marginBottom: 8 },
  scopeWrap: { alignItems: 'center' },
  scope: { width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: SP_COLOR.border },
  scopeEmpty: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SP_COLOR.bgCard,
  },
  scopeWait: { color: SP_COLOR.dim, letterSpacing: 1.2, fontSize: 12 },
  note: { color: SP_COLOR.muted, fontSize: 12, marginTop: 8, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    width: '47%',
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    padding: 12,
    borderRadius: 8,
    backgroundColor: SP_COLOR.bgCard,
  },
  chipLabel: { color: SP_COLOR.dim, fontSize: 11, letterSpacing: 1 },
  chipValue: { color: SP_COLOR.text, fontSize: 16, marginTop: 6 },
  alert: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SP_COLOR.border },
  sev: { width: 8, borderRadius: 4 },
  alertCopy: { flex: 1 },
  alertName: { color: SP_COLOR.text, fontSize: 14, fontWeight: '700' },
  alertDesc: { color: SP_COLOR.muted, fontSize: 12, marginTop: 2 },
  source: { color: SP_COLOR.muted, marginTop: 6, fontSize: 13 },
  foot: { color: SP_COLOR.dim, marginTop: 22, fontSize: 11, lineHeight: 16 },
});
