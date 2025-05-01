// routes/reservationRoutes.js
import express from 'express';
import { 
  createReservation, 
  updateReservationStatus, 
  getUserReservations, 
  getVendorReservations 
} from '../controllers/reservationController.js';
import { VerifyTokenvendor, VerifyToken } from '../middlewares/auth.js';

const router = express.Router();

// Routes pour les clients
router.post('/', VerifyToken, createReservation);
router.get('/user', VerifyToken, getUserReservations);

// Routes pour les vendeurs
router.put('/:reservationId', VerifyTokenvendor, updateReservationStatus);
router.get('/vendor', VerifyTokenvendor, getVendorReservations);

export default router;