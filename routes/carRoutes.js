// routes/carRoutes.js
import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { checkVendorSubscription } from '../middlewares/vendorSubscription.js';

import { 
  createCar, 
  searchAvailableCars, 
  getVendorCars ,
  searchLocations,
  deleteCar,
  addLocation,
  banCar,
  unbanCar,
  getCarByVendor
} from '../controllers/carController.js';
import { VerifyTokenvendor, VerifyToken, verifyAdmin} from '../middlewares/auth.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import manquant
import cloudinary from '../config/cloudinaryConfig.js'; // Chemin vers votre config

const router = express.Router();

// Get the current file's directory path (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'camping',
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
// Routes pour les vendeurs
router.post('/',upload.array('images', 10),validateFileSize,checkVendorSubscription, VerifyTokenvendor, createCar);
router.get('/vendor', VerifyTokenvendor, getVendorCars);
router.get('/searchLocations', searchLocations);
router.delete('/cars/:id', VerifyTokenvendor, deleteCar);
// Route publique pour la recherche
router.get('/search',searchAvailableCars);
router.post('/add', addLocation); // 👉 Route pour ajouter une location

// Ajouter ces nouvelles routes pour l'admin
router.get('/admin/vendor/:vendorId/cars', verifyAdmin, getCarByVendor);

// Admin ban/unban routes
router.post('/admin/car/:id/ban', verifyAdmin, banCar);
router.post('/admin/car/:id/unban', verifyAdmin, unbanCar);


export default router;
