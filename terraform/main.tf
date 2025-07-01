terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "s3" {
    # Backend configuration is provided via CLI flags
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "EIDF-CRM"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local variables
locals {
  cluster_name = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    CreatedBy   = "Terraform"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  
  availability_zones = data.aws_availability_zones.available.names
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = local.cluster_name
  cluster_version = var.kubernetes_version
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  node_groups = var.node_groups
  
  tags = local.common_tags
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"
  
  identifier     = "${var.project_name}-${var.environment}"
  engine_version = var.postgres_version
  instance_class = var.rds_instance_class
  
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  
  database_name = "eidf_crm"
  username      = "postgres"
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]
  
  backup_retention_period = var.backup_retention_days
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = var.environment == "production"
  deletion_protection    = var.environment == "production"
  
  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/elasticache"
  
  cluster_id           = "${var.project_name}-${var.environment}"
  engine_version       = var.redis_version
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_nodes
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]
  
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"
  
  tags = local.common_tags
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"
  
  project_name = var.project_name
  environment  = var.environment
  
  buckets = {
    assets = {
      versioning = true
      lifecycle_rules = [{
        id      = "delete-old-versions"
        enabled = true
        noncurrent_version_expiration_days = 30
      }]
    }
    backups = {
      versioning = true
      lifecycle_rules = [{
        id      = "archive-old-backups"
        enabled = true
        transition_days = 30
        transition_storage_class = "GLACIER"
      }]
    }
  }
  
  tags = local.common_tags
}

# Route53 DNS
module "route53" {
  source = "./modules/route53"
  
  domain_name = var.domain_name
  
  records = {
    # Main application
    "app" = {
      type = "CNAME"
      ttl  = 300
      records = [module.eks.load_balancer_dns]
    }
    # API endpoint
    "api" = {
      type = "CNAME"
      ttl  = 300
      records = [module.eks.load_balancer_dns]
    }
  }
  
  tags = local.common_tags
}

# CloudWatch Monitoring
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment  = var.environment
  
  alarm_email = var.alarm_email
  
  # EKS metrics
  eks_cluster_name = module.eks.cluster_name
  
  # RDS metrics
  rds_instance_id = module.rds.instance_id
  
  # Redis metrics
  redis_cluster_id = module.redis.cluster_id
  
  tags = local.common_tags
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"
  
  project_name = var.project_name
  environment  = var.environment
  
  eks_cluster_oidc_issuer_url = module.eks.cluster_oidc_issuer_url
  
  service_accounts = {
    "gateway" = {
      namespace = "eidf-crm"
      policies = [
        "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
      ]
    }
    "billing" = {
      namespace = "eidf-crm"
      policies = [
        "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
      ]
    }
  }
  
  tags = local.common_tags
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${var.project_name}-${var.environment}-secrets"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  
  secret_string = jsonencode({
    database_password = module.rds.password
    redis_auth_token  = module.redis.auth_token
    jwt_secret       = random_password.jwt_secret.result
    encryption_key   = random_password.encryption_key.result
  })
}

# Random passwords
resource "random_password" "jwt_secret" {
  length  = 32
  special = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = module.eks.load_balancer_dns
}

output "s3_bucket_assets" {
  description = "Name of the assets S3 bucket"
  value       = module.s3.bucket_names["assets"]
}

output "secrets_manager_arn" {
  description = "ARN of the secrets manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}