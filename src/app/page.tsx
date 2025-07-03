"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/LoginPage';
import { TravelMap } from '@/components/TravelMap';
import { MapPin, Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DestinationModal } from '@/components/DestinationModal';
import { Destination, DestinationsService, CreateDestinationData, UpdateDestinationData } from '@/lib/destinations';

// Memoized country to continent mapping
const COUNTRY_TO_CONTINENT: { [key: string]: string } = {
  'USA': 'North America',
  'United States': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  'Brazil': 'South America',
  'Argentina': 'South America',
  'UK': 'Europe',
  'United Kingdom': 'Europe',
  'France': 'Europe',
  'Germany': 'Europe',
  'Italy': 'Europe',
  'Spain': 'Europe',
  'Japan': 'Asia',
  'China': 'Asia',
  'India': 'Asia',
  'Thailand': 'Asia',
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  'South Africa': 'Africa',
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'Kenya': 'Africa',
  // Add more as needed
};

export default function HomePage() {
  const { user, logout, isLoading } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<'visited' | 'wishlist' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDestination, setModalDestination] = useState<Destination | null>(null);
  const [isNewDestination, setIsNewDestination] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  const loadDestinations = useCallback(async () => {
    if (!user) {
      console.log('No user found, skipping destination load');
      return;
    }
    
    console.log('Loading destinations for user:', user.id);
    setIsLoadingDestinations(true);
    try {
      const data = await DestinationsService.getDestinations(user);
      console.log('Successfully loaded destinations:', data.length);
      setDestinations(data);
    } catch (error) {
      console.error('Error loading destinations:', error);
      // Set empty array instead of keeping old data to prevent confusion
      setDestinations([]);
    } finally {
      setIsLoadingDestinations(false);
    }
  }, [user]);

  // Load destinations from Supabase
  useEffect(() => {
    if (user) {
      loadDestinations();
    }
  }, [user, loadDestinations]);

  const handleSaveDestination = useCallback(async (destinationData: CreateDestinationData | UpdateDestinationData) => {
    if (!user) {
      console.error('No user found when trying to save destination');
      return;
    }

    console.log('Saving destination:', destinationData);
    console.log('Current user:', user);

    try {
      if (isNewDestination) {
        // Create new destination
        console.log('Creating new destination...');
        const newDestination = await DestinationsService.createDestination(
          user, 
          destinationData as CreateDestinationData
        );
        console.log('New destination created:', newDestination);
        setDestinations(prev => [newDestination, ...prev]);
      } else if (modalDestination) {
        // Update existing destination
        console.log('Updating existing destination:', modalDestination.id);
        const updatedDestination = await DestinationsService.updateDestination(
          user,
          modalDestination.id,
          destinationData as UpdateDestinationData
        );
        console.log('Destination updated:', updatedDestination);
        setDestinations(prev => 
          prev.map(dest => 
            dest.id === modalDestination.id ? updatedDestination : dest
          )
        );
      }
      
      setIsModalOpen(false);
      setModalDestination(null);
      setIsNewDestination(false);
    } catch (error) {
      console.error('Error saving destination:', error);
      // Show error to user
      alert(`Failed to save destination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [user, isNewDestination, modalDestination]);

  const handleDeleteDestination = useCallback(async (id: string) => {
    if (!user) return;

    try {
      await DestinationsService.deleteDestination(user, id);
      setDestinations(prev => prev.filter(dest => dest.id !== id));
    } catch (error) {
      console.error('Error deleting destination:', error);
      // You might want to show an error message to the user
    }
  }, [user]);

  const handleMapMarkerClick = useCallback((destination: Destination) => {
    setModalDestination(destination);
    setIsNewDestination(false);
    setIsModalOpen(true);
  }, []);

  // Memoized filtered destinations
  const filteredDestinations = useMemo(() => 
    filteredStatus 
      ? destinations.filter(dest => dest.status === filteredStatus)
      : destinations,
    [destinations, filteredStatus]
  );

  // Memoized stats calculations
  const stats = useMemo(() => {
    const totalCount = destinations.length;
    const visitedCount = destinations.filter(dest => dest.status === 'visited').length;
    const wishlistCount = destinations.filter(dest => dest.status === 'wishlist').length;

    const visitedCountries = new Set(
      destinations
        .filter(dest => dest.status === 'visited' && dest.country)
        .map(dest => dest.country.trim())
    );

    const visitedContinents = new Set(
      Array.from(visitedCountries).map(country => COUNTRY_TO_CONTINENT[country] || 'Unknown')
    );

    const uniqueCountries = visitedCountries.size;
    const uniqueContinents = visitedContinents.has('Unknown')
      ? visitedContinents.size - 1
      : visitedContinents.size;

    return {
      totalCount,
      visitedCount,
      wishlistCount,
      uniqueCountries,
      uniqueContinents,
      visitedCountries: Array.from(visitedCountries),
      visitedContinents: Array.from(visitedContinents)
    };
  }, [destinations]);

  // Debug logging
  console.log('Destinations updated:', destinations.length);
  console.log('Visited countries:', stats.visitedCountries);
  console.log('Visited continents:', stats.visitedContinents);
  console.log('Stats:', stats);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Travel Map - A simple and easy map-based travel tool
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.name}
              </span>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalCount}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.visitedCount}</div>
              <div className="text-sm text-gray-600">Visited</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.wishlistCount}</div>
              <div className="text-sm text-gray-600">Wishlist</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.uniqueCountries}</div>
              <div className="text-sm text-gray-600">Countries</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-600">{stats.uniqueContinents}</div>
              <div className="text-sm text-gray-600">Continents</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex gap-2">
            <Button
              variant={filteredStatus === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilteredStatus(null)}
            >
              All ({stats.totalCount})
            </Button>
            <Button
              variant={filteredStatus === 'visited' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilteredStatus('visited')}
            >
              Visited ({stats.visitedCount})
            </Button>
            <Button
              variant={filteredStatus === 'wishlist' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilteredStatus('wishlist')}
            >
              Wishlist ({stats.wishlistCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <TravelMap 
          destinations={filteredDestinations}
          onMarkerClick={handleMapMarkerClick}
        />
        
        {/* Add Destination Button */}
        <Button
          onClick={() => {
            setModalDestination(null);
            setIsNewDestination(true);
            setIsModalOpen(true);
          }}
          className="absolute bottom-6 right-6 z-10 shadow-lg"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Destination
        </Button>
      </div>

      {/* Destination Modal */}
      <DestinationModal
        destination={modalDestination}
        isOpen={isModalOpen}
        isNewDestination={isNewDestination}
        onClose={() => {
          setIsModalOpen(false);
          setModalDestination(null);
          setIsNewDestination(false);
        }}
        onSave={handleSaveDestination}
        onDelete={modalDestination ? () => handleDeleteDestination(modalDestination.id) : undefined}
      />
    </div>
  );
}
