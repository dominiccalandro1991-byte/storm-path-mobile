import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { SP_COLOR } from '../theme';
import { formatSpeed, useStormPath } from '../state/StormPathStore';
import { VEHICLE_IMAGES, INTEL_IMAGES } from '../ui/markerAssets';
import { SP_CAM_FOLLOW_ZOOM } from '../core/spCamera';
import { SP_IEM_NEXRAD_TILE } from '../core/spRadarTiles';

const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function MapScreen(): React.ReactElement {
  const {
    snapshot,
    markMapLayout,
    mapViewDefault,
    setSearchOpen,
    setMarkerOpen,
    setIntelOpen,
    requestGps,
    deleteIntel,
  } = useStormPath();
  const mapRef = useRef<MapView>(null);
  const [followCam, setFollowCam] = useState(true);
  const lastDest = useRef<string | null>(null);

  const onLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      markMapLayout(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0);
    },
    [markMapLayout],
  );

  useEffect(() => {
    if (!followCam || !snapshot.coords) {
      return;
    }
    void mapRef.current?.animateCamera(
      {
        center: { latitude: snapshot.coords.latitude, longitude: snapshot.coords.longitude },
      },
      { duration: 180 },
    );
  }, [followCam, snapshot.coords]);

  useEffect(() => {
    const key = snapshot.destination
      ? `${snapshot.destination.label}:${snapshot.route?.geometry.length ?? 0}`
      : null;
    if (!key || key === lastDest.current) {
      return;
    }
    const geo = snapshot.route?.geometry ?? [];
    if (geo.length < 2) {
      return;
    }
    lastDest.current = key;
    setFollowCam(true);
    if (geo.length > 1) {
      mapRef.current?.fitToCoordinates(geo, {
        edgePadding: { top: 80, right: 48, bottom: 160, left: 24 },
        animated: true,
      });
      const t = setTimeout(() => {
        if (!snapshot.coords) {
          return;
        }
        void mapRef.current?.animateCamera(
          {
            center: { latitude: snapshot.coords.latitude, longitude: snapshot.coords.longitude },
            zoom: SP_CAM_FOLLOW_ZOOM,
          },
          { duration: 500 },
        );
      }, 1600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [snapshot.coords, snapshot.destination, snapshot.route]);

  const overlayTemplate = snapshot.radarTileUrl || SP_IEM_NEXRAD_TILE;

  const step = snapshot.route?.steps[0];
  const spd = formatSpeed(snapshot.coords, snapshot.gpsAvailable, snapshot.speedUnits);
  const routeCoords = useMemo(() => snapshot.route?.geometry ?? [], [snapshot.route]);
  const vehicleSrc = snapshot.vehicleId ? VEHICLE_IMAGES[snapshot.vehicleId] : undefined;

  function recenter() {
    setFollowCam(true);
    if (!snapshot.coords) {
      return;
    }
    void mapRef.current?.animateCamera(
      {
        center: { latitude: snapshot.coords.latitude, longitude: snapshot.coords.longitude },
        zoom: SP_CAM_FOLLOW_ZOOM,
      },
      { duration: 400 },
    );
  }

  return (
    <View style={styles.page} onLayout={onLayout}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        mapType="none"
        initialRegion={{ ...mapViewDefault }}
        rotateEnabled={false}
        minZoomLevel={2}
        maxZoomLevel={19}
        onPanDrag={() => setFollowCam(false)}
      >
        <UrlTile urlTemplate={OSM_TILE} maximumZ={19} tileSize={256} />
        <UrlTile urlTemplate={overlayTemplate} maximumZ={12} tileSize={256} zIndex={2} />
        {snapshot.coords ? (
          <Marker
            coordinate={{
              latitude: snapshot.coords.latitude,
              longitude: snapshot.coords.longitude,
            }}
            title="LIVE FIX"
            description={snapshot.record.label}
            anchor={vehicleSrc ? { x: 0.5, y: 1 } : undefined}
          >
            {vehicleSrc ? (
              <Image source={vehicleSrc} style={styles.vehMark} resizeMode="contain" />
            ) : (
              <View style={styles.cyanDot} />
            )}
          </Marker>
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
        {snapshot.intelPins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lon }}
            title={pin.label}
            description={pin.note ? `${pin.note} · tap card to delete` : 'Tap this card to delete'}
            onCalloutPress={() => deleteIntel(pin.id)}
            anchor={{ x: 0.5, y: 1 }}
          >
            <Image source={INTEL_IMAGES[pin.type] ?? INTEL_IMAGES.object} style={styles.intelMark} resizeMode="contain" />
          </Marker>
        ))}
        {routeCoords.length > 1 ? (
          <Polyline coordinates={routeCoords} strokeColor={SP_COLOR.amber} strokeWidth={4} />
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

      {!followCam ? (
        <Pressable style={styles.recenter} onPress={recenter}>
          <Text style={styles.recenterText}>RECENTER</Text>
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

      <View style={styles.dock}>
        <Pressable style={styles.searchPill} onPress={() => setSearchOpen(true)}>
          <Text style={styles.searchKicker}>SET DESTINATION</Text>
          <Text style={styles.searchFabText} numberOfLines={1}>
            {snapshot.destination ? snapshot.destination.label : 'Town, state, or address'}
          </Text>
        </Pressable>
        <Pressable style={styles.dockBtn} onPress={() => setMarkerOpen(true)}>
          {vehicleSrc ? <Image source={vehicleSrc} style={styles.dockThumb} resizeMode="contain" /> : null}
          <Text style={styles.dockLabel}>MARKER</Text>
        </Pressable>
        <Pressable style={[styles.dockBtn, styles.dockAmber]} onPress={() => setIntelOpen(true)}>
          <Text style={[styles.dockLabel, styles.dockAmberText]}>REPORT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: SP_COLOR.bg },
  map: { flex: 1 },
  vehMark: { width: 42, height: 64 },
  intelMark: { width: 48, height: 48 },
  cyanDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: SP_COLOR.cyan,
    borderWidth: 2,
    borderColor: '#041016',
  },
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
  recenter: {
    position: 'absolute',
    right: 12,
    top: 12,
    minHeight: 36,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: SP_COLOR.cyan,
    backgroundColor: 'rgba(7,11,16,0.94)',
    justifyContent: 'center',
  },
  recenterText: { color: SP_COLOR.cyan, fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
  hudNext: {
    position: 'absolute',
    left: 12,
    right: 96,
    bottom: 78,
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
    bottom: 78,
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
  dock: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  searchPill: {
    flex: 1,
    minHeight: 48,
    backgroundColor: 'rgba(7,11,16,0.94)',
    borderWidth: 1,
    borderColor: SP_COLOR.cyan,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  searchKicker: { color: SP_COLOR.cyan, fontSize: 9, letterSpacing: 1.2, fontWeight: '800' },
  searchFabText: { color: SP_COLOR.text, fontSize: 13 },
  dockBtn: {
    width: 56,
    minHeight: 48,
    borderWidth: 1,
    borderColor: SP_COLOR.cyan,
    backgroundColor: 'rgba(7,11,16,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockAmber: { borderColor: SP_COLOR.amber },
  dockLabel: { color: SP_COLOR.cyan, fontSize: 8, letterSpacing: 0.6, fontWeight: '800' },
  dockAmberText: { color: SP_COLOR.amber },
  dockThumb: { width: 22, height: 22 },
});
