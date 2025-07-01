import express from 'express';
import { 
    createComplaint, 
    getAllComplaints, 
    updateComplaintStatus, 
    getUserComplaints 
} from '../controllers/complaintController.js';
import { VerifyToken, verifyAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Routes pour les utilisateurs/vendeurs
router.post('/complaints', VerifyToken, createComplaint);
router.get('/complaints/my-complaints', VerifyToken, getUserComplaints);

// Routes pour l'admin
router.get('/admin/complaints', verifyAdmin, getAllComplaints);
router.put('/admin/complaints/:complaintId', verifyAdmin, updateComplaintStatus);

export default router;
