import { WebSocketServer } from 'ws';

const clients = new Map();

export const initWebSocketServer = (server) => {
  // Crée un serveur WebSocket qui gère à la fois HTTP et WebSocket
  const wss = new WebSocketServer({ 
    server,
    path: '/', // Spécifie le chemin de base pour les connexions WS
    clientTracking: false // Nous gérons nous-mêmes les clients
  });

  // Gestion des connexions WebSocket
  wss.on('connection', (ws, req) => {
    try {
      // Extrait le userId de l'URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        console.log('❌ Connexion rejetée: userId manquant');
        ws.close(4000, 'User ID required');
        return;
      }

      // Stocke la connexion
      ws.userId = userId;
      clients.set(userId, ws);
      console.log(`✅ WebSocket connecté: ${userId}`);

      // Gestion des erreurs
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${userId}:`, error);
      });

      // Nettoyage lors de la déconnexion
      ws.on('close', () => {
        if (userId && clients.get(userId) === ws) {
          clients.delete(userId);
          console.log(`❌ WebSocket déconnecté: ${userId}`);
        }
      });

    } catch (error) {
      console.error('Erreur lors de la connexion WebSocket:', error);
      ws.close(4001, 'Internal server error');
    }
  });

  console.log('🚀 WebSocket Server ready');
};

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
    console.error("Erreur d'envoi de notification:", error);
    return false;
  }
};
