// routes/reservationRoutes.js
import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { 
  createReservation, 
  updateReservationStatus, 
  getUserReservations, 
  getVendorReservations 
} from '../controllers/reservationController.js';
import { VerifyTokenvendor, VerifyToken } from '../middlewares/auth.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import manquant
import cloudinary from '../config/cloudinaryConfig.js';
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'event',
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
    if (/^image\/(jpe?g|png|pdf)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images JPEG/PNG/PDF sont autorisées'), false);
    }
  },
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB par fichier
  }
}).fields([
  { name: 'permisRecto', maxCount: 1 },
  { name: 'permisVerso', maxCount: 1 },
  { name: 'cinRecto', maxCount: 1 },
  { name: 'cinVerso', maxCount: 1 },
  { name: 'passport', maxCount: 1 }
]);
  
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
// Routes pour les clients
router.post('/', upload, VerifyToken, createReservation);
router.get('/user', VerifyToken, getUserReservations);

// Routes pour les vendeurs
router.put('/:reservationId', VerifyTokenvendor, updateReservationStatus);
router.get('/vendor', VerifyTokenvendor, getVendorReservations);

export default router;
