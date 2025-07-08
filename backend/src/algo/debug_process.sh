#!/bin/bash

# --- Configuration ---
# Path to your local OSM PBF file (still needed for volume mounts, even if not used directly for help)
LOCAL_OSM_PBF_PATH="/Users/ryanwang/Documents/GitHub/LLLyft/frontend/public/maps/map.osm"
# Directory to store OSRM data files (relative to where the script is run)
DATA_DIR="osrm_data"
# OSRM backend Docker image
OSRM_DOCKER_IMAGE="ghcr.io/project-osrm/osrm-backend"

# --- Functions ---

# Function to display error messages and exit
handle_error() {
    echo "ERROR: $1" >&2
    exit 1
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        handle_error "Docker is not running or not accessible. Please start Docker Desktop or ensure the Docker daemon is running."
    fi
    echo "Docker is running."
}

# --- Main Script ---

echo "--- Debugging OSRM Preprocessing Script ---"

# Create data directory if it doesn't exist
mkdir -p "${DATA_DIR}" || handle_error "Failed to create data directory ${DATA_DIR}."
echo "Data directory ${DATA_DIR} ensured."

check_docker

echo "Attempting to get help for osrm-extract from Docker image..."

# Run osrm-extract with --help to see its expected arguments
# Note: We still need the volume mounts for Docker to function correctly,
# even if osrm-extract --help doesn't directly use them.
docker run -t \
  -v "${PWD}/${DATA_DIR}:/data" \
  -v "$(dirname "${LOCAL_OSM_PBF_PATH}"):/local_osm_dir" \
  "$OSRM_DOCKER_IMAGE" osrm-extract --help || handle_error "Failed to get osrm-extract --help."

echo "--- Debugging Complete. Please review the output above for osrm-extract usage. ---"

# Exit here, as we only wanted the help output
exit 0
