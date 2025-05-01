// config/wsServer.js
import { WebSocketServer } from 'ws'; // Importation corrigée

// Création du serveur WebSocket
export const wss = new WebSocketServer({ port: 8084 });
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