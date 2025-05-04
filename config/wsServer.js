import { WebSocketServer } from 'ws';
import https from 'https';
import fs from 'fs';
import { createServer } from 'http';

// Configuration pour Render (utilisez process.env.PORT)
const PORT = process.env.PORT || 8084;

// Création du serveur HTTP/HTTPS (Render fournit automatiquement SSL)
const server = createServer();

// Création du serveur WebSocket
export const wss = new WebSocketServer({ server });
export const clients = new Map();

server.listen(PORT, () => {
  console.log(`WebSocket Server running on port ${PORT}`);
});

wss.on('connection', (ws, req) => {
  // Extraction de l'ID utilisateur depuis l'URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  
  if (userId) {
    clients.set(userId, ws);
    console.log(`Client connecté: ${userId}`);
  }

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      console.log(`Client déconnecté: ${userId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Fonction pour envoyer des notifications (inchangée)
export const sendNotification = (userId, message) => {
  try {
    const client = clients.get(userId);
    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erreur d\'envoi de notification:', error);
    return false;
  }
};
