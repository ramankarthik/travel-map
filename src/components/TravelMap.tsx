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

// Debug: Log API key info (without exposing the full key)
console.log('TravelMap: Environment check - API key exists:', !!GOOGLE_MAPS_API_KEY);
console.log('TravelMap: Environment check - API key starts with:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');

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
    console.log('TravelMap: Starting Google Maps initialization');
    console.log('TravelMap: API Key exists:', !!GOOGLE_MAPS_API_KEY);
    console.log('TravelMap: API Key length:', GOOGLE_MAPS_API_KEY.length);
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.log('TravelMap: No API key found');
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('TravelMap: Google Maps already loaded, initializing map');
      initializeMap();
      return;
    }

    console.log('TravelMap: Loading Google Maps API script');
    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('TravelMap: Google Maps script loaded successfully');
      initializeMap();
    };
    script.onerror = (error) => {
      console.error('TravelMap: Failed to load Google Maps script:', error);
      setError('Failed to load Google Maps');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initializeMap = useCallback(() => {
    console.log('TravelMap: initializeMap called');
    console.log('TravelMap: mapRef.current exists:', !!mapRef.current);
    console.log('TravelMap: window.google exists:', !!window.google);
    console.log('TravelMap: window.google.maps exists:', !!(window.google && window.google.maps));
    
    if (!mapRef.current) {
      console.log('TravelMap: mapRef.current is null');
      return;
    }
    
    if (!window.google) {
      console.log('TravelMap: window.google is not available');
      return;
    }

    try {
      console.log('TravelMap: Creating Google Maps instance');
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

      console.log('TravelMap: Map created successfully');
      mapInstanceRef.current = map;
      setIsLoading(false);
    } catch (err) {
      console.error('TravelMap: Error creating map:', err);
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

  // Check if map container is properly rendered
  useEffect(() => {
    if (mapRef.current) {
      console.log('TravelMap: Map container rendered');
      console.log('TravelMap: Container dimensions:', {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        clientWidth: mapRef.current.clientWidth,
        clientHeight: mapRef.current.clientHeight
      });
      console.log('TravelMap: Container styles:', window.getComputedStyle(mapRef.current));
    }
  }, []);

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
      style={{ 
        height: '100%', 
        minHeight: '600px',
        border: '2px solid red', // Temporary border for debugging
        backgroundColor: '#f0f0f0', // Temporary background for debugging
        position: 'relative' // Added for debugging
      }}
    >
      {/* Temporary debugging text */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(255,255,255,0.9)',
        padding: '5px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        Map Container - Loading: {isLoading.toString()}, Error: {error || 'none'}
      </div>
    </div>
  );
}; 