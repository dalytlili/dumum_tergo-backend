import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

import {
  createExperience,
  getExperiences,
  getUserExperiences,
  likeExperience,
  addComment,
  searchExperiences,
  getLikes,
  getComments,
  unlikeExperience,
  deleteExperience,
  updateExperienceDescription,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getMonExperience
} from '../controllers/experienceController.js';

import cloudinary from '../config/cloudinaryConfig.js'; // Chemin vers votre config
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import manquant

import { VerifyTokenvendor, VerifyToken, verifyAdmin } from '../middlewares/auth.js';
const router = express.Router();


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
      if (/^image\/.+$/.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Seules les images sont autorisées'), false);
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
  
  router.post('/', VerifyToken, upload.array('images', 5), createExperience);
  // Avant : router.post('/',VerifyToken, createExperience);
router.delete('/:id', VerifyToken, deleteExperience);
router.get('/', VerifyToken, getExperiences);
router.put('/:id', VerifyToken, updateExperienceDescription);
router.get('/user/:userId',VerifyToken, getUserExperiences);
router.put('/:id/like', VerifyToken, likeExperience);
router.put('/:id/unlike', VerifyToken, unlikeExperience);
router.get('/:id', VerifyToken, getMonExperience);

router.post('/:id/comment', VerifyToken, addComment);
router.get('/search',VerifyToken, searchExperiences);
// Ajoutez ces deux nouvelles routes avant l'export
router.get('/:id/like', VerifyToken, getLikes);
router.get('/:id/comments', VerifyToken, getComments);
router.post('/favorites/:experienceId', VerifyToken, addToFavorites);
router.delete('/unfavorites/:experienceId', VerifyToken, removeFromFavorites);
router.get('/favorites', VerifyToken, getFavorites);
export default router;
