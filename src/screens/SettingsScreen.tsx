import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SP_COLOR } from '../theme';
import { useStormPath } from '../state/StormPathStore';
import { SP_APP_VERSION } from '../core/spTypes';
import { spHwFormatSettingsDump } from '../diagnostics/spHardwareLog';

export function SettingsScreen(): React.ReactElement {
  const {
    snapshot,
    toggleUnits,
    toggleLabels,
    toggleLimit,
    clearRecents,
    clearIntel,
    clearPlans,
    clearSaved,
    requestGps,
  } = useStormPath();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>SETTINGS</Text>

      <Text style={styles.head}>NAVIGATION</Text>
      <Row title="Speed units" body="Live GPS speed from this device — not simulated" action={snapshot.speedUnits} onPress={toggleUnits} />
      <Row title="Speed limit badge" body="Posted limit next to your speed when the road has one" action={snapshot.showLimit ? 'ON' : 'OFF'} onPress={toggleLimit} />

      <Text style={styles.head}>MAP</Text>
      <Row title="Map place names" body="Dark OpenStreetMap tiles with US towns and streets" action={snapshot.showLabels ? 'ON' : 'OFF'} onPress={toggleLabels} />
      <Row title="Device GPS" body="Re-request the foreground location permission" action="RETRY" onPress={requestGps} />

      <Text style={styles.head}>THIS DEVICE</Text>
      <Row title="Recent destinations" body="Clear search history on this device" action="CLEAR" onPress={clearRecents} />
      <Row title="Driver intel" body="Remove every pin you posted" action="CLEAR" onPress={clearIntel} />
      <Row title="Planned drives" body="Remove saved leave-later trips" action="CLEAR" onPress={clearPlans} />
      <Row title="Saved home / work" body="Wipe those two slots" action="CLEAR" onPress={clearSaved} />

      <Text style={styles.head}>AND-GATE</Text>
      <Text style={styles.body}>
        GPS={String(snapshot.gpsAvailable)} WX={String(snapshot.weatherOK)} RADAR={String(snapshot.radarOK)} · fix=
        {snapshot.coords ? `${snapshot.coords.latitude.toFixed(4)}, ${snapshot.coords.longitude.toFixed(4)}` : 'null'} ·
        startup={snapshot.startupSafe ? `SAFE ${snapshot.startupCodes.join(',')}` : 'PASS'}
      </Text>
      <Text style={styles.body}>HW probe: {spHwFormatSettingsDump()}</Text>

      <Text style={styles.head}>ABOUT</Text>
      <Text style={styles.body}>
        Storm Path {SP_APP_VERSION}. Navigation × weather. Live NWS. Live NOAA radar. Live device GPS. Map view
        default is Murphysboro, Illinois — view only. First finite GPS fix is the only NWS / NOAA WMS trigger that
        can leave SAFE MODE. OpenStreetMap tiles. Isolated repo storm-path-mobile. Web core mutation forbidden.
      </Text>
      <Pressable
        onPress={() => {
          void Linking.openURL('https://voltcore-org.github.io/storm-path-mobile/privacy.html');
        }}
      >
        <Text style={styles.link}>Privacy policy</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Pressable onPress={onPress} style={styles.action}>
        <Text style={styles.actionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: SP_COLOR.bg },
  content: { padding: 20, paddingBottom: 48 },
  kicker: { color: SP_COLOR.cyan, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  head: { color: SP_COLOR.dim, letterSpacing: 1.5, fontSize: 11, marginTop: 22, marginBottom: 8 },
  body: { color: SP_COLOR.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: SP_COLOR.border,
    paddingVertical: 12,
  },
  rowCopy: { flex: 1 },
  rowTitle: { color: SP_COLOR.text, fontSize: 15, fontWeight: '700' },
  rowBody: { color: SP_COLOR.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  action: {
    minHeight: 44,
    minWidth: 64,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionText: { color: SP_COLOR.cyan, fontSize: 11, letterSpacing: 1, fontWeight: '800' },
  link: { color: SP_COLOR.cyan, marginTop: 12, fontSize: 14 },
});
