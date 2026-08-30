import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Overlay, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import { useStormPath } from '../state/StormPathStore';
import { radarBoundsFromFix } from '../net/spRadar';

export function MapScreen(): React.ReactElement {
  const { snapshot, markMapLayout, mapViewDefault } = useStormPath();

  const onLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      markMapLayout(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0);
    },
    [markMapLayout],
  );

  const region: Region = snapshot.coords
    ? {
        latitude: snapshot.coords.latitude,
        longitude: snapshot.coords.longitude,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      }
    : { ...mapViewDefault };

  const bounds = snapshot.coords
    ? radarBoundsFromFix(snapshot.coords.latitude, snapshot.coords.longitude)
    : null;
  const overlayBounds: [[number, number], [number, number]] | null =
    bounds && snapshot.radarUrl
      ? [
          [bounds.maxLat, bounds.maxLon],
          [bounds.minLat, bounds.minLon],
        ]
      : null;

  return (
    <View style={styles.page} onLayout={onLayout}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{ ...mapViewDefault }}
        region={region}
        rotateEnabled={false}
      >
        {snapshot.coords ? (
          <Marker
            coordinate={{
              latitude: snapshot.coords.latitude,
              longitude: snapshot.coords.longitude,
            }}
            title="LIVE FIX"
            description={snapshot.record.label}
          />
        ) : null}
        {snapshot.radarUrl && overlayBounds ? (
          <Overlay image={{ uri: snapshot.radarUrl }} bounds={overlayBounds} opacity={0.62} />
        ) : null}
      </MapView>
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudText}>{snapshot.record.label}</Text>
        <Text style={styles.hudSub}>
          GPS {snapshot.gpsAvailable ? 'LIVE' : 'WAIT'} · WX {snapshot.weatherOK ? 'LIVE' : 'WAIT'} ·
          RADAR {snapshot.radarOK ? 'LIVE' : 'WAIT'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b0f14' },
  map: { flex: 1 },
  hud: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(11,15,20,0.82)',
    padding: 10,
    borderRadius: 8,
  },
  hudText: { color: '#f4f7fb', fontWeight: '700', fontSize: 16 },
  hudSub: { color: '#9eb1c6', marginTop: 4, fontSize: 12 },
});
