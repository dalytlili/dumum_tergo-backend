import Complaint from '../models/complaintModel.js';
import User from '../models/usermodel.js';
import Vendor from '../models/vendor.js';
export const createComplaint = async (req, res) => {
    try {
        const { vendorId, title, description } = req.body;
        
        // CORRECTION: Accès direct à l'ID utilisateur
        const userId = req.user._id; 

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        // Validation
        if (!vendorId || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Vendor ID, title and description are required'
            });
        }

        // Vérification du vendeur
        const vendorExists = await Vendor.findById(vendorId);
        if (!vendorExists) {
            return res.status(404).json({ 
                success: false,
                message: 'Vendor not found' 
            });
        }

        // Création de la réclamation
        const newComplaint = await Complaint.create({
            complaintType: 'user_to_vendor', // Différent de user_to_vendor

            user: userId,
            vendor: vendorId,
            title,
            description
        });

        res.status(201).json({
            success: true,
            data: {
                id: newComplaint._id,
                vendor: newComplaint.vendor,
                title: newComplaint.title,
                description: newComplaint.description,
                status: newComplaint.status,
                createdAt: newComplaint.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getVendorComplaints = async (req, res) => {
    try {
        const vendorId = req.user._id;
        
  

        // Filtres optionnels
        const filter = {
            vendor: vendorId,
            complaintType: 'vendor_to_user'
        };

        if (req.query.status) {
            filter.status = req.query.status; // pending/resolved/etc
        }

        // Requête principale
        const complaints = await Complaint.find(filter)
            .sort({ createdAt: -1 }) // Plus récent d'abord
         
            .populate('user', 'name email mobile') // Infos basiques de l'utilisateur
            .lean();

        // Count pour la pagination

        res.status(200).json({
            success: true,
            data: complaints,
        
        });

    } catch (error) {
        console.error('Error fetching vendor complaints:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const getUserComplaints = async (req, res) => {
    try {
        const userId = req.user._id;
        

        // Filtres optionnels
        const filter = {
            user: userId,
            complaintType: 'user_to_vendor' // Seulement les réclamations de l'utilisateur vers les vendeurs
        };

        if (req.query.status) {
            filter.status = req.query.status; // pending/resolved/etc
        }

        // Requête principale
        const complaints = await Complaint.find(filter)
            .sort({ createdAt: -1 }) // Plus récent d'abord
      
            .populate('vendor', 'businessName email phone') // Infos basiques du vendeur
            .lean();

        res.status(200).json({
            success: true,
            data: complaints,
         
        });

    } catch (error) {
        console.error('Error fetching user complaints:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const createComplaintVendor = async (req, res) => {
    try {
        const { userId, title, description } = req.body;
        
        // Récupération de l'ID du vendeur depuis le token
        const vendorId = req.user._id; // Le token doit identifier un vendeur

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        // Validation des données
        if (!userId || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'User ID, title and description are required'
            });
        }

        // Vérification que l'utilisateur existe
        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Création de la réclamation (type vendor_to_user)
        const newComplaint = await Complaint.create({
            complaintType: 'vendor_to_user', // Différent de user_to_vendor
            vendor: vendorId, // Le vendeur qui se plaint
            user: userId,    // L'utilisateur visé
            title,
            description,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            data: {
                id: newComplaint._id,
                user: newComplaint.user,
                title: newComplaint.title,
                description: newComplaint.description,
                status: newComplaint.status,
                createdAt: newComplaint.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating vendor complaint:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const getComplaints = async (req, res) => {
    try {
        const { type, userId, vendorId, status } = req.query;
        const filter = {};
        
        if (type) filter.complaintType = type;
        if (userId) filter.user = userId;
        if (vendorId) filter.vendor = vendorId;
        if (status) filter.status = status;

        const complaints = await Complaint.find(filter)
            .populate('user', 'name email')
            .populate('vendor', 'businessName email');

        res.status(200).json({
            success: true,
            data: complaints
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedComplaint = await Complaint.findByIdAndUpdate(
            id,
            { 
                status,
          
                ...(status === 'resolved' && { resolvedAt: new Date() })
            },
            { new: true, runValidators: true }
        );

        if (!updatedComplaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        res.status(200).json({
            success: true,
            data: updatedComplaint
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const addResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { from, message } = req.body;

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { $push: { responses: { from, message } } },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        res.status(200).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
