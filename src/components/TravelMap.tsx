'use client';

import { useEffect, useRef, useState } from 'react';

interface Destination {
  id: string;
  user_id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  status: 'visited' | 'wishlist';
  date: string | null;
  notes: string;
  photos: string[];
  created_at: string;
  updated_at: string;
}

interface TravelMapProps {
  className?: string;
  destinations: Destination[];
  onMarkerClick: (destination: Destination) => void;
}

export const TravelMap: React.FC<TravelMapProps> = ({ 
  className = '', 
  destinations, 
  onMarkerClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet only on client side
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        // CSS is loaded via CDN in the head

        // Fix for default markers in Leaflet
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Initialize the map
        if (!mapRef.current) return;
        const map = L.map(mapRef.current, {
          minZoom: 1,
          maxZoom: 18,
          worldCopyJump: false,
          maxBounds: [[-90, -180], [90, 180]],
          maxBoundsViscosity: 1.0
        }).setView([20, 0], 1); // Max zoomed out
        map.fitWorld();

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Create custom icons
        const redCameraIcon = L.divIcon({
          html: `
            <div style="
              background: #ef4444;
              border: 2px solid white;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0"/>
                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
              </svg>
            </div>
          `,
          className: 'custom-div-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const bluePinIcon = L.divIcon({
          html: `
            <div style="
              background: #3b82f6;
              border: 2px solid white;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `,
          className: 'custom-div-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        // Store map instance
        mapInstanceRef.current = map;
        markersRef.current = [];

        // Store the map instance
        mapInstanceRef.current = map;
      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient]);

  // Update markers when destinations change
  useEffect(() => {
    if (!mapInstanceRef.current || !isClient) return;

    const L = require('leaflet');
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Create custom icons
    const redCameraIcon = L.divIcon({
      html: `
        <div style="
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0"/>
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
          </svg>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const bluePinIcon = L.divIcon({
      html: `
        <div style="
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    // Add markers for each destination
    console.log('Adding markers for destinations:', destinations);
    destinations.forEach(dest => {
      console.log('Adding marker for:', dest.name, 'at', dest.lat, dest.lng, 'status:', dest.status);
      const icon = dest.status === 'visited' ? redCameraIcon : bluePinIcon;
      const marker = L.marker([dest.lat, dest.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-lg">${dest.name}</h3>
            <p class="text-gray-600">${dest.country}</p>
            <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full ${
              dest.status === 'visited' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }">
              ${dest.status}
            </span>
          </div>
        `);

      // Add click event to open modal
      marker.on('click', () => {
        onMarkerClick(dest);
      });

      // Add hover highlighting to the marker itself
      marker.on('mouseover', () => {
        const iconElement = marker.getElement();
        if (iconElement) {
          const iconDiv = iconElement.querySelector('div');
          if (iconDiv) {
            iconDiv.style.transform = 'scale(1.2)';
            iconDiv.style.transition = 'transform 0.2s ease';
          }
        }
      });

      marker.on('mouseout', () => {
        const iconElement = marker.getElement();
        if (iconElement) {
          const iconDiv = iconElement.querySelector('div');
          if (iconDiv) {
            iconDiv.style.transform = 'scale(1)';
          }
        }
      });

      markersRef.current.push(marker);
    });

  }, [destinations, onMarkerClick, isClient]);

  if (!isClient) {
    return (
      <div className={`w-full h-full rounded-lg bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full rounded-lg ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}; 