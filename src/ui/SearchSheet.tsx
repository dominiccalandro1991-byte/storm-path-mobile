import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SP_COLOR } from '../theme';
import { useStormPath } from '../state/StormPathStore';
import type { SpPlace } from '../net/spGeocode';

const CHIPS = ['home', 'work', 'fuel', 'hospital', 'shelter', 'grocery'] as const;

export function SearchSheet(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { snapshot, setSearchOpen, runSearch, startDrive, chipSearch, saveSlot } = useStormPath();
  const [q, setQ] = useState('');
  const [pending, setPending] = useState<SpPlace | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!snapshot.searchOpen) {
      setPending(null);
      setBusy(false);
      return;
    }
    const t = setTimeout(() => {
      void runSearch(q);
    }, 280);
    return () => clearTimeout(t);
  }, [q, snapshot.searchOpen, runSearch]);

  const list = snapshot.searchHits.length ? snapshot.searchHits : snapshot.recents;
  const listLabel = snapshot.searchHits.length ? snapshot.searchStatus : snapshot.recents.length ? 'RECENTS' : 'TYPE A TOWN OR ADDRESS';

  async function onChip(kind: string) {
    if (kind === 'home' && snapshot.saved.home) {
      setPending(snapshot.saved.home);
      return;
    }
    if (kind === 'work' && snapshot.saved.work) {
      setPending(snapshot.saved.work);
      return;
    }
    await chipSearch(kind);
  }

  async function go() {
    if (!pending) {
      return;
    }
    setBusy(true);
    await startDrive(pending);
    setBusy(false);
  }

  return (
    <Modal visible={snapshot.searchOpen} animationType="slide" transparent onRequestClose={() => setSearchOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setSearchOpen(false)} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View>
            <Text style={styles.kicker}>NAVIGATION</Text>
            <Text style={styles.title}>Set destination</Text>
          </View>
          <Pressable onPress={() => setSearchOpen(false)} style={styles.close} accessibilityLabel="Close">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <View style={styles.field}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Town, state, or full US address"
            placeholderTextColor={SP_COLOR.dim}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
          />
          {q ? (
            <Pressable
              onPress={() => {
                setQ('');
                setPending(null);
              }}
            >
              <Text style={styles.clear}>CLEAR</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CHIPS.map((chip) => (
            <Pressable key={chip} onPress={() => void onChip(chip)} style={styles.chip}>
              <Text style={styles.chipText}>{chip.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.listLabel}>{listLabel}</Text>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {list.map((place) => {
            const active = pending?.latitude === place.latitude && pending?.longitude === place.longitude;
            return (
              <Pressable
                key={`${place.label}-${place.latitude}`}
                onPress={() => setPending(place)}
                style={[styles.result, active && styles.resultActive]}
              >
                <View style={styles.pin} />
                <View style={styles.resultCopy}>
                  <Text style={styles.resultLabel}>{place.label}</Text>
                  <Text style={styles.resultSub}>{place.sub || `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {pending ? (
          <View style={styles.pending}>
            <Text style={styles.pendingLabel}>{pending.label}</Text>
            <Text style={styles.pendingMeta}>
              {pending.latitude.toFixed(4)}, {pending.longitude.toFixed(4)}
              {snapshot.gpsAvailable ? '' : ' · AWAITING GPS'}
            </Text>
            <View style={styles.pendingRow}>
              <Pressable onPress={() => saveSlot('home', pending)} style={styles.ghost}>
                <Text style={styles.ghostText}>SAVE HOME</Text>
              </Pressable>
              <Pressable onPress={() => saveSlot('work', pending)} style={styles.ghost}>
                <Text style={styles.ghostText}>SAVE WORK</Text>
              </Pressable>
              <Pressable onPress={() => void go()} style={styles.go} disabled={busy}>
                <Text style={styles.goText}>{busy ? 'ROUTING…' : 'START DRIVE'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: SP_COLOR.bgRaised,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '86%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: SP_COLOR.border,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: SP_COLOR.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  title: { color: SP_COLOR.text, fontSize: 20, fontWeight: '700', marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: SP_COLOR.muted, fontSize: 28, lineHeight: 32 },
  field: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SP_COLOR.bg,
  },
  input: { flex: 1, color: SP_COLOR.text, fontSize: 15, minHeight: 44 },
  clear: { color: SP_COLOR.amber, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  chips: { gap: 8, paddingVertical: 12 },
  chip: {
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { color: SP_COLOR.muted, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  listLabel: { color: SP_COLOR.dim, fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  list: { maxHeight: 280 },
  result: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SP_COLOR.border,
  },
  resultActive: { backgroundColor: '#0C1C24' },
  pin: { width: 10, height: 10, borderRadius: 5, backgroundColor: SP_COLOR.amber, marginTop: 6 },
  resultCopy: { flex: 1 },
  resultLabel: { color: SP_COLOR.text, fontSize: 15, fontWeight: '600' },
  resultSub: { color: SP_COLOR.muted, fontSize: 12, marginTop: 2 },
  pending: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: SP_COLOR.cyan,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  pendingLabel: { color: SP_COLOR.text, fontWeight: '700', fontSize: 15 },
  pendingMeta: { color: SP_COLOR.cyan, fontFamily: 'Courier New', fontSize: 11 },
  pendingRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  ghost: {
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  ghostText: { color: SP_COLOR.muted, fontSize: 11, letterSpacing: 0.8, fontWeight: '700' },
  go: {
    flexGrow: 1,
    backgroundColor: SP_COLOR.cyan,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  goText: { color: '#041016', fontWeight: '800', letterSpacing: 1, fontSize: 12 },
});
