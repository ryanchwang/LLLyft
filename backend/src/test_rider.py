# tests/test_driver.py

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, ANY

# Import your FastAPI app and location classes
# NOTE: Adjust 'main' if your file is named differently
from main import app
from states import *

@pytest.mark.asyncio
async def test_request_ride_endpoint(mocker):
    """
    Tests the /passenger/request_ride endpoint to ensure it correctly
    parses coordinates and calls the get_bus function.
    """
    # 1. MOCK DEPENDENCIES
    # Replace the real get_bus function with an async mock.
    # This prevents the test from executing the real bus logic.
    # NOTE: Adjust the path 'main.get_bus' if your app/function are in different files.
    mock_get_bus = mocker.patch("main.get_bus", new_callable=AsyncMock)

    # 2. SETUP TEST DATA
    pickup_coords = {"lat": 37.7749, "lon": -122.4194}
    dropoff_coords = {"lat": 37.8083, "lon": -122.4105}

    # 3. EXECUTE THE REQUEST
    # The AsyncClient allows us to make requests directly to the app
    # without needing to run a live server.
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/passenger/request_ride",
            params={
                "pickup_lat": pickup_coords["lat"],
                "pickup_lon": pickup_coords["lon"],
                "dropoff_lat": dropoff_coords["lat"],
                "dropoff_lon": dropoff_coords["lon"],
            },
        )

    # 4. ASSERT THE RESULTS
    # Check that the request was successful
    assert response.status_code == 200

    # Check that our mocked get_bus function was called exactly once
    mock_get_bus.assert_awaited_once()

    # Check that get_bus was called with the correct arguments.
    # This verifies that the endpoint correctly created the Location objects.
    call_args, _ = mock_get_bus.call_args
    called_pickup_loc = call_args[0]
    called_dropoff_loc = call_args[1]

    assert isinstance(called_pickup_loc, PickupLocation)
    assert called_pickup_loc.latitude == pickup_coords["lat"]
    assert called_pickup_loc.longitude == pickup_coords["lon"]
    
    assert isinstance(called_dropoff_loc, DropoffLocation)
    assert called_dropoff_loc.latitude == dropoff_coords["lat"]
    assert called_dropoff_loc.longitude == dropoff_coords["lon"]