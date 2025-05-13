// controllers/campingController.js
import Camping from "../models/camping.js";

// controllers/campingController.js
export const createCampingEvent = async (req, res) => {
  try {
    // Récupération des données selon le format
    const { lieu, date, description, longitude, latitude, address } = req.body;
    console.log('Body reçu:', req.body); // Ajout pour débogage

    // Validation des coordonnées
    if (!longitude || !latitude || !address) {
      return res.status(400).json({ 
        message: "Localisation requise",
        details: `Champs manquants: ${!longitude ? 'longitude ' : ''}${!latitude ? 'latitude ' : ''}${!address ? 'address' : ''}`
      });
    }

    // Conversion des coordonnées en nombres
    const long = parseFloat(longitude);
    const lat = parseFloat(latitude);
    
    if (isNaN(long) || isNaN(lat)) {
      return res.status(400).json({ message: "Coordonnées doivent être des nombres valides" });
    }
    const imageUrls = req.files ? req.files.map(file => file.filename) : [];
    const newEvent = new Camping({
      lieu,
      date,
      description,
      location: {
        type: 'Point',
        coordinates: [long, lat],
        address
      },
      createdBy: req.admin.id,
      images: imageUrls,
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ 
      message: error.message,
      errorDetails: error.errors // Affiche les erreurs de validation Mongoose
    });
  }
};
  
  // Nouvelle fonction pour récupérer les événements avec filtrage géospatial
  export const getNearbyEvents = async (req, res) => {
    try {
      const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance en mètres
      
      const events = await Camping.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(maxDistance)
          }
        }
      });
  
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
export const getCampingEvents = async (req, res) => {
  try {
    const events = await Camping.find().populate("createdBy", "name");
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const participerEvenement = async (req, res) => {
  try {
    console.log("Utilisateur authentifié :", req.user);

    const { eventId } = req.params;
    const userId = req.user._id; // L'ID de l'utilisateur authentifié

    // Vérification que userId existe
  

    // 1. Vérifier que l'événement existe
    const event = await Camping.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    // 2. Initialiser participants si null/undefined
    if (!event.participants) {
      event.participants = [];
    }

    // 3. Vérifications supplémentaires
    if (!event.isActive) {
      return res.status(400).json({ message: "Cet événement n'est plus actif" });
    }
    if (event.date < new Date()) {
      return res.status(400).json({ message: "Cet événement est déjà terminé" });
    }

    // 4. Vérification des doublons avec sécurité null-check
    const alreadyParticipating = event.participants.some(participant => 
      participant && participant.toString() === userId.toString()
    );

    if (alreadyParticipating) {
      return res.status(400).json({ 
        message: "Vous participez déjà à cet événement",
        code: "ALREADY_PARTICIPATING"
      });
    }

    // 5. Ajout du participant
    event.participants.push(userId);
    const updatedEvent = await event.save();

    // 6. Retourner l'événement mis à jour
    const populatedEvent = await Camping.findById(updatedEvent._id)
      .populate('participants', 'username email mobile image name');
    
    res.status(200).json({
      message: "Participation enregistrée avec succès",
      event: populatedEvent
    });

  } catch (error) {
    console.error("Erreur participation:", error);
    
    res.status(500).json({ 
      message: "Erreur lors de la participation",
     
    });
  }
};

export const getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    // 1. Récupérer l'événement avec les participants peuplés
    const event = await Camping.findById(eventId)
      .populate('participants', 'username email mobile image name') // Peuplage des participants
      .populate('createdBy', 'username email'); // Optionnel : infos du créateur

    // 2. Vérifier si l’événement existe
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // 3. Retourner les détails de l'événement
    res.status(200).json({ 
      message: 'Détails de l\'événement récupérés avec succès',
      event
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des détails de l’événement:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
// Ajoutez d'autres méthodes au besoin (update, delete, etc.)
