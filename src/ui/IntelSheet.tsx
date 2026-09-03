import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SP_COLOR } from '../theme';
import { useStormPath } from '../state/StormPathStore';
import { SP_INTEL_TYPES } from '../core/spVehicleIntel';
import { INTEL_IMAGES } from './markerAssets';

export function IntelSheet(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { snapshot, setIntelOpen, postIntel } = useStormPath();
  const [typeId, setTypeId] = useState<string | null>(null);
  const [subtype, setSubtype] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const spec = typeId ? SP_INTEL_TYPES.find((t) => t.id === typeId) ?? null : null;
  const canPost = Boolean(spec && (spec.subtypes.length === 0 || subtype));

  function close() {
    setTypeId(null);
    setSubtype(null);
    setNote('');
    setIntelOpen(false);
  }

  function pick(id: string) {
    setTypeId(id);
    setSubtype(null);
  }

  function submit() {
    if (!typeId || !canPost) {
      return;
    }
    postIntel(typeId, subtype, note);
    close();
  }

  return (
    <Modal visible={snapshot.intelOpen} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View>
            <Text style={styles.kicker}>DRIVER INTEL</Text>
            <Text style={styles.title}>Report what you see</Text>
          </View>
          <Pressable onPress={close} style={styles.close} accessibilityLabel="Close">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          <View style={styles.grid}>
            {SP_INTEL_TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => pick(t.id)}
                style={[styles.tile, typeId === t.id && styles.tileOn]}
              >
                <Image source={INTEL_IMAGES[t.id]} style={styles.ico} resizeMode="contain" />
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileDesc}>{t.desc}</Text>
              </Pressable>
            ))}
          </View>
          {spec && spec.subtypes.length ? (
            <View style={styles.subs}>
              {spec.subtypes.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSubtype(s.id)}
                  style={[styles.chip, subtype === s.id && styles.chipOn]}
                >
                  <Text style={[styles.chipText, subtype === s.id && styles.chipTextOn]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <TextInput
            value={note}
            onChangeText={(v) => setNote(v.slice(0, 140))}
            placeholder="Optional note — shows on the pin (140 chars)"
            placeholderTextColor={SP_COLOR.dim}
            multiline
            style={styles.note}
          />
          {canPost ? (
            <Pressable onPress={submit} style={styles.post}>
              <Text style={styles.postText}>POST INTEL</Text>
            </Pressable>
          ) : null}
          <Text style={styles.help}>
            Drops a pin at your live GPS fix (or Murphysboro map center if GPS is still acquiring). Stored on this
            device for 3 hours.
          </Text>
        </ScrollView>
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
  list: { maxHeight: 520 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    backgroundColor: SP_COLOR.bgCard,
    padding: 10,
    minHeight: 100,
  },
  tileOn: { borderColor: SP_COLOR.cyan },
  ico: { width: 80, height: 56 },
  tileLabel: { color: SP_COLOR.cyan, fontSize: 11, letterSpacing: 1.2, fontWeight: '800', marginTop: 6 },
  tileDesc: { color: SP_COLOR.muted, fontSize: 12, marginTop: 3 },
  subs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    minHeight: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  chipOn: { borderColor: SP_COLOR.cyan },
  chipText: { color: SP_COLOR.text, fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  chipTextOn: { color: SP_COLOR.cyan },
  note: {
    marginTop: 10,
    minHeight: 72,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    color: SP_COLOR.text,
    padding: 10,
    textAlignVertical: 'top',
  },
  post: {
    marginTop: 10,
    minHeight: 48,
    backgroundColor: SP_COLOR.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postText: { color: '#041016', fontWeight: '800', letterSpacing: 1.2 },
  help: { color: SP_COLOR.muted, fontSize: 12, marginTop: 10, marginBottom: 8 },
});
