import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Vendor from '../models/vendor.js';
import { VerifyTokenvendor, VerifyToken } from '../middlewares/auth.js';
import {
    requestOtp,
    verifyOtpAndLogin,
    completeProfile,
    logout,
    userProfile,
    verifyOtpAndUpdateMobile,
    updateProfile
} from '../controllers/vendorController.js';
import { WebSocketServer } from 'ws';
import { addRating, getRatings } from '../controllers/ratingController.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import manquant
import cloudinary from '../config/cloudinaryConfig.js'; // Chemin vers votre config

dotenv.config();
const app = express();
const router = express.Router();

// Déterminer le répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'vendeur',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [
        { width: 800, crop: 'limit', quality: 'auto' }, // Compression auto
        { fetch_format: 'auto' } // Format optimal
      ],
      resource_type: 'image',
      public_id: (req, file) => `item-${Date.now()}-${Math.round(Math.random() * 1E9)}` // ID unique
    }
  });
  



  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (/^image\/(jpe?g|png)$/.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Seules les images JPEG/PNG sont autorisées'), false);
      }
    },
    limits: { 
      fileSize: 5 * 1024 * 1024, // 5MB par fichier
      files: 5 // Maximum 5 fichiers
    }
  });
  
  // Middleware de pré-validation
  const validateFileSize = (req, res, next) => {
    if (!req.files) return next();
    
    const oversizedFiles = req.files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return res.status(413).json({
        message: `Certains fichiers dépassent 5MB: ${oversizedFiles.map(f => f.originalname).join(', ')}`
      });
    }
    next();
  };

// Routes d'authentification
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtpAndLogin);
router.post('/complete-profile', upload.single('image'),validateFileSize, VerifyTokenvendor, completeProfile);
router.get('/logout', VerifyTokenvendor, logout)
router.get('/profile', VerifyTokenvendor, userProfile);
router.post('/update-profile', upload.single('image'),validateFileSize, VerifyTokenvendor, updateProfile);
router.post('/verify-otp-update-mobile',VerifyTokenvendor, verifyOtpAndUpdateMobile);

// Routes pour les notations
router.post('/:vendorId/ratings', VerifyToken, addRating);
router.get('/:vendorId/ratings',VerifyToken, getRatings);

// Initialisation du paiement
// Dans la route d'initialisation du paiement, modifiez les liens de succès/échec
router.post('/initiate-payment', VerifyTokenvendor, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, msg: 'Montant invalide' });
        }

        const paymentData = {
            app_token: process.env.FLOUCI_APP_TOKEN,
            app_secret: process.env.FLOUCI_APP_SECRET,
            amount: Number(amount),
            success_link: `dumumtergo://payment/success?developer_tracking_id=${req.vendorId}`,
            fail_link: 'dumumtergo://payment/fail',
            developer_tracking_id: req.vendorId,
            session_timeout_secs: 1200,
            accept_card: true,
        };

        const { data } = await axios.post("https://developers.flouci.com/api/generate_payment", paymentData);
        if (data.result.success) {
            await Vendor.findByIdAndUpdate(req.vendorId, { paymentId: data.result.payment_id });
            return res.status(200).json(data);
        }
        return res.status(400).json({ success: false, msg: "Erreur lors de l'initialisation du paiement." });
    } catch (error) {
        console.error('Erreur paiement:', error.message);
        return res.status(500).json({ success: false, msg: 'Erreur serveur lors de linitiation du paiement.' });
    }
});

// Modifiez la route de succès pour gérer la redirection vers l'app mobile
router.get('/payment/success', async (req, res) => {
    try {
        const { developer_tracking_id, payment_id } = req.query;
        if (!developer_tracking_id || !payment_id) {
            return res.status(400).json({ success: false, msg: 'Paramètres manquants.' });
        }

        const vendor = await Vendor.findById(developer_tracking_id);
        if (!vendor) {
            return res.status(404).json({ success: false, msg: 'Vendeur non trouvé.' });
        }

        // Vérification du paiement avec payment_id reçu
        const { data } = await axios.get(`https://developers.flouci.com/api/verify_payment/${payment_id}`, {
            headers: {
                'Content-Type': 'application/json',
                'apppublic': process.env.FLOUCI_APP_TOKEN,
                'appsecret': process.env.FLOUCI_APP_SECRET,
            },
        });

        if (data.success && data.result.status === 'SUCCESS') {
            vendor.subscription = { 
                status: 'active', 
                expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
            };
            vendor.paymentId = payment_id;
            await vendor.save();

            // Redirection vers l'application mobile avec les paramètres nécessaires
            return res.redirect(`https://dumum-tergo-backend.onrender.com/payment/success?vendorId=${developer_tracking_id}&paymentId=${payment_id}`);
        }

        return res.redirect('https://dumum-tergo-backend.onrender.com/payment/fail');
    } catch (error) {
        console.error('Erreur succès paiement:', error);
        return res.redirect('https://dumum-tergo-backend.onrender.com/payment/fail?error=server_error');
    }
});

// Modifiez la route d'échec pour rediriger vers l'app mobile
router.get('/payment/fail', (req, res) => {
    const { error } = req.query;
    const errorParam = error ? `?error=${error}` : '';
    return res.redirect(`https://dumum-tergo-backend.onrender.com/payment/fail${errorParam}`);
});

// Vérification du paiement
router.get('/verify-payment/:payment_id', async (req, res) => {
    const { payment_id } = req.params; // Récupération du payment_id depuis les paramètres de l'URL

    try {
        const response = await axios.get(`https://developers.flouci.com/api/verify_payment/${payment_id}`, {
            headers: {
                'Content-Type': 'application/json',
                'apppublic': process.env.FLOUCI_APP_TOKEN, // Utilisation de la variable d'environnement
                'appsecret': process.env.FLOUCI_APP_SECRET, // Utilisation de la variable d'environnement
            },
        });

        // Traitez la réponse comme nécessaire
        res.json(response.data); // Envoi de la réponse à l'utilisateur
    } catch (error) {
        console.error('Erreur lors de la vérification du paiement:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de la vérification du paiement.' });
    }
});

export default router;
// Créer un serveur WebSocket
const wss = new WebSocketServer({ port: 9099 });

wss.on('connection', (ws) => {
    console.log('Nouvelle connexion WebSocket');

    ws.on('message', (message) => {
        console.log(`Message reçu: ${message}`);
    });

    ws.on('close', () => {
        console.log('Connexion WebSocket fermée');
    });
});

