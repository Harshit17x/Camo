import React, { useEffect, useMemo, useState, useRef, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, Target, Plus, Minus } from 'lucide-react';

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ id: string; lat: number; lng: number; type: 'pickup' | 'dropoff' | 'driver' | 'user'; title?: string }>;
  path?: Array<{ lat: number; lng: number }>;
  driverPath?: Array<{ lat: number; lng: number }>;
  onMarkerClick?: (marker: any) => void;
}

// Custom SVG Markers for a professional look
const createCustomIcon = (type: string, color: string) => {
  let svg = '';
  if (type === 'driver') {
    svg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.2"/>
      <circle cx="20" cy="20" r="12" fill="${color}"/>
      <path d="M20 14L23 23H17L20 14Z" fill="white"/>
    </svg>`;
  } else if (type === 'pickup') {
    svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="${color}"/>
    </svg>`;
  } else if (type === 'dropoff') {
    svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="20" height="20" rx="4" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
      <rect x="12" y="12" width="8" height="8" rx="1" fill="${color}"/>
    </svg>`;
  } else {
    svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="${color}"/>
    </svg>`;
  }

  return L.divIcon({
    className: 'custom-map-marker',
    html: svg,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

function ChangeView({ center, zoom, isAutoCenter, setIsAutoCenter, path }: { 
  center: [number, number], 
  zoom: number, 
  isAutoCenter: boolean, 
  setIsAutoCenter: (v: boolean) => void,
  path?: Array<{lat: number; lng: number}>
}) {
  const map = useMap();
  const lastZoomRef = useRef(zoom);

  // Validate center coordinates
  const isValidCenter = center && typeof center[0] === 'number' && typeof center[1] === 'number' && !isNaN(center[0]) && !isNaN(center[1]);

  useMapEvents({
    dragstart: () => setIsAutoCenter(false),
    zoomstart: () => setIsAutoCenter(false),
    mousedown: () => setIsAutoCenter(false),
  });

  useEffect(() => {
    if (isAutoCenter && isValidCenter) {
      if (path && path.length > 1) {
        const validPathPoints = path.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng));
        if (validPathPoints.length > 1) {
          const bounds = L.latLngBounds(validPathPoints.map(p => [p.lat, p.lng]));
          map.flyToBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5, easeLinearity: 0.25 });
          return;
        }
      }
      
      const currentZoom = map.getZoom();
      const targetZoom = lastZoomRef.current !== zoom ? zoom : currentZoom;
      map.flyTo(center, targetZoom, { animate: true, duration: 1.5, easeLinearity: 0.25 });
      lastZoomRef.current = zoom;
    }
  }, [center, zoom, map, isAutoCenter, path, isValidCenter]);

  return null;
}

function MapControls({ isAutoCenter, setIsAutoCenter }: { isAutoCenter: boolean, setIsAutoCenter: (v: boolean) => void }) {
  const map = useMap();

  return (
    <div className="absolute right-4 top-[120px] z-[1000] flex flex-col gap-3 pointer-events-auto">
      <button 
        onClick={() => setIsAutoCenter(true)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-white/10 ${
          isAutoCenter 
            ? 'bg-emerald-500 text-black' 
            : 'bg-[#151515]/90 text-zinc-300'
        }`}
        title="Recenter Map"
      >
        <Target size={20} />
      </button>
      <div className="flex flex-col bg-[#151515]/90 border border-white/10 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden">
        <button 
          className="w-12 h-12 flex items-center justify-center text-zinc-300 hover:bg-white/10 transition-all active:scale-90 border-b border-white/5"
          onClick={() => { setIsAutoCenter(false); map.zoomIn(); }}
        >
          <Plus size={20} />
        </button>
        <button 
          className="w-12 h-12 flex items-center justify-center text-zinc-300 hover:bg-white/10 transition-all active:scale-90"
          onClick={() => { setIsAutoCenter(false); map.zoomOut(); }}
        >
          <Minus size={20} />
        </button>
      </div>
    </div>
  );
}

function Map({ center, zoom = 15, markers = [], path = [], driverPath = [], onMarkerClick }: MapProps) {
  const [isAutoCenter, setIsAutoCenter] = useState(true);
  const polylinePositions = useMemo(() => 
    path
      .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng))
      .map(p => [p.lat, p.lng] as [number, number]), 
    [path]
  );

  const driverPolylinePositions = useMemo(() => 
    driverPath
      .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng))
      .map(p => [p.lat, p.lng] as [number, number]), 
    [driverPath]
  );

  if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number' || isNaN(center.lat) || isNaN(center.lng)) {
    return (
      <div className="h-full w-full bg-[#fcfcfc] flex items-center justify-center">
        <div className="text-zinc-500 flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest">Initializing Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden relative group">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <ChangeView 
          center={[center.lat, center.lng]} 
          zoom={zoom} 
          isAutoCenter={isAutoCenter}
          setIsAutoCenter={setIsAutoCenter}
          path={path}
        />
        <MapControls isAutoCenter={isAutoCenter} setIsAutoCenter={setIsAutoCenter} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {markers.map((marker) => {
          if (!marker || typeof marker.lat !== 'number' || typeof marker.lng !== 'number' || isNaN(marker.lat) || isNaN(marker.lng)) return null;
          
          let color = '#3b82f6'; // Default blue
          if (marker.type === 'pickup') color = '#10b981'; // Emerald
          else if (marker.type === 'dropoff') color = '#ef4444'; // Red
          else if (marker.type === 'driver') color = '#f59e0b'; // Amber
          else if (marker.type === 'user') color = '#8b5cf6'; // Violet

          return (
            <Marker 
              key={marker.id} 
              position={[marker.lat, marker.lng]}
              icon={createCustomIcon(marker.type, color)}
              eventHandlers={{
                click: () => onMarkerClick?.(marker)
              }}
            >
              {marker.title && (
                <Popup className="premium-popup">
                  <div className="px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">{marker.type}</p>
                    <p className="text-sm font-bold text-white">{marker.title}</p>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}

        {polylinePositions.length > 1 && (
          <Polyline 
            positions={polylinePositions} 
            color="#22c55e" 
            weight={4} 
            opacity={0.85}
          />
        )}

        {driverPolylinePositions.length > 1 && (
          <Polyline 
            positions={driverPolylinePositions} 
            color="#3b82f6" 
            weight={4} 
            opacity={0.85}
            dashArray="10, 10"
          />
        )}
      </MapContainer>

      <style>{`
        .premium-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          color: white;
          padding: 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .premium-popup .leaflet-popup-tip {
          background: rgba(15, 15, 15, 0.85);
        }
        .animate-dash {
          stroke-dasharray: 10, 20;
          animation: dash 30s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .custom-map-marker {
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .custom-map-marker:hover {
          transform: scale(1.15);
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  );
}

// React.memo: prevents Leaflet re-renders on unrelated parent state changes
export default memo(Map, (prev, next) =>
  prev.center.lat === next.center.lat &&
  prev.center.lng === next.center.lng &&
  prev.zoom === next.zoom &&
  prev.markers === next.markers &&
  prev.path === next.path
);
