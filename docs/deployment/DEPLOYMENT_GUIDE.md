# EIDF CRM Deployment Guide

This comprehensive guide covers the complete deployment process for EIDF CRM to a staging environment using AWS, Terraform, Kubernetes, and Helm.

## Table of Contents

1. [Prerequisites and Environment Setup](#prerequisites-and-environment-setup)
2. [Infrastructure Deployment with Terraform](#infrastructure-deployment-with-terraform)
3. [Kubernetes Cluster Setup](#kubernetes-cluster-setup)
4. [Application Deployment with Helm](#application-deployment-with-helm)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring Setup](#monitoring-setup)
7. [Troubleshooting](#troubleshooting)

## Prerequisites and Environment Setup

### Required Tools

Ensure the following tools are installed on your local machine:

```bash
# Check tool versions
aws --version          # AWS CLI v2.x
terraform --version    # Terraform >= 1.6.0
kubectl version        # Kubernetes CLI v1.28+
helm version          # Helm v3.x
docker --version      # Docker v20.x+
git --version         # Git v2.x+
```

### Installation Commands

#### macOS
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install awscli terraform kubectl helm docker git
```

#### Linux (Ubuntu/Debian)
```bash
# Update package manager
sudo apt update

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### AWS Configuration

1. **Configure AWS credentials:**
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: eu-west-1
# Default output format: json
```

2. **Verify AWS access:**
```bash
aws sts get-caller-identity
```

### Environment Variables

Create a `.env` file for deployment configuration:

```bash
cat > .env.staging << EOF
# AWS Configuration
export AWS_REGION=eu-west-1
export AWS_PROFILE=default

# Terraform Configuration
export TF_VAR_environment=staging
export TF_VAR_domain_name=staging.eidf-crm.com
export TF_VAR_alarm_email=dev-alerts@eidf-crm.com

# Kubernetes Configuration
export KUBECONFIG=~/.kube/config-eidf-staging

# Application Configuration
export DOCKER_REGISTRY=ghcr.io
export DOCKER_ORG=eidf-crm
export APP_VERSION=latest

# Secrets (replace with actual values)
export STRIPE_SECRET_KEY=sk_test_your_key_here
export STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
export GEMINI_API_KEY=your_gemini_api_key_here
EOF

# Load environment variables
source .env.staging
```

## Infrastructure Deployment with Terraform

### 1. Initialize Terraform Backend

Create S3 bucket for Terraform state:

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://eidf-crm-terraform-state-${AWS_REGION} --region ${AWS_REGION}

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket eidf-crm-terraform-state-${AWS_REGION} \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name eidf-crm-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --region ${AWS_REGION}
```

### 2. Prepare Terraform Configuration

```bash
cd terraform/

# Initialize Terraform with backend configuration
terraform init \
  -backend-config="bucket=eidf-crm-terraform-state-${AWS_REGION}" \
  -backend-config="key=staging/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=eidf-crm-terraform-locks"

# Validate configuration
terraform validate

# Review planned changes
terraform plan -var-file=environments/staging.tfvars
```

### 3. Deploy Infrastructure

```bash
# Apply Terraform configuration
terraform apply -var-file=environments/staging.tfvars -auto-approve

# Save outputs for later use
terraform output -json > ../terraform-outputs.json
```

### 4. Verify Infrastructure

```bash
# Check created resources
aws eks describe-cluster --name eidf-crm-staging --region ${AWS_REGION}
aws rds describe-db-instances --region ${AWS_REGION} | jq '.DBInstances[] | select(.DBInstanceIdentifier | contains("eidf-crm-staging"))'
aws elasticache describe-cache-clusters --region ${AWS_REGION}
```

## Kubernetes Cluster Setup

### 1. Configure kubectl for EKS

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region ${AWS_REGION} \
  --name eidf-crm-staging \
  --kubeconfig ${KUBECONFIG}

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### 2. Install Essential Kubernetes Components

#### Install NGINX Ingress Controller
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true \
  --set controller.podAnnotations."prometheus\.io/port"=10254
```

#### Install Cert-Manager for SSL/TLS
```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true

# Create Let's Encrypt ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${TF_VAR_alarm_email}
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

#### Install External Secrets Operator
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# Create SecretStore for AWS Secrets Manager
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: eidf-crm
spec:
  provider:
    aws:
      service: SecretsManager
      region: ${AWS_REGION}
      auth:
        jwt:
          serviceAccountRef:
            name: eidf-crm-secrets
EOF
```

### 3. Create Application Namespace and ConfigMaps

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create ConfigMap for application configuration
kubectl create configmap app-config \
  --namespace eidf-crm \
  --from-literal=NODE_ENV=staging \
  --from-literal=LOG_LEVEL=info \
  --from-literal=AWS_REGION=${AWS_REGION} \
  --from-literal=REDIS_HOST=$(terraform output -raw redis_endpoint) \
  --from-literal=DATABASE_HOST=$(terraform output -raw rds_endpoint | cut -d: -f1) \
  --from-literal=DATABASE_PORT=5432 \
  --from-literal=DATABASE_NAME=eidf_crm
```

## Application Deployment with Helm

### 1. Build and Push Docker Images

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Build and push Gateway service
docker build -t ${DOCKER_REGISTRY}/${DOCKER_ORG}/gateway:${APP_VERSION} \
  -f services/gateway/Dockerfile \
  services/gateway/
docker push ${DOCKER_REGISTRY}/${DOCKER_ORG}/gateway:${APP_VERSION}

# Build and push Organization service
docker build -t ${DOCKER_REGISTRY}/${DOCKER_ORG}/organization:${APP_VERSION} \
  -f services/organization/Dockerfile \
  services/organization/
docker push ${DOCKER_REGISTRY}/${DOCKER_ORG}/organization:${APP_VERSION}

# Build and push frontend
docker build -t ${DOCKER_REGISTRY}/${DOCKER_ORG}/frontend:${APP_VERSION} \
  -f Dockerfile.frontend .
docker push ${DOCKER_REGISTRY}/${DOCKER_ORG}/frontend:${APP_VERSION}
```

### 2. Create Helm Values for Staging

```bash
cat > helm/values-staging.yaml << EOF
# Staging environment values
global:
  environment: staging
  
image:
  registry: ${DOCKER_REGISTRY}
  repository: ${DOCKER_ORG}
  tag: ${APP_VERSION}
  pullPolicy: Always

services:
  gateway:
    replicaCount: 2
    resources:
      requests:
        memory: "256Mi"
        cpu: "200m"
      limits:
        memory: "512Mi"
        cpu: "400m"
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 5
      targetCPUUtilizationPercentage: 70

  organization:
    replicaCount: 2
    resources:
      requests:
        memory: "256Mi"
        cpu: "200m"
      limits:
        memory: "512Mi"
        cpu: "400m"

  billing:
    replicaCount: 1
    resources:
      requests:
        memory: "256Mi"
        cpu: "200m"
      limits:
        memory: "512Mi"
        cpu: "400m"

  analytics:
    replicaCount: 1
    resources:
      requests:
        memory: "512Mi"
        cpu: "300m"
      limits:
        memory: "1Gi"
        cpu: "600m"

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "50"
  hosts:
    - host: api.staging.eidf-crm.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: eidf-crm-staging-tls
      hosts:
        - api.staging.eidf-crm.com

# External services (RDS, ElastiCache)
postgresql:
  enabled: false
  external:
    host: $(terraform output -raw rds_endpoint | cut -d: -f1)
    port: 5432
    database: eidf_crm

redis:
  enabled: false
  external:
    host: $(terraform output -raw redis_endpoint)
    port: 6379

config:
  nodeEnv: staging
  logLevel: debug
EOF
```

### 3. Deploy Application with Helm

```bash
# Create secrets
kubectl create secret generic app-secrets \
  --namespace eidf-crm \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=ENCRYPTION_KEY=$(openssl rand -base64 32) \
  --from-literal=DATABASE_PASSWORD=$(terraform output -raw rds_password) \
  --from-literal=REDIS_PASSWORD=$(terraform output -raw redis_auth_token) \
  --from-literal=STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY} \
  --from-literal=STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET} \
  --from-literal=GEMINI_API_KEY=${GEMINI_API_KEY}

# Deploy application
helm upgrade --install eidf-crm ./helm/eidf-crm \
  --namespace eidf-crm \
  --values helm/values-staging.yaml \
  --wait \
  --timeout 10m
```

### 4. Run Database Migrations

```bash
# Create migration job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: database-migration-$(date +%s)
  namespace: eidf-crm
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: ${DOCKER_REGISTRY}/${DOCKER_ORG}/migrations:${APP_VERSION}
        command: ["npm", "run", "migrate:deploy"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_URL
EOF

# Wait for migration to complete
kubectl wait --for=condition=complete job/database-migration-* -n eidf-crm --timeout=300s
```

## Post-Deployment Verification

### 1. Check Deployment Status

```bash
# Check all pods are running
kubectl get pods -n eidf-crm
kubectl get deployments -n eidf-crm
kubectl get services -n eidf-crm

# Check ingress
kubectl get ingress -n eidf-crm

# Get load balancer URL
export APP_URL=$(kubectl get ingress -n eidf-crm -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')
echo "Application URL: https://${APP_URL}"
```

### 2. Run Smoke Tests

```bash
# Health check endpoints
curl -f https://api.staging.eidf-crm.com/health || echo "Gateway health check failed"
curl -f https://api.staging.eidf-crm.com/api/organization/health || echo "Organization service health check failed"
curl -f https://api.staging.eidf-crm.com/api/billing/health || echo "Billing service health check failed"
curl -f https://api.staging.eidf-crm.com/api/analytics/health || echo "Analytics service health check failed"

# Run automated smoke tests
./scripts/smoke-tests.sh https://api.staging.eidf-crm.com
```

### 3. Verify Database Connectivity

```bash
# Check database connection from a pod
kubectl run -it --rm psql-test \
  --image=postgres:15 \
  --namespace=eidf-crm \
  --env="PGPASSWORD=$(kubectl get secret app-secrets -n eidf-crm -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 -d)" \
  -- psql -h $(terraform output -raw rds_endpoint | cut -d: -f1) -U postgres -d eidf_crm -c "SELECT version();"
```

### 4. Check Application Logs

```bash
# View logs for each service
kubectl logs -l app=gateway -n eidf-crm --tail=100
kubectl logs -l app=organization -n eidf-crm --tail=100
kubectl logs -l app=billing -n eidf-crm --tail=100
kubectl logs -l app=analytics -n eidf-crm --tail=100
```

## Monitoring Setup

### 1. Deploy Prometheus and Grafana

```bash
# Add Prometheus community repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set grafana.adminPassword=admin \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.size=10Gi
```

### 2. Configure Service Monitors

```bash
# Create ServiceMonitor for application metrics
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: eidf-crm-services
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
    - eidf-crm
  selector:
    matchLabels:
      app.kubernetes.io/name: eidf-crm
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
EOF
```

### 3. Deploy Application Dashboards

```bash
# Create ConfigMap with Grafana dashboards
kubectl create configmap eidf-crm-dashboards \
  --namespace monitoring \
  --from-file=monitoring/dashboards/

# Label ConfigMap for auto-discovery
kubectl label configmap eidf-crm-dashboards \
  --namespace monitoring \
  grafana_dashboard=1
```

### 4. Setup Alerts

```bash
# Apply alert rules
kubectl apply -f monitoring/alerts/service-alerts.yml
```

### 5. Access Monitoring Tools

```bash
# Port-forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 &

# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090 &

echo "Grafana: http://localhost:3000 (admin/admin)"
echo "Prometheus: http://localhost:9090"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n eidf-crm

# Check events
kubectl get events -n eidf-crm --sort-by='.lastTimestamp'

# Check resource quotas
kubectl describe resourcequota -n eidf-crm
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
kubectl run -it --rm debug \
  --image=postgres:15 \
  --namespace=eidf-crm \
  -- psql postgresql://postgres@<rds-endpoint>:5432/eidf_crm

# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

#### 3. Service Discovery Issues
```bash
# Check service endpoints
kubectl get endpoints -n eidf-crm

# Test DNS resolution
kubectl run -it --rm dnsutils \
  --image=gcr.io/kubernetes-e2e-test-images/dnsutils:1.3 \
  --namespace=eidf-crm \
  -- nslookup gateway.eidf-crm.svc.cluster.local
```

#### 4. Ingress/SSL Issues
```bash
# Check certificate status
kubectl describe certificate -n eidf-crm

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

### Rollback Procedures

#### Application Rollback
```bash
# List Helm releases
helm list -n eidf-crm

# Rollback to previous version
helm rollback eidf-crm -n eidf-crm

# Rollback to specific revision
helm rollback eidf-crm 3 -n eidf-crm
```

#### Infrastructure Rollback
```bash
cd terraform/
# Review current state
terraform show

# Rollback to previous state
terraform apply -var-file=environments/staging.tfvars -refresh=true
```

### Cleanup (if needed)

```bash
# Delete application
helm uninstall eidf-crm -n eidf-crm

# Delete infrastructure
cd terraform/
terraform destroy -var-file=environments/staging.tfvars

# Clean up namespace
kubectl delete namespace eidf-crm
```

## Security Checklist

- [ ] All secrets are stored in AWS Secrets Manager or Kubernetes secrets
- [ ] Network policies are configured to restrict pod-to-pod communication
- [ ] RBAC is properly configured with least privilege principle
- [ ] All container images are scanned for vulnerabilities
- [ ] SSL/TLS is enabled for all external endpoints
- [ ] Database connections use SSL
- [ ] Regular security updates are applied to cluster nodes
- [ ] Pod security policies are enforced
- [ ] Audit logging is enabled for the cluster

## Maintenance Tasks

### Daily
- Monitor application logs and metrics
- Check backup completion status
- Review error rates and response times

### Weekly
- Review and apply security patches
- Update container images if needed
- Review resource utilization and costs

### Monthly
- Disaster recovery drill
- Performance optimization review
- Security audit
- Cost optimization review

## Support and Documentation

- **Internal Wiki**: https://wiki.eidf-crm.com/deployment
- **Runbook**: https://runbook.eidf-crm.com
- **On-call Schedule**: https://oncall.eidf-crm.com
- **Incident Response**: Follow the incident response procedure in INCIDENT_RESPONSE.md

## Conclusion

This deployment guide provides a complete pathway from infrastructure provisioning to application deployment and monitoring setup. Always test deployments in staging before promoting to production, and maintain proper backup and rollback procedures.

For production deployments, ensure you have:
1. Reviewed and updated all security configurations
2. Configured proper backup and disaster recovery
3. Set up comprehensive monitoring and alerting
4. Documented any environment-specific configurations
5. Validated performance under expected load

Remember to keep this guide updated as the deployment process evolves.