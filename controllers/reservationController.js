import Reservation from '../models/Reservation.js';
import Car from '../models/Car.js';
import User from '../models/userModel.js';
import Vendor from '../models/vendor.js';
import {  sendNotification } from '../config/wsServer.js';
import Notification from '../models/Notification.js';

// At the top of reservationController.js
//import { clients } from '../config/wsServer.js';

// Créer une réservation (pour client)
export const createReservation = async (req, res) => {
  try {
    console.log("Utilisateur authentifié :", req.user);

    const { 
      carId, 
      startDate, 
      endDate,
      childSeats,
      additionalDrivers,
      location,
      driverEmail,
      driverPhoneNumber,
      documentType // 'cin' ou 'passport'
    } = req.body;
    
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    const fullUser = await User.findById(user._id);


    // Vérifier la disponibilité de la voiture
    const car = await Car.findById(carId)
      .populate('vendor')
      .select('images brand model pricePerDay');
  
    if (!car) {
      return res.status(404).json({ error: 'Voiture non trouvée' });
    }

    // Convertir les dates en objets Date pour vérification
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    // Validation des données
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
    }

    if (!driverPhoneNumber.match(/^\+?[\d\s-]+$/)) {
      return res.status(400).json({ error: 'Numéro de téléphone invalide' });
    }

    if (!driverEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    // Vérification des documents
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Documents manquants' });
    }

// Dans createReservation, remplacez la partie documents par :

let documents = {};
if (documentType === 'cin') {
  if (!req.files.permisRecto || !req.files.permisVerso || !req.files.cinRecto) {
    return res.status(400).json({ error: 'Pour CIN, vous devez fournir permis recto, verso et CIN recto' });
  }
  
  documents = {
    permisRecto: req.files.permisRecto[0].path,
    permisVerso: req.files.permisVerso[0].path,
    cinRecto: req.files.cinRecto[0].path,
    cinVerso: req.files.cinVerso?.[0]?.path || '' // Optionnel
  };
} else if (documentType === 'passport') {
  if (!req.files.permisRecto || !req.files.permisVerso || !req.files.passport) {
    return res.status(400).json({ error: 'Pour passport, vous devez fournir permis recto, verso et passport' });
  }
  
  documents = {
    permisRecto: req.files.permisRecto[0].path,
    permisVerso: req.files.permisVerso[0].path,
    passport: req.files.passport[0].path
  };
} else {
  return res.status(400).json({ error: 'Type de document invalide (doit être "cin" ou "passport")' });
}

    const isAvailable = await checkCarAvailability(carId, startDate, endDate);
    if (!isAvailable) {
      return res.status(400).json({ error: 'Voiture non disponible pour ces dates et heures' });
    }

    // Calculer le prix total
    const durationInDays = (endDateTime - startDateTime) / (1000 * 60 * 60 * 24);
    let totalPrice = durationInDays * car.pricePerDay;
    
    // Ajouter les options supplémentaires
    totalPrice += (childSeats || 0) * 30; // 30 TND par siège enfant
    totalPrice += (additionalDrivers || 0) * 30; // 30 TND par conducteur supplémentaire

    const reservation = await Reservation.create({
      car: carId,
      user: user._id,
      vendor: car.vendor._id,
      startDate: startDateTime,
      endDate: endDateTime,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending',
      childSeats: childSeats || 0,
      additionalDrivers: additionalDrivers || 0,
      location,
      documents,
      driverDetails: {
        email: driverEmail,
        phoneNumber: driverPhoneNumber
      }
    });

    // Envoyer une notification au vendeur
    await sendNotification(
      car.vendor._id.toString(),
      {
        type: 'new_reservation',
        recipientType: 'Vendor',
        data: {
          reservationId: reservation._id,
          car: {
            _id: car._id,
            brand: car.brand,
            model: car.model
          },
          user: {
            _id: user._id,
            name: `${user.name}`,
            image: `${user.image}`,
          },
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          totalPrice: reservation.totalPrice
        }
      }
    );

    res.status(201).json(reservation);
  } catch (error) {
    console.error("Erreur lors de la création de la réservation:", error);
    res.status(400).json({ 
      error: error.message,
      details: "Veuillez vérifier tous les champs requis et leur format" 
    });
  }
};

