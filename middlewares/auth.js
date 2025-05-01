import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import Blacklist from '../models/blacklist.js';  // Liste noire pour tokens invalides
import User from '../models/userModel.js';  // Importer ton modèle utilisateur
import Vendor from '../models/vendor.js';  // Importer ton modèle vendeur
import mongoose from 'mongoose'; // Assurez-vous que Mongoose est importé

// Charger les variables d'environnement
config();
export const checkUserBanStatus = async (req, res, next) => {
    try {
        const { email } = req.body;

        // Si pas d'email dans la requête, on passe au middleware suivant
        if (!email) {
            return next();
        }

        // Recherche de l'utilisateur par email
        const user = await User.findOne({ email });
        
        // Si utilisateur trouvé et banni
        if (user.is_banned) {
            return res.status(403).json({
                success: false,
                code: "USER_ACCOUNT_BANNED",
                message: "Votre compte utilisateur a été suspendu",
                reason: user.ban_reason || "Raison non spécifiée",
                banned_at: user.banned_at,
                can_appeal: true // Option pour permettre un recours
            });
        }

        next();
    } catch (error) {
        console.error("Erreur lors de la vérification du bannissement:", error);
        // En cas d'erreur, on laisse passer pour ne pas bloquer le service
        // Mais on pourrait logger cette erreur pour investigation
        next();
    }
};
const verifyAdmin = async (req, res, next) => {
    // Accepte à la fois les headers et les cookies
    const authHeader = req.headers.authorization || req.cookies.adminAccessToken;
    
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            code: "MISSING_AUTH",
            message: "Authentication required"
        });
    }

    try {
        // Gère à la fois "Bearer token" et le token seul
        const token = authHeader.replace(/^Bearer\s+/i, '');

        // Vérification blacklist (optimisée)
        const isBlacklisted = await Blacklist.findOne({ token }).lean();
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Your session has expired"
            });
        }

        // Vérification robuste du JWT
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
            algorithms: ['HS256'],
            clockTolerance: 15
        });

        if (decoded.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                code: "ADMIN_REQUIRED",
                message: "Admin privileges required"
            });
        }

        req.admin = decoded.user;
        next();
    } catch (error) {
        // Gestion d'erreur améliorée
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                code: "TOKEN_EXPIRED",
                message: "Session expired, please login again"
            });
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                code: "INVALID_TOKEN",
                message: "Invalid authentication token"
            });
        }

        console.error("Admin verification error:", error);
        res.status(500).json({
            success: false,
            code: "AUTH_ERROR",
            message: "Authentication system error"
        });
    }
};
const VerifyToken = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({
            success: false,
            msg: 'A token is required for authentication'
        });
    }

    try {
        const bearerToken = token.split(' ')[1];
        if (!bearerToken) {
            return res.status(403).json({
                success: false,
                msg: 'Token format is incorrect'
            });
        }

        // Vérifie si le jeton est dans la liste noire
        const blacklistedToken = await Blacklist.findOne({ token: bearerToken });
        if (blacklistedToken) {
            return res.status(400).json({
                success: false,
                msg: 'This session has expired, please try again!'
            });
        }

        // Vérifie et décode le jeton
        const decodedData = jwt.verify(bearerToken, process.env.ACCESS_TOKEN_SECRET);
        req.user = decodedData.user;

        // Vérifie si le token a expiré dans la base de données
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(401).json({
                success: false,
                msg: 'User not found'
            });
        }

        if (user.tokenExpiredAt && new Date(user.tokenExpiredAt) < new Date()) {
            await Blacklist.create({ token: bearerToken });  // Ajouter à la blacklist
            return res.status(401).json({
                success: false,
                msg: 'Token has expired, please login again!'
            });
        }

        next(); // Si tout va bien, continue
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({
            success: false,
            msg: 'Invalid token'
        });
    }
};

 
const VerifyTokenvendor = async (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({
            success: false,
            msg: 'Token requis pour accéder à cette ressource.',
        });
    }

    const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
        // Vérifier si le token est dans la liste noire
        const blacklistedToken = await Blacklist.findOne({ token: tokenWithoutBearer });
        if (blacklistedToken) {
            return res.status(401).json({
                success: false,
                msg: 'Cette session a expiré, veuillez vous reconnecter !',
            });
        }

        // Vérifier et décoder le token
        const decoded = jwt.verify(tokenWithoutBearer, process.env.ACCESS_TOKEN_SECRET);
        req.vendorId = decoded.vendorId;

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            msg: 'Token invalide ou expiré.',
        });
    }
};
export { VerifyToken, VerifyTokenvendor, verifyAdmin };
