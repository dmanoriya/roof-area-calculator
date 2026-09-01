'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export default function RoofMapCanvas({
  apiKey,
  selectedLocation,
  initialCoordinates = null,
  readOnly = false,
  isVisible = true,
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
  const cornerMarkersRef = useRef([]);
  const drawingManagerRef = useRef(null);

  // Default center fallback (Raleigh, NC)
  const currentCenterRef = useRef({ lat: 35.7796, lng: -78.6382 });
  const lastFetchedLocRef = useRef('');

  const [pointsCount, setPointsCount] = useState(0);
  const [solarDetected, setSolarDetected] = useState(false);

  const [activeShape, setActiveShape] = useState('auto');

  const clearPolygonAndMarkers = useCallback(() => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    if (cornerMarkersRef.current && cornerMarkersRef.current.length) {
      cornerMarkersRef.current.forEach(m => m.setMap(null));
      cornerMarkersRef.current = [];
    }
  }, []);

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

    clearPolygonAndMarkers();

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
      editable: false,
      draggable: isEditable,
      map: mapInstanceRef.current
    });

    polygonRef.current = poly;
    updateAreaFromPoly(poly);

    if (isEditable) {
      const cornerIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="#ffffff" stroke="#dc2626" stroke-width="3"/>
            <circle cx="10" cy="10" r="3" fill="#dc2626"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(20, 20),
        anchor: new window.google.maps.Point(10, 10)
      };

      const markers = path.map((pt, i) => {
        const marker = new window.google.maps.Marker({
          position: pt,
          map: mapInstanceRef.current,
          draggable: true,
          icon: cornerIcon,
          zIndex: 1000 + i
        });

        window.google.maps.event.addListener(marker, 'drag', () => {
          const newPos = marker.getPosition();
          const polyPath = poly.getPath().getArray();
          polyPath[i] = { lat: newPos.lat(), lng: newPos.lng() };
          poly.setPath(polyPath);
          updateAreaFromPoly(poly);
        });

        window.google.maps.event.addListener(marker, 'dragend', () => {
          updateAreaFromPoly(poly);
        });

        return marker;
      });

      cornerMarkersRef.current = markers;

      window.google.maps.event.addListener(poly, 'drag', () => {
        const currentPath = poly.getPath().getArray();
        cornerMarkersRef.current.forEach((m, idx) => {
          if (currentPath[idx]) {
            m.setPosition(currentPath[idx]);
          }
        });
        updateAreaFromPoly(poly);
      });

      window.google.maps.event.addListener(poly, 'dragend', () => {
        updateAreaFromPoly(poly);
      });
    }

    if (window.google.maps.LatLngBounds && path.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach(pt => bounds.extend(pt));
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [clearPolygonAndMarkers, updateAreaFromPoly]);

  const createAutoPolygon = useCallback((centerLoc, shapeType = 'rectangle') => {
    if (!mapInstanceRef.current || !window.google?.maps?.Polygon) return;

    clearPolygonAndMarkers();

    const lat = typeof centerLoc.lat === 'function' ? centerLoc.lat() : centerLoc.lat;
    const lng = typeof centerLoc.lng === 'function' ? centerLoc.lng() : centerLoc.lng;

    currentCenterRef.current = { lat, lng };

    let coords = [];
    const dy = 0.00018;
    const dx = 0.00022;

    if (shapeType === 'l-shape') {
      coords = [
        { lat: lat + dy, lng: lng - dx },
        { lat: lat + dy, lng: lng },
        { lat: lat, lng: lng },
        { lat: lat, lng: lng + dx },
        { lat: lat - dy, lng: lng + dx },
        { lat: lat - dy, lng: lng - dx }
      ];
    } else if (shapeType === 't-shape') {
      coords = [
        { lat: lat + dy, lng: lng - dx/3 },
        { lat: lat + dy, lng: lng + dx/3 },
        { lat: lat + dy/3, lng: lng + dx/3 },
        { lat: lat + dy/3, lng: lng + dx },
        { lat: lat - dy/3, lng: lng + dx },
        { lat: lat - dy/3, lng: lng + dx/3 },
        { lat: lat - dy, lng: lng + dx/3 },
        { lat: lat - dy, lng: lng - dx/3 },
        { lat: lat - dy/3, lng: lng - dx/3 },
        { lat: lat - dy/3, lng: lng - dx },
        { lat: lat + dy/3, lng: lng - dx },
        { lat: lat + dy/3, lng: lng - dx/3 }
      ];
    } else {
      // Standard rectangle box
      coords = [
        { lat: lat + dy, lng: lng - dx },
        { lat: lat + dy, lng: lng + dx },
        { lat: lat - dy, lng: lng + dx },
        { lat: lat - dy, lng: lng - dx }
      ];
    }

    drawPolygonFromCoords(coords, !readOnly);
  }, [clearPolygonAndMarkers, drawPolygonFromCoords, readOnly]);

  const rotateCurrentPolygon = (degrees) => {
    if (!polygonRef.current || readOnly) return;
    const path = polygonRef.current.getPath().getArray();
    if (!path || path.length < 3) return;

    let sumLat = 0, sumLng = 0;
    path.forEach(pt => {
      sumLat += pt.lat();
      sumLng += pt.lng();
    });
    const cLat = sumLat / path.length;
    const cLng = sumLng / path.length;

    const rad = (degrees * Math.PI) / 180;
    const cosLat = Math.cos((cLat * Math.PI) / 180);

    const newCoords = path.map(pt => {
      const dy = pt.lat() - cLat;
      const dx = (pt.lng() - cLng) * cosLat;

      const rotatedDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const rotatedDy = dx * Math.sin(rad) + dy * Math.cos(rad);

      return {
        lat: cLat + rotatedDy,
        lng: cLng + (rotatedDx / cosLat)
      };
    });

    drawPolygonFromCoords(newCoords, !readOnly);
  };

  const scaleCurrentPolygon = (factor) => {
    if (!polygonRef.current || readOnly) return;
    const path = polygonRef.current.getPath().getArray();
    if (!path || path.length < 3) return;

    let sumLat = 0, sumLng = 0;
    path.forEach(pt => {
      sumLat += pt.lat();
      sumLng += pt.lng();
    });
    const cLat = sumLat / path.length;
    const cLng = sumLng / path.length;

    const newCoords = path.map(pt => {
      const dy = pt.lat() - cLat;
      const dx = pt.lng() - cLng;

      return {
        lat: cLat + dy * factor,
        lng: cLng + dx * factor
      };
    });

    drawPolygonFromCoords(newCoords, !readOnly);
  };

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

        let sqMeters = 0;
        if (data.solarPotential.wholeRoofStats) {
          sqMeters = data.solarPotential.wholeRoofStats.areaMeters2;
          if (sqMeters && sqMeters > 20) {
            const solarSqFt = Math.round(sqMeters * 10.7639);
            const solarSq = Math.max(Math.round(solarSqFt / 100), 5);
            if (onMetricsChange) onMetricsChange(solarSq, solarSqFt);
          }
        }

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
        } else if (sqMeters > 50) {
          // Dynamic scale based on roof area meters
          const sideMeter = Math.sqrt(sqMeters);
          const dy = (sideMeter / 111111) * 0.55;
          const dx = (sideMeter / (111111 * Math.cos((lat * Math.PI) / 180))) * 0.55;
          const solarCoords = [
            { lat: lat + dy, lng: lng - dx },
            { lat: lat + dy, lng: lng + dx },
            { lat: lat - dy, lng: lng + dx },
            { lat: lat - dy, lng: lng - dx }
          ];
          drawPolygonFromCoords(solarCoords, !readOnly);
        }
      } else if (data && data.error) {
        setSolarDetected(false);
        setSolarStatusMsg('Roof Fit');
      }
    } catch (e) {
      setSolarDetected(false);
      setSolarStatusMsg('Roof Fit');
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

        if (initialCoordinates && Array.isArray(initialCoordinates) && initialCoordinates.length >= 3) {
          drawPolygonFromCoords(initialCoordinates, !readOnly);
        } else {
          createAutoPolygon(targetLoc, 'rectangle');
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
            const drawnPath = poly.getPath().getArray();
            poly.setMap(null);
            dm.setDrawingMode(null);
            drawPolygonFromCoords(drawnPath, !readOnly);
          });
        }
      }
    }).catch(err => {
      console.warn('Google Maps Script Error:', err);
    });

    return () => { isMounted = false; };
  }, [apiKey, createAutoPolygon, drawPolygonFromCoords, fetchSolarRoofInsights, initialCoordinates, readOnly, selectedLocation, updateAreaFromPoly]);

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

    createAutoPolygon(loc, 'rectangle');
    fetchSolarRoofInsights(lat, lng);
  }, [selectedLocation, initialCoordinates, createAutoPolygon, fetchSolarRoofInsights]);

  useEffect(() => {
    if (!isVisible || !mapInstanceRef.current || !window.google?.maps) return;

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');

        const targetLoc = selectedLocation || currentCenterRef.current;
        if (targetLoc) {
          const lat = typeof targetLoc.lat === 'function' ? targetLoc.lat() : targetLoc.lat;
          const lng = typeof targetLoc.lng === 'function' ? targetLoc.lng() : targetLoc.lng;
          const loc = { lat, lng };
          mapInstanceRef.current.setCenter(loc);
          mapInstanceRef.current.setZoom(20);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isVisible, selectedLocation]);

  const clearShape = () => {
    if (readOnly) return;
    clearPolygonAndMarkers();
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
                  createAutoPolygon(currentCenterRef.current, 'rectangle');
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
                ✏️ Manual Outline
              </button>
            </div>

            {/* HOUSE SHAPE PRESETS */}
            <div className="map-tools" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>Shape:</span>
              <button
                type="button"
                className="map-tool-btn"
                title="Standard Rectangular / Gable Roof"
                onClick={() => createAutoPolygon(currentCenterRef.current, 'rectangle')}
              >
                🏠 Standard
              </button>
              <button
                type="button"
                className="map-tool-btn"
                title="L-Shape Roof Layout"
                onClick={() => createAutoPolygon(currentCenterRef.current, 'l-shape')}
              >
                🏢 L-Shape
              </button>
              <button
                type="button"
                className="map-tool-btn"
                title="T-Shape Roof Layout"
                onClick={() => createAutoPolygon(currentCenterRef.current, 't-shape')}
              >
                🏛️ T-Shape
              </button>
            </div>

            {/* ROTATION & SCALE TOOLS */}
            <div className="map-tools" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className="map-tool-btn"
                title="Rotate boundary 15° counter-clockwise for angled roofs"
                onClick={() => rotateCurrentPolygon(-15)}
              >
                🔄 Rotate -15°
              </button>
              <button
                type="button"
                className="map-tool-btn"
                title="Rotate boundary 15° clockwise for angled roofs"
                onClick={() => rotateCurrentPolygon(15)}
              >
                🔄 Rotate +15°
              </button>
              <button
                type="button"
                className="map-tool-btn"
                title="Expand boundary size by 15%"
                onClick={() => scaleCurrentPolygon(1.15)}
              >
                ➕ Expand Size
              </button>
              <button
                type="button"
                className="map-tool-btn"
                title="Shrink boundary size by 15%"
                onClick={() => scaleCurrentPolygon(0.85)}
              >
                ➖ Shrink Size
              </button>
              <button type="button" className="map-tool-btn" onClick={recenterMap}>
                🎯 Recenter
              </button>
              <button type="button" className="map-tool-btn" onClick={clearShape}>
                🗑️ Clear
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
