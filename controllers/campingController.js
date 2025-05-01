import CampingItem from '../models/CampingItem.js';
import Order from '../models/Order.js';
import Rental from '../models/Rental.js';
import { sendNotification } from '../config/wsServer.js';
import Location from '../models/Location.js'
import Vendor from '../models/vendor.js';
import Car from '../models/Car.js';

export const getCampingItemsByVendor = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const { page = 1, limit = 10 } = req.query;

    const query = { vendor: vendorId };

    const items = await CampingItem.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('vendor', 'mobile businessName rating image location email description businessAddress createdAt')
      .populate('location', 'title subtitle');

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

export const addCampingItem = async (req, res) => {
  try {
    console.log("Données reçues:", req.body);
    console.log("Fichiers reçus:", req.files);

    // Extraction des données
    const { location, ...itemData } = req.body;

    // Validation des champs requis
    if (!location) {
      return res.status(400).json({ 
        success: false,
        message: "Le champ 'location' est requis" 
      });
    }

    // Gestion de la localisation
    let existingLocation = await Location.findOne({ title: location });
    if (!existingLocation) {
      existingLocation = await Location.create({ 
        title: location, 
        subtitle: '' 
      });
    }

    // Conversion des types
    const processedData = {
      ...itemData,
      price: parseFloat(itemData.price),
      rentalPrice: itemData.rentalPrice ? parseFloat(itemData.rentalPrice) : undefined,
      //stock: parseInt(itemData.stock),
      isForSale: itemData.isForSale === 'true' || itemData.isForSale === true,
      isForRent: itemData.isForRent === 'true' || itemData.isForRent === true,
      vendor: req.vendorId,
      location: existingLocation._id,
      images: req.files ? req.files.map(file => file.filename) : []
    };

    // Création de l'article
    const newItem = await CampingItem.create(processedData);

    // Réponse unique
    return res.status(201).json({
      success: true,
      data: newItem
    });

  } catch (error) {
    console.error("Erreur:", error);
    
    // Gestion des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors
      });
    }
    
    // Erreur serveur générique
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};
export const getCampingItemDetailsForVendor = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const vendorId = req.vendorId;

    // Recherche l'article avec vérification du propriétaire
    const item = await CampingItem.findOne({
      _id: itemId,
      vendor: vendorId
    })
    .populate('vendor', 'mobile businessName rating image location email description businessAddress createdAt')
    .populate('location', 'title subtitle');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Article non trouvé ou vous n\'êtes pas le propriétaire'
      });
    }

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error("Erreur dans getCampingItemDetailsForVendor:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "ID d'article invalide"
      });
    }
    
    next(error);
  }
};
export const updateCampingItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { location, ...updateData } = req.body;

    // Vérifier si l'article existe et appartient au vendeur
    const item = await CampingItem.findOne({ _id: itemId, vendor: req.vendorId });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or you are not the owner'
      });
    }

    // Gestion de la localisation si elle est fournie
    if (location) {
      let existingLocation = await Location.findOne({ title: location });
      
      if (!existingLocation) {
        existingLocation = await Location.create({ 
          title: location, 
          subtitle: '' 
        });
      }
      
      updateData.location = existingLocation._id;
    }

    // Conversion des types si nécessaire
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.rentalPrice) updateData.rentalPrice = parseFloat(updateData.rentalPrice);
    if (updateData.isForSale !== undefined) {
      updateData.isForSale = updateData.isForSale === 'true' || updateData.isForSale === true;
    }
    if (updateData.isForRent !== undefined) {
      updateData.isForRent = updateData.isForRent === 'true' || updateData.isForRent === true;
    }

    // Mise à jour des images si des fichiers sont fournis
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => file.filename);
    }

    // Appliquer les modifications
    Object.assign(item, updateData);
    const updatedItem = await item.save();

    res.json({
      success: true,
      data: updatedItem
    });

  } catch (error) {
    console.error("Update error:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
        field: error.path,
        value: error.value
      });
    }
    
    next(error);
  }
};

