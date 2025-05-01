// routes/carRoutes.js
import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

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

const router = express.Router();

// Get the current file's directory path (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, path.join(__dirname, '../public/images'));
        } else {
            cb(new Error('Unsupported file type'), false);
        }
    },
    filename: (req, file, cb) => {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type'), false);
    }
};

const upload = multer({
    storage,
    fileFilter
});

// Routes pour les vendeurs
router.post('/',upload.array('images', 5), VerifyTokenvendor, createCar);
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