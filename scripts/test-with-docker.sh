#!/usr/bin/env bash

# Test runner that manages Docker container lifecycle
# Usage: ./scripts/test-with-docker.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="uptime-kuma-test"
MAX_WAIT_TIME=60  # seconds
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Function to print header
print_header() {
  echo -e "${BLUE}🐻 Uptime Kuma MCP Test Runner${NC}"
  echo -e "${BLUE}================================${NC}\n"
}

# Function to cleanup on exit
cleanup() {
  local exit_code=$?
  echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"

  # Stop the test container (--rm flag will auto-remove it)
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
  fi

  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ Tests completed successfully and cleaned up!${NC}"
  else
    echo -e "${RED}❌ Tests failed (exit code: $exit_code)${NC}"
  fi

  exit $exit_code
}

# Function to check docker availability
check_docker() {
  echo -e "${BLUE}🔍 Checking Docker...${NC}"

  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
  fi

  echo -e "${GREEN}✅ Docker is available${NC}\n"
}

load_env_vars() {
  echo -e "${BLUE}🔍 Loading environment variables...${NC}"

  if [ -f "$PROJECT_ROOT/.env.test" ]; then
    echo -e "${BLUE}🔍 Loading environment variables from .env.test...${NC}"
    set -o allexport
    source "$PROJECT_ROOT/.env.test"
    set +o allexport
  elif [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}🔍 .env.test file not found, using default environment variables...${NC}"
    set -o allexport
    source "$PROJECT_ROOT/.env"
    set +o allexport
  else
    echo -e "${YELLOW}⚠️  No .env.test or .env, aborting.${NC}"
    exit 1
  fi

  # Set UPTIME_KUMA_PORT and UPTIME_KUMA_URL from env vars or defaults
  # UPTIME_KUMA_PORT="${UPTIME_KUMA_PORT:-4001}"
  # UPTIME_KUMA_URL="http://localhost:${UPTIME_KUMA_PORT}"

  echo -e "${GREEN}✅ Environment variables loaded:${NC}"
  echo -e "  UPTIME_KUMA_PORT=${UPTIME_KUMA_PORT}"
  echo -e "  UPTIME_KUMA_URL=${UPTIME_KUMA_URL}\n"
}

# Function to start container
start_container() {
  echo -e "${BLUE}🐳 Starting Uptime Kuma container...${NC}"

  # Stop and remove any existing test container
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}Removing existing test container...${NC}"
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
  fi

  # Start fresh container with tmpfs for ephemeral storage
  docker run --rm -d \
    --name "$CONTAINER_NAME" \
    -p "${UPTIME_KUMA_PORT}:3001" \
    --tmpfs /app/data:rw,size=200m \
    -e UPTIME_KUMA_DB_TYPE=sqlite \
    -e UPTIME_KUMA_DB_NAME=kuma \
    -e UPTIME_KUMA_DB_USERNAME=kuma \
    -e UPTIME_KUMA_DB_PASSWORD=kuma \
    louislam/uptime-kuma:2 > /dev/null

  echo -e "${GREEN}✅ Container started (ID: $(docker ps -qf "name=${CONTAINER_NAME}"))${NC}\n"
}

# Function to wait for service to be ready
wait_for_service() {
  echo -e "${YELLOW}⏳ Waiting for Uptime Kuma to be ready...${NC}"

  local start_time=$(date +%s)
  local dots=0
  local setup_url="${UPTIME_KUMA_URL}/setup"

  while true; do
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))

    if [ $elapsed -gt $MAX_WAIT_TIME ]; then
      echo -e "\n${RED}❌ Timeout: Uptime Kuma did not become ready in ${MAX_WAIT_TIME}s${NC}"
      echo -e "${YELLOW}📋 Container logs:${NC}"
      docker logs "$CONTAINER_NAME" --tail 50
      exit 1
    fi

    # Check if setup endpoint returns 200
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$setup_url" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
      echo -e "\n${GREEN}✅ Uptime Kuma is ready!${NC}"
      break
    fi

    # Show progress
    echo -n "."
    dots=$((dots + 1))
    if [ $dots -ge 30 ]; then
      echo -n " ${elapsed}s"
      dots=0
    fi

    sleep 2
  done

  # Show container status
  echo -e "\n${BLUE}📊 Container Info:${NC}"
  echo -e "  Name: ${CONTAINER_NAME}"
  echo -e "  Status: $(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME")"
  echo -e "  Port: ${UPTIME_KUMA_PORT}"
  echo -e "  URL: ${UPTIME_KUMA_URL}"
  echo ""
}

# Function to run tests
run_tests() {
  echo -e "${BLUE}🧪 Running integration tests...${NC}\n"

  export AGENT=1

  # Run the tests
  cd "$PROJECT_ROOT"
  bun test tests/integration.test.ts
}

# Main execution
main() {
  # Register cleanup function to run on script exit
  trap cleanup EXIT INT TERM

  print_header
  check_docker
  load_env_vars
  start_container
  wait_for_service
  bun run scripts/setup-kuma-credentials.ts
  run_tests
}

# Run main function
main
