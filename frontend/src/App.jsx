"use client";

import { useState, useEffect, useRef } from "react";
import "./App.css";

// Dynamically import Leaflet to avoid SSR issues
let L = null;
if (typeof window !== "undefined") {
  L = require("leaflet");

  // Fix for default markers in Leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// Simple Button component
const Button = ({
  children,
  onClick,
  disabled,
  className = "",
  variant = "primary",
}) => {
  const variantClass = variant === "outline" ? "btn-outline" : "btn-primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
};

// Simple Card components
const Card = ({ children, className = "" }) => (
  <div className={`card ${className}`}>{children}</div>
);
const CardHeader = ({ children }) => (
  <div className="card-header">{children}</div>
);
const CardTitle = ({ children, className = "" }) => (
  <h3 className={`card-title ${className}`}>{children}</h3>
);
const CardContent = ({ children, className = "" }) => (
  <div className={`card-content ${className}`}>{children}</div>
);

// Map component
const MapComponent = ({
  onLocationSelect,
  selectedLocation,
  secondSelectedLocation,
  onSecondLocationSelect,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const secondMarkerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [firstMarkerActive, setFirstMarkerActive] = useState(false);
  const [secondMarkerActive, setSecondMarkerActive] = useState(false);

  useEffect(() => {
    if (!L || !mapRef.current) return;
    if (isInitialized) {
      return;
    }

    const initializeMap = () => {
      try {
        console.log("Initializing map...");
        // Initialize map centered on New York City
        mapInstanceRef.current = L.map("map", {
          // center: [40.7128, -80.0060],
          // center: [37.681873, -121.768005],
          center: [37.687827, -121.708087],
          zoom: 14,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
        });
        console.log("init");

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        // Load local filesystem file maps/map.geojson and load to leaflet
        // Add callbacks to make the geojson interactive

        console.log("mapinst", mapInstanceRef.current);
        fetch("maps/map.geojson")
          .then((response) => response.json())
          .then((data) => {
            L.geoJSON(data, {
              onEachFeature: (feature, layer) => {
                // Add a popup with feature properties if available
                if (feature.properties && feature.properties.name) {
                  layer.bindPopup(feature.properties.name);
                }
                if (feature.geometry.type !== "Point") {
                  return;
                }
                // Highlight on mouseover
                // Click to select location
                // Change the marker color to red
                layer.on("click", function (e) {
                  const { lat, lng } = e.latlng;
                  // Reverse geocode and select location
                  fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
                  )
                    .then((response) => response.json())
                    .then((data) => {
                      const address =
                        data.display_name ||
                        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                      // if first marker is active
                        console.log('click', firstMarkerActive, secondMarkerActive, markerRef.current);
                        if (!firstMarkerActive && markerRef.current == null) {
                        console.log("set first marker", firstMarkerActive);
                        onLocationSelect({ lat, lng, address });
                        setFirstMarkerActive(true); // This schedules firstMarkerActive to become true on the next render
                        } else {
                        console.log("second marker", secondMarkerActive);
                        onSecondLocationSelect({ lat, lng, address });
                        setSecondMarkerActive(true);
                        }
                    })
                    .catch(() => {
                      if (!firstMarkerActive) {
                        onLocationSelect({
                          lat,
                          lng,
                          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        });
                        setFirstMarkerActive(true);
                      } else {
                        onSecondLocationSelect({
                          lat,
                          lng,
                          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        });
                        setSecondMarkerActive(true);
                      }
                    });
                });
              },
            }).addTo(mapInstanceRef.current);
          });

        // set isInitialized to true
        setIsInitialized(true);

        // Add click event listener
        // mapInstanceRef.current.on("click", (e) => {
        //   const { lat, lng } = e.latlng
        //   console.log("clicked", lat, lng);

        //   // Reverse geocoding to get address
        //   fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
        //     .then((response) => response.json())
        //     .then((data) => {
        //       const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        //       onLocationSelect({ lat, lng, address })
        //     })
        //     .catch(() => {
        //       onLocationSelect({
        //         lat,
        //         lng,
        //         address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        //       })
        //     })
        // })

        // Map is ready
        mapInstanceRef.current.whenReady(() => {
          console.log("Map is ready");
          setIsLoading(false);
        });
      } catch (error) {
        console.error("Error initializing map:", error);
        setIsLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        // TODO: Figure out why we are doing this
        // mapInstanceRef.current = null
        return;
      }
    };
  }, [
    onLocationSelect,
    onSecondLocationSelect,
    isInitialized,
    firstMarkerActive,
    secondMarkerActive,
  ]);

  // Update marker when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation || !L) return;

    // Remove existing marker
    if (selectedLocation) {
      if (markerRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
      }
    }

    // Create custom red marker
    const customIcon = L.divIcon({
      className: "custom-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: "",
    });

    markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
      icon: customIcon,
    }).addTo(mapInstanceRef.current);

    // Center map on selected location
    mapInstanceRef.current.setView(
      [selectedLocation.lat, selectedLocation.lng],
      15
    );
  }, [selectedLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current || !secondSelectedLocation || !L) return;

    // Remove existing second marker
    if (secondMarkerRef.current) {
      mapInstanceRef.current.removeLayer(secondMarkerRef.current);
    }

    // Create custom red marker
    const customIcon = L.divIcon({
      className: "drop-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: "",
    });

    secondMarkerRef.current = L.marker(
      [secondSelectedLocation.lat, secondSelectedLocation.lng],
      {
        icon: customIcon,
      }
    ).addTo(mapInstanceRef.current);

    // Center map on second selected location
    mapInstanceRef.current.setView(
      [secondSelectedLocation.lat, secondSelectedLocation.lng],
      15
    );
  }, [secondSelectedLocation]);

  if (isLoading) {
    return (
      <div className="map-loading">
        <div id="map">
          <div ref={mapRef} className="map-container" />
        </div>
        <div className="map-loading-spinner"></div>
        <div className="map-loading-text">Loading map...</div>
      </div>
    );
  }

  return (
    <div id="map">
      <div ref={mapRef} className="map-container" />
    </div>
  );
};

