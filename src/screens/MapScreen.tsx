import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Overlay, Polyline, PROVIDER_DEFAULT, UrlTile, type Region } from 'react-native-maps';
import { SP_COLOR } from '../theme';
import { formatSpeed, useStormPath } from '../state/StormPathStore';
import { radarBoundsFromFix } from '../net/spRadar';

const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function MapScreen(): React.ReactElement {
  const { snapshot, markMapLayout, mapViewDefault, setSearchOpen, requestGps } = useStormPath();

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
        latitudeDelta: snapshot.driving ? 0.06 : 0.08,
        longitudeDelta: snapshot.driving ? 0.06 : 0.08,
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

  const step = snapshot.route?.steps[0];
  const spd = formatSpeed(snapshot.coords, snapshot.gpsAvailable, snapshot.speedUnits);
  const routeCoords = useMemo(() => snapshot.route?.geometry ?? [], [snapshot.route]);

  return (
    <View style={styles.page} onLayout={onLayout}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={{ ...mapViewDefault }}
        region={region}
        rotateEnabled={false}
      >
        <UrlTile urlTemplate={OSM_TILE} maximumZ={19} tileSize={256} />
        {snapshot.coords ? (
          <Marker
            coordinate={{
              latitude: snapshot.coords.latitude,
              longitude: snapshot.coords.longitude,
            }}
            pinColor={SP_COLOR.cyan}
            title="LIVE FIX"
            description={snapshot.record.label}
          />
        ) : null}
        {snapshot.destination ? (
          <Marker
            coordinate={{
              latitude: snapshot.destination.latitude,
              longitude: snapshot.destination.longitude,
            }}
            pinColor={SP_COLOR.amber}
            title={snapshot.destination.label}
          />
        ) : null}
        {routeCoords.length > 1 ? (
          <Polyline coordinates={routeCoords} strokeColor={SP_COLOR.amber} strokeWidth={4} />
        ) : null}
        {snapshot.radarUrl && overlayBounds ? (
          <Overlay image={{ uri: snapshot.radarUrl }} bounds={overlayBounds} opacity={0.55} />
        ) : null}
      </MapView>

      {!snapshot.gpsAvailable ? (
        <Pressable style={styles.gpsGate} onPress={requestGps}>
          <Text style={styles.gpsGateTitle}>USE MY LIVE GPS</Text>
          <Text style={styles.gpsGateCopy}>
            First finite device fix is the only legal NWS / NOAA trigger. Map opens on Murphysboro as a view
            default only. IP location is never GPS.
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.hudNext} pointerEvents="none">
        <Text style={styles.nextDist}>{step ? `${step.miles.toFixed(1)} mi` : '—'}</Text>
        <Text style={styles.nextStreet}>{step?.instruction ?? 'Set a destination'}</Text>
        <Text style={styles.nextRoad}>{snapshot.destination ? snapshot.destination.label : 'SEARCH TO NAVIGATE'}</Text>
      </View>

      <View style={styles.speed} pointerEvents="none">
        <Text style={styles.speedVal}>{spd}</Text>
        <Text style={styles.speedUnit}>{snapshot.speedUnits}</Text>
      </View>

      <Pressable style={styles.searchFab} onPress={() => setSearchOpen(true)}>
        <Text style={styles.searchFabText}>
          {snapshot.destination ? snapshot.destination.label : 'Town, state, or address'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: SP_COLOR.bg },
  map: { flex: 1 },
  gpsGate: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 88,
    maxHeight: 92,
    overflow: 'hidden',
    backgroundColor: 'rgba(7,11,16,0.94)',
    borderColor: SP_COLOR.cyan,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  gpsGateTitle: { color: SP_COLOR.cyan, fontWeight: '800', letterSpacing: 1.2 },
  gpsGateCopy: { color: SP_COLOR.muted, fontSize: 12, lineHeight: 18 },
  hudNext: {
    position: 'absolute',
    left: 12,
    right: 96,
    bottom: 72,
    backgroundColor: 'rgba(7,11,16,0.88)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SP_COLOR.border,
    padding: 12,
  },
  nextDist: { color: SP_COLOR.amber, fontSize: 18, fontWeight: '800' },
  nextStreet: { color: SP_COLOR.text, fontSize: 14, marginTop: 2 },
  nextRoad: { color: SP_COLOR.muted, fontSize: 11, marginTop: 4, letterSpacing: 0.6 },
  speed: {
    position: 'absolute',
    right: 12,
    bottom: 72,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: SP_COLOR.cyan,
    backgroundColor: 'rgba(7,11,16,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedVal: { color: SP_COLOR.text, fontSize: 22, fontWeight: '800' },
  speedUnit: { color: SP_COLOR.cyan, fontSize: 10, letterSpacing: 1 },
  searchFab: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(7,11,16,0.92)',
    borderWidth: 1,
    borderColor: SP_COLOR.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  searchFabText: { color: SP_COLOR.text, fontSize: 14 },
});
