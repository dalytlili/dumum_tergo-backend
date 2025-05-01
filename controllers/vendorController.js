import Vendor from '../models/vendor.js';
import { sendOtp } from '../helpers/twilio.js';
import randomstring from 'randomstring';
import jwt from 'jsonwebtoken';
import Blacklist from '../models/blacklist.js';

// Fonction pour demander un OTP
export const requestOtp = async (req, res) => {
    try {
        const { mobile } = req.body;

        // Vérifier si le vendeur existe
        let vendor = await Vendor.findOne({ mobile });

        if (!vendor) {
            // Créer un nouveau vendeur si le numéro de mobile n'existe pas
            vendor = new Vendor({ mobile });
            await vendor.save(); // Sauvegarder le nouveau vendeur
        }
        if (vendor.is_banned !== undefined && vendor.is_banned === true) {
            return res.status(403).json({
                success: false,
                msg: 'Votre compte est banni !!!!'
            });
        }
        // Générer un OTP
        const otp = randomstring.generate({ length: 6, charset: 'numeric' });
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valide pendant 5 minutes

        // Enregistrer l'OTP dans la base de données
        vendor.otp = otp;
        vendor.otpExpiresAt = otpExpiresAt;
        await vendor.save();

        // Envoyer l'OTP par SMS
        await sendOtp(mobile, otp);

        return res.status(200).json({
            success: true,
            msg: 'OTP envoyé avec succès.',
            isNewUser: !vendor.profileCompleted, // Indique si le vendeur est nouveau
        });

    } catch (error) {
        console.error('Erreur lors de la demande d\'OTP:', error);
        return res.status(500).json({
            success: false,
            msg: error.message,
        });
    }
};

// Fonction pour vérifier l'OTP et connecter le vendeur
export const verifyOtpAndLogin = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        // Vérifier si le vendeur existe
        const vendor = await Vendor.findOne({ mobile });
        if (!vendor) {
            return res.status(400).json({
                success: false,
                msg: 'Numéro de mobile non enregistré.',
            });
        }

        // Vérifier l'OTP
        if (vendor.otp !== otp || vendor.otpExpiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                msg: 'OTP invalide ou expiré.',
            });
        }

        // Réinitialiser l'OTP après utilisation
        vendor.otp = null;
        vendor.otpExpiresAt = null;
        await vendor.save();

        // Générer un token d'accès
        const accessToken = jwt.sign(
            { vendorId: vendor._id, role: 'vendor' },
            process.env.ACCESS_TOKEN_SECRET,
           // { expiresIn: '2h' } // Durée de validité du token
        );

        return res.status(200).json({
            success: true,
            msg: 'Connexion réussie !',
            accessToken,
            profileCompleted: vendor.profileCompleted,
            subscription: vendor.subscription, // Indique si le profil est complété
            // Indique si le profil est complété
        });

    } catch (error) {
        console.error('Erreur lors de la vérification de l\'OTP:', error);
        return res.status(500).json({
            success: false,
            msg: error.message,
        });
    }
};
export const logout = async(req,res)=>{
    try{

        const token = req.body.token || req.query.token || req.headers['authorization']
        const bearer = token.split(' ');
        const bearerToken = bearer[1];

        const newBlacklist = new Blacklist({
            token:bearerToken
        })

        await newBlacklist.save();
        res.setHeader('Clear-Site-Data', '"cookies","storage"');
        return res.status(200).json({
            success: true,
            msg: 'You are logged out!'
        });

    }catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }

}

