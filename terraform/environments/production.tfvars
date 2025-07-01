environment = "production"
aws_region  = "eu-west-1"
domain_name = "eidf-crm.com"
alarm_email = "alerts@eidf-crm.com"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"

# EKS Configuration
kubernetes_version = "1.28"

node_groups = {
  general = {
    instance_types = ["t3.large"]
    min_size      = 3
    max_size      = 20
    desired_size  = 5
    disk_size     = 100
    labels = {
      role = "general"
    }
    taints = []
  }
  spot = {
    instance_types = ["t3.large", "t3a.large", "t3.xlarge", "t3a.xlarge"]
    min_size      = 0
    max_size      = 20
    desired_size  = 3
    disk_size     = 100
    labels = {
      role          = "spot"
      workload-type = "batch"
    }
    taints = [{
      key    = "spot"
      value  = "true"
      effect = "NoSchedule"
    }]
  }
  monitoring = {
    instance_types = ["t3.medium"]
    min_size      = 2
    max_size      = 3
    desired_size  = 2
    disk_size     = 50
    labels = {
      role = "monitoring"
    }
    taints = [{
      key    = "monitoring"
      value  = "true"
      effect = "NoSchedule"
    }]
  }
}

# RDS Configuration
postgres_version          = "15.4"
rds_instance_class       = "db.t3.medium"
rds_allocated_storage    = 100
rds_max_allocated_storage = 1000
backup_retention_days    = 30

# Redis Configuration
redis_version   = "7.0"
redis_node_type = "cache.t3.small"
redis_num_nodes = 3