#!/bin/bash

# This script automates the OSRM data preprocessing using Docker.
# It downloads an OSM PBF extract, runs osrm-extract, osrm-partition, and osrm-customize.

# --- Configuration ---
# Default map URL (e.g., Berlin from Geofabrik)
MAP_URL="http://download.geofabrik.de/europe/germany/berlin-latest.osm.pbf"
# Default map name (without .osm.pbf extension)
MAP_NAME="berlin-latest"
# Default OSRM profile (car, bike, foot - must exist in /opt inside the Docker image)
OSRM_PROFILE="/opt/car.lua"
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

# Function to download the PBF file
download_map() {
    local url=$1
    local output_file=$2
    echo "Downloading map from $url to $output_file..."
    wget -c -O "$output_file" "$url" || handle_error "Failed to download map file."
    echo "Map downloaded successfully."
}

# Function to run OSRM Docker command
run_osrm_command() {
    local command_name=$1
    shift # Remove the first argument (command_name)
    local docker_command="$@" # Remaining arguments are the actual docker command parts

    echo "Running OSRM command: $command_name"
    echo "Docker command: docker run -t -v \"${PWD}/${DATA_DIR}:/data\" $OSRM_DOCKER_IMAGE $docker_command"

    docker run -t -v "${PWD}/${DATA_DIR}:/data" "$OSRM_DOCKER_IMAGE" "$docker_command" || handle_error "$command_name failed."
    echo "$command_name completed successfully."
}

# --- Main Script ---

echo "--- OSRM Preprocessing Script ---"

# Create data directory if it doesn't exist
mkdir -p "${DATA_DIR}" || handle_error "Failed to create data directory ${DATA_DIR}."
echo "Data directory ${DATA_DIR} ensured."

# Change to data directory to simplify paths for Docker mounts (optional, but clean)
# cd "${DATA_DIR}" || handle_error "Failed to change to data directory."

check_docker

# 1. Download OpenStreetMap PBF extract
OSM_FILE="${DATA_DIR}/${MAP_NAME}.osm"
if [ ! -f "$OSM_FILE" ]; then
    download_map "$MAP_URL" "$PBF_FILE"
else
    echo "Map file '$PBF_FILE' already exists. Skipping download. To re-download, delete the file first."
fi

# 2. Run osrm-extract
run_osrm_command "osrm-extract" "osrm-extract -p ${OSRM_PROFILE} /data/${MAP_NAME}.osm.pbf"

# 3. Run osrm-partition (for MLD)
run_osrm_command "osrm-partition" "osrm-partition /data/${MAP_NAME}.osrm"

# 4. Run osrm-customize (for MLD)
run_osrm_command "osrm-customize" "osrm-customize /data/${MAP_NAME}.osrm"

echo "--- OSRM Preprocessing Complete! ---"
echo "OSRM data files are located in: ${PWD}/${DATA_DIR}"
echo "You can now start osrm-routed with: "
echo "docker run -t -i -p 5000:5000 -v \"${PWD}/${DATA_DIR}:/data\" ${OSRM_DOCKER_IMAGE} osrm-routed --algorithm mld /data/${MAP_NAME}.osrm"