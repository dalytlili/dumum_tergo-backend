
import User from '../models/userModel.js';
import Vendor from '../models/vendor.js';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import Blacklist from '../models/blacklist.js';
import { deletefile } from '../helpers/delteFile.js';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose'; // Ajoutez cette ligne au début du fichier
import { sendBanEmail } from '../helpers/mailer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export {
    generateAdminAccessToken,
    generateAdminRefreshToken,
    loginAdmin,
    logoutAdmin,
    adminProfile,
    updateProfileAdmin,
    getalluser,
    promoteToAdmin,
    banUser,
    unbanUser,
    revokeAdmin,
    getAllVendors,
    banVendor,
    unbanVendor

}
const unbanVendor = async (req, res) => {
    try {
        // 1. Vérification des droits admin
        if (!req.admin || req.admin.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                code: "ADMIN_REQUIRED",
                message: "Admin privileges required" 
            });
        }

        // 2. Validation de l'ID
        if (!mongoose.Types.ObjectId.isValid(req.params.vendorId)) {
            return res.status(400).json({ 
                success: false,
                code: "INVALID_ID",
                message: "Invalid vendor ID" 
            });
        }

        // 3. Vérifier si le vendeur existe avant la mise à jour
        const vendorToUnban = await Vendor.findById(req.params.vendorId);
        if (!vendorToUnban) {
            return res.status(404).json({ 
                success: false,
                code: "VENDOR_NOT_FOUND",
                message: "Vendor not found" 
            });
        }

        // 4. Mise à jour du vendeur
        const vendor = await Vendor.findByIdAndUpdate(
            req.params.vendorId,
            { 
                $unset: { 
                    is_banned: "",
                    ban_reason: "",
                    banned_at: ""
                },
                // Option: Réactiver automatiquement l'abonnement si nécessaire
                // 'subscription.status': vendorToUnban.subscription.status === 'expired' 
                //     ? 'expired' 
                //     : 'inactive'
            },
            { new: true }
        );

        // 5. Envoyer une notification (si email existe)
        if (vendorToUnban.email) {
            try {
                await sendUnbanEmail(vendorToUnban.email);
            } catch (emailError) {
                console.error("Failed to send unban email:", emailError);
                // Continuer même si l'email échoue
            }
        }

        // 6. Réponse de succès
        return res.status(200).json({
            success: true,
            code: "VENDOR_UNBANNED",
            message: "Vendor has been unbanned" + (vendorToUnban.email ? " and notified by email" : ""),
            data: vendor
        });

    } catch (error) {
        console.error('Error in unbanVendor:', error);
        res.status(500).json({ 
            success: false,
            code: "SERVER_ERROR",
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const banVendor = async (req, res) => {
    try {
        // 1. Vérification des droits admin
        if (!req.admin || req.admin.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                code: "ADMIN_REQUIRED",
                message: "Admin privileges required" 
            });
        }

        // 2. Validation de l'ID
        if (!mongoose.Types.ObjectId.isValid(req.params.vendorId)) {
            return res.status(400).json({ 
                success: false,
                code: "INVALID_ID",
                message: "Invalid vendor ID" 
            });
        }

        const { reason } = req.body;

        // 3. Trouver le vendeur avant de le mettre à jour
        const vendorToBan = await Vendor.findById(req.params.vendorId);
        if (!vendorToBan) {
            return res.status(404).json({ 
                success: false,
                code: "VENDOR_NOT_FOUND",
                message: "Vendor not found" 
            });
        }

        // 4. Mise à jour du vendeur
        const vendor = await Vendor.findByIdAndUpdate(
            req.params.vendorId,
            { 
                $set: { 
                    is_banned: true,
                    ban_reason: reason || "No reason provided",
                    banned_at: new Date(),
                    // Optionnel: désactiver aussi l'abonnement lors du bannissement
                    'subscription.status': 'inactive'
                }
            },
            { new: true }
        );

        // 5. Envoyer l'email de bannissement (si le vendeur a un email)
        if (vendorToBan.email) {
            try {
                await sendBanEmail(vendorToBan.email, reason);
            } catch (emailError) {
                console.error("Failed to send ban email:", emailError);
                // On continue même si l'email échoue
            }
        }

        // 6. Réponse de succès
        return res.status(200).json({
            success: true,
            code: "VENDOR_BANNED",
            message: "Vendor has been banned" + (vendorToBan.email ? " and notified by email" : ""),
            data: vendor
        });

    } catch (error) {
        console.error('Error in banVendor:', error);
        res.status(500).json({ 
            success: false,
            code: "SERVER_ERROR",
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const getAllVendors = async (req, res) => {
    try {
        // 1. Vérification des droits admin (à faire par le middleware verifyAdmin)
        
        // 2. Paramètres de pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 3. Options de tri
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortBy]: sortOrder };

        // 4. Filtres optionnels
        const filters = {};
        
        // Recherche textuelle
        if (req.query.search) {
            filters.$or = [
                { businessName: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
                { mobile: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        // Filtre par statut de profil
        if (req.query.profileCompleted !== undefined) {
            filters.profileCompleted = req.query.profileCompleted === 'true';
        }
        
        // Filtre par statut d'abonnement
        if (req.query.subscriptionStatus) {
            filters['subscription.status'] = req.query.subscriptionStatus;
        }
        
        // Filtre par abonnement expiré
        if (req.query.expired === 'true') {
            filters['subscription.expirationDate'] = { $lt: new Date() };
            filters['subscription.status'] = 'active'; // Seulement les abonnements actifs peuvent expirer
        }

        // 5. Récupération des vendeurs
        const vendors = await Vendor.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        // 6. Calcul du total pour la pagination
        const totalVendors = await Vendor.countDocuments(filters);
        const totalPages = Math.ceil(totalVendors / limit);

        // 7. Formatage de la réponse
        return res.status(200).json({
            success: true,
            code: "VENDORS_RETRIEVED",
            message: "Vendors list retrieved successfully",
            data: {
                vendors,
                pagination: {
                    total: totalVendors,
                    page,
                    limit,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error in getAllVendors:', error);
        return res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Internal server error while retrieving vendors",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const unbanUser = async (req, res) => {
    try {
        // Vérification des droits admin
        if (!req.admin || req.admin.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Admin privileges required" 
            });
        }

        // Validation de l'ID
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid user ID" 
            });
        }

        // Mise à jour de l'utilisateur (sans banned_by)
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { 
                $unset: { 
                    is_banned: "",
                    ban_reason: "",
                    banned_at: ""
                    // Supprimé: banned_by: ""
                }
            },
            { new: true }
        ).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        return res.status(200).json({
            success: true,
            message: "User has been unbanned",
            data: user
        });

    } catch (error) {
        console.error('Error in unbanUser:', error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const banUser = async (req, res) => {
    try {
        // Vérification des droits admin
        if (!req.admin || req.admin.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Admin privileges required" 
            });
        }

        // Validation de l'ID
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid user ID" 
            });
        }

        const { reason } = req.body;

        // Trouver l'utilisateur avant de le mettre à jour
        const userToBan = await User.findById(req.params.userId);
        if (!userToBan) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Mise à jour de l'utilisateur
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { 
                $set: { 
                    is_banned: true,
                    ban_reason: reason || "No reason provided",
                    banned_at: new Date()
                }
            },
            { new: true }
        ).select('-password -refreshToken');

        // Envoyer l'email de bannissement
        try {
            await sendBanEmail(userToBan.email, reason);
        } catch (emailError) {
            console.error("Échec d'envoi d'email:", emailError);
            // On continue même si l'email échoue
        }

        return res.status(200).json({
            success: true,
            message: "User has been banned and notified by email",
            data: user
        });

    } catch (error) {
        console.error('Error in banUser:', error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const promoteToAdmin = async (req, res) => {
    try {
        // 1. Vérification des droits admin
        if (!req.admin || req.admin.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Admin privileges required" 
            });
        }

        // 2. Validation de l'ID avec Mongoose
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid user ID" 
            });
        }

        // 3. Mise à jour du rôle
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { role: 'admin' } },
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        return res.status(200).json({
            success: true,
            message: "User promoted to admin",
            data: user
        });

    } catch (error) {
        console.error('Error in promoteToAdmin:', error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const revokeAdmin = async (req, res) => {
    try {
        // 1. Vérification des droits admin
        if (!req.admin || req.admin.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Admin privileges required" 
            });
        }

        // 2. Validation de l'ID avec Mongoose
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid user ID" 
            });
        }

        // 3. Vérification que l'utilisateur n'est pas en train de se révoquer lui-même
        if (req.params.userId === req.admin.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot revoke your own admin privileges"
            });
        }

        // 4. Mise à jour du rôle
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { role: 'user' } }, // Retour au rôle 'user'
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        return res.status(200).json({
            success: true,
            message: "Admin privileges revoked successfully",
            data: user
        });

    } catch (error) {
        console.error('Error in revokeAdmin:', error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const getalluser = async (req, res) => {
    try {
        // 1. Vérification des droits admin (déjà fait par le middleware verifyAdmin)
        
        // 2. Paramètres de pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 3. Options de tri et filtrage
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortBy]: sortOrder };

        // 4. Filtres optionnels
        const filters = {};
        if (req.query.search) {
            filters.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
                { mobile: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        if (req.query.role) {
            filters.role = req.query.role;
        }
        if (req.query.is_verified !== undefined) {
            filters.is_verified = req.query.is_verified === 'true';
        }

        // 5. Récupération des utilisateurs avec exclusion des champs sensibles
        const users = await User.find(filters)
            .select('-password -refreshToken -__v')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        // 6. Calcul du total pour la pagination
        const totalUsers = await User.countDocuments(filters);
        const totalPages = Math.ceil(totalUsers / limit);

        // 7. Formatage de la réponse
        return res.status(200).json({
            success: true,
            code: "USERS_RETRIEVED",
            message: "Users list retrieved successfully",
            data: {
                users,
                pagination: {
                    total: totalUsers,
                    page,
                    limit,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error in getalluser:', error);
        return res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Internal server error while retrieving users",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const updateProfileAdmin = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.file) {
                await deletefile(path.join(__dirname, '../public/images', req.file.filename));
            }
            return res.status(400).json({
                success: false,
                msg: 'Validation errors',
                errors: errors.array()
            });
        }

        // Vérification complète de la session admin
        if (!req.admin || !req.admin.id) {
            if (req.file) {
                await deletefile(path.join(__dirname, '../public/images', req.file.filename));
            }
            return res.status(403).json({
                success: false,
                code: "INVALID_SESSION",
                msg: 'Invalid admin session'
            });
        }

        const { name, email, mobile, genre } = req.body;
        const adminId = req.admin.id; // Utilisation directe de req.admin.id

        // Récupération de l'admin avec vérification du rôle
        const existingAdmin = await User.findOne({ 
            _id: adminId, 
            role: 'admin' 
        });

        if (!existingAdmin) {
            if (req.file) {
                await deletefile(path.join(__dirname, '../public/images', req.file.filename));
            }
            return res.status(404).json({
                success: false,
                code: "ADMIN_NOT_FOUND",
                msg: 'Admin account not found'
            });
        }

        // Vérification de l'unicité de l'email
        if (email && email !== existingAdmin.email) {
            const emailExists = await User.findOne({ 
                email, 
                _id: { $ne: adminId } 
            });
            if (emailExists) {
                if (req.file) {
                    await deletefile(path.join(__dirname, '../public/images', req.file.filename));
                }
                return res.status(400).json({
                    success: false,
                    code: "EMAIL_EXISTS",
                    msg: 'Email already in use'
                });
            }
        }

        // Vérification de l'unicité du mobile
        if (mobile && mobile !== existingAdmin.mobile) {
            const mobileExists = await User.findOne({ 
                mobile, 
                _id: { $ne: adminId } 
            });
            if (mobileExists) {
                if (req.file) {
                    await deletefile(path.join(__dirname, '../public/images', req.file.filename));
                }
                return res.status(400).json({
                    success: false,
                    code: "MOBILE_EXISTS",
                    msg: 'Mobile number already in use'
                });
            }
        }

        // Mise à jour des données
        const updateData = {
            name: name || existingAdmin.name,
            email: email || existingAdmin.email,
            mobile: mobile || existingAdmin.mobile,
            genre: genre || existingAdmin.genre
        };

        // Gestion de l'image
        if (req.file) {
            updateData.image = '/images/' + req.file.filename;
            
            if (existingAdmin.image && existingAdmin.image !== '/images/default.png') {
                const oldImagePath = path.join(__dirname, '../public', existingAdmin.image);
                try {
                    await deletefile(oldImagePath);
                } catch (err) {
                    console.error("Error deleting old image:", err);
                }
            }
        }

        // Mise à jour du profil
        const updatedAdmin = await User.findByIdAndUpdate(
            adminId,
            { $set: updateData },
            { 
                new: true,
                runValidators: true 
            }
        ).select('-password -__v -refreshToken');

        return res.status(200).json({
            success: true,
            code: "PROFILE_UPDATED",
            msg: 'Admin profile updated successfully',
            data: updatedAdmin
        });

    } catch (error) {
        console.error('Error in updateProfileAdmin:', error);
        
        if (req.file) {
            try {
                await deletefile(path.join(__dirname, '../public/images', req.file.filename));
            } catch (err) {
                console.error("Error deleting temporary file:", err);
            }
        }

        return res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            msg: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const generateAdminAccessToken = async (user) => {
    const token = jwt.sign(
        { id: user.id, role: "admin" },  // Corrigé: utiliser 'user.id' au lieu de 'admin.id'
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
    );
    return token;
};

const generateAdminRefreshToken = async (user) => {
    const token = jwt.sign(
        { id: user.id, role: "admin" },
        process.env.ACCESS_TOKEN_SECRET,  // Corrigé: utiliser REFRESH_TOKEN_SECRET
        { expiresIn: '7d' }  // Les refresh tokens ont généralement une durée plus longue
    );
    return token;
};
const adminProfile = async (req, res) => {
    try {
        // 1. Vérification que l'admin est bien authentifié
        if (!req.admin || !req.admin.id) {
            return res.status(403).json({
                success: false,
                code: "ADMIN_REQUIRED",
                message: "Admin authentication failed"
            });
        }

        // 2. Récupération des données admin avec des champs spécifiques
        const adminData = await User.findById(req.admin.id)
        .select('-password -__v -refreshToken') // Exclusion des champs sensibles
        .lean();

        if (!adminData) {
            return res.status(404).json({
                success: false,
                code: "ADMIN_NOT_FOUND",
                message: "Admin account not found in database"
            });
        }

        // 3. Vérification supplémentaire du rôle (double sécurité)
        if (adminData.role !== 'admin') {
            return res.status(403).json({
                success: false,
                code: "ADMIN_PRIVILEGES_REQUIRED",
                message: "Account doesn't have admin privileges"
            });
        }

        // 4. Formatage de la réponse
        return res.status(200).json({
            success: true,
            code: "ADMIN_PROFILE",
            message: "Admin profile retrieved successfully",
            data: {
                profile: adminData,
                // Vous pouvez ajouter des stats admin ici si nécessaire
            }
        });

    } catch (error) {
        console.error("Admin profile error:", error);
        return res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Internal server error while processing admin profile",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Fonction pour la connexion admin
const logoutAdmin = async (req, res) => {
    try {
        // Récupération multi-source du token
        const token = req.headers.authorization || req.cookies.adminAccessToken;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                code: "MISSING_TOKEN",
                message: "No session to logout from"
            });
        }

        // Extraction sécurisée
        const cleanToken = token.startsWith('Bearer ') 
            ? token.slice(7) 
            : token;

        // Vérification préalable du token
        try {
            jwt.verify(cleanToken, process.env.ACCESS_TOKEN_SECRET);
        } catch (e) {
            // Token déjà invalide mais on continue le logout
            console.warn("Logout with invalid token:", e.message);
        }

        // Ajout à la blacklist avec expiration automatique
        await Blacklist.create({
            token: cleanToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expire dans 30 jours
        });

        // Nettoyage côté client complet
        res.clearCookie('adminAccessToken');
        res.clearCookie('adminRefreshToken');
        res.setHeader('Clear-Site-Data', '"cookies", "storage", "cache"');

        return res.status(200).json({
            success: true,
            code: "LOGOUT_SUCCESS",
            message: "You have been securely logged out"
        });

    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: false,
            code: "LOGOUT_ERROR",
            message: "Could not complete logout process",
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

 const loginAdmin = async (req, res) => {
    try {
        // Validation des entrées
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { identifier, password } = req.body;

        // Trouver l'utilisateur
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { mobile: identifier }
            ]
        }).select('+password'); // Inclure le mot de passe qui est normalement exclu

        if (!user) {
            return res.status(401).json({
                success: false,
                msg: 'Identifiants incorrects'
            });
        }

        // Vérifier le rôle admin
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                msg: 'Accès réservé aux administrateurs'
            });
        }

        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                msg: 'Identifiants incorrects'
            });
        }

        // Vérifier si le compte est activé
        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                msg: 'Compte non vérifié. Veuillez vérifier votre email.'
            });
        }

        // Créer le payload JWT
        const payload = {
            user: {
                id: user._id,
                role: user.role,
                email: user.email
            }
        };

        // Générer les tokens
        const accessToken = jwt.sign(
            payload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Exclure le mot de passe de la réponse
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        return res.status(200).json({
            success: true,
            msg: 'Connexion admin réussie',
            user: userWithoutPassword,
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Erreur loginAdmin:', error);
        return res.status(500).json({
            success: false,
            msg: 'Erreur serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};