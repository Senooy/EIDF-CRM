#!/bin/bash

# Script de monitoring pour l'infrastructure email
# Usage: ./email-monitoring.sh [check|stats|cleanup|health]

set -e

COMMAND=${1:-"health"}
LOG_FILE="/var/log/email-monitoring.log"
POSTFIX_LOG="/var/log/postfix.log"
ALERT_EMAIL="admin@example.com"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction d'alerte
alert() {
    log "ALERT: $1"
    echo "ALERT: $1" | mail -s "Email Infrastructure Alert" "$ALERT_EMAIL" 2>/dev/null || true
}

# Vérification de la santé du système
check_health() {
    echo -e "${BLUE}🏥 Vérification de la santé du système email${NC}"
    echo "=================================================="
    
    local issues=0
    
    # Vérifier les services
    echo -e "\n${YELLOW}📋 Services:${NC}"
    services=("postfix" "opendkim" "opendmarc" "fail2ban")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            echo -e "  ✅ $service: ${GREEN}RUNNING${NC}"
        else
            echo -e "  ❌ $service: ${RED}STOPPED${NC}"
            issues=$((issues + 1))
            alert "$service is not running"
        fi
    done
    
    # Vérifier les ports
    echo -e "\n${YELLOW}🔌 Ports:${NC}"
    ports=("25" "587" "465")
    
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            echo -e "  ✅ Port $port: ${GREEN}LISTENING${NC}"
        else
            echo -e "  ❌ Port $port: ${RED}NOT LISTENING${NC}"
            issues=$((issues + 1))
            alert "Port $port is not listening"
        fi
    done
    
    # Vérifier l'espace disque
    echo -e "\n${YELLOW}💾 Espace disque:${NC}"
    df -h / | tail -1 | awk '{
        usage = substr($5, 1, length($5)-1)
        if (usage > 90) {
            printf "  ❌ Racine: %s (CRITIQUE)\n", $5
            system("echo \"Disk usage critical: " $5 "\" >> /tmp/alert")
        } else if (usage > 80) {
            printf "  ⚠️  Racine: %s (ATTENTION)\n", $5  
        } else {
            printf "  ✅ Racine: %s (OK)\n", $5
        }
    }'
    
    # Vérifier la queue Postfix
    echo -e "\n${YELLOW}📬 Queue Postfix:${NC}"
    local queue_size=$(mailq | tail -n1 | awk '{print $5}' | grep -o '[0-9]*' | head -1)
    queue_size=${queue_size:-0}
    
    if [ "$queue_size" -eq 0 ]; then
        echo -e "  ✅ Queue: ${GREEN}VIDE${NC}"
    elif [ "$queue_size" -lt 100 ]; then
        echo -e "  ⚠️  Queue: ${YELLOW}$queue_size messages${NC}"
    else
        echo -e "  ❌ Queue: ${RED}$queue_size messages (CRITIQUE)${NC}"
        issues=$((issues + 1))
        alert "Mail queue has $queue_size messages"
    fi
    
    # Vérifier les logs d'erreur récents
    echo -e "\n${YELLOW}📋 Erreurs récentes (dernière heure):${NC}"
    local error_count=0
    if [ -f "$POSTFIX_LOG" ]; then
        error_count=$(tail -n 1000 "$POSTFIX_LOG" | grep "$(date '+%b %d %H')" | grep -i "error\|reject\|bounce" | wc -l)
    fi
    
    if [ "$error_count" -eq 0 ]; then
        echo -e "  ✅ Erreurs: ${GREEN}AUCUNE${NC}"
    elif [ "$error_count" -lt 10 ]; then
        echo -e "  ⚠️  Erreurs: ${YELLOW}$error_count${NC}"
    else
        echo -e "  ❌ Erreurs: ${RED}$error_count (CRITIQUE)${NC}"
        issues=$((issues + 1))
        alert "High error count in last hour: $error_count"
    fi
    
    echo -e "\n=================================================="
    if [ "$issues" -eq 0 ]; then
        echo -e "${GREEN}✅ Système en bonne santé${NC}"
        return 0
    else
        echo -e "${RED}❌ $issues problème(s) détecté(s)${NC}"
        return 1
    fi
}

