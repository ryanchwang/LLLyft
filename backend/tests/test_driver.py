import asyncio
import pytest
from websockets.asyncio.client import connect
import json


@pytest.mark.asyncio
async def test_driver():
    # Initialize websocket client
    async with connect("ws://0.0.0.0:8000/ws/driver") as client:
        await client.send(json.dumps({"type": "LOC_PING", "location": [37.7749, -122.4194], "loc_time": "2023-10-01T12:00:00Z"}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Location ping received"}
        await client.send(json.dumps({"type": "STOP_RECVD", "location": [37.7749, -122.4194]}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Stop received"}

        await client.send(json.dumps({"type": "STOP_REMOVED", "location": [37.7749, -122.4194]}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Stop removed"}

        await client.send(json.dumps({"type": "STOP_RECVD", "location": [37.7749, -122.4194]}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Stop received"}
        await client.send(json.dumps({"type": "GET_NEXT"}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Next stop", "stop": [37.7749, -122.4194]}
        while True:
            await client.send(json.dumps({"type": "GET_NEXT"}))
            data = await client.recv()
            data = json.loads(data)
            # assert data == {"msg": "Next stop", "stop": [37.7749, -122.4194]}
            print(data)

@pytest.mark.asyncio
async def test_passenger():
    # Initialize websocket client
    async with connect("ws://0.0.0.0:8000/ws/driver") as client:
        await client.send(json.dumps({"type": "LOC_PING", "location": [37.7749, -122.4194], "loc_time": "2023-10-01T12:00:00Z"}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Location ping received"}
        await client.send(json.dumps({"type": "STOP_RECVD", "location": [37.7749, -122.4194]}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Stop received"}

        await client.send(json.dumps({"type": "STOP_REMOVED", "location": [37.7749, -122.4194]}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Stop removed"}

        await client.send(json.dumps({"type": "STOP_RECVD", "location": [37.7749, -122.4194]}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Stop received"}
        await client.send(json.dumps({"type": "GET_NEXT"}))
        data = await client.recv()
        data = json.loads(data)
        assert data == {"msg": "Next stop", "stop": [37.7749, -122.4194]}
