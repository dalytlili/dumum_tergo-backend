import { WebSocketServer } from 'ws';

const clients = new Map();

export const initWebSocketServer = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.userId = userId;
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, req) => {
    const userId = ws.userId;
    if (userId) {
      clients.set(userId, ws);
      console.log(`✅ WebSocket connecté : ${userId}`);
    }

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`❌ WebSocket déconnecté : ${userId}`);
      }
    });
  });
};

export const sendNotification = (userId, message) => {
  try {
    const client = clients.get(userId);
    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Erreur d'envoi de notification:", error);
    return false;
  }
};
