import Vendor from '../models/vendor.js';

export const addRating = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id; // Récupéré du token via le middleware VerifyToken

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, msg: 'Données de notation invalides' });
        }

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ success: false, msg: 'Vendeur non trouvé' });
        }

        // Vérifier si l'utilisateur a déjà noté ce vendeur
        const existingRatingIndex = vendor.ratings.findIndex(r => r.userId.toString() === userId.toString());
        
        if (existingRatingIndex >= 0) {
            // Mettre à jour la notation existante
            vendor.ratings[existingRatingIndex].rating = rating;
            vendor.ratings[existingRatingIndex].comment = comment || '';
        } else {
            // Ajouter une nouvelle notation
            vendor.ratings.push({ userId, rating, comment });
        }

        // Sauvegarder et calculer automatiquement la moyenne via le middleware
        await vendor.save();

        return res.status(200).json({ 
            success: true, 
            averageRating: vendor.averageRating, 
            ratingCount: vendor.ratingCount 
        });
    } catch (error) {
        console.error('Erreur ajout notation:', error);
        return res.status(500).json({ success: false, msg: 'Erreur serveur' });
    }
};

export const getRatings = async (req, res) => {
    try {
        const { vendorId } = req.params;
        
        const vendor = await Vendor.findById(vendorId)
            .select('ratings averageRating ratingCount')
            .populate('ratings.userId', 'name'); // Adaptez selon votre modèle User

        if (!vendor) {
            return res.status(404).json({ success: false, msg: 'Vendeur non trouvé' });
        }

        return res.status(200).json({ 
            success: true, 
            ratings: vendor.ratings,
            averageRating: vendor.averageRating,
            ratingCount: vendor.ratingCount
        });
    } catch (error) {
        console.error('Erreur récupération notations:', error);
        return res.status(500).json({ success: false, msg: 'Erreur serveur' });
    }
};