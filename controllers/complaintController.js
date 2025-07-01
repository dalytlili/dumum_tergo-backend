import Complaint from '../models/complaintModel.js';
import User from '../models/userModel.js';
import Vendor from '../models/vendor.js';

// User ou Vendor contre Vendor ou User
export const createComplaint = async (req, res) => {
    try {
        const { accusedId, subject, description, accusedType } = req.body;
        const complainantId = req.user._id;
        const complainantType = req.user.role === 'vendor' ? 'Vendor' : 'User';

        // Vérifier que l'accusé existe
        let accused;
        if (accusedType === 'vendor') {
            accused = await Vendor.findById(accusedId);
        } else {
            accused = await User.findById(accusedId);
        }

        if (!accused) {
            return res.status(404).json({
                success: false,
                msg: "L'utilisateur ou vendeur accusé n'existe pas"
            });
        }

        // Créer la réclamation
        const complaint = new Complaint({
            complainant: complainantId,
            complainantModel: complainantType,
            accused: accusedId,
            accusedModel: accusedType === 'vendor' ? 'Vendor' : 'User',
            subject,
            description
        });

        await complaint.save();

        return res.status(201).json({
            success: true,
            msg: "Réclamation envoyée à l'administrateur",
            data: complaint
        });

    } catch (error) {
        console.error("Erreur lors de la création de la réclamation:", error);
        return res.status(500).json({
            success: false,
            msg: error.message
        });
    }
};

// Admin peut voir toutes les réclamations
export const getAllComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate('complainant')
            .populate('accused')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: complaints
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des réclamations:", error);
        return res.status(500).json({
            success: false,
            msg: error.message
        });
    }
};

// Admin peut mettre à jour le statut d'une réclamation
export const updateComplaintStatus = async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { status, adminResponse } = req.body;

        const complaint = await Complaint.findByIdAndUpdate(
            complaintId,
            { 
                status,
                adminResponse,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({
                success: false,
                msg: "Réclamation non trouvée"
            });
        }

        return res.status(200).json({
            success: true,
            msg: "Statut de la réclamation mis à jour",
            data: complaint
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour de la réclamation:", error);
        return res.status(500).json({
            success: false,
            msg: error.message
        });
    }
};

// Utilisateur/Vendeur peut voir ses réclamations
export const getUserComplaints = async (req, res) => {
    try {
        const userId = req.user._id;
        const userType = req.user.role === 'vendor' ? 'Vendor' : 'User';

        const complaints = await Complaint.find({
            $or: [
                { complainant: userId, complainantModel: userType },
                { accused: userId, accusedModel: userType }
            ]
        })
        .populate('complainant')
        .populate('accused')
        .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: complaints
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des réclamations:", error);
        return res.status(500).json({
            success: false,
            msg: error.message
        });
    }
};