// Accepter/refuser une réservation (pour vendeur)
export const updateReservationStatus = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { status } = req.body;
    const vendor = req.vendorId;

    // Vérification du statut
    if (status !== 'accepted' && status !== 'rejected') {
      return res.status(400).json({ error: 'Statut invalide. Doit être "accepted" ou "rejected"' });
    }

    const reservation = await Reservation.findOne({
      _id: reservationId,
      vendor: vendor
    }).populate('car').populate('user').populate('vendor');

    if (!reservation) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: 'La réservation a déjà été traitée' });
    }

    if (status === 'accepted') {
      const isAvailable = await checkCarAvailability(
        reservation.car._id,
        reservation.startDate,
        reservation.endDate
      );

      if (!isAvailable) {
        return res.status(400).json({ error: 'La voiture n\'est plus disponible pour ces dates' });
      }

      await Car.findByIdAndUpdate(reservation.car._id, {
        $push: {
          unavailableDates: {
            from: reservation.startDate,
            to: reservation.endDate
          }
        }
      });
    }

    // Mise à jour du statut
    reservation.status = status;
    await reservation.save();

    // Type de notification basé sur le statut
    const notificationType = status === 'accepted' ? 'reservation_accepted' : 'reservation_rejected';

    // Données de notification pour l'utilisateur
    const userNotificationData = {
      type: notificationType,
      recipientType: 'User',
      data: {
        reservationId: reservation._id,
        car: {
          _id: reservation.car._id,
          brand: reservation.car.brand,
          model: reservation.car.model
        },
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: status
      }
    };

    // Données de notification pour le vendeur
    const vendorNotificationData = {
      type: notificationType,
      recipientType: 'Vendor',
      data: {
        reservationId: reservation._id,
        car: {
          _id: reservation.car._id,
          brand: reservation.car.brand,
          model: reservation.car.model
        },
        user: {
          _id: reservation.user._id,
          name: reservation.user.name,
          image: reservation.user.image
        },
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: status,
        isVendorNotification: true
      }
    };

    // Création des notifications dans la base de données
    await Notification.create({
      recipient: reservation.user._id,
      ...userNotificationData,
      read: false
    });

    await Notification.create({
      recipient: reservation.vendor._id,
      ...vendorNotificationData,
      read: false
    });

    // Envoi des notifications via WebSocket
    await sendNotification(reservation.user._id.toString(), userNotificationData);
    await sendNotification(reservation.vendor._id.toString(), vendorNotificationData);

    res.json({
      message: `Réservation ${status === 'accepted' ? 'acceptée' : 'rejetée'} avec succès`,
      reservation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Obtenir les réservations d'un client
export const getUserReservations = async (req, res) => {
  try {
    const { user } = req;
    const reservations = await Reservation.find({ user: user._id })
      .populate('car', 'brand model images')
      .populate('vendor', 'businessName image');
    res.json(reservations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtenir les réservations d'un vendeur
export const getVendorReservations = async (req, res) => {
  try {
    const { vendor } = req;
    const reservations = await Reservation.find({ vendor: req.vendorId })
      .populate('car', 'brand model images registrationNumber')
      .populate('user', 'name image email mobile');
    res.json(reservations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Fonction utilitaire pour vérifier la disponibilité d'une voiture
async function checkCarAvailability(carId, startDate, endDate) {
  const car = await Car.findOne({
    _id: carId,
    isAvailable: true,
    $nor: [
      {
        unavailableDates: {
          $elemMatch: {
            from: { $lte: new Date(endDate) },
            to: { $gte: new Date(startDate) }
          }
        }
      }
    ]
  });
  return !!car;
};
// Annuler une réservation (pour client)
export const cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { user } = req;

    const reservation = await Reservation.findOne({
      _id: reservationId,
      user: user._id
    }).populate('car').populate('vendor');

    if (!reservation) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    // Vérifier que la réservation est encore en attente
    if (reservation.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Vous ne pouvez annuler que les réservations en attente' 
      });
    }

    // Mettre à jour le statut
    reservation.status = 'cancelled';
    await reservation.save();

    // Envoyer une notification au vendeur
    await sendNotification(
      reservation.vendor._id.toString(),
      {
        type: 'reservation_cancelled',
        recipientType: 'Vendor',
        data: {
          reservationId: reservation._id,
          car: {
            _id: reservation.car._id,
            brand: reservation.car.brand,
            model: reservation.car.model
          },
          user: {
            _id: user._id,
            name: `${user.name}`,
            image: `${user.image}`,
          },
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          totalPrice: reservation.totalPrice
        }
      }
    );

    // Envoyer une notification à l'utilisateur
    await sendNotification(
      user._id.toString(),
      {
        type: 'reservation_cancelled',
        recipientType: 'User',
        data: {
          reservationId: reservation._id,
          car: {
            _id: reservation.car._id,
            brand: reservation.car.brand,
            model: reservation.car.model
          },
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          totalPrice: reservation.totalPrice
        }
      }
    );

    res.json({
      message: 'Réservation annulée avec succès',
      reservation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
