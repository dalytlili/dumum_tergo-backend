import { WebSocketServer } from 'ws';
import https from 'https';
import fs from 'fs';

// Configuration pour Render.com
const server = https.createServer();
export const wss = new WebSocketServer({ server });
export const clients = new Map();

wss.on('connection', (ws, req) => {
  // Correction de l'URL pour HTTPS
  const url = new URL(req.url, `https://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    ws.close(4001, 'User ID required');
    return;
  }

  clients.set(userId, ws);
  console.log(`Client connecté: ${userId}`);

  // Envoyer un accusé de réception
  ws.send(JSON.stringify({
    type: 'connection_ack',
    status: 'connected',
    timestamp: new Date().toISOString()
  }));

  ws.on('close', () => {
    clients.delete(userId);
    console.log(`Client déconnecté: ${userId}`);
  });

  ws.on('error', (error) => {
    console.error(`Erreur WebSocket (${userId}):`, error);
  });
});

// Démarrer sur le bon port pour Render
const PORT = process.env.PORT || 8084;
server.listen(PORT, () => {
  console.log(`WebSocket Server running on port ${PORT}`);
});
