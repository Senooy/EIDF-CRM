-- Create databases for each microservice
CREATE DATABASE IF NOT EXISTS eidf_auth;
CREATE DATABASE IF NOT EXISTS eidf_org;
CREATE DATABASE IF NOT EXISTS eidf_wc;
CREATE DATABASE IF NOT EXISTS eidf_billing;
CREATE DATABASE IF NOT EXISTS eidf_analytics;

-- Create a read-only user for analytics
CREATE USER IF NOT EXISTS 'analytics_reader'@'%' IDENTIFIED BY 'analytics_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON eidf_auth.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON eidf_org.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON eidf_wc.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON eidf_billing.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON eidf_analytics.* TO 'postgres'@'%';

-- Grant read-only access to analytics user
GRANT SELECT ON eidf_auth.* TO 'analytics_reader'@'%';
GRANT SELECT ON eidf_org.* TO 'analytics_reader'@'%';
GRANT SELECT ON eidf_billing.* TO 'analytics_reader'@'%';

FLUSH PRIVILEGES;