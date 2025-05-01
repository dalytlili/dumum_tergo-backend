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
    changePassword

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

// Create an Express router
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

// Route handlers
router.post('/register', upload.single('image'), registerValidator, userRegister);
router.post('/send-mail-verification', sendMailVerificationValidator, sendMailVerification);
router.post('/forgot-password', passwordResetValidator, forgotPassword);
router.post('/login',   loginUser);
router.get('/profile', VerifyToken, userProfile);
router.post('/update-profile', VerifyToken, upload.single('image'), updateProfile);
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

//admin
router.post('/login-admin', loginValidator, loginAdmin);
router.get('/logout-admin', verifyAdmin, logoutAdmin);
router.get('/profile-admin', verifyAdmin, adminProfile);
router.post('/update-profile-admin', verifyAdmin, upload.single('image'), updateProfileValidator, updateProfileAdmin);
router.get('/all-user', verifyAdmin, getalluser);
router.put('/promote-to-admin/:userId', verifyAdmin, promoteToAdmin);
router.patch('/:userId/ban', verifyAdmin, banUser);
router.patch('/:userId/unban', verifyAdmin, unbanUser);
router.put('/revokeAdmin/:userId', verifyAdmin, revokeAdmin);
router.get('/all-vendeur', verifyAdmin, getAllVendors);
router.patch('/:vendorId/banVendor', verifyAdmin, banVendor);
router.patch('/:vendorId/unbanVendor', verifyAdmin, unbanVendor);
export default router;
