import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// React-leaflet marker icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OfflineMapProps {
  lat: number;
  lng: number;
}

const OfflineMap: React.FC<OfflineMapProps> = ({ lat, lng }) => {
  return (
    <div className="h-[200px] w-[280px] sm:w-[350px] rounded-md overflow-hidden border border-red-500/50 mt-2 shadow-[0_0_10px_rgba(220,38,38,0.2)]">
      <MapContainer 
        center={[lat, lng]} 
        zoom={14} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* YAHI JADOO HAI: Sirf local downloaded tiles use hongi */}
        <TileLayer
          attribution='DisasterNet Offline Node'
          url="/tiles/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          <Popup>
            <div className="font-mono text-red-600 font-bold text-xs">DISTRESS SIGNAL ORIGIN</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default OfflineMap;