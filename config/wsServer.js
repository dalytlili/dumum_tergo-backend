// config/wsServer.js
import { WebSocketServer } from 'ws';

export const clients = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
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
  });
}
// Toujours dans config/wsServer.js
export function sendNotification(userId, message) {
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
}
