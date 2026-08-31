import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SP_COLOR } from '../theme';
import { formatSpeed, useStormPath } from '../state/StormPathStore';
import { SP_SOURCE_KEYS } from '../core/spTypes';

export function DriverScreen(): React.ReactElement {
  const { snapshot, setSearchOpen, clearDestination, requestGps } = useStormPath();
  const rec = snapshot.record;
  const spd = formatSpeed(snapshot.coords, snapshot.gpsAvailable, snapshot.speedUnits);
  const totalSec = snapshot.route ? Math.round(snapshot.route.minutes * 60) : 0;
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const step = snapshot.route?.steps[0];
  const dest = snapshot.destination;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>DRIVER</Text>
      <Text style={styles.state}>{rec.label}</Text>
      <Text style={styles.conf}>
        CONFIDENCE:{' '}
        {snapshot.validated.confPercent == null ? 'N/A' : `${snapshot.validated.confPercent}%`}
        {'  '}
        {snapshot.validated.confLevelLabel}
      </Text>
      <View style={styles.sources}>
        {SP_SOURCE_KEYS.map((key) => (
          <View key={key} style={styles.sourceChip}>
            <View
              style={[
                styles.sourceDot,
                {
                  backgroundColor:
                    snapshot.validated.sources[key] === 'connected'
                      ? SP_COLOR.green
                      : snapshot.validated.sources[key] === 'prototype'
                        ? SP_COLOR.amber
                        : SP_COLOR.dim,
                },
              ]}
            />
            <Text style={styles.sourceText}>{key}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.action}>{rec.action}</Text>
      <Text style={styles.reason}>{rec.reason}</Text>
      <View style={styles.home}>
        <Text style={styles.homeKicker}>{snapshot.gpsAvailable ? 'LIVE FIX' : 'READY'}</Text>
        <Text style={styles.homeTitle}>You're on the map</Text>
        <Text style={styles.homeCopy}>
          Your marker stays on your GPS. Search a town, state, or address, then Start Drive. Weather and
          radar stay gated until a finite live fix.
        </Text>
        <View style={styles.homeStats}>
          <Text style={styles.stat}>{snapshot.gpsAvailable ? 'GPS LIVE' : 'GPS WAIT'}</Text>
          <Text style={styles.stat}>
            {spd} {snapshot.speedUnits}
          </Text>
        </View>
        {!snapshot.gpsAvailable ? (
          <Pressable style={styles.secondary} onPress={requestGps}>
            <Text style={styles.secondaryText}>USE MY LIVE GPS</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable style={styles.search} onPress={() => setSearchOpen(true)}>
        <Text style={styles.searchKicker}>NAVIGATE</Text>
        <Text style={[styles.searchDest, !dest && styles.searchEmpty]}>
          {dest ? dest.label : 'Town, state, or address'}
        </Text>
      </Pressable>
      <Text style={styles.section}>TIME TO ARRIVE</Text>
      <View style={styles.clockRow}>
        <ClockCell value={d} label="DAYS" />
        <ClockCell value={h} label="HOURS" />
        <ClockCell value={m} label="MIN" />
        <ClockCell value={sec} label="SEC" />
      </View>
      <View style={styles.tripMeta}>
        <Text style={styles.meta}>
          REMAIN <Text style={styles.metaStrong}>{snapshot.route ? snapshot.route.miles.toFixed(1) : '--'}</Text> MI
        </Text>
        <Text style={styles.meta}>
          SPEED <Text style={styles.metaStrong}>{spd}</Text>
        </Text>
      </View>
      {dest && snapshot.driving ? (
        <Pressable style={styles.secondary} onPress={clearDestination}>
          <Text style={styles.secondaryText}>END DRIVE</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.primary} onPress={() => setSearchOpen(true)}>
          <Text style={styles.primaryText}>START DRIVE</Text>
        </Pressable>
      )}
      <View style={styles.nowCard}>
        <Text style={styles.nowGlyph}>↑</Text>
        <View style={styles.nowCopy}>
          <Text style={styles.nowDist}>{step ? `${step.miles.toFixed(1)} mi` : '—'}</Text>
          <Text style={styles.nowStreet}>{step?.instruction ?? 'Set a destination to load the route'}</Text>
          <Text style={styles.nowThen}>
            {dest ? dest.label : 'Search a town, state, or address, then Start Drive.'}
          </Text>
        </View>
      </View>
      <View style={styles.fallback}>
        <Text style={styles.fallbackLabel}>FALLBACK STATE</Text>
        <Text style={styles.fallbackText}>{rec.fallback}</Text>
      </View>
      {snapshot.startupSafe ? (
        <Text style={styles.warn}>STARTUP SAFE MODE · {snapshot.startupCodes.join(', ')}</Text>
      ) : null}
    </ScrollView>
  );
}

function ClockCell({ value, label }: { value: number; label: string }): React.ReactElement {
  return (
    <View style={styles.clockCell}>
      <Text style={styles.clockValue}>{value}</Text>
      <Text style={styles.clockLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: SP_COLOR.bg },
  content: { padding: 20, paddingBottom: 48, gap: 8 },
  kicker: { color: SP_COLOR.cyan, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  state: { color: SP_COLOR.text, fontSize: 32, fontWeight: '800', marginTop: 4 },
  conf: { color: SP_COLOR.muted, fontSize: 12, letterSpacing: 0.6 },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sourceDot: { width: 7, height: 7, borderRadius: 4 },
  sourceText: { color: SP_COLOR.muted, fontSize: 10, letterSpacing: 0.5 },
  action: { color: SP_COLOR.amber, fontSize: 18, fontWeight: '700', marginTop: 10 },
  reason: { color: SP_COLOR.muted, fontSize: 14, lineHeight: 20 },
  home: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: SP_COLOR.bgCard,
    gap: 6,
  },
  homeKicker: { color: SP_COLOR.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  homeTitle: { color: SP_COLOR.text, fontSize: 22, fontWeight: '700' },
  homeCopy: { color: SP_COLOR.muted, fontSize: 13, lineHeight: 19 },
  homeStats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  stat: { color: SP_COLOR.text, fontFamily: 'Courier New', fontSize: 12 },
  search: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: SP_COLOR.cyan,
    borderRadius: 12,
    padding: 14,
    minHeight: 64,
    justifyContent: 'center',
  },
  searchKicker: { color: SP_COLOR.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  searchDest: { color: SP_COLOR.text, fontSize: 16, marginTop: 2 },
  searchEmpty: { color: SP_COLOR.dim },
  section: { color: SP_COLOR.dim, letterSpacing: 1.5, fontSize: 11, marginTop: 10 },
  clockRow: { flexDirection: 'row', gap: 8 },
  clockCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: SP_COLOR.bgCard,
  },
  clockValue: { color: SP_COLOR.text, fontSize: 22, fontWeight: '800' },
  clockLabel: { color: SP_COLOR.dim, fontSize: 10, letterSpacing: 1, marginTop: 2 },
  tripMeta: { flexDirection: 'row', gap: 16, marginTop: 4 },
  meta: { color: SP_COLOR.muted, fontSize: 12 },
  metaStrong: { color: SP_COLOR.text, fontWeight: '700' },
  primary: {
    marginTop: 8,
    backgroundColor: SP_COLOR.cyan,
    borderRadius: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#041016', fontWeight: '800', letterSpacing: 1.2 },
  secondary: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: SP_COLOR.amber,
    borderRadius: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: SP_COLOR.amber, fontWeight: '800', letterSpacing: 1.2 },
  nowCard: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: SP_COLOR.bgCard,
  },
  nowGlyph: { color: SP_COLOR.cyan, fontSize: 28, fontWeight: '800' },
  nowCopy: { flex: 1 },
  nowDist: { color: SP_COLOR.amber, fontSize: 16, fontWeight: '700' },
  nowStreet: { color: SP_COLOR.text, fontSize: 14, marginTop: 2 },
  nowThen: { color: SP_COLOR.muted, fontSize: 12, marginTop: 4 },
  fallback: { marginTop: 8 },
  fallbackLabel: { color: SP_COLOR.dim, fontSize: 10, letterSpacing: 1.4 },
  fallbackText: { color: SP_COLOR.muted, fontSize: 13, marginTop: 4 },
  warn: { color: SP_COLOR.amber, marginTop: 10, fontSize: 12 },
});
