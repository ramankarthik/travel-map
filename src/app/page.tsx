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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6" style={{ height: 'calc(100vh - 120px)' }}>
          {/* Map */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden relative">
            <div className="absolute inset-0">
              <TravelMap 
                destinations={filteredDestinations}
                onMarkerClick={handleMapMarkerClick}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-96 bg-white rounded-lg shadow p-4 overflow-y-auto">
            {/* Travel Stats Card */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Your travel stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.uniqueCountries}</div>
                  <div className="text-sm text-gray-600">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats.uniqueContinents}</div>
                  <div className="text-sm text-gray-600">Continents</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Destinations</h3>
              </div>
              <button 
                onClick={() => {
                  setIsNewDestination(true);
                  setModalDestination(null);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add New
              </button>
            </div>

            {/* Filter Buttons (moved here) */}
            <div className="flex gap-2 mb-4">
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

            {/* Destinations List */}
            <div className="space-y-4">
              {isLoadingDestinations ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading destinations...</p>
                </div>
              ) : filteredDestinations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {filteredStatus 
                      ? `No ${filteredStatus} destinations yet` 
                      : 'No destinations yet'
                    }
                  </p>
                  {!filteredStatus && (
                    <button
                      onClick={() => {
                        setIsNewDestination(true);
                        setModalDestination(null);
                        setIsModalOpen(true);
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Add your first destination
                    </button>
                  )}
                </div>
              ) : (
                filteredDestinations.map((destination) => (
                  <div
                    key={destination.id}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setModalDestination(destination);
                      setIsNewDestination(false);
                      setIsModalOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {destination.name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          {destination.status === 'visited' && destination.date && (
                            <span>{destination.date}</span>
                          )}
                          {destination.photos && destination.photos.length > 0 && (
                            <span>• {destination.photos.length} photo{destination.photos.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          destination.status === 'visited' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {destination.status === 'visited' ? 'Visited' : 'Wishlist'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
