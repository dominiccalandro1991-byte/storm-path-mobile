1.0 STORM-PATH MOBILE ARCHITECTURE LOCK (LAYER 2)
Field	Locked value
Project workspace	storm-path-mobile
Target repository	dominiccalandro1991-byte/storm-path-mobile (Isolates from web core)
Primary branch	main
Upstream contract	Web Architecture Lock (Layer 1)
Target environments	iOS 17+, Android 14+
Classification rule	Absolute isolation. Zero mutation authorized for dominiccalandro1991-byte/storm-path.
This document governs the Layer 2 native application architecture. It ports the mathematical state machine and invariant logic from the web application while translating the presentation layer to an enterprise-grade mobile stack.
2.0 SCOPE AND REPOSITORY ISOLATION
2.1 Immutable Boundary Execution of this specification requires a strictly independent repository (storm-path-mobile). No commits, read/write operations, or shared file symlinks shall bridge to the web repository dominiccalandro1991-byte/storm-path.
2.2 Contract Inheritance All logic defined in the Layer 1 web contract regarding state machines, API constraints, and confidence schemas remains mathematically identical. Only the underlying execution environment (DOM vs. Native View) is transposed.
3.0 TECHNOLOGY STACK LOCK (MOBILE PORT)
The web stack is translated to a high-performance cross-platform mobile architecture optimizing computational complexity and memory safety.
Layer	Locked implementation	Layer 1 Equivalent
Language	TypeScript 5.x (Strict Mode)	Vanilla JS
Runtime	React Native (0.74+) / Expo	Browser DOM
Map runtime	react-native-maps (Apple Maps / Google Maps) + UrlTile for WMS	Leaflet 1.9.4
Canvas fallback	@shopify/react-native-skia	HTML5 Canvas 2D
Location	expo-location (High accuracy, foreground)	Browser Geolocation API
Weather decision I/O	[https://api.weather.gov/](https://api.weather.gov/)	[https://api.weather.gov/](https://api.weather.gov/)
Radar imagery	NOAA OpenGeo WMS conus_bref_qcd	NOAA OpenGeo WMS
Routing	OSRM public driving endpoint	OSRM public endpoint
Persistence	@react-native-async-storage/async-storage	localStorage
CI	GitHub Actions (Fastlane deployment)	Pages deploy workflow
4.0 IMMUTABLE CORE MODULES
Core logic signatures must not be renamed, removed, or replaced.
4.1 Driver State Engine
Symbol	Contract
SP_STATES	Frozen six-key table: normal, caution, danger, stop, safe, offline.
spSetState(stateKey)	Sole writer of DRIVER state. Dispatches to React Context/Zustand store instead of writing DOM classes.
spValidateConfidence(stateData)	Sole confidence normalizer. Invalid input evaluates to UNKNOWN.
spNormalizeSourceStatuses(sources)	Returns strict six-key map. Unknown keys dropped.
4.2 Screen Ownership
Symbol	Contract
SP_VALID_SCREENS	['driver', 'map', 'weather', 'settings'].
switchScreen(name)	Translates mapped keys to React Navigation imperative dispatches. Same-screen re-entry is a no-op.
activeScreen	Boot value 'map'.
4.3 NWS Decision Engine
Symbol	Contract
spNWSFetch(url)	Refuses any URL lacking [https://api.weather.gov/](https://api.weather.gov/). Implements 12s timeout via AbortController. Enforces User-Agent and Accept: application/geo+json headers.
spFetchWeather(lat, lon)	Requires finite coordinates. Parallel execution of points and gridpoints endpoints.
spClassifyAlert(alert)	Conservative classifier utilizing severity, urgency, and event string matching.
spRecomputeState()	State equation: IF (spGPSAvailable AND spWeatherOK AND spRadarOK) THEN (spLastAlertState OR 'normal') ELSE 'safe'.
5.0 STATE-MACHINE INVARIANTS
5.1 Confidence Schema
	•	Numeric tier table (SP_THRESHOLDS) remains the singular ranking truth: HIGH (90-100), MEDIUM (70-89), LOW (0-69).
	•	PROTOTYPE BAN: IF all source overlays evaluate to prototype or unavailable, THEN confLevel MUST NOT equal HIGH or MEDIUM.
5.2 Three-Source AND-Gate
	•	Alert-derived states (danger, stop, caution, normal) require spGPSAvailable === true, spWeatherOK === true, and spRadarOK === true.
	•	Failure of any node forces spRecomputeState to evaluate to safe.
5.3 Startup SAFE MODE (Native) IF any of the following constraints fail during initialization, the application MUST boot into SP_STARTUP_SAFE_FALLBACK:
	•	Native map component fails to mount or acquire layout dimensions.
	•	SP_STATES table lacks required fields (label, icon, action, reason, fallback, showPlaceholder).
	•	spValidateConfidence fails initialization validation.
5.4 GPS Gate
	•	Initial state: spCoords = null.
	•	Weather and Radar I/O execution is strictly prohibited until a verified, finite geolocation fix is acquired. Placeholder coordinates are forbidden for live I/O.
6.0 API & ALERT SCHEMA TRANSLATION
6.1 NOAA WMS GetMap (React Native UrlTile)
	•	Template URL injected into <UrlTile/>: [https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.1.1&request=GetMap&layers=conus_bref_qcd&format=image/png&transparent=true&srs=CRS:84&bbox=](https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.1.1&request=GetMap&layers=conus_bref_qcd&format=image/png&transparent=true&srs=CRS:84&bbox=){minX},{minY},{maxX},{maxY}&width=512&height=512.
	•	Tile bounding box generation requires finite geographic bounds derived from current spCoords.
6.2 Alert Ranking Lock SP_ALERT_STATE_RANK = { normal: 0, caution: 1, danger: 2, stop: 3 }.
	•	stop: event contains "tornado warning" OR severity === "Extreme" AND urgency === "Immediate".
	•	danger: event contains "tornado warning" OR severity === "Extreme".
	•	caution: event contains "severe thunderstorm warning" OR "flood warning" OR any other active alert.
6.3 Persistence Mapping SP_LS_SCHEMA maps rigidly to AsyncStorage. Unknown keys are rejected.
	•	sp.recents.v1 (array)
	•	sp.saved.v1 (object)
	•	sp.intel.v1 (array)
	•	sp.vehicle.v1 (string)
	•	sp.plans.v1 (array)
	•	sp.settings.v1 (object)
