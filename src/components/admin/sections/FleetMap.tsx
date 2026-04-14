import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DriverProfile, UserProfile } from '../../../types';

// Custom icons for vehicles
const createVehicleIcon = (type: string, status: string) => {
  const color = status === 'online' ? '#22c55e' : status === 'busy' ? '#eab308' : '#71717a';
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-vehicle-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface FleetMapProps {
  drivers: (DriverProfile & { profile?: UserProfile })[];
  center?: [number, number];
}

const FleetMap: React.FC<FleetMapProps> = ({ drivers, center = [23.2156, 72.6369] }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-[600px] relative">
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {drivers.map((driver) => (
          driver.currentLocation && (
            <Marker 
              key={driver.uid} 
              position={[driver.currentLocation.lat, driver.currentLocation.lng]}
              icon={createVehicleIcon(driver.vehicleId || 'Economy', driver.status)}
            >
              <Popup className="custom-popup">
                <div className="p-2">
                  <div className="font-bold text-zinc-900">{driver.profile?.displayName || 'Unknown Driver'}</div>
                  <div className="text-xs text-zinc-600">Status: {driver.status}</div>
                  <div className="text-xs text-zinc-600">Vehicle: {driver.vehicleId || 'Standard'}</div>
                  <div className="text-xs text-zinc-600">Rating: ⭐ {driver.rating.toFixed(1)}</div>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
      
      <div className="absolute top-4 right-4 z-[1000] bg-zinc-900/90 border border-zinc-800 p-3 rounded-lg backdrop-blur-sm">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Fleet Status</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-white">Online ({drivers.filter(d => d.status === 'online').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-xs text-white">Busy ({drivers.filter(d => d.status === 'busy').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-xs text-white">Offline ({drivers.filter(d => d.status === 'offline').length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetMap;
