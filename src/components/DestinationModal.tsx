'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Plus, X, MapPin, Search, Calendar, Trash2, AlertCircle, Upload } from 'lucide-react';
import type { Destination, CreateDestinationData, UpdateDestinationData } from '@/lib/destinations';
import { optimizeImage } from '@/lib/utils';

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

// Photo limit constant
const MAX_PHOTOS_PER_LOCATION = 3; // Reduced from 5 to save storage
const MAX_FILE_SIZE_MB = 5; // 5MB max before compression
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const DestinationModal: React.FC<DestinationModalProps> = ({
  destination,
  isOpen,
  isNewDestination,
  onClose,
  onSave,
  onDelete
}) => {
  console.log('🚀 DestinationModal rendered, isOpen:', isOpen, 'isNewDestination:', isNewDestination);

  const [formData, setFormData] = useState<Destination>({
    id: '',
    user_id: '',
    name: '',
    country: '',
    date: '',
    status: 'wishlist',
    notes: '',
    photos: [],
    lat: 0,
    lng: 0,
    created_at: '',
    updated_at: '',
  });

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [showPhotoLimitError, setShowPhotoLimitError] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (isOpen) {
      if (isNewDestination) {
        setFormData({
          id: '',
          user_id: '',
          name: '',
          country: '',
          date: new Date().toISOString().slice(0, 7), // YYYY-MM format
          status: 'wishlist',
          notes: '',
          photos: [],
          lat: 0,
          lng: 0,
          created_at: '',
          updated_at: '',
        });
        setLocationQuery('');
      } else if (destination) {
        // Convert date to YYYY-MM format if it exists
        let formattedDate = '';
        if (destination.date) {
          const date = new Date(destination.date);
          formattedDate = date.toISOString().slice(0, 7);
        } else {
          formattedDate = new Date().toISOString().slice(0, 7);
        }
        
        setFormData({
          ...destination,
          date: formattedDate,
          notes: typeof destination.notes === 'string' 
            ? destination.notes 
            : ''
        });
        setLocationQuery(destination.name || '');
      }
    }
  }, [isOpen, isNewDestination, destination]);

  // Geocoding function using OpenStreetMap Nominatim API
  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    setIsLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      
      const suggestions: LocationSuggestion[] = data.map((item: Record<string, unknown>) => ({
        name: (item.name as string) || ((item.display_name as string)?.split(',')[0] || ''),
        country: ((item.address as Record<string, unknown>)?.country as string) || ((item.display_name as string)?.split(',').pop()?.trim() || ''),
        lat: parseFloat(item.lat as string),
        lng: parseFloat(item.lon as string),
        displayName: item.display_name as string
      }));
      
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching locations:', error);
      setLocationSuggestions([]);
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
    setLocationQuery(suggestion.displayName);
    setShowSuggestions(false);
  };

  const handleInputChange = (field: keyof Destination, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    console.log('🚀 NEW PHOTO UPLOAD CODE V5 - FIXED DIALOG ISSUES 🚀');
    console.log('🚀 TIMESTAMP: ' + new Date().toISOString() + ' 🚀');
    console.log('Photo upload started, files:', files.length);
    console.log('Current photos count:', formData.photos.length);

    // Check file sizes
    const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      setError(`Files must be smaller than ${MAX_FILE_SIZE_MB}MB. Please resize your images.`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Check photo limit
    if (formData.photos.length + files.length > MAX_PHOTOS_PER_LOCATION) {
      setShowPhotoLimitError(true);
      setTimeout(() => setShowPhotoLimitError(false), 3000);
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const newPhotos: string[] = [];
      
      for (const file of Array.from(files)) {
        console.log('Processing file:', file.name, file.size);
        // Compress the image
        const optimizedFile = await optimizeImage(file, 800, 0.6);
        
        // Convert to base64 for storage (v3 - ensure this is deployed)
        const base64String = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(optimizedFile);
        });
        
        console.log('Created base64 photo, length:', base64String.length);
        newPhotos.push(base64String);
      }

      console.log('Setting new photos:', newPhotos.length);
      setFormData(prev => ({ 
        ...prev, 
        photos: [...prev.photos, ...newPhotos] 
      }));
      
      // Reset the file input to allow multiple uploads
      event.target.value = '';
      
      console.log('Photo upload completed successfully');
      
    } catch (error) {
      console.error('Error processing photos:', error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const openPhotoModal = (index: number) => {
    console.log('Opening photo modal for index:', index);
    setSelectedPhotoIndex(index);
  };

  const closePhotoModal = () => {
    console.log('Closing photo modal');
    setSelectedPhotoIndex(null);
  };

  const handlePhotoClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Photo clicked:', index);
    openPhotoModal(index);
  };

  const handleDeleteClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Delete photo clicked:', index);
    removePhoto(index);
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.country || formData.lat === 0 || formData.lng === 0) {
      alert('Please select a location from the search results');
      return;
    }

    // Prepare the data to save (exclude id and user_id for new destinations)
    const saveData = {
      name: formData.name,
      country: formData.country,
      lat: formData.lat,
      lng: formData.lng,
      status: formData.status,
      date: formData.date,
      notes: formData.notes,
      photos: formData.photos
    };

    console.log('Submitting destination data:', saveData);

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
    console.log('File input clicked - preventing dialog close');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        console.log('Dialog onOpenChange called with:', open, 'isUploadingPhoto:', isUploadingPhoto);
        // Only close if explicitly set to false (user clicked outside or pressed escape)
        // Don't close if user is interacting with form elements or uploading photos
        if (!open && !isUploadingPhoto) {
          console.log('Closing dialog');
          onClose();
        } else if (!open && isUploadingPhoto) {
          console.log('Preventing dialog close during photo upload');
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
                  <span>Coordinates: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}</span>
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
                <Label>Photos ({formData.photos.length}/{MAX_PHOTOS_PER_LOCATION})</Label>
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
                {formData.photos.map((photo, index) => (
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
                {formData.photos.length < MAX_PHOTOS_PER_LOCATION && (
                  <div 
                    className="relative aspect-square w-full h-full border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
                    onClick={handleFileInputClick}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="photo-upload"
                      disabled={isUploadingPhoto}
                      onClick={handleFileInputClick}
                    />
                    <div className="text-center pointer-events-none">
                      <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                      <p className="text-sm text-gray-500">
                        {isUploadingPhoto ? 'Uploading...' : `Upload photos (max ${MAX_PHOTOS_PER_LOCATION}, ${MAX_FILE_SIZE_MB}MB each)`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <div className="h-32 overflow-y-auto border border-gray-300 rounded-md bg-white">
                <Textarea
                  id="notes"
                  placeholder="Add your travel notes, memories, tips, and useful information here..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="resize-none border-0 focus:ring-0 focus:border-0 h-full bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t mt-6">
            <div>
              {!isNewDestination && onDelete && (
                <Button 
                  variant="destructive" 
                  size="icon"
                  onClick={handleDelete}
                  className="w-8 h-8"
                  title="Delete Destination"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {isNewDestination ? 'Add Destination' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size Photo Modal (root level, not nested) */}
      {selectedPhotoIndex !== null && (
        <Dialog open={selectedPhotoIndex !== null} onOpenChange={closePhotoModal}>
          <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 flex items-center justify-center bg-black bg-opacity-80">
            <button
              onClick={closePhotoModal}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={formData.photos[selectedPhotoIndex]}
              alt={`Photo ${selectedPhotoIndex + 1}`}
              className="object-contain max-w-full max-h-[95vh] mx-auto"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}; 