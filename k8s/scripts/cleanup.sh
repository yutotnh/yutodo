#!/bin/bash

# YuToDo Kubernetes Cleanup Script
# This script removes YuToDo deployment from Kubernetes

set -euo pipefail

# Default values
NAMESPACE="yutodo"
RELEASE_NAME="yutodo"
DELETE_NAMESPACE=false
DELETE_PVC=false
FORCE=false

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
YuToDo Kubernetes Cleanup Script

Usage: $0 [OPTIONS]

Options:
    -n, --namespace NAMESPACE        Kubernetes namespace [default: yutodo]
    -r, --release RELEASE_NAME       Helm release name [default: yutodo]
    --delete-namespace              Delete the entire namespace
    --delete-pvc                    Delete persistent volume claims (data will be lost!)
    --force                         Skip confirmation prompts
    -h, --help                      Show this help message

Examples:
    # Remove deployment only
    $0

    # Remove deployment and PVCs (data loss)
    $0 --delete-pvc

    # Remove everything including namespace
    $0 --delete-namespace --delete-pvc --force

WARNING: 
    --delete-pvc will permanently delete all data!
    --delete-namespace will remove the entire namespace and all resources in it!
EOF
}

# Function to confirm action
confirm() {
    local message="$1"
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}$message${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Operation cancelled"
        exit 0
    fi
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
    
    print_success "All prerequisites met"
}

# Function to show current deployment status
show_status() {
    print_status "Current deployment status:"
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_warning "Namespace $NAMESPACE does not exist"
        return 0
    fi
    
    # Check if Helm release exists
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        print_status "Helm release found:"
        helm list -n "$NAMESPACE" | grep "$RELEASE_NAME"
        echo ""
        
        print_status "Resources in namespace $NAMESPACE:"
        kubectl get all -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo
        echo ""
        
        if kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo &> /dev/null; then
            print_status "Persistent Volume Claims:"
            kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo
            echo ""
        fi
    else
        print_warning "Helm release $RELEASE_NAME not found in namespace $NAMESPACE"
    fi
}

# Function to uninstall Helm release
uninstall_release() {
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        print_status "Uninstalling Helm release $RELEASE_NAME..."
        
        if helm uninstall "$RELEASE_NAME" -n "$NAMESPACE"; then
            print_success "Helm release uninstalled"
        else
            print_error "Failed to uninstall Helm release"
            return 1
        fi
    else
        print_warning "Helm release $RELEASE_NAME not found"
    fi
}

# Function to delete PVCs
delete_pvcs() {
    if [ "$DELETE_PVC" = true ]; then
        print_warning "This will permanently delete all data!"
        confirm "Delete Persistent Volume Claims?"
        
        print_status "Deleting PVCs..."
        
        local pvcs
        pvcs=$(kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo -o name 2>/dev/null || true)
        
        if [ -n "$pvcs" ]; then
            for pvc in $pvcs; do
                print_status "Deleting $pvc..."
                kubectl delete "$pvc" -n "$NAMESPACE"
            done
            print_success "PVCs deleted"
        else
            print_status "No PVCs found to delete"
        fi
    fi
}

# Function to delete secrets that might contain sensitive data
delete_secrets() {
    print_status "Cleaning up secrets..."
    
    local secrets
    secrets=$(kubectl get secrets -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo -o name 2>/dev/null || true)
    
    if [ -n "$secrets" ]; then
        for secret in $secrets; do
            print_status "Deleting $secret..."
            kubectl delete "$secret" -n "$NAMESPACE"
        done
        print_success "Secrets deleted"
    else
        print_status "No secrets found to delete"
    fi
}

# Function to delete configmaps
delete_configmaps() {
    print_status "Cleaning up ConfigMaps..."
    
    local cms
    cms=$(kubectl get configmaps -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo -o name 2>/dev/null || true)
    
    if [ -n "$cms" ]; then
        for cm in $cms; do
            print_status "Deleting $cm..."
            kubectl delete "$cm" -n "$NAMESPACE"
        done
        print_success "ConfigMaps deleted"
    else
        print_status "No ConfigMaps found to delete"
    fi
}

