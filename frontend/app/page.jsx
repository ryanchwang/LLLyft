"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Clock, CheckCircle } from "lucide-react"

export default function HomePage() {
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

  const handleMapClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    setSelectedLocation({ x, y })
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Ride Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div>
              <p className="text-gray-600 mb-2">Your bus will arrive in:</p>
              <div className="text-4xl font-bold text-indigo-600 flex items-center justify-center gap-2">
                <Clock className="w-8 h-8" />
                {formatTime(countdown)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Driver will contact you shortly. Please wait at your selected location.
              </p>
            </div>
            <Button onClick={resetApp} variant="outline" className="w-full bg-transparent">
              Book Another Ride
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            RideBus
          </h1>
          <p className="text-gray-600 mt-1">Connect with bus drivers instantly</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 mt-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Map Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Select Drop-off Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="w-full h-80 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg border-2 border-dashed border-gray-300 cursor-crosshair relative overflow-hidden"
                onClick={handleMapClick}
              >
                {/* Mock map background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="w-full h-full bg-gradient-to-br from-green-200 via-blue-200 to-purple-200"></div>
                  {/* Mock streets */}
                  <div className="absolute top-1/3 left-0 right-0 h-1 bg-gray-400 opacity-50"></div>
                  <div className="absolute top-2/3 left-0 right-0 h-1 bg-gray-400 opacity-50"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 w-1 bg-gray-400 opacity-50"></div>
                  <div className="absolute left-2/3 top-0 bottom-0 w-1 bg-gray-400 opacity-50"></div>
                </div>

                {/* Selected location marker */}
                {selectedLocation && (
                  <div
                    className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg transform -translate-x-3 -translate-y-3 animate-bounce"
                    style={{
                      left: selectedLocation.x,
                      top: selectedLocation.y,
                    }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                )}

                {/* Instructions */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 text-center shadow-lg">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                    <p className="text-gray-700 font-medium">
                      {selectedLocation ? "Drop-off selected!" : "Click anywhere to select drop-off"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Section */}
          <Card>
            <CardHeader>
              <CardTitle>Request Your Ride</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="font-medium text-gray-900">Drop-off Location</p>
                    <p className="text-sm text-gray-600">
                      {selectedLocation ? "Location selected on map" : "Please select on map"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="font-medium text-gray-900">Estimated Arrival</p>
                    <p className="text-sm text-gray-600">3-7 minutes</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCallTaxi}
                disabled={!selectedLocation || isRequesting}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {isRequesting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Requesting...
                  </div>
                ) : (
                  "Call Taxi"
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By requesting a ride, you agree to our terms of service
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
