'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Calendar, MapPin, Search, Trash2, AlertCircle, X } from 'lucide-react';
import { CreateDestinationData, UpdateDestinationData } from '@/lib/destinations';

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

interface DestinationModalProps {
  destination: Destination | null;
  isOpen: boolean;
  isNewDestination: boolean;
  onClose: () => void;
  onSave: (destination: CreateDestinationData | UpdateDestinationData) => void;
  onDelete?: () => void;
}

interface LocationSuggestion {
  name: string;
  country: string;
  lat: number;
  lng: number;
  displayName: string;
}

const MAX_PHOTOS_PER_LOCATION = 5;

export const DestinationModal: React.FC<DestinationModalProps> = ({
  destination,
  isOpen,
  isNewDestination,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<Partial<Destination>>({
    name: '',
    country: '',
    lat: 0,
    lng: 0,
    status: 'wishlist',
    date: null,
    notes: '',
    photos: [] as string[]
  });

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState('');
  const [showPhotoLimitError, setShowPhotoLimitError] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Reset form when modal opens/closes or destination changes
  useEffect(() => {
    if (isOpen) {
      if (destination) {
        setFormData({
          name: destination.name,
          country: destination.country,
          lat: destination.lat,
          lng: destination.lng,
          status: destination.status,
          date: destination.date,
          notes: destination.notes,
          photos: destination.photos || []
        });
        setLocationQuery(`${destination.name}, ${destination.country}`);
      } else {
        setFormData({
          name: '',
          country: '',
          lat: 0,
          lng: 0,
          status: 'wishlist',
          date: null,
          notes: '',
          photos: []
        });
        setLocationQuery('');
      }
      setError('');
      setShowPhotoLimitError(false);
    }
  }, [isOpen, destination]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.location-search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search locations using OpenStreetMap Nominatim API
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setLocationSuggestions([]);
      return;
    }

    setIsLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();

      const suggestions: LocationSuggestion[] = data.map((item: any) => ({
        name: item.name || item.display_name.split(',')[0],
        country: item.address?.country || 'Unknown',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name
      }));

      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching locations:', error);
      setError('Failed to search locations. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (locationQuery) {
        searchLocations(locationQuery);
      } else {
        setLocationSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [locationQuery]);

  const selectLocation = (suggestion: LocationSuggestion) => {
    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      country: suggestion.country,
      lat: suggestion.lat,
      lng: suggestion.lng
    }));
    setLocationQuery(`${suggestion.name}, ${suggestion.country}`);
    setShowSuggestions(false);
  };

  const handleInputChange = (field: keyof Destination, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    const newPhotos: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError(`File ${file.name} is too large. Maximum size is 5MB.`);
          continue;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          setError(`File ${file.name} is not an image.`);
          continue;
        }

        // Convert to base64
        const base64String = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newPhotos.push(base64String);
      }

      // Check photo limit
      const currentPhotos = formData.photos || [];
      const totalPhotos = currentPhotos.length + newPhotos.length;
      if (totalPhotos > MAX_PHOTOS_PER_LOCATION) {
        setShowPhotoLimitError(true);
        setTimeout(() => setShowPhotoLimitError(false), 3000);
        return;
      }

      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotos]
      }));

      setError('');
    } catch (error) {
      console.error('Error uploading photos:', error);
      setError('Failed to upload photos. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const openPhotoModal = (index: number) => {
    setSelectedPhotoIndex(index);
    setIsPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setIsPhotoModalOpen(false);
    setSelectedPhotoIndex(null);
  };

  const handlePhotoClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    openPhotoModal(index);
  };

  const handleDeleteClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    removePhoto(index);
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name?.trim()) {
      setError('Location name is required');
      return;
    }

    if (!formData.country?.trim()) {
      setError('Country is required');
      return;
    }

    if (formData.lat === 0 && formData.lng === 0) {
      setError('Please select a location from the search results');
      return;
    }

    const saveData: CreateDestinationData | UpdateDestinationData = {
      name: formData.name.trim(),
      country: formData.country.trim(),
      lat: formData.lat,
      lng: formData.lng,
      status: formData.status || 'wishlist',
      date: formData.date,
      notes: formData.notes || '',
      photos: formData.photos || []
    };

    // Call the save callback
    onSave(saveData);
    onClose();
  };

  const handleDelete = () => {
    if (isNewDestination) {
      onClose();
      return;
    }

    if (confirm('Are you sure you want to delete this destination? This action cannot be undone.')) {
      onDelete?.();
      onClose();
    }
  };

  const handleFileInputClick = (event: React.MouseEvent) => {
    // Prevent the click from bubbling up to the dialog
    event.stopPropagation();
  };

  const handleUploadButtonClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Find and click the file input
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Only close if explicitly set to false (user clicked outside or pressed escape)
        // Don't close if user is interacting with form elements or uploading photos
        if (!open && !isUploadingPhoto) {
          onClose();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isNewDestination ? 'Add New Destination' : 'Edit Destination'}
            </DialogTitle>
            <DialogDescription>
              {isNewDestination 
                ? 'Add a new destination to your travel map. Search for a location and add photos and notes.' 
                : 'Edit your destination details, photos, and notes.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 flex-1 overflow-y-auto pr-4">
            {/* Location Search */}
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <div className="relative location-search-container">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="location"
                    placeholder="Search for a city, place, or landmark..."
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="pl-10"
                  />
                </div>
                
                {/* Location Suggestions */}
                {showSuggestions && (locationSuggestions.length > 0 || isLoadingLocation) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {isLoadingLocation ? (
                      <div className="p-3 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-1 text-sm">Searching...</p>
                      </div>
                    ) : (
                      locationSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectLocation(suggestion)}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{suggestion.name}</div>
                          <div className="text-sm text-gray-500">{suggestion.country}</div>
                          <div className="text-xs text-gray-400">{suggestion.displayName}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected Coordinates */}
              {formData.lat !== 0 && formData.lng !== 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>Coordinates: {(formData.lat || 0).toFixed(4)}, {(formData.lng || 0).toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.status === 'wishlist' ? 'default' : 'outline'}
                  onClick={() => handleInputChange('status', 'wishlist')}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Wishlist
                </Button>
                <Button
                  type="button"
                  variant={formData.status === 'visited' ? 'default' : 'outline'}
                  onClick={() => handleInputChange('status', 'visited')}
                  className="flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Visited
                </Button>
              </div>
            </div>

            {/* Date - Only show for visited destinations */}
            {formData.status === 'visited' && (
              <div className="space-y-2">
                <Label htmlFor="date">Dates visited</Label>
                <Input
                  id="date"
                  type="month"
                  value={formData.date || ''}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </div>
            )}

            {/* Photos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Photos ({(formData.photos || []).length}/{MAX_PHOTOS_PER_LOCATION})</Label>
                {showPhotoLimitError && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Maximum {MAX_PHOTOS_PER_LOCATION} photos allowed</span>
                  </div>
                )}
              </div>
              {error && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(formData.photos || []).map((photo, index) => (
                  <div key={index} className="relative group aspect-square overflow-hidden rounded-md bg-gray-100">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(event) => handlePhotoClick(index, event)}
                    />
                    <button
                      onClick={(event) => handleDeleteClick(index, event)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(formData.photos || []).length < MAX_PHOTOS_PER_LOCATION && (
                  <div className="relative aspect-square w-full h-full border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50">
                    <input
                      id="photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      onClick={handleFileInputClick}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleUploadButtonClick}
                      className="flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700"
                    >
                      <Camera className="w-6 h-6" />
                      <span className="text-sm">Add Photo</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this destination..."
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {!isNewDestination && onDelete && (
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              )}
            </div>
            <Button onClick={handleSubmit} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </div>
              ) : (
                isNewDestination ? 'Add Destination' : 'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Modal */}
      {isPhotoModalOpen && selectedPhotoIndex !== null && (
        <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={closePhotoModal}
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </Button>
              <img
                src={(formData.photos || [])[selectedPhotoIndex]}
                alt={`Photo ${selectedPhotoIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}; 