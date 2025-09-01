-- EIDF CRM - Script d'initialisation PostgreSQL
-- Ce script est exécuté lors de la création du conteneur PostgreSQL

-- Création de la base de données si elle n'existe pas
CREATE DATABASE eidf_crm;

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour fonctions de texte avancées
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Configuration pour les performances
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Configuration de sécurité
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_line_prefix = '%t [%p]: user=%u,db=%d,app=%a,client=%h ';

-- Configuration mémoire (ajustée pour 2GB RAM)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Rechargement de la configuration
SELECT pg_reload_conf();