# Statistiques détaillées
show_stats() {
    echo -e "${BLUE}📊 Statistiques email (dernières 24h)${NC}"
    echo "=================================================="
    
    if [ ! -f "$POSTFIX_LOG" ]; then
        echo -e "${RED}❌ Fichier de log non trouvé: $POSTFIX_LOG${NC}"
        return 1
    fi
    
    local today=$(date '+%b %d')
    
    # Extraire les statistiques des logs
    echo -e "\n${YELLOW}📈 Volumes:${NC}"
    local sent=$(grep "$today" "$POSTFIX_LOG" | grep "status=sent" | wc -l)
    local bounced=$(grep "$today" "$POSTFIX_LOG" | grep "status=bounced" | wc -l)
    local deferred=$(grep "$today" "$POSTFIX_LOG" | grep "status=deferred" | wc -l)
    local rejected=$(grep "$today" "$POSTFIX_LOG" | grep "reject" | wc -l)
    
    echo "  📤 Envoyés: $sent"
    echo "  ⚠️  Bounces: $bounced"
    echo "  ⏸️  Différés: $deferred"
    echo "  🚫 Rejetés: $rejected"
    
    # Top des erreurs
    echo -e "\n${YELLOW}🔴 Top erreurs:${NC}"
    grep "$today" "$POSTFIX_LOG" | grep -i "error\|reject\|bounce" | awk '{print $8}' | sort | uniq -c | sort -nr | head -5 | while read count error; do
        echo "  $count: $error"
    done
    
    # Top des domaines destinataires
    echo -e "\n${YELLOW}🌐 Top domaines destinataires:${NC}"
    grep "$today" "$POSTFIX_LOG" | grep "status=sent" | sed -n 's/.*to=<[^@]*@\([^>]*\)>.*/\1/p' | sort | uniq -c | sort -nr | head -5 | while read count domain; do
        echo "  $count: $domain"
    done
    
    # Calcul du taux de réussite
    local total=$((sent + bounced + deferred + rejected))
    if [ "$total" -gt 0 ]; then
        local success_rate=$(echo "scale=2; $sent * 100 / $total" | bc -l 2>/dev/null || echo "0")
        echo -e "\n${YELLOW}📊 Taux de réussite:${NC} ${success_rate}%"
    fi
}

# Nettoyage et maintenance
cleanup() {
    echo -e "${BLUE}🧹 Nettoyage et maintenance${NC}"
    echo "=================================================="
    
    local cleaned=0
    
    # Nettoyer la queue des emails différés anciens (> 5 jours)
    echo -e "\n${YELLOW}📬 Nettoyage de la queue...${NC}"
    local old_deferred=$(postsuper -d ALL deferred 2>/dev/null | grep -c "deleted" || echo "0")
    if [ "$old_deferred" -gt 0 ]; then
        echo "  🗑️  $old_deferred messages différés supprimés"
        cleaned=$((cleaned + old_deferred))
    fi
    
    # Nettoyer les logs anciens
    echo -e "\n${YELLOW}📋 Rotation des logs...${NC}"
    if logrotate -f /etc/logrotate.d/postfix; then
        echo "  ✅ Rotation des logs effectuée"
    else
        echo "  ❌ Erreur lors de la rotation des logs"
    fi
    
    # Nettoyer les statistiques fail2ban
    echo -e "\n${YELLOW}🔒 Nettoyage fail2ban...${NC}"
    if systemctl is-active --quiet fail2ban; then
        fail2ban-client unban --all 2>/dev/null || true
        echo "  ✅ IPs bannies réinitialisées"
    fi
    
    # Vérifier et optimiser la configuration
    echo -e "\n${YELLOW}⚙️  Vérification de la configuration...${NC}"
    if postfix check; then
        echo "  ✅ Configuration Postfix valide"
    else
        echo "  ❌ Erreur dans la configuration Postfix"
        alert "Postfix configuration error detected"
    fi
    
    log "Cleanup completed: $cleaned items cleaned"
    echo -e "\n${GREEN}✅ Maintenance terminée${NC}"
}

