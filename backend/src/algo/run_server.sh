#!/bin/bash

# Define variables
DATA_DIR="backend/src/algo/osrm_data" && \
MAP_NAME="map" && \
CONTAINER_NAME="osrm_server" && \
DOCKER_IMAGE="osrm/osrm-backend" && \
\
# Stop and remove the old container if it exists, then start the new one
echo "--- Starting OSRM server... ---" && \
(docker stop "$CONTAINER_NAME" && docker rm "$CONTAINER_NAME") || true && \
docker run -d --name "$CONTAINER_NAME" --platform linux/amd64 -p 5000:5000 -v "${PWD}/${DATA_DIR}:/data" "$DOCKER_IMAGE" osrm-routed "/data/${MAP_NAME}.osrm" && \
\
# Confirmation message
echo "--- ✅ OSRM server is running. Use 'docker ps' to verify. ---"
echo "---  OSRM server is running. Use 'docker ps' to verify. ---"
zsh: command not found: #
zsh: command not found: #
--- Starting OSRM server... ---
Error response from daemon: No such container: osrm_server
c3229c04ae4db78572e1237eda5b66ee2bdfd099b6e5b253e21edb8f892fc242
zsh: command not found: #
--- ✅ OSRM server is running. Use 'docker ps' to verify. ------  OSRM server is running. Use 'docker ps' to verify. ---