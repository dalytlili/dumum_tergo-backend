// server.js
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/passport.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initWebSocketServer } from './config/wsServer.js';

import { notFoundError, errorHandler } from './middlewares/error-handler.js';
import userRoute from './routes/userRouter.js';
import authRoute from './routes/authRouter.js';
import vendorRoutes from './routes/vendorRoutes.js';
import usercar from './routes/carRoutes.js';
import reservation from './routes/reservationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import campingRoutes from './routes/campingRoutes.js';
import sortiecampingRoutes from './routes/sortiecampingRoutes.js';

import { generateAccessToken, generateRefreshToken } from './controllers/userController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9098;
const databaseName = 'dumum_tergo';

// Serveur HTTP combiné
const httpServer = createServer(app);

// Initialiser WebSocket
initWebSocketServer(httpServer);

// Connexion à MongoDB
mongoose.set('debug', true);
mongoose.Promise = global.Promise;
mongoose.connect(`mongodb+srv://mohammedalitlili:mwxWZME8ju5chsDN@cluster0.xfhzvke.mongodb.net/${databaseName}`)
  .then(() => console.log(`Connecté à la base de données MongoDB: ${databaseName}`))
  .catch(err => console.error('Erreur MongoDB:', err));

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use((req, res, next) => {
  res.header('Access-Control-Expose-Headers', 'x-new-access-token, x-new-refresh-token');
  next();
});

app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/sortiecamping', sortiecampingRoutes);

// Fichiers statiques
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Routes
app.use('/api/cars', usercar);
app.use('/api/reservation', reservation);
app.use('/api/notifications', notificationRoutes);
app.use('/api/camping', campingRoutes);
app.use('/api', userRoute);
app.use('/', authRoute);
app.use('/api/vendor', vendorRoutes);

// Page de paiement
app.get('/payment/success', (req, res) => res.render('success'));

// Authentification Google
app.get('/auth/google', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      next();
    });
  });
}, passport.authenticate('google', { scope: ['profile', 'email'], prompt: "consent select_account" }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const accessToken = await generateAccessToken({ user: req.user });
      const refreshToken = await generateRefreshToken({ user: req.user });
      res.redirect(`dumumtergo://callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      res.status(500).json({ success: false, msg: 'Erreur lors de la génération du token' });
    }
  });

// Authentification Facebook
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const accessToken = await generateAccessToken({ user: req.user });
      const refreshToken = await generateRefreshToken({ user: req.user });
      res.redirect(`dumumtergo://callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      res.status(500).json({ success: false, msg: 'Erreur lors de la génération du token' });
    }
  });

// Gestion des erreurs
app.use(notFoundError);
app.use(errorHandler);

// Démarrage du serveur HTTP + WebSocket
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
