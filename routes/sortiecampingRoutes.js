import express from "express";
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import {
  createCampingEvent,
  getCampingEvents,
  participerEvenement,
  getEventDetails,
  annulerParticipationEvenement,
  deleteCampingEvent
} from "../controllers/sortiecampingController.js";
import { VerifyTokenvendor, VerifyToken, verifyAdmin} from '../middlewares/auth.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import manquant
import cloudinary from '../config/cloudinaryConfig.js'; // Chemin vers votre config
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
router.post("/",upload.array('images', 10), verifyAdmin, createCampingEvent);
router.get("/geteventadmin", verifyAdmin, getCampingEvents);
router.get('/evenementadmin/:eventId', verifyAdmin, getEventDetails);
router.delete('/supremmer/:eventId', verifyAdmin, deleteCampingEvent);

router.get("/", VerifyToken, getCampingEvents);
router.post('/:eventId/participer', VerifyToken, participerEvenement);
router.get('/evenement/:eventId', VerifyToken, getEventDetails);
router.delete('/:eventId/annulerparticiper', VerifyToken, annulerParticipationEvenement);
// Ajoutez d'autres routes au besoin

export default router;
