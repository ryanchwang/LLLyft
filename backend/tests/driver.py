# driver_client.py
import asyncio
import json
import time
import httpx  # Modern async HTTP client
import websockets

# --- Configuration ---
# URL of your FastAPI WebSocket server
SERVER_WEBSOCKET_URL = "ws://localhost:8000/ws/driver"
# URL of your running OSRM server
OSRM_SERVER_URL = "http://localhost:5000"

# --- Driver's Initial State ---
# This would be dynamic in a real application
current_location = [37.7749, -122.4194]  # [latitude, longitude]
current_route = [
    [37.8083, -122.4105],  # Stop 1: Pier 39
    [37.8060, -122.4228],  # Stop 2: Ghirardelli Square
]

async def send_pings(websocket):
    """Periodically sends the bus's location to the server."""
    while True:
        try:
            ping_message = {
                "type": "LOC_PING",
                "location": current_location,
                "loc_time": time.time(),
            }
            await websocket.send(json.dumps(ping_message))
            await asyncio.sleep(10)  # Send a ping every 10 seconds
        except websockets.ConnectionClosed:
            break

async def connect_and_listen():
    """Main function to connect, listen for messages, and handle them."""
    global current_route # Make sure to modify the global route state
    
    async with websockets.connect(SERVER_WEBSOCKET_URL) as websocket:
        print(f"Successfully connected to server at {SERVER_WEBSOCKET_URL}")
        
        asyncio.create_task(send_pings(websocket))
        
        async for message_str in websocket:
            message = json.loads(message_str)
            print(f"\n[SERVER] -> {message}")
            
            # CHANGED: Handle the new, simpler message type
            if message.get("type") == "ROUTE_UPDATE":
                print("--- Received new route from server! ---")
                # The new route is a list of {"latitude": y, "longitude": x} dicts
                new_route_from_server = message.get("route", [])
                # Convert it back to our local format: [lat, lon]
                current_route = [
                    [stop["latitude"], stop["longitude"]] for stop in new_route_from_server
                ]
                print(f"Local route updated. New first stop is: {current_route[0]}")
                # The client is now ready to follow the new route.

if __name__ == "__main__":
    print("Starting driver client application...")
    try:
        asyncio.run(connect_and_listen())
    except KeyboardInterrupt:
        print("Driver client stopped.")