#!/bin/bash

# ======================================
# YuToDo Docker Local Development Script
# ======================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
COMMAND=""
TAG="latest"
ENVIRONMENT="dev"
CLEANUP=false

# Print usage
usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build           Build Docker image locally"
    echo "  run             Run container with development settings"
    echo "  test            Test Docker build and startup"
    echo "  publish         Test publishing workflow (local registry)"
    echo "  clean           Clean up Docker resources"
    echo "  logs            Show container logs"
    echo "  shell           Open shell in running container"
    echo ""
    echo "Options:"
    echo "  -t, --tag TAG         Docker image tag (default: latest)"
    echo "  -e, --env ENV         Environment: dev|prod (default: dev)"
    echo "  -c, --cleanup         Cleanup after operation"
    echo "  -h, --help           Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 build --tag test"
    echo "  $0 run --env prod"
    echo "  $0 test --cleanup"
}

# Print colored output
log() {
    local level=$1
    shift
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $*" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $*" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $*" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $*" ;;
    esac
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log "ERROR" "Docker daemon is not running"
        exit 1
    fi
}

# Build Docker image
build_image() {
    log "INFO" "Building Docker image with tag: yutodo-server:$TAG"
    
    cd "$(dirname "$0")/../server"
    
    docker build \
        --tag "yutodo-server:$TAG" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
        --build-arg VERSION="$TAG" \
        .
    
    log "INFO" "Build completed successfully"
}

# Run container
run_container() {
    local compose_file
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        compose_file="docker-compose.prod.yml"
        log "INFO" "Starting container in production mode"
    else
        compose_file="docker-compose.yml"
        log "INFO" "Starting container in development mode"
    fi
    
    cd "$(dirname "$0")/.."
    
    # Stop existing containers
    docker-compose -f "$compose_file" down 2>/dev/null || true
    
    # Start containers
    docker-compose -f "$compose_file" up -d
    
    # Wait for startup
    log "INFO" "Waiting for server to start..."
    sleep 5
    
    # Health check
    if docker-compose -f "$compose_file" exec yutodo-server node -e "
        const http = require('http');
        const options = { host: '0.0.0.0', port: 3001, timeout: 2000 };
        const request = http.request(options, (res) => {
            console.log('Health check passed');
            process.exit(0);
        });
        request.on('error', () => {
            console.log('Health check failed');
            process.exit(1);
        });
        request.end();
    " 2>/dev/null; then
        log "INFO" "Server is healthy and running on http://localhost:3001"
    else
        log "WARN" "Server may not be fully ready yet"
    fi
    
    log "INFO" "Run 'npm run tauri dev' to connect Tauri app"
}

# Test Docker setup
test_setup() {
    log "INFO" "Testing Docker setup..."
    
    # Build test image
    build_image
    
    # Test compose configs
    cd "$(dirname "$0")/.."
    
    log "INFO" "Validating docker-compose configurations..."
    docker-compose config > /dev/null
    docker-compose -f docker-compose.prod.yml config > /dev/null
    
    # Test container startup
    log "INFO" "Testing container startup..."
    run_container
    
    # Show logs
    sleep 2
    docker-compose logs yutodo-server | tail -n 20
    
    if [[ "$CLEANUP" == "true" ]]; then
        cleanup_resources
    fi
    
    log "INFO" "Test completed successfully"
}

# Test publish workflow (local registry)
test_publish() {
    log "INFO" "Testing publish workflow with local registry (simulating GHCR)..."
    
    # Start local registry
    docker run -d -p 5000:5000 --name local-registry registry:2 || true
    
    # Build and tag for local registry (simulating GHCR structure)
    build_image
    docker tag "yutodo-server:$TAG" "localhost:5000/yutodo/server:$TAG"
    
    # Push to local registry
    docker push "localhost:5000/yutodo/server:$TAG"
    
    # Test pulling and running
    docker rmi "localhost:5000/yutodo/server:$TAG" || true
    docker pull "localhost:5000/yutodo/server:$TAG"
    
    log "INFO" "Publish test completed successfully (GHCR simulation)"
    
    if [[ "$CLEANUP" == "true" ]]; then
        docker stop local-registry 2>/dev/null || true
        docker rm local-registry 2>/dev/null || true
    fi
}

# Clean up Docker resources
cleanup_resources() {
    log "INFO" "Cleaning up Docker resources..."
    
    cd "$(dirname "$0")/.."
    
    # Stop containers
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Remove test images
    docker rmi "yutodo-server:$TAG" 2>/dev/null || true
    docker rmi "localhost:5000/yutodo/server:$TAG" 2>/dev/null || true
    
    # Clean up system
    docker system prune -f
    
    log "INFO" "Cleanup completed"
}

# Show container logs
show_logs() {
    cd "$(dirname "$0")/.."
    
    local compose_file
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        compose_file="docker-compose.prod.yml"
    else
        compose_file="docker-compose.yml"
    fi
    
    docker-compose -f "$compose_file" logs -f yutodo-server
}

# Open shell in container
open_shell() {
    cd "$(dirname "$0")/.."
    
    local compose_file
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        compose_file="docker-compose.prod.yml"
    else
        compose_file="docker-compose.yml"
    fi
    
    docker-compose -f "$compose_file" exec yutodo-server sh
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        build|run|test|publish|clean|logs|shell)
            COMMAND="$1"
            shift
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -c|--cleanup)
            CLEANUP=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    log "ERROR" "No command specified"
    usage
    exit 1
fi

# Check Docker availability
check_docker

# Execute command
case $COMMAND in
    "build")
        build_image
        ;;
    "run")
        run_container
        ;;
    "test")
        test_setup
        ;;
    "publish")
        test_publish
        ;;
    "clean")
        cleanup_resources
        ;;
    "logs")
        show_logs
        ;;
    "shell")
        open_shell
        ;;
    *)
        log "ERROR" "Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac