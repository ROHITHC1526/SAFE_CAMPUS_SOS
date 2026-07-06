import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveCampusMapProps {
  studentLocation?: { lat: number; lng: number } | null;
  guardLocation?: { lat: number; lng: number } | null;
  studentName?: string;
  guardName?: string;
  safeZones?: Array<{ name: string; latitude: number; longitude: number; radius: number; hasGuard?: boolean }>;
  buildings?: Array<{ name: string; code: string; latitude: number; longitude: number }>;
  height?: string;
}

export default function LiveCampusMap({
  studentLocation,
  guardLocation,
  studentName = 'Student (SOS)',
  guardName = 'Security Responder',
  safeZones = [],
  buildings = [],
  height = '350px',
}: LiveCampusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const guardMarkerRef = useRef<L.Marker | null>(null);
  const pathLineRef = useRef<L.Polyline | null>(null);
  const safeZoneCirclesRef = useRef<L.Circle[]>([]);
  const buildingMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Standard center coordinates around LBRCE campus
    const defaultCenter: L.LatLngExpression = [16.4420, 80.6225];

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Realistic Google Maps Hybrid Layer (Satellite Imagery + Street Names / Boundaries)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
    }).addTo(map);

    // Render static campus buildings
    buildings.forEach(b => {
      const bIcon = L.divIcon({
        className: 'campus-building-label',
        html: `<div style="background: rgba(17,17,40,0.9); border: 1.5px solid #6366f1; padding: 4px 8px; border-radius: 6px; color: #fff; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">${b.code}</div>`,
        iconSize: [40, 20],
      });
      const marker = L.marker([b.latitude, b.longitude], { icon: bIcon }).addTo(map)
        .bindPopup(`<b>Building: ${b.name} (${b.code})</b>`);
      buildingMarkersRef.current.push(marker);
    });

    // Render static campus Safe Zones
    safeZones.forEach(sz => {
      const circle = L.circle([sz.latitude, sz.longitude], {
        radius: sz.radius,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '4, 6',
      }).addTo(map).bindPopup(`<b>🛡️ Safe Zone: ${sz.name}</b><br/>Radius: ${sz.radius}m`);
      safeZoneCirclesRef.current.push(circle);
    });

    return () => {
      safeZoneCirclesRef.current.forEach(c => c.remove());
      buildingMarkersRef.current.forEach(m => m.remove());
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [buildings.length, safeZones.length]);

  // Handle dynamic student/guard positions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Student Location Update with Name Tag
    if (studentLocation && studentLocation.lat && studentLocation.lng) {
      const studentPos: L.LatLngExpression = [studentLocation.lat, studentLocation.lng];
      const studentIcon = L.divIcon({
        className: 'student-pulse-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; height: 60px;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.4); animation: ping 1.5s infinite ease-in-out; top: 0;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #ef4444; border: 2px solid #fff; box-shadow: 0 0 8px #ef4444; z-index: 10; margin-top: 8px;"></div>
            <div style="background: rgba(239, 68, 68, 0.95); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; white-space: nowrap; margin-top: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); border: 1px solid #fff; z-index: 10;">
              🚨 ${studentName}
            </div>
          </div>
          <style>
            @keyframes ping {
              0% { transform: scale(0.5); opacity: 1; }
              100% { transform: scale(2); opacity: 0; }
            }
          </style>
        `,
        iconSize: [120, 60],
        iconAnchor: [60, 14],
      });

      if (!studentMarkerRef.current) {
        studentMarkerRef.current = L.marker(studentPos, { icon: studentIcon }).addTo(map)
          .bindPopup(`<b style="color: #ef4444;">SOS Active: ${studentName}</b>`)
          .openPopup();
      } else {
        studentMarkerRef.current.setLatLng(studentPos);
        studentMarkerRef.current.setIcon(studentIcon);
      }
    } else {
      if (studentMarkerRef.current) {
        studentMarkerRef.current.remove();
        studentMarkerRef.current = null;
      }
    }

    // Guard Location Update with Name Tag
    if (guardLocation && guardLocation.lat && guardLocation.lng) {
      const guardPos: L.LatLngExpression = [guardLocation.lat, guardLocation.lng];
      const guardIcon = L.divIcon({
        className: 'guard-pulse-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; height: 60px;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.4); animation: ping 2s infinite ease-in-out; top: 0;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #10b981; border: 2px solid #fff; box-shadow: 0 0 8px #10b981; z-index: 10; margin-top: 8px;"></div>
            <div style="background: rgba(16, 185, 129, 0.95); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; white-space: nowrap; margin-top: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); border: 1px solid #fff; z-index: 10;">
              👮 ${guardName}
            </div>
          </div>
        `,
        iconSize: [120, 60],
        iconAnchor: [60, 14],
      });

      if (!guardMarkerRef.current) {
        guardMarkerRef.current = L.marker(guardPos, { icon: guardIcon }).addTo(map)
          .bindPopup(`<b style="color: #10b981;">Responder: ${guardName}</b>`);
      } else {
        guardMarkerRef.current.setLatLng(guardPos);
        guardMarkerRef.current.setIcon(guardIcon);
      }
    } else {
      if (guardMarkerRef.current) {
        guardMarkerRef.current.remove();
        guardMarkerRef.current = null;
      }
    }

    // Draw connection line
    if (studentLocation && guardLocation && studentLocation.lat && guardLocation.lat) {
      const lineCoordinates: L.LatLngExpression[] = [
        [studentLocation.lat, studentLocation.lng],
        [guardLocation.lat, guardLocation.lng]
      ];
      if (!pathLineRef.current) {
        pathLineRef.current = L.polyline(lineCoordinates, {
          color: '#10b981',
          weight: 4,
          dashArray: '8, 12',
          opacity: 0.8,
        }).addTo(map);
      } else {
        pathLineRef.current.setLatLngs(lineCoordinates);
      }

      // Auto zoom to cover both
      const bounds = L.latLngBounds([studentLocation.lat, studentLocation.lng], [guardLocation.lat, guardLocation.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      if (pathLineRef.current) {
        pathLineRef.current.remove();
        pathLineRef.current = null;
      }
      // Zoom to student if only student is present
      if (studentLocation && studentLocation.lat && studentLocation.lng) {
        map.setView([studentLocation.lat, studentLocation.lng], 18);
      }
    }
  }, [studentLocation, guardLocation, studentName, guardName]);

  // Haversine Distance helper
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // returns distance in meters
  };

  let distanceStr = '';
  let etaStr = '';

  if (studentLocation && guardLocation && studentLocation.lat && guardLocation.lat) {
    const dist = calculateHaversineDistance(
      studentLocation.lat,
      studentLocation.lng,
      guardLocation.lat,
      guardLocation.lng
    );
    if (dist >= 1000) {
      distanceStr = `${(dist / 1000).toFixed(2)} km`;
    } else {
      distanceStr = `${Math.round(dist)} m`;
    }
    const etaMinutes = Math.ceil(dist / (1.4 * 60)); // walking speed: ~1.4 m/s
    etaStr = `${etaMinutes} min`;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', border: '1px solid #2a2a4a' }} />
      {distanceStr && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(7,7,20,0.92)',
          border: '1.5px solid #6366f1',
          borderRadius: 8,
          padding: '8px 12px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minWidth: '130px',
        }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Live Approach</div>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>Dist: {distanceStr}</div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>Est. Walk ETA: {etaStr}</div>
        </div>
      )}
    </div>
  );
}
