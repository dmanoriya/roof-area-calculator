'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export default function RoofMapCanvas({
  apiKey,
  selectedLocation,
  initialCoordinates = null,
  readOnly = false,
  propertyAddress,
  mode,
  pitch,
  waste,
  baseSquares,
  onMetricsChange,
  onModeChange,
  onCoordinatesChange
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);
  const drawingManagerRef = useRef(null);

  // Default center fallback (Raleigh, NC)
  const currentCenterRef = useRef({ lat: 35.7796, lng: -78.6382 });
  const lastFetchedLocRef = useRef('');

  const [pointsCount, setPointsCount] = useState(0);
  const [solarDetected, setSolarDetected] = useState(false);

  const updateAreaFromPoly = useCallback((poly) => {
    if (!window.google?.maps?.geometry || !poly) return;
    try {
      const areaSqMeters = window.google.maps.geometry.spherical.computeArea(poly.getPath());
      const areaSqFt = Math.round(areaSqMeters * 10.7639);
      const sq = Math.max(Math.round(areaSqFt / 100), 5);

      setPointsCount(poly.getPath().getLength());

      const coords = [];
      const path = poly.getPath();
      for (let i = 0; i < path.getLength(); i++) {
        coords.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() });
      }

      if (onCoordinatesChange) onCoordinatesChange(coords);
      if (onMetricsChange) onMetricsChange(sq, areaSqFt);
    } catch (e) {
      console.warn('Error computing polygon area:', e);
    }
  }, [onCoordinatesChange, onMetricsChange]);

  const drawPolygonFromCoords = useCallback((coordsList, isEditable = true) => {
    if (!mapInstanceRef.current || !window.google?.maps?.Polygon || !coordsList || !coordsList.length) return;

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    const path = coordsList.map(c => ({
      lat: typeof c.lat === 'function' ? c.lat() : Number(c.lat),
      lng: typeof c.lng === 'function' ? c.lng() : Number(c.lng)
    }));

    const poly = new window.google.maps.Polygon({
      paths: path,
      strokeColor: '#dc2626',
      strokeOpacity: 0.95,
      strokeWeight: 3,
      fillColor: '#dc2626',
      fillOpacity: 0.35,
      editable: isEditable,
      draggable: isEditable,
      map: mapInstanceRef.current
    });

    polygonRef.current = poly;
    updateAreaFromPoly(poly);

    if (isEditable) {
      window.google.maps.event.addListener(poly.getPath(), 'set_at', () => updateAreaFromPoly(poly));
      window.google.maps.event.addListener(poly.getPath(), 'insert_at', () => updateAreaFromPoly(poly));
    }

    if (window.google.maps.LatLngBounds && path.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach(pt => bounds.extend(pt));
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [updateAreaFromPoly]);

  const createAutoPolygon = useCallback((centerLoc) => {
    if (!mapInstanceRef.current || !window.google?.maps?.Polygon) return;

    // Purge previous polygon if present
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    const lat = typeof centerLoc.lat === 'function' ? centerLoc.lat() : centerLoc.lat;
    const lng = typeof centerLoc.lng === 'function' ? centerLoc.lng() : centerLoc.lng;

    currentCenterRef.current = { lat, lng };

    // ~12m x 14m roof bounding box
    const latDelta = 0.00011;
    const lngDelta = 0.00013;

    const coords = [
      { lat: lat + latDelta, lng: lng - lngDelta },
      { lat: lat + latDelta, lng: lng + lngDelta },
      { lat: lat - latDelta, lng: lng + lngDelta },
      { lat: lat - latDelta, lng: lng - lngDelta }
    ];

    drawPolygonFromCoords(coords, !readOnly);
  }, [drawPolygonFromCoords, readOnly]);

  const [solarStatusMsg, setSolarStatusMsg] = useState('');

  const fetchSolarRoofInsights = useCallback(async (lat, lng) => {
    if (!apiKey) return;
    try {
      const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.solarPotential) {
        setSolarDetected(true);
        setSolarStatusMsg('AI Solar Active');

        if (data.solarPotential.wholeRoofStats) {
          const sqMeters = data.solarPotential.wholeRoofStats.areaMeters2;
          if (sqMeters && sqMeters > 20) {
            const solarSqFt = Math.round(sqMeters * 10.7639);
            const solarSq = Math.max(Math.round(solarSqFt / 100), 5);
            if (onMetricsChange) onMetricsChange(solarSq, solarSqFt);
          }
        }

        // Draw exact polygon from Solar API bounding box if available
        if (data.boundingBox && data.boundingBox.sw && data.boundingBox.ne) {
          const sw = data.boundingBox.sw;
          const ne = data.boundingBox.ne;
          const solarCoords = [
            { lat: ne.latitude, lng: sw.longitude },
            { lat: ne.latitude, lng: ne.longitude },
            { lat: sw.latitude, lng: ne.longitude },
            { lat: sw.latitude, lng: sw.longitude }
          ];
          drawPolygonFromCoords(solarCoords, !readOnly);
        }
      } else if (data && data.error) {
        setSolarDetected(false);
        if (data.error.status === 'PERMISSION_DENIED' || data.error.reason === 'API_KEY_SERVICE_BLOCKED') {
          setSolarStatusMsg('Solar API Disabled on Key');
          console.warn('Google Solar API Notice: Enable solar.googleapis.com in Google Cloud Console for API key:', apiKey);
        } else {
          setSolarStatusMsg('Roof Satellite Fit');
        }
      }
    } catch (e) {
      setSolarDetected(false);
      setSolarStatusMsg('Roof Satellite Fit');
    }
  }, [apiKey, drawPolygonFromCoords, onMetricsChange, readOnly]);

  // Load Google Maps Script & initialize map + roof polygon
  useEffect(() => {
    if (!apiKey) return;

    let isMounted = true;

    const loadScript = (key) => {
      if (window.google?.maps) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existingScript = document.getElementById('google-maps-api-script');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          if (window.google?.maps) resolve();
          return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-api-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry,drawing`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
    };

    loadScript(apiKey).then(() => {
      if (!isMounted) return;

      const targetLoc = selectedLocation || currentCenterRef.current;

      if (mapRef.current && !mapInstanceRef.current && window.google?.maps) {
        const googleMap = new window.google.maps.Map(mapRef.current, {
          center: targetLoc,
          zoom: 20,
          mapTypeId: 'hybrid',
          tilt: 0,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true
        });

        mapInstanceRef.current = googleMap;

        // Priority 1: Render exact saved initialCoordinates if provided!
        if (initialCoordinates && Array.isArray(initialCoordinates) && initialCoordinates.length >= 3) {
          drawPolygonFromCoords(initialCoordinates, !readOnly);
        } else {
          createAutoPolygon(targetLoc);
          fetchSolarRoofInsights(targetLoc.lat, targetLoc.lng);
        }

        if (!readOnly && window.google.maps.drawing) {
          const dm = new window.google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
              fillColor: '#dc2626',
              fillOpacity: 0.35,
              strokeColor: '#dc2626',
              strokeWeight: 3,
              editable: true,
              draggable: true
            }
          });
          dm.setMap(googleMap);
          drawingManagerRef.current = dm;

          window.google.maps.event.addListener(dm, 'polygoncomplete', (poly) => {
            if (polygonRef.current) polygonRef.current.setMap(null);
            polygonRef.current = poly;
            dm.setDrawingMode(null);
            updateAreaFromPoly(poly);

            window.google.maps.event.addListener(poly.getPath(), 'set_at', () => updateAreaFromPoly(poly));
            window.google.maps.event.addListener(poly.getPath(), 'insert_at', () => updateAreaFromPoly(poly));
          });
        }
      }
    }).catch(err => {
      console.warn('Google Maps Script Error:', err);
    });

    return () => { isMounted = false; };
  }, [apiKey, createAutoPolygon, drawPolygonFromCoords, fetchSolarRoofInsights, initialCoordinates, readOnly, selectedLocation, updateAreaFromPoly]);

  // Update map center & polygon when selectedLocation changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation) return;
    if (initialCoordinates && Array.isArray(initialCoordinates) && initialCoordinates.length >= 3) return;

    const lat = typeof selectedLocation.lat === 'function' ? selectedLocation.lat() : selectedLocation.lat;
    const lng = typeof selectedLocation.lng === 'function' ? selectedLocation.lng() : selectedLocation.lng;

    const locKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (lastFetchedLocRef.current === locKey) return;
    lastFetchedLocRef.current = locKey;

    const loc = { lat, lng };
    currentCenterRef.current = loc;
    mapInstanceRef.current.setCenter(loc);
    mapInstanceRef.current.setZoom(20);

    createAutoPolygon(loc);
    fetchSolarRoofInsights(lat, lng);
  }, [selectedLocation, initialCoordinates, createAutoPolygon, fetchSolarRoofInsights]);

  const clearShape = () => {
    if (readOnly) return;
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    setPointsCount(0);
  };

  const recenterMap = () => {
    if (mapInstanceRef.current) {
      if (initialCoordinates && Array.isArray(initialCoordinates) && initialCoordinates.length >= 3 && window.google?.maps?.LatLngBounds) {
        const bounds = new window.google.maps.LatLngBounds();
        initialCoordinates.forEach(pt => bounds.extend(pt));
        mapInstanceRef.current.fitBounds(bounds);
      } else if (currentCenterRef.current) {
        mapInstanceRef.current.setCenter(currentCenterRef.current);
        mapInstanceRef.current.setZoom(20);
      }
    }
  };

  return (
    <div className="map-fullwidth-wrapper">
      <div className="map-control-bar">
        {!readOnly ? (
          <>
            <div className="map-tools">
              <button
                type="button"
                className={`map-tool-btn ${mode === 'auto' ? 'active' : ''}`}
                onClick={() => {
                  if (onModeChange) onModeChange('auto');
                  if (drawingManagerRef.current) drawingManagerRef.current.setDrawingMode(null);
                }}
              >
                ⚡ Auto Roof Detect {solarStatusMsg ? `(${solarStatusMsg})` : ''}
              </button>
              <button
                type="button"
                className={`map-tool-btn ${mode === 'manual' ? 'active' : ''}`}
                onClick={() => {
                  if (onModeChange) onModeChange('manual');
                  if (drawingManagerRef.current && window.google?.maps?.drawing) {
                    drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                  }
                }}
              >
                ✏️ Manual Polygon Outline
              </button>
            </div>
            <div className="map-tools">
              <button type="button" className="map-tool-btn" onClick={recenterMap}>
                🔄 Recenter Map
              </button>
              <button type="button" className="map-tool-btn" onClick={clearShape}>
                🗑️ Clear Shape
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
              📍 Homeowner Submitted Roof Boundary ({pointsCount} Vertices)
            </span>
            <button type="button" className="map-tool-btn" onClick={recenterMap}>
              🔄 Recenter Roof Polygon
            </button>
          </div>
        )}
      </div>

      <div className="map-canvas-container">
        <div ref={mapRef} id="map" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
