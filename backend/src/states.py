
from typing import List
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field



class Location(BaseModel):
    latitude: float = Field(..., description="Latitude of the location")
    longitude: float = Field(..., description="Longitude of the location")

    def to_list(self) -> List[float]:
        return [self.latitude, self.longitude]
    
# --- Subclasses for Specific Roles ---
# 1. PickupLocation inherits all attributes and methods from Location.
class PickupLocation(Location):
    """A specific location designated for a passenger pickup."""
    pass

# 2. DropoffLocation also inherits from Location.
class DropoffLocation(Location):
    """A specific location designated for a passenger dropoff."""
    pass

class BusState:
    def __init__(self, websocket: WebSocket, logger):
        self.websocket = websocket
        self.location = None
        self.loc_time = None
        self.route: List[Location] = []
        self.logger = logger

    def update_loc(self, location: List, loc_time: float):
        self.location = Location(latitude=location[0], longitude=location[1])
        self.loc_time = loc_time

    def add_stop(self, stop: dict):
        self.logger.debug(f"Adding stop: {stop}")
        if stop:
            self.route.append(Location(longitude=stop[1], latitude=stop[0]))
        self.logger.debug(f"Route after adding: {self.route}")

    def remove_stop(self, stop: dict):
        self.logger.debug(f"Removing stop: {stop}")
        if stop:
            self.route.remove(Location(longitude=stop[1], latitude=stop[0]))

    def get_next_stop(self) -> Location:
        # Implement your logic to get the next stop
        self.logger.debug("Route before getting next stop: %s", self.route)
        return self.route[0] if self.route else None


class AppState:
    def __init__(self):
        self.busses = []
        self.passenger_requests = []

    def add_bus(self, bus: BusState):
        self.busses.append(bus)
