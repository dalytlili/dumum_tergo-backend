import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import { notFoundError, errorHandler } from "./middlewares/error-handler.js";
import userRoute from "./routes/userRouter.js";
import authRoute from "./routes/authRouter.js";
import dotenv from 'dotenv';
import passport from "./config/passport.js";
import session from "express-session";
import path from 'path'; // تم إضافة هذا السطر
import vendorRoutes from './routes/vendorRoutes.js';
import usercar from "./routes/carRoutes.js"
import reservation from "./routes/reservationRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"
import campingRoutes from './routes/campingRoutes.js';

import { generateAccessToken, generateRefreshToken } from './controllers/userController.js';
import { wss } from './config/wsServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9098;
const databaseName = 'dumum_tergo';

mongoose.set('debug', true);
mongoose.Promise = global.Promise;

mongoose.connect(`mongodb+srv://mohammedalitlili:mwxWZME8ju5chsDN@cluster0.xfhzvke.mongodb.net/${databaseName}`, {
  // يمكنك إزالة هذه الخيارات إن كنت تستخدم MongoDB Driver 4.0+
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
})
.then(() => {
  console.log(`Connected to MongoDB database: ${databaseName}`);
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

app.use(
  session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
  })
);
app.use((req, res, next) => {
  // Middleware pour exposer les headers personnalisés
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
app.use('/images', express.static('public/images'));
app.use('/api/cars', usercar);
app.use('/api/reservation', reservation);
app.use('/api/notifications', notificationRoutes);
app.use('/api/camping', campingRoutes);

app.use('/api', userRoute);

app.use('/', authRoute);
app.use('/api/vendor', vendorRoutes);

app.get('/payment/success', (req, res) => {
  res.render('success'); 
});
app.get('/auth/google', (req, res, next) => {
  req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
          res.clearCookie('connect.sid'); // Supprimer le cookie de session
          next(); // Continuer vers l'authentification Google
      });
  });
}, passport.authenticate('google', { scope: ['profile', 'email'], prompt: "consent select_account" }));


// route pour l'authentification
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      // Générer un token JWT
      const accessToken = await generateAccessToken({ user: req.user });
      const refreshToken = await generateRefreshToken({ user: req.user });

      // Afficher les tokens dans la console
      console.log('Access Token:', accessToken);
      console.log('Refresh Token:', refreshToken);

      // Rediriger l'utilisateur avec le token dans l'URL ou renvoyer le token en JSON
      res.redirect(`dumumtergo://callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Erreur lors de la génération du token:', error);
      res.status(500).json({ success: false, msg: 'Erreur lors de la génération du token' });
    }
  });
// مسار البداية للمصادقة عبر Facebook
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

// مسار العودة بعد المصادقة
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      // Générer un token JWT
      const accessToken = await generateAccessToken({ user: req.user });
      const refreshToken = await generateRefreshToken({ user: req.user });

      // Afficher les tokens dans la console
      console.log('Access Token:', accessToken);
      console.log('Refresh Token:', refreshToken);

      // Rediriger l'utilisateur avec le token dans l'URL ou renvoyer le token en JSON
      res.redirect(`dumumtergo://callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Erreur lors de la génération du token:', error);
      res.status(500).json({ success: false, msg: 'Erreur lors de la génération du token' });
    }
  });


app.use(notFoundError);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
