import Experience from '../models/experienceModel.js';
import User from '../models/userModel.js';
import {  sendNotification } from '../config/wsServer.js';

// Créer une nouvelle expérience
export const createExperience = async (req, res) => {
  try {
    console.log('Corps de la requête:', req.body); // Pour débogage
    console.log('Fichiers reçus:', req.files); // Pour débogage

    const { description, } = req.body;
    const userId = req.user._id;

    // Validation améliorée
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "La description est requise et doit être une chaîne non vide"
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Au moins une image est requise"
      });
    }

    const mediaFiles = req.files.map(file => ({
      url: file.path,
      mediaType: file.mimetype.startsWith('image') ? 'image' : 'video'
    }));

    const newExperience = new Experience({
      user: userId,
      description: description.trim(),
      images: mediaFiles
    });

    await newExperience.save();
    
    const populatedExperience = await Experience.findById(newExperience._id)
    .populate('user', 'name image')

    res.status(201).json({
      success: true,
      data: populatedExperience
    });
  } catch (error) {
    console.error('Erreur:', error); // Log détaillé
    res.status(500).json({
      success: false,
      message: error.message || "Une erreur est survenue"
    });
  }
};

// Obtenir toutes les expériences
export const getExperiences = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const experiences = await Experience.find()
      .populate('user', 'name image')
      .populate('comments.user', 'name image')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Experience.countDocuments();

    res.json({
      success: true,
      data: experiences,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtenir les expériences d'un utilisateur
export const getUserExperiences = async (req, res) => {
  try {
    const { userId } = req.params;
    const experiences = await Experience.find({ user: userId })
    .populate('user', 'name image')
    .populate('comments.user', 'name image')

    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: experiences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Ajouter un like
export const likeExperience = async (req, res) => {
  try {
    // 1. Récupérer l'expérience avec l'utilisateur peuplé
    const experience = await Experience.findById(req.params.id).populate('user', '_id name');
    
    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Expérience non trouvée'
      });
    }

    // 2. Vérifier que l'utilisateur existe sur l'expérience
    if (!experience.user) {
      return res.status(400).json({
        success: false,
        message: 'Auteur de l\'expérience introuvable'
      });
    }

    // 3. Vérifier si l'utilisateur a déjà liké
    if (experience.likes.some(like => like.equals(req.user._id))) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà aimé cette expérience'
      });
    }

    // 4. Ajouter le like
    experience.likes.push(req.user._id);
    await experience.save();

    // 5. Envoyer notification seulement si l'auteur est différent de l'utilisateur actuel
  // Dans likeExperience, modifiez la partie notification :
if (!experience.user._id.equals(req.user._id)) {
  try {
    console.log('Attempting to send like notification to:', experience.user._id);
    const notificationResult = await sendNotification(experience.user._id.toString(), {
      type: 'experience_like',
      recipientType: 'User', // Doit correspondre exactement à l'enum
      data: {
        experienceId: experience._id,
        likedBy: {
          _id: req.user._id,
          name: req.user.name,
          image: req.user.image // Ajoutez l'image de l'utilisateur
        },
        experienceTitle: experience.title // Vous pouvez ajouter d'autres infos sur l'expérience si besoin

      },
      message: `${req.user.name} a aimé votre expérience`
    });
    console.log('Notification result:', notificationResult);
  } catch (error) {
    console.error('Notification error:', error);
    // Ne pas bloquer le like à cause d'une erreur de notification
  }
}

    return res.json({
      success: true,
      data: {
        ...experience.toObject(),
        // Ajoutez d'autres champs si nécessaire
      }
    });

  } catch (error) {
    console.error("Erreur dans likeExperience:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const unlikeExperience = async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Expérience non trouvée'
      });
    }

    if (!experience.likes.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Vous n'avez pas encore aimé cette expérience"
      });
    }

    // Retirer l'id utilisateur du tableau likes
    experience.likes = experience.likes.filter(
      (userId) => userId.toString() !== req.user._id.toString()
    );

    await experience.save();

    res.json({
      success: true,
      data: experience
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    console.log('Corps de la requête:', req.body); // Pour débogage

    const experience = await Experience.findById(req.params.id).populate('user', '_id name');

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Expérience non trouvée'
      });
    }

    // Ajouter le commentaire
    experience.comments.push({
      user: req.user._id,
      text
    });

    await experience.save();

    // Envoyer une notification à l'auteur si ce n'est pas lui qui commente
    if (!experience.user._id.equals(req.user._id)) {
      try {
        console.log('Sending comment notification to:', experience.user._id);
        const notificationResult = await sendNotification(experience.user._id.toString(), {
          type: 'experience_comment',
          recipientType: 'User',
          data: {
            experienceId: experience._id,
            commentedBy: req.user._id,
            commentedByUsername: req.user.name,
            commentText: text
          },
          message: `${req.user.name} a commenté votre expérience`
        });
        console.log('Notification result:', notificationResult);
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi de la notification de commentaire:', notificationError);
      }
    }

    // Retourner l'expérience peuplée
    const populatedExperience = await Experience.findById(experience._id)
      .populate({
        path: 'comments.user',
        select: 'name image'
      });

    res.json({
      success: true,
      data: populatedExperience
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mettre à jour la description d'une expérience
export const updateExperienceDescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const userId = req.user._id;

    // Validation
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "La description est requise et doit être une chaîne non vide"
      });
    }

    // Trouver l'expérience
    const experience = await Experience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Expérience non trouvée"
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de l'expérience
    if (experience.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé - Vous ne pouvez modifier que vos propres expériences"
      });
    }

    // Mettre à jour la description
    experience.description = description.trim();
    await experience.save();

    // Renvoyer l'expérience mise à jour avec les informations utilisateur
    const populatedExperience = await Experience.findById(experience._id)
      .populate('user', 'name image')
      .populate('comments.user', 'name image');

    res.json({
      success: true,
      data: populatedExperience
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Une erreur est survenue lors de la mise à jour"
    });
  }
};
// Rechercher des expériences par tag ou localisation
export const searchExperiences = async (req, res) => {
  try {
    const { tag, lat, lng, radius = 10 } = req.query;
    let query = {};

    if (tag) {
      query.tags = tag;
    }

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const experiences = await Experience.find(query)
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: experiences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Obtenir les likes d'une expérience
export const getLikes = async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id)
      .populate('likes', 'name image')
      .select('likes');

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Expérience non trouvée"
      });
    }

    res.json({
      success: true,
      data: experience.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtenir les commentaires d'une expérience
export const getComments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const experience = await Experience.findById(req.params.id)
      .populate({
        path: 'comments.user',
        select: 'name image'
      })
      .select('comments');

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Expérience non trouvée"
      });
    }

    // Pagination des commentaires
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedComments = experience.comments.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedComments,
      totalComments: experience.comments.length,
      totalPages: Math.ceil(experience.comments.length / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Supprimer une expérience
export const deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Trouver l'expérience
    const experience = await Experience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Expérience non trouvée"
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de l'expérience
    if (experience.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé - Vous ne pouvez supprimer que vos propres expériences"
      });
    }

    // Supprimer les fichiers média associés (si stockés localement)
    if (experience.images && experience.images.length > 0) {
      for (const image of experience.images) {
        try {
          const fs = require('fs');
          const path = require('path');
          const filePath = path.join(__dirname, '..', image.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error("Erreur lors de la suppression du fichier:", fileError);
        }
      }
    }

    // Supprimer l'expérience de la base de données
    await Experience.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Expérience supprimée avec succès"
    });

  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Une erreur est survenue lors de la suppression"
    });
  }
};
// Ajouter une expérience aux favoris
export const addToFavorites = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const userId = req.user._id;

    // Vérifier si l'expérience existe
    const experience = await Experience.findById(experienceId);
    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Expérience non trouvée'
      });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'expérience est déjà dans les favoris
    if (user.favorites.includes(experienceId)) {
      return res.status(400).json({
        success: false,
        message: 'Cette expérience est déjà dans vos favoris'
      });
    }

    // Ajouter l'expérience aux favoris
    user.favorites.push(experienceId);
    await user.save();

    res.json({
      success: true,
      message: 'Expérience ajoutée aux favoris avec succès',
      data: user.favorites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Retirer une expérience des favoris
export const removeFromFavorites = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const userId = req.user._id;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'expérience est dans les favoris
    if (!user.favorites.includes(experienceId)) {
      return res.status(400).json({
        success: false,
        message: "Cette expérience n'est pas dans vos favoris"
      });
    }

    // Retirer l'expérience des favoris
    user.favorites = user.favorites.filter(
      fav => fav.toString() !== experienceId
    );
    await user.save();

    res.json({
      success: true,
      message: 'Expérience retirée des favoris avec succès',
      data: user.favorites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtenir les expériences favorites d'un utilisateur
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user._id;

    // Trouver l'utilisateur avec ses favoris peuplés
    const user = await User.findById(userId)
      .populate({
        path: 'favorites',
        populate: {
          path: 'user',
          select: 'name image'
        }
      })
      .select('favorites');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user.favorites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
