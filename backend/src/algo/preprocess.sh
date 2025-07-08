#!/bin/bash

# This script automates the OSRM data preprocessing using Docker.
# It uses an existing local OSM PBF extract and runs osrm-extract, osrm-partition, and osrm-customize.

# --- Configuration ---
# Path to your local OSM PBF file
LOCAL_OSM_PBF_PATH="/Users/ryanwang/Documents/GitHub/LLLyft/frontend/public/maps/map.osm"
# Name for the generated OSRM files (without .osm.pbf extension)
# This will be the base name for files inside the DATA_DIR (e.g., map.osrm)
MAP_BASE_NAME="map"
# Default OSRM profile (car, bike, foot - must exist in /opt inside the Docker image)
OSRM_PROFILE="/opt/car.lua"
# Directory to store OSRM data files (relative to where the script is run)
DATA_DIR="backend/src/algo/osrm_data"
# OSRM backend Docker image
OSRM_DOCKER_IMAGE="osrm/osrm-backend"

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

# Function to run OSRM Docker command
# Arguments are the full command to execute inside the container (e.g., "osrm-extract -p /opt/car.lua /data/map.osm")
run_osrm_command() {
    local osrm_full_command=("$@") # All arguments are now treated as the full command for OSRM

    echo "Running OSRM command: ${osrm_full_command[0]}" # Print the first part of the command (e.g., osrm-extract)
    echo "Docker command: docker run -t -v \"${PWD}/${DATA_DIR}:/data\" $OSRM_DOCKER_IMAGE ${osrm_full_command[@]}"

    # Mount only DATA_DIR, as the PBF will be copied there first.
    docker run -t --platform linux/amd64 \
      -v "${PWD}/${DATA_DIR}:/data" \
      "$OSRM_DOCKER_IMAGE" "${osrm_full_command[@]}" || handle_error "${osrm_full_command[0]} failed."
    echo "${osrm_full_command[0]} completed successfully."
}

# --- Main Script ---

echo "--- OSRM Preprocessing Script ---"

# Create data directory if it doesn't exist
mkdir -p "${DATA_DIR}" || handle_error "Failed to create data directory ${DATA_DIR}."
echo "Data directory ${DATA_DIR} ensured."

check_docker

# Define the path for the PBF file *inside* the data directory
PBF_FILE_IN_DATA_DIR="${DATA_DIR}/${MAP_BASE_NAME}.osm" # Keep the .osm extension here

# Verify the local PBF file exists before copying
if [ ! -f "${LOCAL_OSM_PBF_PATH}" ]; then
    handle_error "Local OSM PBF file not found at: ${LOCAL_OSM_PBF_PATH}"
fi
echo "Using local OSM PBF file: ${LOCAL_OSM_PBF_PATH}"

# 0. Copy the OSM PBF file into the OSRM data directory
echo "Copying ${LOCAL_OSM_PBF_PATH} to ${PBF_FILE_IN_DATA_DIR}..."
cp "${LOCAL_OSM_PBF_PATH}" "${PBF_FILE_IN_DATA_DIR}" || handle_error "Failed to copy PBF file to data directory."
echo "PBF file copied successfully."

# The OSRM commands will now operate entirely within the /data directory inside the container.
# The base name for all OSRM files will be map.osrm

# 1. Run osrm-extract
# Input: /data/map.osm, Output will be /data/map.osrm (implicit)
run_osrm_command "osrm-extract" "/data/${MAP_BASE_NAME}.osm" "-p" "${OSRM_PROFILE}"

# 2. Run osrm-partition (for MLD)
run_osrm_command "osrm-partition" "/data/${MAP_BASE_NAME}.osrm"

# 3. Run osrm-customize (for MLD)
run_osrm_command "osrm-customize" "/data/${MAP_BASE_NAME}.osrm"

echo "--- OSRM Preprocessing Complete! ---"
echo "OSRM data files are located in: ${PWD}/${DATA_DIR}"
echo "You can now start osrm-routed with: "
echo "docker run -t -i -p 5000:5000 -v \"${PWD}/${DATA_DIR}:/data\" ${OSRM_DOCKER_IMAGE} osrm-routed --algorithm mld /data/${MAP_BASE_NAME}.osrm"