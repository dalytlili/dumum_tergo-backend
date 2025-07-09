import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import {
    userRegister,
    sendMailVerification,
    forgotPassword,
    loginUser,
    userProfile,
    updateProfile,
    refreshToken,
    logout,
    sendOpt,
    verifyOpt,
    forgotPasswordP,
    sendOtpP,
    verifyOtpPhone,
    resetPasswordP,
    deleteAccount,
    changePassword,
    getUserById,
    followUser,
    searchUsers,
    getStats

} from '../controllers/userController.js';
import {
    registerValidator,
    sendMailVerificationValidator,
    passwordResetValidator,
    loginValidator,
    updateProfileValidator,
    optMailValidation,
    verifyOptValidator
} from '../helpers/validation.js';

import { VerifyToken,
     verifyAdmin,
      checkUserBanStatus
     } from '../middlewares/auth.js';

import { loginAdmin,
     logoutAdmin, 
     adminProfile,
     updateProfileAdmin,
     getalluser,
     promoteToAdmin,
     banUser,
     unbanUser,
     revokeAdmin,
     getAllVendors,
     banVendor,
     unbanVendor
     } from '../controllers/adminController.js';
     import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Import manquant
     import cloudinary from '../config/cloudinaryConfig.js'; // Chemin vers votre config
     
// Create an Express router
const router = express.Router();

// Get the current file's directory path (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'user',
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

// Route handlers
router.post('/register', upload.single('image'),validateFileSize, registerValidator, userRegister);
router.post('/send-mail-verification', sendMailVerificationValidator, sendMailVerification);
router.post('/forgot-password', passwordResetValidator, forgotPassword);
router.post('/login',   loginUser);
router.get('/profile', VerifyToken, userProfile);
router.post('/update-profile', VerifyToken, upload.single('image'),validateFileSize, updateProfile);
router.post('/refresh-token', VerifyToken, refreshToken);
router.get('/logout', VerifyToken, logout)
router.post('/send-opt', optMailValidation, sendOpt)
router.post('/verify-opt', verifyOptValidator, verifyOpt)
router.post('/forgot-passwordP', forgotPasswordP)
router.post('/verifyOtpPhone', verifyOtpPhone)
router.post('/reset-password', resetPasswordP);
router.post('/send-opt', sendOtpP)
router.delete('/delete-account', VerifyToken, deleteAccount);
router.post('/change-password', VerifyToken, changePassword);
router.get('/search', VerifyToken, searchUsers);
router.post('/verify-token', VerifyToken, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});
router.get('/stats', getStats);

// Routes
router.get('/user/:id', VerifyToken, getUserById);
router.post('/:id/follow', VerifyToken, followUser);
//admin
router.post('/login-admin', loginValidator, loginAdmin);
router.get('/logout-admin', verifyAdmin, logoutAdmin);
router.get('/profile-admin', verifyAdmin, adminProfile);
router.post('/update-profile-admin', verifyAdmin, upload.single('image'), updateProfileValidator, updateProfileAdmin);
router.get('/all-user', verifyAdmin, getalluser);
router.get('/get-user-admin/:id', verifyAdmin, getUserById);

router.put('/promote-to-admin/:userId', verifyAdmin, promoteToAdmin);
router.patch('/:userId/ban', verifyAdmin, banUser);
router.patch('/:userId/unban', verifyAdmin, unbanUser);
router.put('/revokeAdmin/:userId', verifyAdmin, revokeAdmin);
router.get('/all-vendeur', verifyAdmin, getAllVendors);
router.patch('/:vendorId/banVendor', verifyAdmin, banVendor);
router.patch('/:vendorId/unbanVendor', verifyAdmin, unbanVendor);
export default router;
