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
      driverFirstName,
      driverLastName,
      driverBirthDate,
      driverPhoneNumber,
      driverCountry
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
    const driverBirthDateTime = new Date(driverBirthDate);

    // Validation des données
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
    }

    if (driverBirthDateTime >= new Date()) {
      return res.status(400).json({ error: 'La date de naissance doit être dans le passé' });
    }

    if (!driverPhoneNumber.match(/^\+?[\d\s-]+$/)) {
      return res.status(400).json({ error: 'Numéro de téléphone invalide' });
    }

    if (!driverEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Email invalide' });
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
      driverDetails: {
        email: driverEmail,
        firstName: driverFirstName,
        lastName: driverLastName,
        birthDate: driverBirthDateTime,
        phoneNumber: driverPhoneNumber,
        country: driverCountry
      }
    });

    // Envoyer une notification au vendeur
    await sendNotification(
      car.vendor._id.toString(),
      {
        type: 'new_reservation',
        recipientType: 'Vendor', // Doit correspondre à votre enum
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
      .populate('user', 'name image');
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
}
