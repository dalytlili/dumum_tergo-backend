import express from 'express';
import { VerifyTokenvendor, VerifyToken } from '../middlewares/auth.js';
import {
  getVendorNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUserrNotifications,
  markNotificationAsReaduser
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/user', VerifyToken, getUserrNotifications);
router.put('/user/:notificationId/read', VerifyToken, markNotificationAsReaduser);

// Routes protégées par authentification vendeur
router.get('/vendor', VerifyTokenvendor, getVendorNotifications);
router.put('/vendor/:notificationId/read', VerifyTokenvendor, markNotificationAsRead);
router.put('/vendor/read-all', VerifyTokenvendor, markAllNotificationsAsRead);

export default router; 