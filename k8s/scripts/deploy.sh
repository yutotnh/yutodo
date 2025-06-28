#!/bin/bash

# YuToDo Kubernetes Deployment Script
# This script deploys YuToDo to Kubernetes using Helm

set -euo pipefail

# Default values
NAMESPACE="yutodo"
ENVIRONMENT="development"
RELEASE_NAME="yutodo"
CHART_PATH="./helm/yutodo"
DRY_RUN=false
UPGRADE=false
WAIT=true
TIMEOUT="600s"
VERIFY=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    cat << EOF
YuToDo Kubernetes Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENVIRONMENT    Environment to deploy (development|staging|production) [default: development]
    -n, --namespace NAMESPACE        Kubernetes namespace [default: yutodo]
    -r, --release RELEASE_NAME       Helm release name [default: yutodo]
    -c, --chart PATH                 Path to Helm chart [default: ./helm/yutodo]
    -u, --upgrade                    Upgrade existing release
    -d, --dry-run                    Perform a dry run
    --no-wait                        Don't wait for deployment to complete
    --timeout TIMEOUT               Timeout for deployment [default: 600s]
    --verify                         Verify the deployment after installation
    -h, --help                       Show this help message

Examples:
    # Deploy to development environment
    $0 --environment development

    # Deploy to production with upgrade
    $0 --environment production --upgrade --verify

    # Dry run for staging
    $0 --environment staging --dry-run

    # Custom namespace and release name
    $0 --namespace my-yutodo --release my-release
EOF
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        print_error "Helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if chart directory exists
    if [ ! -d "$CHART_PATH" ]; then
        print_error "Chart directory $CHART_PATH does not exist"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    print_status "Checking namespace $NAMESPACE..."
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_status "Creating namespace $NAMESPACE..."
        kubectl create namespace "$NAMESPACE"
        
        # Add labels to namespace
        kubectl label namespace "$NAMESPACE" \
            app.kubernetes.io/name=yutodo \
            app.kubernetes.io/environment="$ENVIRONMENT" \
            --overwrite
        
        print_success "Namespace $NAMESPACE created"
    else
        print_status "Namespace $NAMESPACE already exists"
    fi
}

# Function to install/upgrade Helm dependencies
install_dependencies() {
    print_status "Installing Helm dependencies..."
    cd "$CHART_PATH"
    helm dependency update
    cd - > /dev/null
    print_success "Dependencies installed"
}

# Function to validate Helm chart
validate_chart() {
    print_status "Validating Helm chart..."
    
    # Lint the chart
    if ! helm lint "$CHART_PATH" --values "$CHART_PATH/values-$ENVIRONMENT.yaml"; then
        print_error "Helm chart validation failed"
        exit 1
    fi
    
    print_success "Chart validation passed"
}

# Function to deploy or upgrade
deploy() {
    local cmd="install"
    local args=""
    
    if [ "$UPGRADE" = true ]; then
        cmd="upgrade"
        args="--install"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        args="$args --dry-run"
    fi
    
    if [ "$WAIT" = true ]; then
        args="$args --wait --timeout=$TIMEOUT"
    fi
    
    print_status "Deploying YuToDo to $ENVIRONMENT environment..."
    
    # Construct Helm command
    helm_cmd="helm $cmd $args \
        $RELEASE_NAME \
        $CHART_PATH \
        --namespace $NAMESPACE \
        --values $CHART_PATH/values.yaml \
        --values $CHART_PATH/values-$ENVIRONMENT.yaml \
        --set app.environment=$ENVIRONMENT \
        --set image.tag=\${IMAGE_TAG:-latest}"
    
    print_status "Executing: $helm_cmd"
    
    if ! eval "$helm_cmd"; then
        print_error "Deployment failed"
        exit 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        print_success "Dry run completed successfully"
    else
        print_success "Deployment completed successfully"
    fi
}

# Function to verify deployment
verify_deployment() {
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    print_status "Verifying deployment..."
    
    # Wait for pods to be ready
    print_status "Waiting for pods to be ready..."
    if ! kubectl wait --for=condition=ready pod \
        -l app.kubernetes.io/name=yutodo \
        -n "$NAMESPACE" \
        --timeout=300s; then
        print_error "Pods did not become ready in time"
        return 1
    fi
    
    # Run Helm tests
    print_status "Running Helm tests..."
    if ! helm test "$RELEASE_NAME" -n "$NAMESPACE"; then
        print_warning "Some tests failed, but deployment may still be functional"
    else
        print_success "All tests passed"
    fi
    
    # Show deployment status
    print_status "Deployment status:"
    kubectl get pods,svc,ingress -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo
    
    print_success "Verification completed"
}

# Function to show post-deployment information
show_info() {
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    print_status "Deployment Information:"
    echo "========================"
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Release: $RELEASE_NAME"
    echo ""
    
    # Get service information
    if kubectl get service "$RELEASE_NAME" -n "$NAMESPACE" &> /dev/null; then
        echo "Service:"
        kubectl get service "$RELEASE_NAME" -n "$NAMESPACE"
        echo ""
    fi
    
    # Get ingress information
    if kubectl get ingress "$RELEASE_NAME" -n "$NAMESPACE" &> /dev/null; then
        echo "Ingress:"
        kubectl get ingress "$RELEASE_NAME" -n "$NAMESPACE"
        echo ""
        
        # Show URLs
        local hosts
        hosts=$(kubectl get ingress "$RELEASE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.rules[*].host}')
        if [ -n "$hosts" ]; then
            echo "Access URLs:"
            for host in $hosts; do
                echo "  https://$host"
            done
            echo ""
        fi
    fi
    
    # Show how to access logs
    echo "To view logs:"
    echo "  kubectl logs -f deployment/$RELEASE_NAME -n $NAMESPACE"
    echo ""
    echo "To access the application locally:"
    echo "  kubectl port-forward service/$RELEASE_NAME 3001:3001 -n $NAMESPACE"
    echo "  Then open http://localhost:3001"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -c|--chart)
            CHART_PATH="$2"
            shift 2
            ;;
        -u|--upgrade)
            UPGRADE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-wait)
            WAIT=false
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Must be one of: development, staging, production"
    exit 1
fi

# Check if values file exists for the environment
if [ ! -f "$CHART_PATH/values-$ENVIRONMENT.yaml" ]; then
    print_error "Values file for environment $ENVIRONMENT not found: $CHART_PATH/values-$ENVIRONMENT.yaml"
    exit 1
fi

# Main execution
print_status "Starting YuToDo deployment..."
print_status "Environment: $ENVIRONMENT"
print_status "Namespace: $NAMESPACE"
print_status "Release: $RELEASE_NAME"
print_status "Chart: $CHART_PATH"

check_prerequisites
create_namespace
install_dependencies
validate_chart
deploy

if [ "$VERIFY" = true ]; then
    verify_deployment
fi

show_info

print_success "YuToDo deployment script completed!"