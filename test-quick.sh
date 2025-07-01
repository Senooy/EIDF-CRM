#!/bin/bash

# Script de test rapide pour l'API SaaS
# Usage: ./test-quick.sh

API_URL="http://localhost:3001/api"
TOKEN="demo-token"

echo "🧪 Test Rapide de l'API SaaS"
echo "============================"
echo ""

# Test 1: Get organizations
echo "1️⃣ Récupération des organisations..."
ORGS=$(curl -s -H "Authorization: Bearer $TOKEN" $API_URL/my-organizations)
echo "$ORGS" | jq '.'

# Extract first org ID
ORG_ID=$(echo "$ORGS" | jq -r '.[0].id')
echo ""
echo "Organisation sélectionnée: $ORG_ID"
echo ""

# Test 2: Get organization details
echo "2️⃣ Détails de l'organisation..."
curl -s -H "Authorization: Bearer $TOKEN" \
  $API_URL/organizations/$ORG_ID | jq '.'
echo ""

# Test 3: Get credentials
echo "3️⃣ Credentials de l'organisation..."
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  $API_URL/credentials | jq '.'
echo ""

# Test 4: Get analytics summary
echo "4️⃣ Résumé analytics..."
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  $API_URL/analytics/summary | jq '.'
echo ""

# Test 5: Get health score
echo "5️⃣ Health score..."
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  $API_URL/analytics/health | jq '.'
echo ""

# Test 6: Get usage limits
echo "6️⃣ Limites d'utilisation..."
echo "- Utilisateurs:"
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  $API_URL/usage/users | jq '.'

echo "- Générations IA:"
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  $API_URL/usage/ai_generations | jq '.'
echo ""

# Test 7: Get billing plans
echo "7️⃣ Plans tarifaires disponibles..."
curl -s $API_URL/plans | jq '.'
echo ""

echo "✅ Tests terminés!"