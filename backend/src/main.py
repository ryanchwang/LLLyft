from typing import List
import json
from states import AppState, BusState, Location, PickupLocation, DropoffLocation
from fastapi import FastAPI
import uvicorn
from fastapi import WebSocket, WebSocketDisconnect
import logging
import asyncio
import httpx
from algo.bus_logic import find_optimal_bus
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OSRM_SERVER_URL = "http://localhost:5000"


origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state = AppState()

@app.get("/")
async def read_root():
    return {"message": "Hello, FastAPI!"}

# Periodically ping all connected drivers

@app.on_event("startup")
async def start_ping_drivers():
    asyncio.create_task(ping_drivers())

async def ping_drivers():
    while True:
        for bus in state.busses:
            if bus.websocket:
                await bus.websocket.send_text(json.dumps({"type": "PING"}))
        await asyncio.sleep(5)

"""
WebSocket endpoint for driver communication
Docs: 
    key: type 
    values: LOC_PING, STOP_RECVD, STOP_REMOVED

    LOC_PING: 
        Location ping from the driver
        other_params: location: [latitude, longitude] , loc_time: timestamp

    STOP_RECVD: 
        Stop received from the driver
        other_params: location: [latitude, longitude]

    STOP_REMOVED: 
        Stop removed from the driver
        other_params: location: [latitude, longitude]
"""
@app.websocket("/ws/driver")
async def websocket_driver(websocket: WebSocket):
    print("Driver websocket connected")
    await websocket.accept()
    print("WebSocket connection established")
    bus_state = BusState(websocket, logger)
    state.add_bus(bus_state)
    try:
        while True:
            logger.debug("Waiting for driver message...")
            data = await websocket.receive_text()
            logger.debug('Received text')
            data_json = json.loads(data)
            data_type = data_json.get("type", None)
            if data_type == "LOC_PING":
                bus_state.update_loc(data_json.get("location", None), data_json.get("loc_time", None))
                await websocket.send_text(json.dumps({"msg": "Location ping received"}))
            elif data_type == "STOP_RECVD":
                logger.info(f"Stop received: {data_json}")
                bus_state.add_stop(data_json.get("location", None))
                await websocket.send_text(json.dumps({"msg": "Stop received"}))
            elif data_type == "STOP_REMOVED":
                bus_state.remove_stop(data_json.get("location", None))
                await websocket.send_text(json.dumps({"msg": "Stop removed"}))
            elif data_type == "GET_NEXT":
                next_stop = bus_state.get_next_stop()
                await websocket.send_text(json.dumps({"msg": "Next stop", "stop": next_stop.to_list() if next_stop else None}))
            else:
                logger.error(f"Unknown message type: {data_type}")
                await websocket.send_text(json.dumps({"msg": "Unknown message type"}))
            # Here you can process the received data from the driver
            # For demonstration, echo the data back
            # await websocket.send_text(f"Received: {data}")
    except WebSocketDisconnect:
        logger.info(f"Driver disconnected")
        pass

# deleted get best bus, replaced wiht find optimal bus

async def get_bus(pickup_loc: Location, dropoff_loc: Location):
    # Query all the bus location and routes
    buses = [
        bus for bus in state.busses
        if bus.location and bus.route
    ]
    my_bus, _ = await find_optimal_bus(
        buses=buses,
        pickup_loc=pickup_loc,
        dropoff_loc=dropoff_loc,
        osrm_url=OSRM_SERVER_URL, # Pass the config as an argument
        logger=logger             # Pass the logger as an argument
    )
    # Tell the bus
    data = {
        "type": "RIDE_REQUEST",
        "pickup": {
            "latitude": pickup_loc.latitude,
            "longitude": pickup_loc.longitude
        },
        # RECOMMENDED CHANGE: Add the dropoff location here
        "dropoff": {
            "latitude": dropoff_loc.latitude,
            "longitude": dropoff_loc.longitude
        }
    }

    if my_bus:
        await my_bus.websocket.send_text(json.dumps(data))
        
        logger.info(f"Ride request sent to bus at location: {pickup_loc.latitude}, {pickup_loc.longitude}")
        # Return bus location
        return my_bus.location

    else:
        # Return first bus location
        await buses[0].websocket.send_text(json.dumps(data))
        return buses[0].location
        logger.warning(f"No available bus found for location: {pickup_loc.latitude}, {pickup_loc.longitude}")

@app.get("/passenger/request_ride")
async def request_ride(
    pickup_lat: float, 
    pickup_lon: float,
    dropoff_lat: float,
    dropoff_lon: float
):
    logger.info(f"Ride requested at location: ({pickup_lat}, {pickup_lon})")

    # FIXED: Create location objects from the coordinates provided in the request.
    pickup_location = PickupLocation(latitude=pickup_lat, longitude=pickup_lon)
    dropoff_location = DropoffLocation(latitude=dropoff_lat, longitude=dropoff_lon)

    # FIXED: The call to get_bus now passes both locations.
    location = await get_bus(pickup_location, dropoff_location)
    print(location)
    return location


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)