# tests/test_bus_logic.py

import pytest
import logging
import httpx
from unittest.mock import MagicMock

# Import the functions and classes to test
from src import get_trip_duration, find_optimal_bus
from src.states import Location, BusState

# --- Fixtures and Mocks ---

@pytest.fixture
def logger():
    """Provides a logger for tests."""
    return logging.getLogger("test_logger")

@pytest.fixture
def osrm_url():
    """Provides the mock OSRM server URL."""
    return "http://mock-osrm-server:5000"

# --- Tests for get_trip_duration ---

@pytest.mark.asyncio
async def test_get_trip_duration_success(httpx_mock, osrm_url, logger):
    """
    Tests that get_trip_duration correctly parses a successful OSRM response.
    """
    stops = [Location(latitude=37.7, longitude=-122.4), Location(latitude=37.8, longitude=-122.5)]
    
    # Mock the OSRM API response
    httpx_mock.add_response(
        url=f"{osrm_url}/trip/v1/driving/-122.4,37.7;-122.5,37.8?source=first",
        json={"code": "Ok", "trips": [{"duration": 350.5}]},
    )
    
    duration = await get_trip_duration(stops, osrm_url, logger)
    assert duration == 350.5

@pytest.mark.asyncio
async def test_get_trip_duration_not_enough_stops(logger):
    """
    Tests that the function returns infinity if fewer than two stops are provided.
    """
    duration_one_stop = await get_trip_duration([Location(1, 1)], "dummy_url", logger)
    assert duration_one_stop == float('inf')

    duration_no_stops = await get_trip_duration([], "dummy_url", logger)
    assert duration_no_stops == float('inf')

@pytest.mark.asyncio
async def test_get_trip_duration_osrm_api_error(httpx_mock, osrm_url, logger):
    """
    Tests that the function returns infinity if OSRM returns a non-"Ok" code.
    """
    stops = [Location(1, 1), Location(2, 2)]
    httpx_mock.add_response(
        url=f"{osrm_url}/trip/v1/driving/1,1;2,2?source=first",
        json={"code": "NoRoute", "message": "Cannot find a route"},
    )
    
    duration = await get_trip_duration(stops, osrm_url, logger)
    assert duration == float('inf')

@pytest.mark.asyncio
async def test_get_trip_duration_osrm_connection_error(httpx_mock, osrm_url, logger):
    """
    Tests that the function returns infinity if it can't connect to OSRM.
    """
    stops = [Location(1, 1), Location(2, 2)]
    httpx_mock.add_exception(httpx.RequestError("Connection failed"))

    duration = await get_trip_duration(stops, osrm_url, logger)
    assert duration == float('inf')

# --- Tests for find_optimal_bus ---

@pytest.mark.asyncio
async def test_find_optimal_bus_selects_cheapest(httpx_mock, osrm_url, logger):
    """
    Tests that the function correctly identifies the bus with the lowest trip duration.
    """
    pickup_loc = Location(latitude=37.0, longitude=-122.0)
    dropoff_loc = Location(latitude=37.1, longitude=-122.1)

    # Mock two buses
    bus1 = BusState(websocket=MagicMock(), logger=logger)
    bus1.location = Location(latitude=37.2, longitude=-122.2)
    bus1.route = [Location(latitude=37.3, longitude=-122.3)]
    
    bus2 = BusState(websocket=MagicMock(), logger=logger)
    bus2.location = Location(latitude=37.8, longitude=-122.8)
    bus2.route = [Location(latitude=37.9, longitude=-122.9)]

    # Mock the OSRM responses for each bus's potential new route
    # Bus 1 will be faster (100s)
    httpx_mock.add_response(
        url=f"{osrm_url}/trip/v1/driving/-122.2,37.2;-122.3,37.3;-122.0,37.0;-122.1,37.1?source=first",
        json={"code": "Ok", "trips": [{"duration": 100}]},
    )
    # Bus 2 will be slower (500s)
    httpx_mock.add_response(
        url=f"{osrm_url}/trip/v1/driving/-122.8,37.8;-122.9,37.9;-122.0,37.0;-122.1,37.1?source=first",
        json={"code": "Ok", "trips": [{"duration": 500}]},
    )

    best_bus, min_cost = await find_optimal_bus(
        buses=[bus1, bus2],
        pickup_loc=pickup_loc,
        dropoff_loc=dropoff_loc,
        osrm_url=osrm_url,
        logger=logger
    )

    assert best_bus is bus1
    assert min_cost == 100

@pytest.mark.asyncio
async def test_find_optimal_bus_no_buses_available(osrm_url, logger):
    """
    Tests that the function returns None when given an empty list of buses.
    """
    best_bus, min_cost = await find_optimal_bus(
        buses=[],
        pickup_loc=Location(1, 1),
        dropoff_loc=Location(2, 2),
        osrm_url=osrm_url,
        logger=logger
    )
    assert best_bus is None
    assert min_cost == float('inf')

@pytest.mark.asyncio
async def test_find_optimal_bus_ignores_buses_without_location(httpx_mock, osrm_url, logger):
    """
    Tests that buses with no current location are correctly ignored.
    """
    pickup_loc = Location(1, 1)
    dropoff_loc = Location(2, 2)

    # A valid bus
    bus1 = BusState(websocket=MagicMock(), logger=logger)
    bus1.location = Location(3, 3)
    bus1.route = []
    
    # An invalid bus with no location
    bus2 = BusState(websocket=MagicMock(), logger=logger)
    bus2.location = None
    bus2.route = [Location(4, 4)]
    
    # Mock the OSRM response ONLY for the valid bus
    httpx_mock.add_response(
        url=f"{osrm_url}/trip/v1/driving/3,3;1,1;2,2?source=first",
        json={"code": "Ok", "trips": [{"duration": 150}]},
    )

    best_bus, min_cost = await find_optimal_bus(
        buses=[bus1, bus2],
        pickup_loc=pickup_loc,
        dropoff_loc=dropoff_loc,
        osrm_url=osrm_url,
        logger=logger
    )

    # The function should select the only valid bus and not crash on the invalid one.
    assert best_bus is bus1
    assert min_cost == 150