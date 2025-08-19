#!/bin/bash

# Script de démarrage pour l'application EIDF CRM
# Ce script lance le frontend et le backend avec PM2

echo "🚀 Démarrage de l'application EIDF CRM..."

# Créer le dossier logs si nécessaire
mkdir -p logs

# Arrêter les processus existants
echo "⏹️  Arrêt des processus existants..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Tuer les processus sur les ports si nécessaires
echo "🔍 Vérification des ports..."
# Utiliser fuser au lieu de lsof qui n'est pas installé
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true

# Attendre un peu pour libérer les ports
sleep 2

# Démarrer avec PM2
echo "✨ Démarrage avec PM2..."
pm2 start ecosystem.config.cjs

# Afficher le statut
echo ""
echo "✅ Application démarrée!"
echo ""
pm2 status

echo ""
echo "📝 Logs disponibles avec:"
echo "   pm2 logs eidf-backend   # Logs du backend"
echo "   pm2 logs eidf-frontend  # Logs du frontend"
echo "   pm2 logs                # Tous les logs"
echo ""
echo "🌐 Accès à l'application:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3001"
echo ""
echo "⚙️  Commandes utiles:"
echo "   pm2 status              # Voir le statut"
echo "   pm2 restart all         # Redémarrer tout"
echo "   pm2 stop all            # Arrêter tout"
echo "   pm2 save                # Sauvegarder la configuration"
echo "   pm2 startup             # Configurer le démarrage automatique"