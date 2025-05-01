import Notification from '../models/Notification.js';

// Récupérer toutes les notifications d'un vendeur
export const getVendorNotifications = async (req, res) => {
  try {
    const vendorId = req.vendorId;

    if (!vendorId) {
      return res.status(401).json({ error: 'Vendeur non authentifié' });
    }

    const notifications = await Notification.find({
      recipient: vendorId,
      recipientType: 'Vendor'
    })
    .sort({ createdAt: -1 }) // Trier par date de création décroissante
    .populate({
      path: 'data.reservationId',
      select: 'startDate endDate totalPrice status',
      populate: {
        path: 'car',
        select: 'brand model images'
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des notifications' });
  }
};

export const getUserrNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('iser:', userId)
    if (!userId) {
      return res.status(401).json({ error: 'User non authentifié' });
      
    }

    const notifications = await Notification.find({
      recipient: userId,
      recipientType: 'User'
    })
    .sort({ createdAt: -1 }) // Trier par date de création décroissante
    .populate({
      path: 'data.reservationId',
      select: 'startDate endDate totalPrice status',
      populate: {
        path: 'car',
        select: 'brand model images'
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des notifications' });
  }
};
// Marquer une notification comme lue
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const vendorId = req.vendorId;

    if (!vendorId) {
      return res.status(401).json({ error: 'Vendeur non authentifié' });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: vendorId,
        recipientType: 'Vendor'
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la notification' });
  }
};
export const markNotificationAsReaduser = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ error: 'Vendeur non authentifié' });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId,
        recipientType: 'User'
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de la notification' });
  }
};
// Marquer toutes les notifications comme lues
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const vendorId = req.vendorId;

    if (!vendorId) {
      return res.status(401).json({ error: 'Vendeur non authentifié' });
    }

    await Notification.updateMany(
      {
        recipient: vendorId,
        recipientType: 'Vendor',
        read: false
      },
      { read: true }
    );

    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour des notifications' });
  }
}; 