# Staging environment configuration

environment = "staging"
region      = "eu-west-1"

# VPC Configuration
vpc_cidr = "10.1.0.0/16"
availability_zones = ["eu-west-1a", "eu-west-1b"]

# EKS Configuration
eks_cluster_version = "1.28"
eks_node_groups = {
  general = {
    desired_size = 2
    min_size     = 2
    max_size     = 4
    instance_types = ["t3.medium"]
    capacity_type  = "ON_DEMAND"
  }
  spot = {
    desired_size = 1
    min_size     = 1
    max_size     = 3
    instance_types = ["t3.medium", "t3a.medium"]
    capacity_type  = "SPOT"
  }
}

# RDS Configuration
rds_instance_class = "db.t3.small"
rds_allocated_storage = 20
rds_multi_az = false
rds_backup_retention_period = 7
rds_deletion_protection = false

# ElastiCache Configuration
elasticache_node_type = "cache.t3.micro"
elasticache_num_cache_nodes = 1
elasticache_automatic_failover_enabled = false

# S3 Configuration
s3_versioning_enabled = true
s3_lifecycle_rules = {
  logs = {
    enabled = true
    expiration_days = 30
  }
}

# Monitoring
enable_monitoring = true
enable_logging = true

# Cost optimization
enable_spot_instances = true
enable_auto_scaling = true

# Tags
tags = {
  Environment = "staging"
  Project     = "EIDF-CRM"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
}