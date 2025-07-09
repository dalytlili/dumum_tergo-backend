import express from 'express';
import {
    createComplaint,
    getComplaints,
    updateComplaintStatus,
    addResponse,
    createComplaintVendor,
    getVendorComplaints,
    getUserComplaints
} from '../controllers/complaintController.js';
import { VerifyTokenvendor, VerifyToken, verifyAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Routes accessibles aux utilisateurs et vendeurs
router.post('/', VerifyToken, createComplaint);
router.get('/user-complaints', VerifyToken, getUserComplaints);
router.post('/vendeur', VerifyTokenvendor, createComplaintVendor);
router.get('/vendeur', VerifyTokenvendor, getVendorComplaints);

router.get('/', verifyAdmin, getComplaints);

// Route pour ajouter des réponses
router.post('/:id/responses', verifyAdmin, addResponse);

// Routes admin seulement
router.patch('/:id/status', verifyAdmin,  updateComplaintStatus);

export default router;
