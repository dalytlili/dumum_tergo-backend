// config/wsServer.js
import { WebSocketServer } from 'ws';
import Notification from '../models/Notification.js'; // Assurez-vous d'importer le modèle

const clients = new Map();

export const initWebSocketServer = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
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
};


export const sendNotification = async (userId, message) => {
  try {
    // 1. Enregistrer la notification dans la base de données
    const notification = new Notification({
      recipient: userId,
      recipientType: message.recipientType || 'User', // Valeur par défaut
      type: message.type,
      data: message.data || message, // Compatibilité rétroactive
      read: false
    });

    await notification.save();

    // 2. Envoyer via WebSocket si le client est connecté
    const client = clients.get(userId);
    if (client && client.readyState === client.OPEN) {
      const wsMessage = { 
        ...message, 
        _id: notification._id, // Inclure l'ID MongoDB
        timestamp: new Date().toISOString() 
      };
      client.send(JSON.stringify(wsMessage));
      return { success: true, notification };
    }

    // Si le client n'est pas connecté, la notification est quand même enregistrée
    return { success: false, notification, reason: 'User not connected' };

  } catch (error) {
    console.error("Erreur d'envoi de notification:", error);
    throw error; // Ou retourner un objet d'erreur selon votre préférence
  }
};
