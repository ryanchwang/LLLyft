# driver_client.py
import asyncio
import json
import time
import httpx
import websockets

# --- Configuration ---
SERVER_WEBSOCKET_URL = "ws://localhost:8000/ws/driver"
OSRM_SERVER_URL = "http://localhost:5000"

# --- Driver's Initial State ---
current_location = [37.7749, -122.4194]
current_route = [
    [37.8083, -122.4105],  # Stop 1: Pier 39
    [37.8060, -122.4228],  # Stop 2: Ghirardelli Square
]

async def send_initial_route(websocket):
    """Sends the driver's initial route to the server."""
    print("--- Sending initial route to server ---")
    for stop in current_route:
        route_message = {
            "type": "STOP_RECVD",
            "location": stop
        }
        await websocket.send(json.dumps(route_message))
        print(f"Sent stop: {stop}")
    print("--- Initial route sent ---")

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
            await asyncio.sleep(10)
        except websockets.ConnectionClosed:
            break

async def connect_and_listen():
    """Main function to connect, listen for messages, and handle them."""
    global current_route
    
    async with websockets.connect(SERVER_WEBSOCKET_URL) as websocket:
        print(f"Successfully connected to server at {SERVER_WEBSOCKET_URL}")
        
        # --- NEW: Send the route right after connecting ---
        await send_initial_route(websocket)
        
        # Start sending location pings in the background
        asyncio.create_task(send_pings(websocket))
        
        async for message_str in websocket:
            message = json.loads(message_str)
            print(f"\n[SERVER] -> {message}")
            
            # This part remains the same, but you have no logic for RIDE_REQUEST yet
            if message.get("type") == "RIDE_REQUEST":
                print("!!! RIDE REQUEST RECEIVED !!!")
                # In a real app, you would add logic here to handle the new pickup/dropoff
                pickup = message.get("pickup")
                print(f"New pickup location: {pickup}")


if __name__ == "__main__":
    print("Starting driver client application...")
    try:
        asyncio.run(connect_and_listen())
    except KeyboardInterrupt:
        print("Driver client stopped.")