export default function App() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [secondSelectedLocation, setSecondSelectedLocation] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    if (isConfirmed && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isConfirmed, countdown]);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  const handleSecondLocationSelect = (location) => {
    setSecondSelectedLocation(location);
  };

  const handleCallTaxi = async () => {
    setIsRequesting(true);

    // Make api request to /api/request-ride
    try {
      const response = await fetch("http://0.0.0.0:8000/passenger/request_ride?" +
        new URLSearchParams({
          pickup_lat: selectedLocation.lat,
          pickup_lon: selectedLocation.lng,
          dropoff_lat: secondSelectedLocation.lat,
          dropoff_lon: secondSelectedLocation.lng,
        }), {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("Ride requested successfully:", data);
    } catch (error) {
      console.error("Error requesting ride:", error);
    } finally {
      setIsRequesting(false);
      setIsConfirmed(true);
      setCountdown(300); // 5 minutes countdown
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetApp = () => {
    setSelectedLocation(null);
    setIsConfirmed(false);
    setCountdown(0);
  };

  if (isConfirmed) {
    return (
      <div className="confirmation-screen">
        <Card className="confirmation-card">
          <CardHeader>
            <div className="confirmation-header">
              <div className="success-icon-container">
                <span className="success-icon">✅</span>
              </div>
              <CardTitle className="confirmation-title">
                Ride Confirmed!
              </CardTitle>
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

            {secondSelectedLocation?.address && (
              <div className="selected-address">
                <div className="address-label">Dropoff Location:</div>
                <div className="address-text">{secondSelectedLocation.address}</div>
              </div>
            )}

            <div className="driver-info">
              <p className="driver-info-text">
                Driver will contact you shortly. Please wait at your selected
                location.
              </p>
            </div>
            <Button
              onClick={resetApp}
              variant="outline"
              className="btn-full bg-transparent"
            >
              Book Another Ride
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">
            <span>📍</span>
            LLLyft
          </h1>
          <p className="header-subtitle">
            Connect with LLNL bus drivers instantly
          </p>
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
              <MapComponent
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                secondSelectedLocation={secondSelectedLocation}
                onSecondLocationSelect={handleSecondLocationSelect}
              />

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
                      {selectedLocation
                        ? "Location selected on map"
                        : "Please click on the map to select"}
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
                By requesting a ride, you agree to sell your soul to LLLyft.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
