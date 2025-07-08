import asyncio
import httpx
from typing import List
import logging

# Note: We import the state classes from the parent directory
from ..states import BusState, Location

async def get_trip_duration(
    stops: List[Location],
    osrm_url: str,
    logger: logging.Logger
) -> float:
    """
    Calls OSRM to get the total duration for a trip.
    """
    if len(stops) < 2:
        return float('inf')

    coords_str = ";".join([f"{loc.longitude},{loc.latitude}" for loc in stops])
    url = f"{osrm_url}/trip/v1/driving/{coords_str}?source=first"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            data = response.json()
            if data.get("code") == "Ok":
                return data['trips'][0]['duration']
    except httpx.RequestError as e:
        logger.error(f"Error connecting to OSRM: {e}")

    return float('inf')

async def find_optimal_bus(
    buses: List[BusState],
    pickup_loc: Location,
    dropoff_loc: Location,
    osrm_url: str,
    logger: logging.Logger
) -> tuple[BusState | None, float]:
    """
    Calculates the best bus based on the lowest resulting trip time.
    """
    logger.info("Finding optimal bus...")
    tasks = []
    available_buses = [bus for bus in buses if bus.location]

    for bus in available_buses:
        potential_stops = [bus.location] + bus.route + [pickup_loc, dropoff_loc]
        tasks.append(get_trip_duration(potential_stops, osrm_url, logger))

    costs = await asyncio.gather(*tasks)
    best_bus, min_cost = None, float('inf')

    for i, bus in enumerate(available_buses):
        cost = costs[i]
        logger.info(f"Calculated cost for bus {getattr(bus, 'bus_id', '')}: {cost:.2f}s")
        if cost < min_cost:
            min_cost = cost
            best_bus = bus

    if best_bus:
        logger.info(f"Optimal bus found: {getattr(bus, 'bus_id', '')}")
    else:
        logger.warning("No optimal bus could be found.")

    return best_bus, min_cost