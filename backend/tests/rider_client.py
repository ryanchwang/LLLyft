import httpx
import asyncio

# --- Configuration ---
SERVER_API_URL = "http://localhost:8000"

# --- Sample Ride Details ---
# In a real app, this would come from user input or a GUI.
PICKUP_LOCATION = {"latitude": 37.7749, "longitude": -122.4194}  # San Francisco City Hall
DROPOFF_LOCATION = {"latitude": 37.8083, "longitude": -122.4105} # Pier 39

async def send_ride_request():
    """
    Simulates a rider requesting a ride by calling the FastAPI endpoint.
    """
    print(" rider client application...")
    print(f"Requesting a ride from {PICKUP_LOCATION['latitude']},{PICKUP_LOCATION['longitude']} to {DROPOFF_LOCATION['latitude']},{DROPOFF_LOCATION['longitude']}")

    # Construct the request parameters from our sample locations
    params = {
        "pickup_lat": PICKUP_LOCATION["latitude"],
        "pickup_lon": PICKUP_LOCATION["longitude"],
        "dropoff_lat": DROPOFF_LOCATION["latitude"],
        "dropoff_lon": DROPOFF_LOCATION["longitude"],
    }

    try:
        # Use httpx to make an async GET request
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SERVER_API_URL}/passenger/request_ride", params=params)

        # Check if the server accepted the request
        if response.status_code == 200:
            print("Ride request sent successfully!")
            print(f"Server response: {response.text}")
        else:
            print(f"Error: Server responded with status code {response.status_code}")
            print(f"Response body: {response.text}")

    except httpx.RequestError as e:
        print(f"An error occurred while requesting the ride: {e}")

if __name__ == "__main__":
    asyncio.run(send_ride_request())