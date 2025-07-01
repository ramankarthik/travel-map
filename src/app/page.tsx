"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Plus, Upload, Camera, Map, ImageIcon, Trash2, LogOut, User } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { LoginPage } from "@/components/LoginPage"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import "leaflet/dist/leaflet.css"
import { optimizeImage } from "../lib/utils"

interface Photo {
  id: string
  url: string
  caption: string
  uploadedAt: Date
}

interface Location {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  photos: Photo[]
  notes: string // Add notes field
  visitedAt?: Date // Make this optional since future locations won't have a visit date
  type: "visited" | "wishlist" // Add type field
}

export default function Component() {
  const { user, logout, isLoading } = useAuth()
  const [locations, setLocations] = useState<Location[]>([
    {
      id: "1",
      name: "Eiffel Tower, Paris",
      description: "Iconic iron lattice tower and symbol of Paris",
      latitude: 48.8584,
      longitude: 2.2945,
      photos: [],
      notes: "",
      visitedAt: new Date("2024-06-15"),
      type: "visited",
    },
    {
      id: "2",
      name: "Times Square, New York",
      description: "Bustling commercial intersection and entertainment center",
      latitude: 40.758,
      longitude: -73.9855,
      photos: [],
      notes: "",
      visitedAt: new Date("2024-05-20"),
      type: "visited",
    },
    {
      id: "3",
      name: "Tokyo Tower, Japan",
      description: "Communications and observation tower in Tokyo",
      latitude: 35.6586,
      longitude: 139.7454,
      photos: [],
      notes: "",
      visitedAt: new Date("2024-04-10"),
      type: "visited",
    },
    {
      id: "4",
      name: "Santorini, Greece",
      description: "Beautiful Greek island with stunning sunsets",
      latitude: 36.3932,
      longitude: 25.4615,
      photos: [],
      notes: "",
      type: "wishlist",
    },
    {
      id: "5",
      name: "Machu Picchu, Peru",
      description: "Ancient Incan citadel high in the Andes Mountains",
      latitude: -13.1631,
      longitude: -72.545,
      photos: [],
      notes: "",
      type: "wishlist",
    },
    {
      id: "6",
      name: "Great Wall of China",
      description: "Ancient fortification stretching across northern China",
      latitude: 40.4319,
      longitude: 116.5704,
      photos: [],
      notes: "",
      type: "wishlist",
    },
    {
      id: "7",
      name: "Taj Mahal, India",
      description: "Iconic white marble mausoleum in Agra",
      latitude: 27.1751,
      longitude: 78.0421,
      photos: [],
      notes: "",
      type: "wishlist",
    },
    {
      id: "8",
      name: "Colosseum, Rome",
      description: "Ancient amphitheater and symbol of Imperial Rome",
      latitude: 41.8902,
      longitude: 12.4922,
      photos: [],
      notes: "",
      type: "wishlist",
    },
    {
      id: "9",
      name: "Petra, Jordan",
      description: "Ancient Nabatean city carved into red sandstone cliffs",
      latitude: 30.3285,
      longitude: 35.4444,
      photos: [],
      notes: "",
      type: "wishlist",
    },
    {
      id: "10",
      name: "Angkor Wat, Cambodia",
      description: "Largest religious monument in the world",
      latitude: 13.4125,
      longitude: 103.8670,
      photos: [],
      notes: "",
      type: "wishlist",
    },
  ])

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: "",
    description: "",
    latitude: "",
    longitude: "",
  })
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 })
  const [mapZoom, setMapZoom] = useState(2)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodingError, setGeocodingError] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "visited" | "wishlist">("all")
  const [addLocationType, setAddLocationType] = useState<"visited" | "wishlist">("visited")
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null)

  const geocodeLocation = async (query: string) => {
    setIsGeocoding(true)
    setGeocodingError("")

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        setNewLocation((prev) => ({
          ...prev,
          latitude: result.lat,
          longitude: result.lon,
          name: prev.name || result.display_name.split(",")[0], // Use first part of display name if name is empty
        }))
        setGeocodingError("")
      } else {
        setGeocodingError("Location not found. Please try a different search term.")
      }
    } catch (error) {
      setGeocodingError("Error searching for location. Please try again.")
    } finally {
      setIsGeocoding(false)
    }
  }

  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const leafletRef = useRef<any>(null)

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    const initMap = async () => {
      const L = (await import("leaflet")).default
      leafletRef.current = L

      // Fix for default markers in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      if (!mapRef.current) {
        // Initialize map
        mapRef.current = L.map("map").setView([mapCenter.lat, mapCenter.lng], mapZoom)

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(mapRef.current)
      }

      // Clear existing markers
      markersRef.current.forEach((marker) => mapRef.current.removeLayer(marker))
      markersRef.current = []

      // Filter locations based on active tab
      const filteredLocations = locations.filter((location) => 
        activeTab === "all" || location.type === activeTab
      )

      // Add markers for filtered locations only
      filteredLocations.forEach((location) => {
        let markerIcon

        if (location.type === "visited") {
          // Camera icon for visited places
          markerIcon = L.divIcon({
            html: `
              <div style="position: relative; width: 28px; height: 28px;">
                <div style="
                  width: 28px; 
                  height: 28px; 
                  background: #DC2626; 
                  border-radius: 6px; 
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 7C14.76 7 17 9.24 17 12S14.76 17 12 17S7 14.76 7 12S9.24 7 12 7ZM12 9C10.34 9 9 10.34 9 12S10.34 15 12 15S15 13.66 15 12S13.66 9 12 9Z"/>
                  </svg>
                </div>
              </div>
            `,
            className: "custom-camera-icon",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
          })
        } else {
          // Blue map pin for wishlist places
          markerIcon = L.divIcon({
            html: `
              <div style="position: relative; width: 25px; height: 41px;">
                <svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 21.875 12.5 41 12.5 41S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="#2563EB"/>
                  <path d="M12.5 2C6.701 2 2 6.701 2 12.5C2 19.5 12.5 37 12.5 37S23 19.5 23 12.5C23 6.701 18.299 2 12.5 2Z" fill="#3B82F6"/>
                  <circle cx="12.5" cy="12.5" r="6" fill="white"/>
                  <circle cx="12.5" cy="12.5" r="3" fill="#2563EB"/>
                </svg>
              </div>
            `,
            className: "custom-pin-icon",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          })
        }

        const marker = L.marker([location.latitude, location.longitude], { icon: markerIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-semibold">${location.name}</h3>
              <p class="text-sm text-gray-600">${location.description}</p>
              ${
                location.visitedAt
                  ? `<p class="text-xs text-gray-500">Visited: ${location.visitedAt.toLocaleDateString()}</p>`
                  : `<p class="text-xs text-blue-600">Wishlist destination</p>`
              }
              <p class="text-xs text-blue-600">${location.photos.length} photos</p>
            </div>
          `)
          .on("click", () => {
            setSelectedLocation(location)
          })

        // Store locationId with marker for hover functionality
        ;(marker as any).locationId = location.id
        markersRef.current.push(marker)
      })
    }

    initMap()
  }, [locations, mapCenter, mapZoom, activeTab])

  // Update map view when center or zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([mapCenter.lat, mapCenter.lng], mapZoom)
    }
  }, [mapCenter, mapZoom])

  const handleAddLocation = (type: "visited" | "wishlist" = "visited") => {
    if (newLocation.name && newLocation.latitude && newLocation.longitude) {
      const location: Location = {
        id: Date.now().toString(),
        name: newLocation.name,
        description: newLocation.description,
        latitude: Number.parseFloat(newLocation.latitude),
        longitude: Number.parseFloat(newLocation.longitude),
        photos: [],
        notes: "",
        ...(type === "visited" ? { visitedAt: new Date() } : {}),
        type: type,
      }
      setLocations([...locations, location])
      setNewLocation({ name: "", description: "", latitude: "", longitude: "" })
      setGeocodingError("")
      setIsAddingLocation(false)
    }
  }

  const handlePhotoUpload = async (locationId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    console.log("Photo upload triggered for location:", locationId)
    console.log("Files selected:", files?.length || 0)
    
    if (files && files.length > 0) {
      setUploadingPhotos(true)
      let processedCount = 0
      
      for (const file of Array.from(files)) {
        try {
          // Optimize the image before processing
          const optimizedFile = await optimizeImage(file, 1920, 0.8)
          console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Optimized size: ${(optimizedFile.size / 1024 / 1024).toFixed(2)}MB`)
          
          const reader = new FileReader()
          reader.onload = (e) => {
            console.log("File read successfully:", file.name)
            const photo: Photo = {
              id: Date.now().toString() + Math.random(),
              url: e.target?.result as string,
              caption: file.name,
              uploadedAt: new Date(),
            }
            console.log("Created photo object:", { id: photo.id, caption: photo.caption, urlLength: photo.url.length })
            
            // Test if the image loads
            const testImg = new window.Image()
            testImg.onload = () => {
              console.log("Image loads successfully:", file.name, "Dimensions:", testImg.width, "x", testImg.height)
              setLocations((prev) => {
                const updated = prev.map((loc) => (loc.id === locationId ? { ...loc, photos: [...loc.photos, photo] } : loc))
                console.log("Updated locations:", updated.find(l => l.id === locationId)?.photos.length)
                
                // Update selectedLocation if it's the current location
                if (selectedLocation?.id === locationId) {
                  const updatedLocation = updated.find(l => l.id === locationId)
                  if (updatedLocation) {
                    setSelectedLocation(updatedLocation)
                  }
                }
                
                return updated
              })
              
              processedCount++
              if (processedCount === files.length) {
                setUploadingPhotos(false)
                // Reset the file input
                if (event.target) {
                  event.target.value = ""
                }
                console.log("Photo upload completed successfully!")
              }
            }
            testImg.onerror = () => {
              console.error("Image failed to load after optimization:", file.name)
            }
            testImg.src = e.target?.result as string
          }
          reader.readAsDataURL(optimizedFile)
        } catch (error) {
          console.error("Error optimizing image:", error)
          alert(`Failed to process ${file.name}`)
        } finally {
          processedCount++
          if (processedCount === files.length) {
            setUploadingPhotos(false)
            if (event.target) {
              event.target.value = ""
            }
          }
        }
      }
    }
  }

  const handleDeleteLocation = (locationId: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId))
    if (selectedLocation?.id === locationId) {
      setSelectedLocation(null)
    }
  }

  const handleDeletePhoto = (locationId: string, photoId: string) => {
    setLocations((prev) => {
      const updated = prev.map((loc) =>
        loc.id === locationId ? { ...loc, photos: loc.photos.filter((photo) => photo.id !== photoId) } : loc,
      )
      
      // Update selectedLocation if it's the current location
      if (selectedLocation?.id === locationId) {
        const updatedLocation = updated.find(l => l.id === locationId)
        if (updatedLocation) {
          setSelectedLocation(updatedLocation)
        }
      }
      
      return updated
    })
  }

  const focusLocation = (location: Location) => {
    setMapCenter({ lat: location.latitude, lng: location.longitude })
    setMapZoom(12)
    setSelectedLocation(location)
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Travel Map</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>Welcome, {user.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
          <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="z-[9999]">
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="search">Search for Location</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      placeholder="e.g., Paris, Tokyo, New York City"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const query = e.currentTarget.value
                          if (query.trim()) {
                            geocodeLocation(query.trim())
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isGeocoding}
                      onClick={() => {
                        const searchInput = document.getElementById("search") as HTMLInputElement
                        const query = searchInput?.value?.trim()
                        if (query) {
                          geocodeLocation(query)
                        }
                      }}
                    >
                      {isGeocoding ? "Searching..." : "Find"}
                    </Button>
                  </div>
                  {geocodingError && <p className="text-sm text-red-600">{geocodingError}</p>}
                </div>

                <div className="grid gap-2">
                  <Label>Location Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={addLocationType === "visited" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAddLocationType("visited")}
                      className="flex-1"
                    >
                      📷 Visited
                    </Button>
                    <Button
                      type="button"
                      variant={addLocationType === "wishlist" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAddLocationType("wishlist")}
                      className="flex-1"
                    >
                      📍 Wishlist
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">Location Name</Label>
                  <Input
                    id="name"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Golden Gate Bridge"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newLocation.description}
                    onChange={(e) => setNewLocation((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your visit..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={newLocation.latitude}
                      onChange={(e) => setNewLocation((prev) => ({ ...prev, latitude: e.target.value }))}
                      placeholder="37.8199"
                      className="bg-muted"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={newLocation.longitude}
                      onChange={(e) => setNewLocation((prev) => ({ ...prev, longitude: e.target.value }))}
                      placeholder="-122.4783"
                      className="bg-muted"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Search for a city above to automatically fill in coordinates, or enter them manually.
                </p>
                <Button
                  onClick={() => handleAddLocation(addLocationType)}
                  className="w-full"
                  disabled={!newLocation.name || !newLocation.latitude || !newLocation.longitude}
                >
                  Add {addLocationType === "visited" ? "Visited" : "Wishlist"} Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative bg-slate-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <div id="map" className="w-full h-full" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-background flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-3">Travel Locations</h2>
            
            {/* Statistics */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Travel Stats</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded border">
                  <div className="text-lg font-bold text-blue-600">
                    {locations.filter(loc => loc.type === "visited").length}
                  </div>
                  <div className="text-xs text-gray-600">Cities Visited</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-lg font-bold text-green-600">
                    {new Set(locations
                      .filter(loc => loc.type === "visited")
                      .map(loc => {
                        const parts = loc.name.split(', ')
                        return parts.length > 1 ? parts[parts.length - 1] : 'Unknown'
                      })).size}
                  </div>
                  <div className="text-xs text-gray-600">Countries Visited</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-lg font-bold text-purple-600">
                    {(() => {
                      const visitedCountries = locations
                        .filter(loc => loc.type === "visited")
                        .map(loc => {
                          const parts = loc.name.split(', ')
                          return parts.length > 1 ? parts[parts.length - 1] : 'Unknown'
                        })
                      
                      // Simple continent mapping
                      const continentMap: { [key: string]: string } = {
                        'France': 'Europe',
                        'United States': 'North America',
                        'Japan': 'Asia',
                        'Greece': 'Europe',
                        'Peru': 'South America',
                        'China': 'Asia',
                        'India': 'Asia',
                        'Italy': 'Europe',
                        'Jordan': 'Asia',
                        'Cambodia': 'Asia',
                      }
                      
                      const continents = visitedCountries.map(country => 
                        continentMap[country] || 'Unknown'
                      )
                      
                      return new Set(continents).size
                    })()}
                  </div>
                  <div className="text-xs text-gray-600">Continents Visited</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1 mb-3">
              <Button
                size="sm"
                variant={activeTab === "all" ? "default" : "ghost"}
                onClick={() => setActiveTab("all")}
                className="flex-1 text-xs"
              >
                All ({locations.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === "visited" ? "default" : "ghost"}
                onClick={() => setActiveTab("visited")}
                className="flex-1 text-xs"
              >
                📷 Visited ({locations.filter((l) => l.type === "visited").length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === "wishlist" ? "default" : "ghost"}
                onClick={() => setActiveTab("wishlist")}
                className="flex-1 text-xs"
              >
                📍 Wishlist ({locations.filter((l) => l.type === "wishlist").length})
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border-t">
            <div className="p-4 space-y-4">
              {locations
                .filter((location) => activeTab === "all" || location.type === activeTab)
                .map((location) => (
                  <Card
                    key={location.id}
                    className={`cursor-pointer transition-colors ${
                      selectedLocation?.id === location.id ? "ring-2 ring-primary" : ""
                    } ${
                      location.type === "visited" 
                        ? "border-l-4 border-l-red-300 bg-red-50/50" 
                        : "border-l-4 border-l-blue-300 bg-blue-50/50"
                    }`}
                    onClick={() => setSelectedLocation(location)}
                    onMouseEnter={() => {
                      // Highlight corresponding marker on map
                      if (markersRef.current && leafletRef.current) {
                        const marker = markersRef.current.find(m => m.locationId === location.id)
                        if (marker) {
                          marker.setIcon(leafletRef.current.divIcon({
                            className: 'custom-marker-highlight',
                            html: `<div style="background-color: ${location.type === 'visited' ? '#ef4444' : '#3b82f6'}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                          }))
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      // Reset marker to normal state
                      if (markersRef.current && leafletRef.current) {
                        const marker = markersRef.current.find(m => m.locationId === location.id)
                        if (marker) {
                          marker.setIcon(leafletRef.current.divIcon({
                            className: 'custom-marker',
                            html: `<div style="background-color: ${location.type === 'visited' ? '#dc2626' : '#2563eb'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                          }))
                        }
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm">{location.name}</CardTitle>
                            {location.type === "wishlist" && (
                              <Badge variant="outline" className="text-xs">
                                Wishlist
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {location.visitedAt ? location.visitedAt.toLocaleDateString() : "Future destination"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Are you sure you want to delete "${location.name}"?`)) {
                              handleDeleteLocation(location.id)
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{location.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          <Camera className="w-3 h-3 mr-1" />
                          {location.photos.length} photos
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLocation(location)
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Location Detail Modal - Custom Overlay */}
    {selectedLocation && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedLocation(null)} />
        <div className="relative bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] w-full mx-4 shadow-xl overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold">{selectedLocation.name}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedLocation(null)}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
          {selectedLocation.type === "visited" && (
            <div className="mb-4 flex gap-2">
              <Button 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhotos}
              >
                {uploadingPhotos ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photos
                  </>
                )}
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoUpload(selectedLocation.id, e)}
          />
          <div className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedLocation.visitedAt
                  ? `Visited on ${selectedLocation.visitedAt.toLocaleDateString()}`
                  : "Future destination"}
              </p>
              <p>{selectedLocation.description}</p>
            </div>
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes & Information
              </Label>
              <Textarea
                id="notes"
                placeholder="Add your notes, websites, tips, or any other information about this location..."
                value={selectedLocation.notes}
                onChange={(e) => {
                  const updatedLocation = { ...selectedLocation, notes: e.target.value }
                  setSelectedLocation(updatedLocation)
                  setLocations((prev) =>
                    prev.map((loc) => (loc.id === selectedLocation.id ? updatedLocation : loc))
                  )
                }}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Store websites, tips, notes, or any other information you want to remember.
              </p>
            </div>
            {selectedLocation.type === "visited" ? (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Photos ({selectedLocation.photos.length})
                </h3>
                {selectedLocation.photos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No photos yet</p>
                    <p className="text-sm">Upload some photos to remember this place!</p>
                  </div>
                ) : (
                  <div className="h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedLocation.photos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <div className="relative">
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              style={{ width: '100%', height: '120px', objectFit: 'cover', imageRendering: 'auto' }}
                              onClick={() => {
                                console.log("Photo clicked:", photo.caption)
                                setViewingPhoto(photo)
                              }}
                              onError={(e) => {
                                console.error("Image failed to load:", photo.url)
                                e.currentTarget.style.display = 'none'
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  parent.innerHTML = `<div style=\"height: 120px; background: red; color: white; display: flex; align-items: center; justify-content: center;\">Failed to load: ${photo.caption}</div>`
                                }
                              }}
                              onLoad={() => {
                                console.log("Image loaded successfully:", photo.caption)
                              }}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm("Are you sure you want to delete this photo?")) {
                                  handleDeletePhoto(selectedLocation.id, photo.id)
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Future destination</p>
                <p className="text-sm">Photos will be available after you visit this place!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Photo Preview Modal */}
    {viewingPhoto && (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
        onClick={() => setViewingPhoto(null)}
      >
        <div 
          className="relative max-w-4xl max-h-[90vh] w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/50 text-white hover:bg-black/70 z-10 rounded-full"
          >
            ✕
          </Button>
          <img
            src={viewingPhoto.url}
            alt={viewingPhoto.caption}
            className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
            style={{ imageRendering: 'auto' }}
            onError={(e) => {
              console.error("Photo modal image failed to load:", viewingPhoto.url)
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm">
            <p className="font-medium">{viewingPhoto.caption}</p>
            <p className="text-sm opacity-75">
              Uploaded on {viewingPhoto.uploadedAt.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
  )
}