export const deleteCampingItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    //const vendorId = req.params.vendorId;
    
    const item = await CampingItem.findOneAndDelete({ _id: itemId, vendor: req.vendorId });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or you are not the owner'
      });
    }
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorItems = async (req, res, next) => {
  try {
   // const vendorId = req.params.vendorId;

    const items = await CampingItem.find({ vendor: req.vendorId })
    .populate('vendor', 'mobile businessName rating image location email description businessAddress createdAt')
    .populate('location', 'title subtitle');
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
};
// Contrôleurs pour l'utilisateur
export const getAllCampingItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search, minPrice, maxPrice, forSale, forRent } = req.query;
    
    const query = { isBanned: false };
    
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (forSale) query.isForSale = forSale === 'true';
    if (forRent) query.isForRent = forRent === 'true';
    
    const items = await CampingItem.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('vendor', 'mobile businessName rating image')
      .populate('location', 'title subtitle');
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
};
export const getCampingItemDetails = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    
    const item = await CampingItem.findOne({ 
      _id: itemId,
      isBanned: false 
    }).populate('vendor', 'name email rating');
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or has been banned'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};
export const purchaseItem = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { itemId, quantity, shippingAddress, paymentMethod } = req.body;
    
    const item = await CampingItem.findById(itemId);
    
    if (!item || !item.isForSale) {
      return res.status(400).json({
        success: false,
        message: 'Item not available for purchase'
      });
    }
    
    if (item.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }
    
    // Créer la commande
    const order = new Order({
      items: [{
        item: itemId,
        quantity,
        priceAtPurchase: item.price
      }],
      totalAmount: item.price * quantity,
      buyer: userId,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending' // À mettre à jour après paiement
    });
    
    await order.save();
    
    // Mettre à jour le stock
    item.stock -= quantity;
    await item.save();
    
    // Envoyer une notification au vendeur
    await sendNotification({
      recipient: item.vendor,
      title: 'Nouvelle commande',
      message: `Vous avez une nouvelle commande pour ${item.name}`,
      type: 'order',
      relatedId: order._id
    });
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order placed successfully. Please proceed with payment.'
    });
  } catch (error) {
    next(error);
  }
};
export const rentItem = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { itemId, startDate, endDate, pickupLocation, returnLocation } = req.body;
    
    const item = await CampingItem.findById(itemId);
    
    if (!item || !item.isForRent) {
      return res.status(400).json({
        success: false,
        message: 'Item not available for rent'
      });
    }
    if (itemData.isForSale && !itemData.price) {
      return res.status(400).json({
        success: false,
        message: "Le prix de vente est requis lorsque l'article est à vendre"
      });
    }

    if (itemData.isForRent && !itemData.rentalPrice) {
      return res.status(400).json({
        success: false,
        message: "Le prix de location est requis lorsque l'article est à louer"
      });
    }

    if (!itemData.isForSale && !itemData.isForRent) {
      return res.status(400).json({
        success: false,
        message: "L'article doit être à vendre ou à louer"
      });
    }
    // Vérifier la disponibilité
    const existingRentals = await Rental.find({
      item: itemId,
      status: { $in: ['confirmed', 'active'] },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });
    
    if (existingRentals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Item not available for the selected dates'
      });
    }
    
    // Calculer le nombre de jours et le prix total
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const totalPrice = days * item.rentalPrice;
    
    // Créer la location
    const rental = new Rental({
      item: itemId,
      renter: userId,
      vendor: item.vendor,
      startDate,
      endDate,
      totalPrice,
      pickupLocation,
      returnLocation,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    await rental.save();
    
    // Envoyer une notification au vendeur
    await sendNotification({
      recipient: item.vendor,
      title: 'Nouvelle demande de location',
      message: `Vous avez une nouvelle demande de location pour ${item.name}`,
      type: 'rental',
      relatedId: rental._id
    });
    
    res.status(201).json({
      success: true,
      data: rental,
      message: 'Rental request submitted. Waiting for vendor confirmation.'
    });
  } catch (error) {
    next(error);
  }
};
export const confirmRental = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { rentalId } = req.params;
    
    const rental = await Rental.findOne({
      _id: rentalId,
      vendor: userId
    });
    
    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Rental not found or you are not the owner'
      });
    }
    
    if (rental.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Rental is not in pending status'
      });
    }
    
    rental.status = 'confirmed';
    await rental.save();
    
    // Envoyer une notification au locataire
    await sendNotification({
      recipient: rental.renter,
      title: 'Location confirmée',
      message: `Votre demande de location pour ${rental.item.name} a été confirmée`,
      type: 'rental',
      relatedId: rental._id
    });
    
    res.json({
      success: true,
      data: rental,
      message: 'Rental confirmed successfully'
    });
  } catch (error) {
    next(error);
  }
};
export const getRentalHistory = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { type = 'renter' } = req.query;
    
    let query = {};
    
    if (type === 'renter') {
      query.renter = userId;
    } else if (type === 'vendor') {
      query.vendor = userId;
    }
    
    const rentals = await Rental.find(query)
      .populate('item', 'name images')
      .populate(type === 'renter' ? 'vendor' : 'renter', 'name email');
    
    res.json({
      success: true,
      data: rentals
    });
  } catch (error) {
    next(error);
  }
};
export const getOrderHistory = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { type = 'buyer' } = req.query;
    
    let query = {};
    
    if (type === 'buyer') {
      query.buyer = userId;
    } else if (type === 'vendor') {
      // Pour les vendeurs, nous devons trouver les commandes qui contiennent leurs articles
      const vendorItems = await CampingItem.find({ vendor: userId }, '_id');
      query['items.item'] = { $in: vendorItems.map(item => item._id) };
    }
    
    const orders = await Order.find(query)
      .populate('items.item', 'name images')
      .populate('buyer', 'name email');
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};
// Ajouter ces nouvelles fonctions de contrôleur