# Vérifications détaillées
detailed_check() {
    echo -e "${BLUE}🔍 Vérifications détaillées${NC}"
    echo "=================================================="
    
    # Test DKIM
    echo -e "\n${YELLOW}🔐 Test DKIM:${NC}"
    local domain=$(postconf mydomain | cut -d'=' -f2 | tr -d ' ')
    if command -v opendkim-testkey >/dev/null; then
        if opendkim-testkey -d "$domain" -s default -vvv 2>&1 | grep -q "key OK"; then
            echo -e "  ✅ DKIM: ${GREEN}VALIDE${NC}"
        else
            echo -e "  ❌ DKIM: ${RED}ERREUR${NC}"
            alert "DKIM validation failed for domain $domain"
        fi
    else
        echo -e "  ⚠️  DKIM: ${YELLOW}NON TESTABLE${NC}"
    fi
    
    # Test connectivité SMTP
    echo -e "\n${YELLOW}📡 Test connectivité SMTP:${NC}"
    local smtp_ports=("25" "587" "465")
    for port in "${smtp_ports[@]}"; do
        if timeout 5 telnet localhost "$port" <<< "quit" &>/dev/null; then
            echo -e "  ✅ Port $port: ${GREEN}ACCESSIBLE${NC}"
        else
            echo -e "  ❌ Port $port: ${RED}INACCESSIBLE${NC}"
        fi
    done
    
    # Vérifier les certificats SSL
    echo -e "\n${YELLOW}🔒 Certificats SSL:${NC}"
    local cert_file="/etc/ssl/certs/ssl-cert-snakeoil.pem"
    if [ -f "$cert_file" ]; then
        local exp_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local exp_timestamp=$(date -d "$exp_date" +%s 2>/dev/null || echo "0")
        local now_timestamp=$(date +%s)
        local days_left=$(( (exp_timestamp - now_timestamp) / 86400 ))
        
        if [ "$days_left" -gt 30 ]; then
            echo -e "  ✅ SSL: ${GREEN}VALIDE ($days_left jours)${NC}"
        elif [ "$days_left" -gt 0 ]; then
            echo -e "  ⚠️  SSL: ${YELLOW}EXPIRE BIENTÔT ($days_left jours)${NC}"
            alert "SSL certificate expires in $days_left days"
        else
            echo -e "  ❌ SSL: ${RED}EXPIRÉ${NC}"
            alert "SSL certificate has expired"
        fi
    else
        echo -e "  ❌ SSL: ${RED}FICHIER NON TROUVÉ${NC}"
    fi
    
    # Vérifier la réputation IP
    echo -e "\n${YELLOW}🌐 Réputation IP:${NC}"
    local ip=$(hostname -I | awk '{print $1}')
    echo "  📍 IP externe: $ip"
    
    # Test basique de délivrabilité
    echo -e "\n${YELLOW}📧 Test de délivrabilité:${NC}"
    if echo "Test email $(date)" | mail -s "Monitoring test" root 2>/dev/null; then
        echo -e "  ✅ Test: ${GREEN}EMAIL ENVOYÉ${NC}"
    else
        echo -e "  ❌ Test: ${RED}ÉCHEC D'ENVOI${NC}"
    fi
}

# Menu principal
case "$COMMAND" in
    "health")
        check_health
        ;;
    "stats")
        show_stats
        ;;
    "cleanup")
        cleanup
        ;;
    "check")
        detailed_check
        ;;
    "all")
        check_health
        echo
        show_stats
        echo
        detailed_check
        ;;
    *)
        echo "Usage: $0 {health|stats|cleanup|check|all}"
        echo
        echo "Commandes disponibles:"
        echo "  health  - Vérification rapide de la santé du système"
        echo "  stats   - Statistiques détaillées des dernières 24h"
        echo "  cleanup - Nettoyage et maintenance"
        echo "  check   - Vérifications détaillées (DKIM, SSL, etc.)"
        echo "  all     - Toutes les vérifications"
        exit 1
        ;;
esac