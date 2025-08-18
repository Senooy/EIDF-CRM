#!/bin/bash

# Script de génération des enregistrements DNS pour l'email
# Usage: ./dns-setup.sh [domain] [ip-address]

set -e

DOMAIN=${1:-"example.com"}
IP_ADDRESS=${2:-$(hostname -I | awk '{print $1}')}
HOSTNAME=${3:-"mail.$DOMAIN"}

echo "🌐 Génération des enregistrements DNS pour l'email"
echo "Domain: $DOMAIN"
echo "IP Address: $IP_ADDRESS"
echo "Hostname: $HOSTNAME"
echo

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour générer les enregistrements DNS
generate_dns_records() {
    echo -e "${BLUE}📋 ENREGISTREMENTS DNS REQUIS${NC}"
    echo "=================================="
    echo
    
    # Enregistrement A
    echo -e "${YELLOW}📍 Enregistrement A (Adresse IP):${NC}"
    echo "Nom: mail.$DOMAIN"
    echo "Type: A"
    echo "Valeur: $IP_ADDRESS"
    echo "TTL: 3600"
    echo
    
    # Enregistrement MX
    echo -e "${YELLOW}📬 Enregistrement MX (Serveur mail):${NC}"
    echo "Nom: $DOMAIN"
    echo "Type: MX"
    echo "Priorité: 10"
    echo "Valeur: mail.$DOMAIN"
    echo "TTL: 3600"
    echo
    
    # Enregistrement PTR (Reverse DNS)
    echo -e "${YELLOW}🔄 Enregistrement PTR (Reverse DNS):${NC}"
    echo "IMPORTANT: À configurer chez votre hébergeur/FAI"
    echo "IP: $IP_ADDRESS → mail.$DOMAIN"
    echo
    
    # SPF
    echo -e "${YELLOW}🛡️  Enregistrement SPF (Sender Policy Framework):${NC}"
    echo "Nom: $DOMAIN"
    echo "Type: TXT"
    echo "Valeur: \"v=spf1 ip4:$IP_ADDRESS mx -all\""
    echo "TTL: 3600"
    echo
    
    # DKIM (si disponible)
    if [ -f "/etc/opendkim/keys/$DOMAIN/default.txt" ]; then
        echo -e "${YELLOW}🔐 Enregistrement DKIM:${NC}"
        echo "Nom: default._domainkey.$DOMAIN"
        echo "Type: TXT"
        echo "Valeur:"
        cat "/etc/opendkim/keys/$DOMAIN/default.txt" | sed 's/default._domainkey.*IN.*TXT.*( "//' | sed 's/" ).*$//' | sed 's/" "//g' | sed 's/^[[:space:]]*//' | tr -d '\n'
        echo
        echo "TTL: 3600"
        echo
    else
        echo -e "${YELLOW}🔐 Enregistrement DKIM:${NC}"
        echo "ATTENTION: Générer d'abord la clé DKIM avec:"
        echo "opendkim-genkey -s default -d $DOMAIN -D /etc/opendkim/keys/$DOMAIN/"
        echo
    fi
    
    # DMARC
    echo -e "${YELLOW}📊 Enregistrement DMARC:${NC}"
    echo "Nom: _dmarc.$DOMAIN"
    echo "Type: TXT"
    echo "Valeur: \"v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@$DOMAIN; ruf=mailto:dmarc-failures@$DOMAIN; sp=quarantine; aspf=r; adkim=r\""
    echo "TTL: 3600"
    echo
    
    # Enregistrements supplémentaires recommandés
    echo -e "${YELLOW}📋 Enregistrements supplémentaires (optionnels):${NC}"
    echo
    echo "🔒 TLS Reporting (TLS-RPT):"
    echo "Nom: _smtp._tls.$DOMAIN"
    echo "Type: TXT"
    echo "Valeur: \"v=TLSRPTv1; rua=mailto:tls-reports@$DOMAIN\""
    echo
    echo "📧 MTA-STS (Mail Transfer Agent Strict Transport Security):"
    echo "Nom: _mta-sts.$DOMAIN"
    echo "Type: TXT" 
    echo "Valeur: \"v=STSv1; id=$(date +%Y%m%d%H%M%S)\""
    echo
    echo "🌐 Sous-domaine MTA-STS:"
    echo "Nom: mta-sts.$DOMAIN"
    echo "Type: A"
    echo "Valeur: $IP_ADDRESS"
    echo
}

