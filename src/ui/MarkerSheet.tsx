import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SP_COLOR } from '../theme';
import { useStormPath } from '../state/StormPathStore';
import { SP_VEHICLE_SECTIONS } from '../core/spVehicleIntel';
import { VEHICLE_IMAGES } from './markerAssets';

export function MarkerSheet(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { snapshot, setMarkerOpen, setVehicle } = useStormPath();
  const [packId, setPackId] = useState<string | null>(null);
  const pack = SP_VEHICLE_SECTIONS.find((s) => s.id === packId) ?? null;

  function close() {
    setPackId(null);
    setMarkerOpen(false);
  }

  return (
    <Modal visible={snapshot.markerOpen} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          {pack ? (
            <Pressable onPress={() => setPackId(null)} style={styles.back} accessibilityLabel="Back to sections">
              <Text style={styles.backText}>‹</Text>
            </Pressable>
          ) : null}
          <View style={styles.headCopy}>
            <Text style={styles.kicker}>{pack ? `YOUR MARKER · ${pack.label}` : 'YOUR MARKER'}</Text>
            <Text style={styles.title}>{pack ? 'Pick one' : 'Choose a form'}</Text>
          </View>
          <Pressable onPress={close} style={styles.close} accessibilityLabel="Close">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list}>
          {pack ? (
            <View style={styles.grid}>
              {pack.items.map((it) => {
                const selected = snapshot.vehicleId === it.id;
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => setVehicle(it.id)}
                    style={[styles.tile, selected && styles.tileOn]}
                  >
                    <Image source={VEHICLE_IMAGES[it.id]} style={styles.vehImg} resizeMode="contain" />
                    <Text style={styles.tileLabel}>{it.label}</Text>
                    <Text style={styles.tileDesc}>{it.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.grid}>
              {SP_VEHICLE_SECTIONS.map((sec) => (
                <Pressable key={sec.id} onPress={() => setPackId(sec.id)} style={styles.tile}>
                  <View style={styles.thumbs}>
                    {sec.items.map((it) => (
                      <Image key={it.id} source={VEHICLE_IMAGES[it.id]} style={styles.thumb} resizeMode="contain" />
                    ))}
                  </View>
                  <Text style={styles.tileLabel}>{sec.label}</Text>
                  <Text style={styles.tileDesc}>{sec.desc} · 4 markers</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
        <Text style={styles.note}>
          {pack
            ? 'Tap any of the four. It rides your GPS until you pick another.'
            : 'Tap a pack — its four markers pop up. Tap one and it stays on your GPS path.'}
        </Text>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headCopy: { flex: 1 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: SP_COLOR.cyan, fontSize: 28, lineHeight: 32 },
  kicker: { color: SP_COLOR.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  title: { color: SP_COLOR.text, fontSize: 20, fontWeight: '700', marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: SP_COLOR.muted, fontSize: 28, lineHeight: 32 },
  list: { maxHeight: 420 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    backgroundColor: SP_COLOR.bgCard,
    padding: 10,
    minHeight: 108,
  },
  tileOn: { borderColor: SP_COLOR.cyan },
  thumbs: { flexDirection: 'row', height: 44, alignItems: 'flex-end', overflow: 'hidden', gap: 2 },
  thumb: { width: 28, height: 44 },
  vehImg: { width: 80, height: 72 },
  tileLabel: { color: SP_COLOR.cyan, fontSize: 11, letterSpacing: 1.2, fontWeight: '800', marginTop: 6 },
  tileDesc: { color: SP_COLOR.muted, fontSize: 12, marginTop: 3 },
  note: { color: SP_COLOR.muted, fontSize: 12, marginTop: 10 },
});
