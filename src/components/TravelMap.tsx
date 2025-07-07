'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

// Google Maps API key - you'll need to add this to your environment variables
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export const TravelMap: React.FC<TravelMapProps> = ({ 
  className = '', 
  destinations, 
  onMarkerClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => {
      setError('Failed to load Google Maps');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'cooperative'
      });

      mapInstanceRef.current = map;
      setIsLoading(false);
    } catch (err) {
      setError('Failed to initialize map');
      setIsLoading(false);
    }
  }, []);

  // Update markers when destinations change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // Create new markers
    destinations.forEach(dest => {
      const marker = new google.maps.Marker({
        position: { lat: dest.lat, lng: dest.lng },
        map: mapInstanceRef.current,
        title: dest.name,
        icon: {
          url: dest.status === 'visited' 
            ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="13" fill="#ef4444" stroke="white" stroke-width="2"/>
                <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0" fill="white"/>
                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="white"/>
              </svg>
            `)
            : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="13" fill="#3b82f6" stroke="white" stroke-width="2"/>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
              </svg>
            `),
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15)
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
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
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        onMarkerClick(dest);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all destinations
    if (destinations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      destinations.forEach(dest => {
        bounds.extend({ lat: dest.lat, lng: dest.lng });
      });
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [destinations, onMarkerClick]);

  if (error) {
    return (
      <div className={`w-full h-full rounded-lg bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-sm text-gray-600">Please check your Google Maps API key configuration</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
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
      style={{ height: '100%', minHeight: '600px' }}
    />
  );
}; 