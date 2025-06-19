// middlewares/vendorSubscription.js
import Vendor from '../models/vendor.js';

export const checkVendorSubscription = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.vendorId);
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false,
        error: "Vendeur non trouvé" 
      });
    }



    // Vérifier l'abonnement
    const isActive = vendor.subscription.status === 'active' && 
                     (!vendor.subscription.expirationDate || 
                      vendor.subscription.expirationDate > new Date());

    if (!isActive) {
      return res.status(403).json({
        success: false,
        error: "Votre abonnement n'est pas actif. Veuillez souscrire à un abonnement !"
      });
    }

    next();
  } catch (error) {
    console.error("Erreur dans checkVendorSubscription:", error);
    res.status(500).json({ 
      success: false,
      error: "Erreur lors de la vérification de l'abonnement" 
    });
  }
};
