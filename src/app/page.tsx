"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/LoginPage';
import { TravelMap } from '@/components/TravelMap';
import { MapPin, Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DestinationModal } from '@/components/DestinationModal';
import { Destination, DestinationsService, CreateDestinationData, UpdateDestinationData } from '@/lib/destinations';

export default function HomePage() {
  const { user, logout, isLoading } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<'visited' | 'wishlist' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDestination, setModalDestination] = useState<Destination | null>(null);
  const [isNewDestination, setIsNewDestination] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  const loadDestinations = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingDestinations(true);
    try {
      const data = await DestinationsService.getDestinations(user);
      setDestinations(data);
    } catch (error) {
      console.error('Error loading destinations:', error);
      // For demo purposes, you might want to show some sample data
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

  const handleSaveDestination = async (destinationData: CreateDestinationData | UpdateDestinationData) => {
    if (!user) return;

    console.log('Saving destination:', destinationData);

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
      // You might want to show an error message to the user
    }
  };

  const handleDeleteDestination = async (id: string) => {
    if (!user) return;

    try {
      await DestinationsService.deleteDestination(user, id);
      setDestinations(prev => prev.filter(dest => dest.id !== id));
    } catch (error) {
      console.error('Error deleting destination:', error);
      // You might want to show an error message to the user
    }
  };

  const handleMapMarkerClick = (destination: Destination) => {
    setModalDestination(destination);
    setIsNewDestination(false);
    setIsModalOpen(true);
  };

  // Filter destinations based on status
  const filteredDestinations = filteredStatus 
    ? destinations.filter(dest => dest.status === filteredStatus)
    : destinations;

  // Calculate stats
  const totalCount = destinations.length;
  const visitedCount = destinations.filter(dest => dest.status === 'visited').length;
  const wishlistCount = destinations.filter(dest => dest.status === 'wishlist').length;

  // Calculate unique countries and continents
  const countryToContinent: { [key: string]: string } = {
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

  const visitedCountries = new Set(
    destinations
      .filter(dest => dest.status === 'visited' && dest.country)
      .map(dest => dest.country.trim())
  );

  const visitedContinents = new Set(
    Array.from(visitedCountries).map(country => countryToContinent[country] || 'Unknown')
  );

  const uniqueCountries = visitedCountries.size;
  const uniqueContinents = visitedContinents.has('Unknown')
    ? visitedContinents.size - 1
    : visitedContinents.size;

  // Debug logging
  console.log('Destinations updated:', destinations.length);
  console.log('Visited countries:', Array.from(visitedCountries));
  console.log('Visited continents:', Array.from(visitedContinents));
  console.log('Stats:', { totalCount, visitedCount, wishlistCount, uniqueCountries, uniqueContinents });

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
        <div className="flex gap-6 h-[calc(100vh-120px)]">
          {/* Map */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            <TravelMap 
              destinations={filteredDestinations}
              onMarkerClick={handleMapMarkerClick}
            />
          </div>

          {/* Sidebar */}
          <div className="w-96 bg-white rounded-lg shadow p-4 overflow-y-auto">
            {/* Travel Stats Card */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Your travel stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{uniqueCountries}</div>
                  <div className="text-sm text-gray-600">Countries visited</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{uniqueContinents}</div>
                  <div className="text-sm text-gray-600">Continents visited</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
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

            {/* Stats */}
            <div className="flex gap-6 mb-4">
              <button
                onClick={() => setFilteredStatus(null)}
                className={`text-sm font-medium transition-colors ${
                  filteredStatus === null 
                    ? 'text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setFilteredStatus('visited')}
                className={`text-sm font-medium transition-colors ${
                  filteredStatus === 'visited' 
                    ? 'text-red-600' 
                    : 'text-gray-500 hover:text-red-600'
                }`}
              >
                Visited ({visitedCount})
              </button>
              <button
                onClick={() => setFilteredStatus('wishlist')}
                className={`text-sm font-medium transition-colors ${
                  filteredStatus === 'wishlist' 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-blue-600'
                }`}
              >
                Wishlist ({wishlistCount})
              </button>
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

      {/* Modal */}
      <DestinationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalDestination(null);
          setIsNewDestination(false);
        }}
        destination={modalDestination}
        isNewDestination={isNewDestination}
        onSave={handleSaveDestination}
        onDelete={modalDestination ? () => handleDeleteDestination(modalDestination.id) : undefined}
      />
    </div>
  );
}
