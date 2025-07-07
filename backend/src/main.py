from typing import List
import json
from states import AppState, BusState, Location
from fastapi import FastAPI
import uvicorn
from fastapi import WebSocket, WebSocketDisconnect
import logging

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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

def get_best_bus(buses: List[BusState], location: Location) -> BusState:
    # Implement your logic to find the best bus based on location
    return buses[0] if buses else None

async def get_bus(location: Location):
    # Query all the bus location and routes
    buses = [
        bus for bus in state.busses
        if bus.location and bus.route
    ]
    my_bus = get_best_bus(buses, location)
    # Tell the bus
    if my_bus:
        data = {
            "type": "RIDE_REQUEST",
            "location": {
                "latitude": location.latitude,
                "longitude": location.longitude
            }
        }
        await my_bus.websocket.send_text(json.dumps(data))
        logger.info(f"Ride request sent to bus at location: {location.latitude}, {location.longitude}")
        
    else:
        logger.warning(f"No available bus found for location: {location.latitude}, {location.longitude}")

@app.get("/passenger/request_ride")
async def request_ride(location: Location):
    logger.info(f"Ride requested at location: {location.latitude}, {location.longitude}")

    await get_bus(location)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)