"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/LoginPage';
import { TravelMap } from '@/components/TravelMap';
import { DestinationModal } from '@/components/DestinationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Camera, Globe } from 'lucide-react';
import { DestinationsService, type Destination, type CreateDestinationData, type UpdateDestinationData } from '@/lib/destinations';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDestination, setModalDestination] = useState<Destination | null>(null);
  const [isNewDestination, setIsNewDestination] = useState(false);

  // Load destinations when user changes
  useEffect(() => {
    if (!user) {
      setDestinations([]);
      return;
    }

    const loadDestinations = async () => {
      try {
        const data = await DestinationsService.getDestinations(user);
        setDestinations(data);
      } catch (error) {
        console.error('Error loading destinations:', error);
      }
    };

    loadDestinations();
  }, [user]);

  const handleSaveDestination = async (destinationData: CreateDestinationData | UpdateDestinationData) => {
    if (!user) return;

    try {
      if (isNewDestination) {
        const newDestination = await DestinationsService.createDestination(user, destinationData as CreateDestinationData);
        setDestinations(prev => [...prev, newDestination]);
      } else if (modalDestination) {
        const updatedDestination = await DestinationsService.updateDestination(user, modalDestination.id, destinationData as UpdateDestinationData);
        setDestinations(prev => 
          prev.map(dest => dest.id === updatedDestination.id ? updatedDestination : dest)
        );
      }
      setIsModalOpen(false);
      setModalDestination(null);
      setIsNewDestination(false);
    } catch (error) {
      console.error('Error saving destination:', error);
    }
  };

  const handleMarkerClick = (destination: Destination) => {
    setModalDestination(destination);
    setIsNewDestination(false);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setModalDestination(null);
    setIsNewDestination(true);
    setIsModalOpen(true);
  };

  const handleEdit = (destination: Destination) => {
    setModalDestination(destination);
    setIsNewDestination(false);
    setIsModalOpen(true);
  };

  const handleDelete = (destinationId: string) => {
    setDestinations(prev => prev.filter(dest => dest.id !== destinationId));
  };

  // Calculate stats
  const stats = {
    totalDestinations: destinations.length,
    visitedDestinations: destinations.filter(d => d.status === 'visited').length,
    wishlistDestinations: destinations.filter(d => d.status === 'wishlist').length,
    visitedCountries: new Set(destinations.filter(d => d.status === 'visited').map(d => d.country)).size,
    visitedContinents: new Set(destinations.filter(d => d.status === 'visited').map(d => {
      // Simple continent mapping - you might want to use a proper library
      const continentMap: { [key: string]: string } = {
        'United States': 'North America',
        'Canada': 'North America',
        'Mexico': 'North America',
        'Brazil': 'South America',
        'Argentina': 'South America',
        'United Kingdom': 'Europe',
        'France': 'Europe',
        'Germany': 'Europe',
        'Italy': 'Europe',
        'Spain': 'Europe',
        'China': 'Asia',
        'Japan': 'Asia',
        'India': 'Asia',
        'Australia': 'Oceania',
        'South Africa': 'Africa',
        'Egypt': 'Africa',
        'Morocco': 'Africa',
      };
      return continentMap[d.country] || 'Other';
    })).size,
    totalPhotos: destinations.reduce((sum, dest) => sum + (dest.photos?.length || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your travel map...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Travel Map</h1>
            <p className="text-gray-600 text-sm">Welcome back, {user.name}!</p>
          </div>

          {/* Stats */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Travel Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Destinations</span>
                <Badge variant="secondary">{stats.totalDestinations}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Visited</span>
                <Badge variant="destructive">{stats.visitedDestinations}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Wishlist</span>
                <Badge variant="default">{stats.wishlistDestinations}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Countries</span>
                <Badge variant="outline">{stats.visitedCountries}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Continents</span>
                <Badge variant="outline">{stats.visitedContinents}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Photos</span>
                <Badge variant="outline">{stats.totalPhotos}</Badge>
              </div>
            </div>
          </div>

          {/* Destinations List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Destinations</h2>
              <Button onClick={handleAddNew} size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            
            <div className="space-y-3">
              {destinations.map((destination) => (
                <Card key={destination.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{destination.name}</h3>
                        <p className="text-sm text-gray-600">{destination.country}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant={destination.status === 'visited' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {destination.status === 'visited' ? (
                              <>
                                <Camera className="h-3 w-3 mr-1" />
                                Visited
                              </>
                            ) : (
                              <>
                                <MapPin className="h-3 w-3 mr-1" />
                                Wishlist
                              </>
                            )}
                          </Badge>
                          {destination.photos && destination.photos.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {destination.photos.length} photo{destination.photos.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(destination);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {destinations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No destinations yet</p>
                  <p className="text-sm">Add your first destination to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          <TravelMap
            destinations={destinations}
            onMarkerClick={handleMarkerClick}
            className="h-full"
          />
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
      />
    </div>
  );
}