# Function to delete namespace
delete_namespace() {
    if [ "$DELETE_NAMESPACE" = true ]; then
        print_warning "This will delete the entire namespace and ALL resources in it!"
        confirm "Delete namespace $NAMESPACE?"
        
        print_status "Deleting namespace $NAMESPACE..."
        
        if kubectl delete namespace "$NAMESPACE"; then
            print_success "Namespace deleted"
        else
            print_error "Failed to delete namespace"
            return 1
        fi
    fi
}

# Function to clean up any remaining resources
cleanup_remaining() {
    if [ "$DELETE_NAMESPACE" = true ]; then
        return 0  # Namespace deletion takes care of everything
    fi
    
    print_status "Cleaning up remaining resources..."
    
    # Delete any remaining pods
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo -o name 2>/dev/null || true)
    if [ -n "$pods" ]; then
        print_status "Deleting remaining pods..."
        kubectl delete $pods -n "$NAMESPACE" --grace-period=30
    fi
    
    # Delete any remaining services
    local svcs
    svcs=$(kubectl get services -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo -o name 2>/dev/null || true)
    if [ -n "$svcs" ]; then
        print_status "Deleting remaining services..."
        kubectl delete $svcs -n "$NAMESPACE"
    fi
    
    # Delete any remaining ingresses
    local ingresses
    ingresses=$(kubectl get ingresses -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo -o name 2>/dev/null || true)
    if [ -n "$ingresses" ]; then
        print_status "Deleting remaining ingresses..."
        kubectl delete $ingresses -n "$NAMESPACE"
    fi
    
    print_success "Cleanup completed"
}

# Function to verify cleanup
verify_cleanup() {
    print_status "Verifying cleanup..."
    
    if [ "$DELETE_NAMESPACE" = true ]; then
        if kubectl get namespace "$NAMESPACE" &> /dev/null; then
            print_warning "Namespace still exists (may be in terminating state)"
        else
            print_success "Namespace successfully deleted"
        fi
        return 0
    fi
    
    # Check for remaining resources
    local remaining
    remaining=$(kubectl get all -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo 2>/dev/null || true)
    
    if [ -n "$remaining" ]; then
        print_warning "Some resources may still exist:"
        echo "$remaining"
    else
        print_success "All YuToDo resources have been removed"
    fi
    
    # Check for remaining PVCs if we didn't delete them
    if [ "$DELETE_PVC" = false ]; then
        local pvcs
        pvcs=$(kubectl get pvc -n "$NAMESPACE" -l app.kubernetes.io/name=yutodo 2>/dev/null || true)
        if [ -n "$pvcs" ]; then
            print_warning "Persistent Volume Claims still exist (data preserved):"
            echo "$pvcs"
            echo ""
            print_status "To delete PVCs and data, run: $0 --delete-pvc"
        fi
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        --delete-namespace)
            DELETE_NAMESPACE=true
            shift
            ;;
        --delete-pvc)
            DELETE_PVC=true
            shift
            ;;
        --force)
            FORCE=true
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

# Main execution
print_status "Starting YuToDo cleanup..."
print_status "Namespace: $NAMESPACE"
print_status "Release: $RELEASE_NAME"

if [ "$DELETE_PVC" = true ]; then
    print_warning "PVCs will be deleted (DATA LOSS!)"
fi

if [ "$DELETE_NAMESPACE" = true ]; then
    print_warning "Namespace will be deleted"
fi

check_prerequisites
show_status

# Confirm the cleanup operation
if [ "$FORCE" = false ]; then
    echo ""
    confirm "Proceed with cleanup?"
fi

# Perform cleanup
uninstall_release

if [ "$DELETE_NAMESPACE" = true ]; then
    delete_namespace
else
    delete_secrets
    delete_configmaps
    delete_pvcs
    cleanup_remaining
fi

verify_cleanup

print_success "YuToDo cleanup completed!"

# Show what to do next
if [ "$DELETE_PVC" = false ] && [ "$DELETE_NAMESPACE" = false ]; then
    echo ""
    print_status "Note: Data has been preserved in PVCs"
    print_status "To redeploy with existing data, run the deploy script again"
fi