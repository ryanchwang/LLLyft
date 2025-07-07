"use client"

import { useState, useEffect, useRef } from "react"
import "./App.css"

// Dynamically import Leaflet to avoid SSR issues
let L = null
if (typeof window !== "undefined") {
  L = require("leaflet")

  // Fix for default markers in Leaflet
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  })
}

// Simple Button component
const Button = ({ children, onClick, disabled, className = "", variant = "primary" }) => {
  const variantClass = variant === "outline" ? "btn-outline" : "btn-primary"
  return (
    <button onClick={onClick} disabled={disabled} className={`btn ${variantClass} ${className}`}>
      {children}
    </button>
  )
}

// Simple Card components
const Card = ({ children, className = "" }) => <div className={`card ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="card-header">{children}</div>
const CardTitle = ({ children, className = "" }) => <h3 className={`card-title ${className}`}>{children}</h3>
const CardContent = ({ children, className = "" }) => <div className={`card-content ${className}`}>{children}</div>

// Map component
const MapComponent = ({ onLocationSelect, selectedLocation }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!L || !mapRef.current) return

    const initializeMap = () => {
      try {
        // Initialize map centered on New York City
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [40.7128, -74.006],
          zoom: 13,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
        })

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapInstanceRef.current)

        // Add click event listener
        mapInstanceRef.current.on("click", (e) => {
          const { lat, lng } = e.latlng

          // Reverse geocoding to get address
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
            .then((response) => response.json())
            .then((data) => {
              const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
              onLocationSelect({ lat, lng, address })
            })
            .catch(() => {
              onLocationSelect({
                lat,
                lng,
                address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              })
            })
        })

        // Map is ready
        mapInstanceRef.current.whenReady(() => {
          setIsLoading(false)
        })
      } catch (error) {
        console.error("Error initializing map:", error)
        setIsLoading(false)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 100)

    return () => {
      clearTimeout(timer)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [onLocationSelect])

  // Update marker when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation || !L) return

    // Remove existing marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
    }

    // Create custom red marker
    const customIcon = L.divIcon({
      className: "custom-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: "",
    })

    markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
      icon: customIcon,
    }).addTo(mapInstanceRef.current)

    // Center map on selected location
    mapInstanceRef.current.setView([selectedLocation.lat, selectedLocation.lng], 15)
  }, [selectedLocation])

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="map-loading-spinner"></div>
        <div className="map-loading-text">Loading map...</div>
      </div>
    )
  }

  return <div ref={mapRef} className="map-container" />
}

export default function App() {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown timer effect
  useEffect(() => {
    if (isConfirmed && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isConfirmed, countdown])

  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
  }

  const handleCallTaxi = async () => {
    setIsRequesting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsRequesting(false)
    setIsConfirmed(true)
    setCountdown(300) // 5 minutes countdown
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const resetApp = () => {
    setSelectedLocation(null)
    setIsConfirmed(false)
    setCountdown(0)
  }

  if (isConfirmed) {
    return (
      <div className="confirmation-screen">
        <Card className="confirmation-card">
          <CardHeader>
            <div className="confirmation-header">
              <div className="success-icon-container">
                <span className="success-icon">✅</span>
              </div>
              <CardTitle className="confirmation-title">Ride Confirmed!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="confirmation-content">
            <div className="countdown-section">
              <p className="countdown-label">Your bus will arrive in:</p>
              <div className="countdown-display">
                <span className="countdown-icon">⏰</span>
                {formatTime(countdown)}
              </div>
            </div>

            {selectedLocation?.address && (
              <div className="selected-address">
                <div className="address-label">Pickup Location:</div>
                <div className="address-text">{selectedLocation.address}</div>
              </div>
            )}

            <div className="driver-info">
              <p className="driver-info-text">
                Driver will contact you shortly. Please wait at your selected location.
              </p>
            </div>
            <Button onClick={resetApp} variant="outline" className="btn-full bg-transparent">
              Book Another Ride
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">
            <span>📍</span>
            RideBus
          </h1>
          <p className="header-subtitle">Connect with bus drivers instantly</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="grid">
          {/* Map Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span>📍</span>
                Select Drop-off Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MapComponent onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />

              {selectedLocation?.address && (
                <div className="selected-address">
                  <div className="address-label">Selected Location:</div>
                  <div className="address-text">{selectedLocation.address}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Section */}
          <Card>
            <CardHeader>
              <CardTitle>Request Your Ride</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="info-section">
                <div className="info-item">
                  <span className="info-icon">📍</span>
                  <div>
                    <p className="info-title">Drop-off Location</p>
                    <p className="info-subtitle">
                      {selectedLocation ? "Location selected on map" : "Please click on the map to select"}
                    </p>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-icon">⏰</span>
                  <div>
                    <p className="info-title">Estimated Arrival</p>
                    <p className="info-subtitle">3-7 minutes</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCallTaxi}
                disabled={!selectedLocation || isRequesting}
                className="btn-large btn-full"
                style={{ marginTop: "1.5rem" }}
              >
                {isRequesting ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner"></div>
                    Requesting...
                  </div>
                ) : (
                  "Call Taxi"
                )}
              </Button>

              <p className="terms-text" style={{ marginTop: "1rem" }}>
                By requesting a ride, you agree to our terms of service
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
