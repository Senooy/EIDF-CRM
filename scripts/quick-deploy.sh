#!/bin/bash

# EIDF CRM Quick Deployment Script
# This script automates the deployment process for staging environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
SKIP_INFRA=${3:-false}

function print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

function print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

function print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
function check_prerequisites() {
    print_header "Checking prerequisites"
    
    # Check required tools
    local tools=("terraform" "kubectl" "helm" "aws" "docker")
    for tool in "${tools[@]}"; do
        if command -v $tool &> /dev/null; then
            print_success "$tool is installed"
        else
            print_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if aws sts get-caller-identity &> /dev/null; then
        print_success "AWS credentials configured"
    else
        print_error "AWS credentials not configured"
        exit 1
    fi
}

# Deploy infrastructure
function deploy_infrastructure() {
    if [ "$SKIP_INFRA" = "true" ]; then
        print_warning "Skipping infrastructure deployment"
        return
    fi
    
    print_header "Deploying infrastructure with Terraform"
    
    cd terraform
    
    # Initialize Terraform
    terraform init -backend-config="environments/${ENVIRONMENT}-backend.conf"
    
    # Plan
    terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out=tfplan
    
    # Apply
    read -p "Do you want to apply the Terraform plan? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        terraform apply tfplan
        print_success "Infrastructure deployed"
    else
        print_warning "Infrastructure deployment cancelled"
    fi
    
    cd ..
}

# Configure kubectl
function configure_kubectl() {
    print_header "Configuring kubectl"
    
    aws eks update-kubeconfig --name eidf-crm-${ENVIRONMENT} --region eu-west-1
    
    # Verify connection
    if kubectl get nodes &> /dev/null; then
        print_success "Connected to Kubernetes cluster"
        kubectl get nodes
    else
        print_error "Failed to connect to Kubernetes cluster"
        exit 1
    fi
}

# Build and push Docker images
function build_and_push_images() {
    print_header "Building and pushing Docker images"
    
    # Login to GitHub Container Registry
    echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin
    
    # Build and push each service
    local services=("gateway" "auth" "organization" "woocommerce" "billing" "analytics" "ai")
    
    for service in "${services[@]}"; do
        print_warning "Building $service..."
        docker build -t ghcr.io/${GITHUB_USER}/eidf-crm/${service}:${VERSION} -f services/${service}/Dockerfile .
        docker push ghcr.io/${GITHUB_USER}/eidf-crm/${service}:${VERSION}
        print_success "$service image pushed"
    done
}

# Deploy with Helm
function deploy_helm() {
    print_header "Deploying application with Helm"
    
    # Create namespace if not exists
    kubectl create namespace eidf-crm --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy secrets
    kubectl apply -f kubernetes/secrets/${ENVIRONMENT}-secrets.yaml -n eidf-crm
    
    # Deploy with Helm
    helm upgrade --install eidf-crm ./helm/eidf-crm \
        -f helm/eidf-crm/values.yaml \
        -f helm/eidf-crm/values-${ENVIRONMENT}.yaml \
        --set image.tag=${VERSION} \
        -n eidf-crm \
        --wait \
        --timeout 10m
    
    print_success "Application deployed"
}

# Run database migrations
function run_migrations() {
    print_header "Running database migrations"
    
    kubectl run migrations \
        --image=ghcr.io/${GITHUB_USER}/eidf-crm/gateway:${VERSION} \
        --rm -it \
        --restart=Never \
        -n eidf-crm \
        -- npm run migrate:deploy
    
    print_success "Migrations completed"
}

# Verify deployment
function verify_deployment() {
    print_header "Verifying deployment"
    
    # Check pod status
    print_warning "Checking pod status..."
    kubectl get pods -n eidf-crm
    
    # Wait for all pods to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=eidf-crm -n eidf-crm --timeout=300s
    
    # Run smoke tests
    print_warning "Running smoke tests..."
    ./scripts/smoke-tests.sh https://api-${ENVIRONMENT}.eidf-crm.com
    
    print_success "Deployment verified"
}

# Setup monitoring
function setup_monitoring() {
    print_header "Setting up monitoring"
    
    # Deploy Prometheus and Grafana if not exists
    if ! helm list -n monitoring | grep -q prometheus; then
        helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
            -f monitoring/prometheus-values.yaml \
            -n monitoring \
            --create-namespace
        print_success "Prometheus deployed"
    fi
    
    # Apply service monitors
    kubectl apply -f monitoring/service-monitors/ -n eidf-crm
    
    print_success "Monitoring configured"
}

# Main deployment flow
function main() {
    print_header "EIDF CRM Deployment - Environment: ${ENVIRONMENT}, Version: ${VERSION}"
    
    check_prerequisites
    deploy_infrastructure
    configure_kubectl
    build_and_push_images
    deploy_helm
    run_migrations
    verify_deployment
    setup_monitoring
    
    print_header "Deployment completed successfully!"
    echo ""
    echo "Application URL: https://api-${ENVIRONMENT}.eidf-crm.com"
    echo "Monitoring URL: https://grafana-${ENVIRONMENT}.eidf-crm.com"
    echo ""
    print_warning "Don't forget to:"
    echo "- Update DNS records if needed"
    echo "- Configure Stripe webhooks"
    echo "- Test the application thoroughly"
    echo "- Monitor logs and metrics"
}

# Run main function
main