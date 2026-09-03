import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SP_COLOR } from '../theme';
import { useStormPath } from '../state/StormPathStore';
import type { SpScreenName } from '../core/spTypes';

const NAV: { name: SpScreenName; label: string }[] = [
  { name: 'driver', label: 'DRIVER' },
  { name: 'map', label: 'MAP' },
  { name: 'weather', label: 'WEATHER' },
  { name: 'settings', label: 'SETTINGS' },
];

export function TopBar(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { snapshot, switchScreen } = useStormPath();
  const live = snapshot.gpsAvailable && snapshot.weatherOK && snapshot.radarOK;
  const badge = !snapshot.gpsAvailable
    ? 'VIEW · MURPHYSBORO'
    : live
      ? 'WX + RADAR LIVE'
      : 'WX/RADAR WAIT · SAFE MODE';

  return (
    <View style={[styles.top, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark} />
        <Text style={styles.logo}>STORMPATH</Text>
        <Text style={styles.clock}>{snapshot.clock}</Text>
      </View>
      <View style={styles.nav}>
        {NAV.map((item) => {
          const active = snapshot.activeScreen === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => switchScreen(item.name)}
              style={[styles.navBtn, active && styles.navBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.statusRow}>
        <StatusChip ok={snapshot.gpsAvailable} label={snapshot.gpsAvailable ? 'GPS LIVE' : 'GPS WAIT'} />
        <StatusChip ok={snapshot.weatherOK} label={snapshot.weatherOK ? 'WX LIVE' : 'WX WAIT'} />
        <StatusChip ok={snapshot.radarOK} label={snapshot.radarOK ? 'RADAR LIVE' : 'RADAR WAIT'} />
        <Text style={[styles.badge, live ? styles.badgeLive : styles.badgeWait]}>{badge}</Text>
      </View>
    </View>
  );
}

export function BottomBar(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { snapshot } = useStormPath();
  const ticker = !snapshot.gpsAvailable
    ? 'VIEW · MURPHYSBORO, IL — TAP GPS FOR LIVE NWS'
    : snapshot.alerts.length
      ? snapshot.alerts.map((a) => a.event || 'Active alert').join('  ·  ')
      : snapshot.weatherOK
        ? 'NO ACTIVE NWS ALERTS AT THE LIVE FIX'
        : 'NWS WAIT · RETRYING PUBLIC api.weather.gov';
  const fix = snapshot.coords
    ? `${snapshot.coords.latitude.toFixed(4)}, ${snapshot.coords.longitude.toFixed(4)}`
    : 'VIEW 37.7645, -89.3351';

  return (
    <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Text style={styles.ticker} numberOfLines={1}>
        {ticker}
      </Text>
      <Text style={styles.fix}>{fix}</Text>
    </View>
  );
}

export function ToastHost(): React.ReactElement | null {
  const { snapshot } = useStormPath();
  if (!snapshot.toast) {
    return null;
  }
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{snapshot.toast}</Text>
    </View>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }): React.ReactElement {
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: ok ? SP_COLOR.green : SP_COLOR.amber }]} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    backgroundColor: SP_COLOR.bgRaised,
    borderBottomWidth: 1,
    borderBottomColor: SP_COLOR.border,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: SP_COLOR.cyan,
  },
  logo: {
    flex: 1,
    color: SP_COLOR.text,
    fontWeight: '800',
    letterSpacing: 2.4,
    fontSize: 13,
  },
  clock: {
    color: SP_COLOR.cyan,
    fontFamily: 'Courier New',
    fontSize: 12,
  },
  nav: { flexDirection: 'row', gap: 6 },
  navBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
  },
  navBtnActive: {
    borderColor: SP_COLOR.cyan,
    backgroundColor: '#0C1C24',
  },
  navLabel: { color: SP_COLOR.dim, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  navLabelActive: { color: SP_COLOR.cyan },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { color: SP_COLOR.muted, fontSize: 10, letterSpacing: 0.6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badge: { marginLeft: 'auto', fontSize: 10, letterSpacing: 0.6, fontWeight: '700' },
  badgeLive: { color: SP_COLOR.green },
  badgeWait: { color: SP_COLOR.amber },
  bottom: {
    backgroundColor: SP_COLOR.bgRaised,
    borderTopWidth: 1,
    borderTopColor: SP_COLOR.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  ticker: { color: SP_COLOR.muted, fontSize: 11, letterSpacing: 0.4 },
  fix: { color: SP_COLOR.cyan, fontFamily: 'Courier New', fontSize: 10 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    backgroundColor: '#0C1C24',
    borderColor: SP_COLOR.cyan,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  toastText: { color: SP_COLOR.cyan, fontSize: 12, letterSpacing: 1, fontWeight: '700', textAlign: 'center' },
});
