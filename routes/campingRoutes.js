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
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
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
router.post('/items',upload.array('images', 5),  VerifyTokenvendor, addCampingItem);
router.put('/items/:itemId',upload.array('images', 5), VerifyTokenvendor, updateCampingItem);
router.delete('/items/:itemId', VerifyTokenvendor, deleteCampingItem);
router.get('/vendor/items', VerifyTokenvendor, getVendorItems);
router.put('/rentals/:rentalId/confirm', VerifyTokenvendor, confirmRental);
router.get('/items/:itemId', VerifyTokenvendor, getCampingItemDetailsForVendor); // Nouvelle route

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