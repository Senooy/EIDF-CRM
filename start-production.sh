#!/bin/bash

echo "Stopping any existing processes..."
pm2 kill 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 4173/tcp 2>/dev/null || true

sleep 2

echo "Starting backend server..."
pm2 start server.ts --name "eidf-backend" --interpreter tsx --max-restarts 3

echo "Waiting for backend to start..."
sleep 5

echo "Starting frontend preview..."
pm2 start npm --name "eidf-frontend" -- run preview

echo "Services started. Checking status..."
sleep 3
pm2 list

echo "Setup complete!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:4173"
echo "Production URL: https://dashboard.eidf-crm.fr"