/**
 * @desc    Get all items for a specific vendor (Admin)
 * @route   GET /api/camping/admin/vendor/:vendorId/items
 * @access  Private/Admin
 */
export const getCampingItemsByVendorForAdmin = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const { page = 1, limit = 10 } = req.query;

    const items = await CampingItem.find({ vendor: vendorId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('vendor', 'mobile businessName rating image location email description businessAddress createdAt')
      .populate('location', 'title subtitle');

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get item details (Admin)
 * @route   GET /api/camping/admin/items/:itemId
 * @access  Private/Admin
 */
export const getCampingItemDetailsForAdmin = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const item = await CampingItem.findById(itemId)
      .populate('vendor', 'mobile businessName rating image location email description businessAddress createdAt')
      .populate('location', 'title subtitle');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error("Error in getCampingItemDetailsForAdmin:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    next(error);
  }
};

/**
 * @desc    Delete any item (Admin)
 * @route   DELETE /api/camping/admin/items/:itemId
 * @access  Private/Admin
 */
export const deleteCampingItemByAdmin = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    
    const item = await CampingItem.findByIdAndDelete(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Optionnel: Supprimer les images associées si nécessaire
    
    res.json({
      success: true,
      message: 'Item deleted successfully by admin'
    });
  } catch (error) {
    next(error);
  }
};
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
/**
 * @desc    Ban a camping item
 * @route   POST /api/camping/admin/items/:itemId/ban
 * @access  Private/Admin
 */
export const banCampingItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    const item = await CampingItem.findById(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    if (item.isBanned) {
      return res.status(400).json({
        success: false,
        message: 'Item is already banned'
      });
    }
    
    item.isBanned = true;
    item.banReason = reason || 'Violation of terms';
    item.bannedAt = new Date();
    item.bannedBy = adminId;
    
    await item.save();
    
    // Vérifier si le vendeur doit être banni
    const vendorBanned = await checkAndBanVendor(item.vendor, adminId);
    
    res.json({
      success: true,
      message: 'Item banned successfully' + (vendorBanned ? ' and vendor automatically banned' : ''),
      data: item,
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
export const unbanCampingItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const adminId = req.admin.id; // ou req.admin.id selon votre auth

    const item = await CampingItem.findById(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    if (!item.isBanned) {
      return res.status(400).json({
        success: false,
        message: 'Item is not banned'
      });
    }
    
    item.isBanned = false;
    item.banReason = '';
    item.bannedAt = undefined;
    item.bannedBy = undefined;
    
    await item.save();
    
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
      message: 'Item unbanned successfully',
      data: item
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all banned items
 * @route   GET /api/camping/admin/banned-items
 * @access  Private/Admin
 */
export const getBannedItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const items = await CampingItem.find({ isBanned: true })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('vendor', 'businessName email')
      .populate('bannedBy', 'name email');
    
    res.json({
      success: true,
      data: items
    });
    
  } catch (error) {
    next(error);
  }
};