#!/bin/bash

# OSRM Data Preprocessing Script
# This script downloads and processes OpenStreetMap data for OSRM routing

set -e  # Exit on any error

# Configuration
DATA_DIR="backend/src/algo/osrm_data"
MAP_NAME="map"
DOCKER_IMAGE="osrm/osrm-backend"
CUSTOM_MAP_PATH="/Users/ryanwang/Documents/GitHub/LLLyft/frontend/public/maps/map.osm"

echo "=== OSRM Data Preprocessing ==="

# Step 1: Create data directory if it doesn't exist
echo "Step 1: Setting up data directory..."
mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

# Step 2: Copy and prepare custom map data
echo "Step 2: Preparing custom map data..."
if [ ! -f "$CUSTOM_MAP_PATH" ]; then
    echo "ERROR: Custom map file not found at: $CUSTOM_MAP_PATH"
    exit 1
else
    echo "✓ Found custom map file: $CUSTOM_MAP_PATH"
    echo "File size: $(ls -lh "$CUSTOM_MAP_PATH" | awk '{print $5}')"
    
    # Copy the custom map to our data directory
    echo "Copying custom map to data directory..."
    cp "$CUSTOM_MAP_PATH" "${MAP_NAME}.osm"
    echo "✓ Map copied to: ${MAP_NAME}.osm"
fi

# Step 3: Extract road network
echo "Step 3: Extracting road network..."
docker run -t --rm \
    -v "${PWD}:/data" \
    "$DOCKER_IMAGE" \
    osrm-extract -p /opt/car.lua "/data/${MAP_NAME}.osm"

# Step 4: Build contraction hierarchies
echo "Step 4: Building contraction hierarchies..."
docker run -t --rm \
    -v "${PWD}:/data" \
    "$DOCKER_IMAGE" \
    osrm-contract "/data/${MAP_NAME}.osrm"

# Step 5: Verify output files
echo "Step 5: Verifying output files..."
REQUIRED_FILES=(
    "${MAP_NAME}.osrm"
    "${MAP_NAME}.osrm.edges"
    "${MAP_NAME}.osrm.geometry"
    "${MAP_NAME}.osrm.hsgr"
    "${MAP_NAME}.osrm.names"
    "${MAP_NAME}.osrm.ramIndex"
    "${MAP_NAME}.osrm.timestamps"
)

echo "Checking for required files:"
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (missing)"
    fi
done

echo ""
echo "=== Preprocessing Complete ==="
echo "Data directory: $(pwd)"
echo "Map file: ${MAP_NAME}.osrm"
echo ""
echo "Next steps:"
echo "1. Run your OSRM server startup script"
echo "2. Test with: curl \"http://localhost:5000/trip/v1/driving/-122.4194,37.7749;-122.4105,37.8083?source=first\""

cd - > /dev/null  # Return to original directory