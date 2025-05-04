import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';

// Création d'une application Express pour le serveur HTTP
const app = express();
const server = createServer(app);

// Création du serveur WebSocket en le liant au serveur HTTP
export const wss = new WebSocketServer({ server });
export const clients = new Map();

wss.on('connection', (ws, req) => {
  // Extraction de l'ID utilisateur depuis l'URL
  const userId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('userId');
  
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
});

// Fonction améliorée pour envoyer des notifications
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

// Export du serveur HTTP pour pouvoir l'utiliser avec le serveur principal
export { server as httpServer };