# Fonction de test DNS
test_dns_records() {
    echo -e "${BLUE}🔍 TEST DES ENREGISTREMENTS DNS${NC}"
    echo "================================="
    echo
    
    # Test A record
    echo -e "${YELLOW}Test enregistrement A:${NC}"
    if dig +short A mail.$DOMAIN | grep -q "$IP_ADDRESS"; then
        echo -e "  ✅ mail.$DOMAIN → $IP_ADDRESS ${GREEN}OK${NC}"
    else
        echo -e "  ❌ mail.$DOMAIN → IP incorrecte ou manquante"
        echo "  📋 Actuel: $(dig +short A mail.$DOMAIN)"
        echo "  📋 Attendu: $IP_ADDRESS"
    fi
    echo
    
    # Test MX record
    echo -e "${YELLOW}Test enregistrement MX:${NC}"
    local mx_record=$(dig +short MX $DOMAIN)
    if echo "$mx_record" | grep -q "mail.$DOMAIN"; then
        echo -e "  ✅ MX record ${GREEN}OK${NC}: $mx_record"
    else
        echo -e "  ❌ MX record manquant ou incorrect"
        echo "  📋 Actuel: $mx_record"
        echo "  📋 Attendu: 10 mail.$DOMAIN"
    fi
    echo
    
    # Test SPF
    echo -e "${YELLOW}Test enregistrement SPF:${NC}"
    local spf_record=$(dig +short TXT $DOMAIN | grep "v=spf1")
    if [ -n "$spf_record" ]; then
        echo -e "  ✅ SPF trouvé: $spf_record"
        if echo "$spf_record" | grep -q "ip4:$IP_ADDRESS"; then
            echo -e "  ✅ IP $IP_ADDRESS ${GREEN}autorisée${NC}"
        else
            echo -e "  ⚠️  IP $IP_ADDRESS ${YELLOW}non trouvée dans SPF${NC}"
        fi
    else
        echo -e "  ❌ SPF record manquant"
    fi
    echo
    
    # Test DKIM
    echo -e "${YELLOW}Test enregistrement DKIM:${NC}"
    local dkim_record=$(dig +short TXT default._domainkey.$DOMAIN)
    if [ -n "$dkim_record" ]; then
        echo -e "  ✅ DKIM trouvé"
        if echo "$dkim_record" | grep -q "v=DKIM1"; then
            echo -e "  ✅ Format DKIM ${GREEN}valide${NC}"
        else
            echo -e "  ⚠️  Format DKIM ${YELLOW}suspect${NC}"
        fi
    else
        echo -e "  ❌ DKIM record manquant"
    fi
    echo
    
    # Test DMARC
    echo -e "${YELLOW}Test enregistrement DMARC:${NC}"
    local dmarc_record=$(dig +short TXT _dmarc.$DOMAIN)
    if [ -n "$dmarc_record" ]; then
        echo -e "  ✅ DMARC trouvé: $dmarc_record"
    else
        echo -e "  ❌ DMARC record manquant"
    fi
    echo
    
    # Test Reverse DNS
    echo -e "${YELLOW}Test Reverse DNS (PTR):${NC}"
    local ptr_record=$(dig +short -x "$IP_ADDRESS")
    if [ -n "$ptr_record" ]; then
        if echo "$ptr_record" | grep -q "$DOMAIN"; then
            echo -e "  ✅ PTR record ${GREEN}OK${NC}: $ptr_record"
        else
            echo -e "  ⚠️  PTR record trouvé mais incorrect: $ptr_record"
            echo "  📋 Attendu: mail.$DOMAIN"
        fi
    else
        echo -e "  ❌ PTR record manquant"
        echo "  📋 À configurer: $IP_ADDRESS → mail.$DOMAIN"
    fi
}

