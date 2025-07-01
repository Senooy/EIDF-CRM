#!/bin/bash
set -e

# Script to deploy EIDF-CRM to Kubernetes
# Usage: ./deploy.sh [environment] [version]

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
NAMESPACE="eidf-crm"

echo "🚀 Deploying EIDF-CRM to $ENVIRONMENT environment"
echo "Version: $VERSION"
echo "Namespace: $NAMESPACE"

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl is required but not installed."; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "❌ helm is required but not installed."; exit 1; }

# Set kubectl context based on environment
case $ENVIRONMENT in
  production)
    CONTEXT="arn:aws:eks:eu-west-1:123456789:cluster/eidf-crm-production"
    VALUES_FILE="helm/values-production.yaml"
    ;;
  staging)
    CONTEXT="arn:aws:eks:eu-west-1:123456789:cluster/eidf-crm-staging"
    VALUES_FILE="helm/values-staging.yaml"
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

echo "📋 Setting kubectl context..."
kubectl config use-context $CONTEXT

# Create namespace if it doesn't exist
echo "📁 Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Install/Update Helm dependencies
echo "📦 Installing Helm dependencies..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Deploy infrastructure components
echo "🔧 Deploying infrastructure components..."

# PostgreSQL
helm upgrade --install postgresql bitnami/postgresql \
  --namespace $NAMESPACE \
  --values helm/infrastructure/postgresql-values.yaml \
  --wait

# Redis
helm upgrade --install redis bitnami/redis \
  --namespace $NAMESPACE \
  --values helm/infrastructure/redis-values.yaml \
  --wait

# RabbitMQ
helm upgrade --install rabbitmq bitnami/rabbitmq \
  --namespace $NAMESPACE \
  --values helm/infrastructure/rabbitmq-values.yaml \
  --wait

# Deploy monitoring stack
echo "📊 Deploying monitoring stack..."
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values helm/monitoring/prometheus-values.yaml \
  --wait

# Deploy application
echo "🎯 Deploying EIDF-CRM application..."
helm upgrade --install eidf-crm ./helm/eidf-crm \
  --namespace $NAMESPACE \
  --values $VALUES_FILE \
  --set image.tag=$VERSION \
  --wait

# Run database migrations
echo "🗃️ Running database migrations..."
kubectl run migrations \
  --image=ghcr.io/eidf-crm/migrations:$VERSION \
  --namespace=$NAMESPACE \
  --rm -it \
  --restart=Never \
  -- npm run migrate:prod

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s \
  deployment/gateway \
  deployment/organization-service \
  deployment/billing-service \
  deployment/analytics-service \
  --namespace=$NAMESPACE

# Get load balancer URL
echo "🌐 Getting application URL..."
APP_URL=$(kubectl get svc gateway-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if [ -z "$APP_URL" ]; then
  APP_URL=$(kubectl get svc gateway-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
fi

echo "✅ Deployment complete!"
echo "Application URL: http://$APP_URL"
echo ""
echo "📝 Post-deployment checklist:"
echo "  - [ ] Run smoke tests: ./scripts/smoke-tests.sh $APP_URL"
echo "  - [ ] Check monitoring dashboards"
echo "  - [ ] Verify database connections"
echo "  - [ ] Test API endpoints"