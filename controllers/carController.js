import Car from '../models/Car.js';
import Location from '../models/Location.js'
import Reservation from '../models/Reservation.js';
import Vendor from '../models/vendor.js';
import CampingItem from '../models/CampingItem.js';

const checkAndBanVendor = async (vendorId, adminId) => {
  // Compter les items et voitures bannis du vendeur
  const bannedItemsCount = await CampingItem.countDocuments({ 
    vendor: vendorId, 
    isBanned: true 
  });
  
  const bannedCarsCount = await Car.countDocuments({ 
    vendor: vendorId, 
    isBanned: true 
  });
  
  const totalBans = bannedItemsCount + bannedCarsCount;
  
  // Si le vendeur a 3 bans ou plus, le bannir
  if (totalBans >= 3) {
    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { 
        $set: { 
          is_banned: true,
          ban_reason: 'Automatic ban after 3 item/car bans',
          banned_at: new Date(),
          bannedBy: adminId,
          'subscription.status': 'inactive'
        }
      },
      { new: true }
    );
    
    // Envoyer une notification au vendeur
    if (vendor.email) {
      try {
        await sendBanEmail(vendor.email, 'Automatic ban after 3 item/car bans');
      } catch (emailError) {
        console.error("Failed to send ban email:", emailError);
      }
    }
    
    return true; // Vendeur banni
  }
  
  return false; // Vendeur non banni
};
export const searchLocations = async (req, res) => {
  try {
    const query = req.query.query.toLowerCase();  // Récupérer la requête de recherche

    // Rechercher les lieux qui correspondent au titre ou au sous-titre
    const locations = await Location.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
       { subtitle: { $regex: query, $options: 'i' } }
      ]
    });

    // Retourner les résultats
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Ajouter une nouvelle location
export const addLocation = async (req, res) => {
  try {
    const { title, subtitle } = req.body;

    // Validation simple
    if (!title) {
      return res.status(400).json({ error: 'Le titre est requis.' });
    }

    const newLocation = new Location({ title, subtitle });
    await newLocation.save();

    res.status(201).json({ message: 'Lieu ajouté avec succès.', location: newLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Supprimer une voiture et toutes ses réservations
export const deleteCar = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier d'abord si la voiture existe et appartient au vendeur
    const car = await Car.findOne({ _id: id, vendor: req.vendorId });
    
    if (!car) {
      return res.status(404).json({
        success: false,
        error: "Voiture non trouvée ou vous n'avez pas les droits pour la supprimer"
      });
    }

    // Supprimer toutes les réservations associées à cette voiture
    await Reservation.deleteMany({ car: id });

    // Supprimer la voiture elle-même
    await Car.deleteOne({ _id: id });

    res.json({
      success: true,
      message: "Voiture et toutes ses réservations associées ont été supprimées avec succès"
    });

  } catch (error) {
    console.error("Erreur lors de la suppression de la voiture:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};



// Créer une nouvelle voiture (pour vendeur)
export const createCar = async (req, res) => {
  try {
    console.log("Données reçues:", req.body);
    console.log("Fichiers reçus:", req.files);

    const { location, features, ...carData } = req.body;

    let parsedFeatures = [];
    try {
      parsedFeatures = typeof features === "string" ? JSON.parse(features) : features || [];
    } catch (err) {
      console.error("Erreur lors du parsing des features:", err);
      return res.status(400).json({ success: false, error: "Format invalide des features. Envoyez un tableau JSON." });
    }

    // Vérifier si l'emplacement existe déjà
    let existingLocation = await Location.findOne({ title: location });

    if (!existingLocation) {
      existingLocation = await Location.create({ title: location, subtitle: '' });
    }

    // Extraire les noms de fichiers des images
    const imageUrls = req.files ? req.files.map(file => file.filename) : [];

    // Créer la voiture
    const car = await Car.create({
      ...carData,
      vendor: req.vendorId,
      location: existingLocation._id,
      features: parsedFeatures, // ✅ Correction ici
      images: imageUrls, // ✅ Ajout des images
    });

    res.status(201).json(car);
  } catch (error) {
    console.error("Erreur lors de la création de la voiture:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};


// Rechercher des voitures disponibles
export const searchAvailableCars = async (req, res) => {
  try {
    const { location, startDate, endDate, transmission, mileagePolicy } = req.query;
   

    // Validation des paramètres de date
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Les paramètres startDate et endDate sont obligatoires" });
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ error: "Format de date invalide. Utilisez le format ISO 8601 (ex: 2025-04-02T14:59:09.589448)" });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: "La date de fin doit être postérieure à la date de début" });
    }

    // Construction de la requête de base
    let query = { isAvailable: true , isBanned: false};

    // Filtre par localisation si spécifiée
    if (location && location.trim() !== "") {
      const locationDoc = await Location.findOne({ title: location });
      if (!locationDoc) {
        return res.status(404).json({ error: "Localisation non trouvée" });
      }
      query.location = locationDoc._id;
    }

    // Filtre par type de transmission si spécifié
    if (transmission && ['manuelle', 'automatique'].includes(transmission)) {
      query.transmission = transmission;
    }

    // Filtre par politique de kilométrage si spécifiée
    if (mileagePolicy && ['limitée', 'illimitée'].includes(mileagePolicy)) {
      query.mileagePolicy = mileagePolicy;
    }

    // Recherche des voitures disponibles avec jointure sur "Location" pour récupérer le title
    const availableCars = await Car.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "reservations",
          let: { carId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$car", "$$carId"] },
                    { $lt: ["$startDate", endDateTime] },
                    { $gt: ["$endDate", startDateTime] },
                    { 
                      $not: {
                        $or: [
                          { $eq: ["$status", "rejected"] },
                          { $eq: ["$status", "cancelled"] }
                        ]
                      }
                    }
                  ]
                }
              }
            }
          ],
          as: "conflictingReservations"
        }
      },
      {
        $match: {
          $and: [
            { "unavailableDates": { 
              $not: {
                $elemMatch: {
                  from: { $lt: endDateTime },
                  to: { $gt: startDateTime }
                }
              }
            }},
            { "conflictingReservations": { $size: 0 } }
          ]
        }
      },
      {
        $lookup: {
          from: "vendors",
          localField: "vendor",
          foreignField: "_id",
          as: "vendor",
          pipeline: [
            { $project: { businessName: 1, image: 1 } }
          ]
        }
      },
      { $unwind: "$vendor" },
      {
        $lookup: {
          from: "locations",
          localField: "location",
          foreignField: "_id",
          as: "locationDetails"
        }
      },
      { 
        $unwind: {
          path: "$locationDetails", 
          preserveNullAndEmptyArrays: true 
        }
      },
      {
        $project: {
          _id: 1,
          vendor: 1,
          brand: 1,
          model: 1,
          year: 1,
          registrationNumber: 1,
          color: 1,
          seats: 1,
          deposit: 1,
          pricePerDay: 1,
          images: 1,
          features: 1,
          isAvailable: 1,
          unavailableDates: 1,
          transmission: 1,
          mileagePolicy: 1,
          mileageLimit: 1,
          location: "$locationDetails.title",
          conflictingReservations: 1
        }
      }
    ]);

    res.json(availableCars);
  } catch (error) {
    console.error("Erreur dans searchAvailableCars:", error);
    res.status(400).json({ 
      error: "Erreur lors de la recherche de voitures disponibles",
      details: error.message 
    });
  }
};
// Obtenir les voitures d'un vendeur
export const getVendorCars = async (req, res) => {
  try {
    const cars = await Car.find({ vendor: req.vendorId }).populate('location', 'title -_id');
    res.json({
      success: true,
      data: cars
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
};
export const banCar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    const car = await Car.findById(id);
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'car not found'
      });
    }
    
    if (car.isBanned) {
      return res.status(400).json({
        success: false,
        message: 'Car is already banned'
      });
    }
    
    car.isBanned = true;
    car.banReason = reason || 'Violation of terms';
    car.bannedAt = new Date();
    car.bannedBy = adminId;
    
    await car.save();
    
    // Vérifier si le vendeur doit être banni
    const vendorBanned = await checkAndBanVendor(car.vendor, adminId);
    
    res.json({
      success: true,
      message: 'Car banned successfully' + (vendorBanned ? ' and vendor automatically banned' : ''),
      data: car,
      vendorBanned: vendorBanned
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unban a camping item
 * @route   POST /api/camping/admin/items/:itemId/unban
 * @access  Private/Admin
 */
export const unbanCar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id; // ou req.admin.id selon votre auth

    const car = await Car.findById(id);
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }
    
    if (!car.isBanned) {
      return res.status(400).json({
        success: false,
        message: 'Car is not banned'
      });
    }
    
    car.isBanned = false;
    car.banReason = '';
    car.bannedAt = undefined;
    car.bannedBy = undefined;
    
    await car.save();
    
    // Envoyer une notification au vendeur si nécessaire
    /**await sendNotification({
      recipient: item.vendor,
      title: 'Article réactivé',
      message: `Votre article "${item.name}" a été réactivé et est à nouveau visible.`,
      type: 'item_unban',
      relatedId: item._id
    });*/

    res.json({
      success: true,
      message: 'Car unbanned successfully',
      data: car
    });
    
  } catch (error) {
    next(error);
  }
};
export const getCarByVendor = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const { page = 1, limit = 10 } = req.query;

    const query = { vendor: vendorId };

    const cars = await Car.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('vendor', 'mobile businessName rating image location email description businessAddress createdAt')
      .populate('location', 'title subtitle');

    res.json({
      success: true,
      data: cars
    });
  } catch (error) {
    next(error);
  }
};// Statistiques générales sur les voitures
export const getCarStatistics = async (req, res) => {
  try {
    // 1. Nombre total de voitures
    const totalCars = await Car.countDocuments();
    
    // 2. Nombre de voitures disponibles vs non disponibles
    const availableCars = await Car.countDocuments({ isAvailable: true });
    const unavailableCars = await Car.countDocuments({ isAvailable: false });
    
    // 3. Nombre de voitures bannies
    const bannedCars = await Car.countDocuments({ isBanned: true });
    
    // 4. Répartition par type de transmission
    const transmissionStats = await Car.aggregate([
      { $group: { _id: "$transmission", count: { $sum: 1 } } }
    ]);
    
    // 5. Répartition par politique de kilométrage
    const mileagePolicyStats = await Car.aggregate([
      { $group: { _id: "$mileagePolicy", count: { $sum: 1 } } }
    ]);
    
    // 6. Prix moyen par jour
    const avgPriceResult = await Car.aggregate([
      { $group: { _id: null, avgPrice: { $avg: "$pricePerDay" } } }
    ]);
    const avgPrice = avgPriceResult[0]?.avgPrice || 0;
    
    // 7. Top 5 marques les plus populaires
    const topBrands = await Car.aggregate([
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      success: true,
      data: {
        totalCars,
        availability: {
          available: availableCars,
          unavailable: unavailableCars
        },
        bannedCars,
        transmissionStats,
        mileagePolicyStats,
        avgPrice: parseFloat(avgPrice.toFixed(2)),
        topBrands
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