// Fonction pour compléter le profil du vendeur
export const completeProfile = async (req, res) => {
    try {
        const vendorId = req.vendorId; // Récupérer l'ID du vendeur à partir du token
        const { businessName, businessAddress, email, description } = req.body;

        // Récupérer le vendeur
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                msg: 'Vendeur non trouvé.',
            });
        }

        // Mettre à jour les informations
        vendor.businessName = businessName;
        vendor.businessAddress = businessAddress;
        vendor.email = email;
        vendor.description = description;
        vendor.profileCompleted = true;

        // Mettre à jour l'image si elle est fournie
        if (req.file) {
            vendor.image = `/images/${req.file.filename}`;
        }

        // Sauvegarder les modifications
        await vendor.save();

        return res.status(200).json({
            success: true,
            msg: 'Profil complété avec succès.',
            vendor: {
                _id: vendor._id,
                mobile: vendor.mobile,
                businessName: vendor.businessName,
                businessAddress: vendor.businessAddress,
                email: vendor.email,
                description: vendor.description,
                image: vendor.image,
            },
        });

    } catch (error) {
        console.error('Erreur lors de la complétion du profil:', error);
        return res.status(500).json({
            success: false,
            msg: error.message,
        });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const vendorId = req.vendorId; // Récupérer l'ID du vendeur à partir du token
        const { businessName, businessAddress, mobile, email, description } = req.body;

        // Récupérer le vendeur
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                msg: 'Vendeur non trouvé.',
            });
        }

        // Mettre à jour les autres informations (indépendamment de la modification du mobile)
        if (businessName) {
            vendor.businessName = businessName;
        }
        if (businessAddress) {
            vendor.businessAddress = businessAddress;
        }
        if (email) {
            vendor.email = email;
        }
        if (description) {
            vendor.description = description;
        }

        // Mettre à jour l'image si elle est fournie
        if (req.file) {
            vendor.image = `/images/${req.file.filename}`;
        }

        // Vérifier si le numéro de mobile est modifié
        if (mobile && mobile !== vendor.mobile) {
            // Générer un OTP
            const otp = randomstring.generate({ length: 6, charset: 'numeric' });
            const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valide pendant 5 minutes

            // Afficher l'OTP dans la console pour le débogage
            console.log('OTP généré:', otp);
            console.log('Numéro de mobile:', mobile);

            // Enregistrer l'OTP et le nouveau numéro de mobile dans la base de données
            vendor.otp = otp;
            vendor.otpExpiresAt = otpExpiresAt;
            vendor.newMobile = mobile; // Stocker temporairement le nouveau numéro de mobile

            try {
                // Envoyer l'OTP par SMS (désactivé temporairement)
                // await sendOtp(mobile, otp);

                // Afficher un message dans la console pour indiquer que l'OTP a été "envoyé"
                console.log('OTP "envoyé" à', mobile);
            } catch (error) {
                console.error('Erreur lors de l\'envoi de l\'OTP:', error);
                return res.status(500).json({
                    success: false,
                    msg: 'Erreur lors de l\'envoi de l\'OTP. Veuillez réessayer.',
                });
            }

            // Sauvegarder les modifications
            await vendor.save();

            return res.status(200).json({
                success: true,
                msg: 'Un OTP a été envoyé à votre nouveau numéro de mobile. Veuillez le vérifier pour confirmer la mise à jour.',
                requiresOtpVerification: true, // Indiquer que la vérification de l'OTP est nécessaire
            });
        }

        // Sauvegarder les modifications si le mobile n'est pas modifié
        await vendor.save();

        return res.status(200).json({
            success: true,
            msg: 'Profil mis à jour avec succès.',
            vendor: {
                _id: vendor._id,
                mobile: vendor.mobile,
                businessName: vendor.businessName,
                businessAddress: vendor.businessAddress,
                email: vendor.email,
                description: vendor.description,
                image: vendor.image,
            },
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return res.status(500).json({
            success: false,
            msg: error.message,
        });
    }
};
export const verifyOtpAndUpdateMobile = async (req, res) => {
    try {
        const vendorId = req.vendorId; // Récupérer l'ID du vendeur à partir du token
        const { otp } = req.body;

        // Récupérer le vendeur
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                msg: 'Vendeur non trouvé.',
            });
        }

        // Vérifier si un OTP est en attente de vérification
        if (!vendor.otp || !vendor.newMobile) {
            return res.status(400).json({
                success: false,
                msg: 'Aucune demande de mise à jour de numéro de mobile en attente.',
            });
        }

        // Vérifier l'OTP
        if (vendor.otp !== otp || vendor.otpExpiresAt < new Date()) {
            return res.status(400).json({
                success: false,
                msg: 'OTP invalide ou expiré.',
            });
        }

        // Mettre à jour le numéro de mobile
        vendor.mobile = vendor.newMobile;
        vendor.otp = null;
        vendor.otpExpiresAt = null;
        vendor.newMobile = null;

        // Sauvegarder les modifications
        await vendor.save();

        return res.status(200).json({
            success: true,
            msg: 'Numéro de mobile mis à jour avec succès.',
            vendor: {
                _id: vendor._id,
                mobile: vendor.mobile,
                businessName: vendor.businessName,
                businessAddress: vendor.businessAddress,
                email: vendor.email,
                description: vendor.description,
                image: vendor.image,
            },
        });

    } catch (error) {
        console.error('Erreur lors de la vérification de l\'OTP:', error);
        return res.status(500).json({
            success: false,
            msg: error.message,
        });
    }
};


export const userProfile = async (req, res) => {
    try {
        const userId = req.vendorId; // Récupérer l'ID de l'utilisateur connecté

        // Récupérer les données les plus récentes depuis MongoDB
        const userData = await Vendor.findById(userId).lean();

        if (!userData) {
            return res.status(404).json({
                success: false,
                msg: "Utilisateur non trouvé",
            });
        }

        return res.status(200).json({
            success: true,
            msg: "User Profile Data!",
            data: userData, // Retourner les données mises à jour
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            msg: error.message
        });
    }
};
