import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import session from 'express-session';
import RedisStore from 'connect-redis'; // Pour la production
import { createClient } from 'redis';

// Configuration pour Render
const PORT = process.env.PORT || 10000;
const app = express();
const server = createServer(app);

// Configuration Redis pour les sessions (production)
async function setupSessionStore() {
  if (process.env.REDIS_URL) { // Configuré dans Render
    const redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
    return new RedisStore({ client: redisClient });
  }
  return null; // En développement, utilisez MemoryStore avec avertissement
}

async function startServer() {
  const sessionStore = await setupSessionStore();

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  // Création du WebSocket Server
  const wss = new WebSocketServer({ server });
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    const userId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('userId');
    if (userId) {
      clients.set(userId, ws);
      console.log(`Client connecté: ${userId}`);
    }

    ws.on('close', () => {
      if (userId) clients.delete(userId);
    });
  });

  // Démarrer le serveur
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (!sessionStore) {
      console.warn('Warning: Using MemoryStore for sessions - not suitable for production');
    }
  });

  // Gestion des erreurs
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} already in use`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });

  return { app, wss, clients };
}

// Fonction pour envoyer des notifications
export function sendNotification(clients, userId, message) {
  const client = clients.get(userId);
  if (client?.readyState === client?.OPEN) {
    client.send(JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
}

startServer().catch(console.error);
