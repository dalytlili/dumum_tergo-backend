import express from 'express';
import {
  addCampingItem,
  updateCampingItem,
  deleteCampingItem,
  getVendorItems,
  getAllCampingItems,
  getCampingItemDetails,
  purchaseItem,
  rentItem,
  confirmRental,
  getRentalHistory,
  getOrderHistory,
  getCampingItemsByVendor,
  getCampingItemDetailsForVendor,
  getCampingItemDetailsForAdmin,
  deleteCampingItemByAdmin,
  banCampingItem,
  unbanCampingItem,
  getBannedItems
} from '../controllers/campingController.js';
import { VerifyTokenvendor, VerifyToken, verifyAdmin } from '../middlewares/auth.js';
import { checkVendorSubscription } from '../middlewares/vendorSubscription.js';

import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
const router = express.Router();
import cloudinary from '../config/cloudinaryConfig.js'; // Chemin vers votre config
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import manquant

// Get the current file's directory path (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for file uploads
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'camping-items',
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
router.post('/items',upload.array('images', 5),validateFileSize,  VerifyTokenvendor,checkVendorSubscription, addCampingItem);
router.put('/items/:itemId',upload.array('images', 5), VerifyTokenvendor,checkVendorSubscription, updateCampingItem);
router.delete('/items/:itemId', VerifyTokenvendor, deleteCampingItem);
router.get('/vendor/items', VerifyTokenvendor,checkVendorSubscription, getVendorItems);
router.put('/rentals/:rentalId/confirm', VerifyTokenvendor,checkVendorSubscription, confirmRental);
router.get('/items/:itemId', VerifyTokenvendor,checkVendorSubscription, getCampingItemDetailsForVendor); // Nouvelle route

// Routes pour les utilisateurs
router.get('/items', VerifyToken, getAllCampingItems);
router.get('/items/vendor/:vendorId', VerifyToken, getCampingItemsByVendor);

router.get('/items/:itemId',VerifyToken, getCampingItemDetails);
router.post('/items/:itemId/purchase', VerifyToken, purchaseItem);
router.post('/items/:itemId/rent', VerifyToken, rentItem);
router.get('/rentals/history', VerifyToken, getRentalHistory);
router.get('/orders/history', VerifyToken, getOrderHistory);

// Ajouter ces nouvelles routes pour l'admin
router.get('/admin/vendor/:vendorId/items', verifyAdmin, getCampingItemsByVendor);
router.get('/admin/items/:itemId', verifyAdmin, getCampingItemDetailsForAdmin);
router.delete('/admin/items/:itemId', verifyAdmin, deleteCampingItemByAdmin);
// Admin ban/unban routes
router.post('/admin/items/:itemId/ban', verifyAdmin, banCampingItem);
router.post('/admin/items/:itemId/unban', verifyAdmin, unbanCampingItem);
router.get('/admin/banned-items', verifyAdmin, getBannedItems);
export default router;