# Fonction pour générer un fichier zone
generate_zone_file() {
    local zone_file="$DOMAIN.zone"
    
    echo -e "${BLUE}📄 Génération du fichier de zone DNS${NC}"
    echo "Fichier: $zone_file"
    echo
    
    cat > "$zone_file" << EOF
; Zone DNS pour $DOMAIN
; Générée le $(date)
; 
\$ORIGIN $DOMAIN.
\$TTL 3600

; SOA Record
@       IN      SOA     mail.$DOMAIN. admin.$DOMAIN. (
                        $(date +%Y%m%d%H)  ; Serial (YYYYMMDDHH)
                        3600            ; Refresh
                        1800            ; Retry  
                        604800          ; Expire
                        86400 )         ; Minimum TTL

; NS Records
@       IN      NS      ns1.$DOMAIN.
@       IN      NS      ns2.$DOMAIN.

; A Records
@       IN      A       $IP_ADDRESS
mail    IN      A       $IP_ADDRESS
www     IN      A       $IP_ADDRESS
mta-sts IN      A       $IP_ADDRESS

; MX Record
@       IN      MX      10 mail.$DOMAIN.

; SPF Record
@       IN      TXT     "v=spf1 ip4:$IP_ADDRESS mx -all"

; DMARC Record
_dmarc  IN      TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@$DOMAIN; ruf=mailto:dmarc-failures@$DOMAIN; sp=quarantine; aspf=r; adkim=r"

EOF

    # Ajouter DKIM si disponible
    if [ -f "/etc/opendkim/keys/$DOMAIN/default.txt" ]; then
        echo "; DKIM Record" >> "$zone_file"
        echo -n "default._domainkey IN TXT \"" >> "$zone_file"
        cat "/etc/opendkim/keys/$DOMAIN/default.txt" | sed 's/default._domainkey.*IN.*TXT.*( "//' | sed 's/" ).*$//' | sed 's/" "//g' | sed 's/^[[:space:]]*//' | tr -d '\n' >> "$zone_file"
        echo "\"" >> "$zone_file"
        echo >> "$zone_file"
    fi

    cat >> "$zone_file" << EOF
; TLS Reporting
_smtp._tls IN   TXT     "v=TLSRPTv1; rua=mailto:tls-reports@$DOMAIN"

; MTA-STS
_mta-sts IN     TXT     "v=STSv1; id=$(date +%Y%m%d%H%M%S)"

; CAA Records (Optionnel)
@       IN      CAA     0 issue "letsencrypt.org"
@       IN      CAA     0 iodef "mailto:admin@$DOMAIN"
EOF

    echo -e "${GREEN}✅ Fichier de zone généré: $zone_file${NC}"
}

# Fonction pour tester la délivrabilité
test_deliverability() {
    echo -e "${BLUE}📧 TEST DE DÉLIVRABILITÉ${NC}"
    echo "=========================="
    echo
    
    # Vérifier avec mail-tester.com
    echo -e "${YELLOW}🌐 Tests en ligne recommandés:${NC}"
    echo "1. Mail Tester: https://www.mail-tester.com/"
    echo "2. MXToolbox: https://mxtoolbox.com/domain/$DOMAIN"
    echo "3. DMARC Analyzer: https://www.dmarcanalyzer.com/"
    echo "4. SSL Labs: https://www.ssllabs.com/ssltest/"
    echo
    
    # Test local basique
    echo -e "${YELLOW}🔧 Test local:${NC}"
    if command -v telnet >/dev/null; then
        echo "Test de connexion SMTP..."
        if timeout 5 bash -c "echo 'quit' | telnet mail.$DOMAIN 25" &>/dev/null; then
            echo -e "  ✅ Connexion SMTP ${GREEN}réussie${NC}"
        else
            echo -e "  ❌ Connexion SMTP ${YELLOW}échouée${NC}"
        fi
    fi
}

# Menu principal
case "${1}" in
    "test")
        test_dns_records
        ;;
    "zone")
        generate_zone_file
        ;;
    "deliverability")
        test_deliverability
        ;;
    "all")
        generate_dns_records
        echo
        test_dns_records
        echo
        generate_zone_file
        echo
        test_deliverability
        ;;
    *)
        generate_dns_records
        echo
        echo -e "${GREEN}💡 COMMANDES UTILES:${NC}"
        echo "  $0 test           - Tester les enregistrements DNS existants"
        echo "  $0 zone           - Générer un fichier de zone DNS"
        echo "  $0 deliverability - Tester la délivrabilité"
        echo "  $0 all            - Tout faire"
        echo
        echo -e "${YELLOW}⚠️  ÉTAPES SUIVANTES:${NC}"
        echo "1. Configurer ces enregistrements DNS chez votre registrar"
        echo "2. Attendre la propagation DNS (24-48h max)"
        echo "3. Tester avec: $0 test"
        echo "4. Configurer le certificat SSL"
        echo "5. Commencer le warm-up IP progressivement"
        ;;
esac