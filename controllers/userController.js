import User from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import { sendMail } from '../helpers/mailer.js';
import randomstring from 'randomstring';
import PasswordReset from '../models/passwordReset.js';
import { deletefile } from '../helpers/delteFile.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import Blacklist from '../models/blacklist.js';
import Otp from '../models/opt.js';
import { oneMinuteExpiry, threeMinuteExpiry } from '../helpers/otpValidate.js';
import OtpReset from '../models/OtpReset.js';
import twilio from 'twilio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export {
    userRegister,
    mailVerification,
    sendMailVerification,
    forgotPassword,
    resetPassword,
    updatePassword,
    restSuccess,
    loginUser,
    userProfile,
    updateProfile,
    refreshToken,
    logout,
    sendOpt,
    verifyOpt,
    sendOtpP,
    forgotPasswordP,
    verifyOtpPhone,
    resetPasswordP,
    generateRefreshToken,
    generateAccessToken,
    deleteAccount,
    changePassword
   
};


// Configurer Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
// Function to change password
const changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                msg: 'Erreurs de validation',
                errors: errors.array()
            });
        }

        const { oldPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user._id; // Récupérer l'ID de l'utilisateur connecté

        // Vérifier si le nouveau mot de passe et la confirmation correspondent
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                msg: "Le nouveau mot de passe et la confirmation ne correspondent pas."
            });
        }

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "Utilisateur non trouvé."
            });
        }

        // Vérifier l'ancien mot de passe
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                msg: "Ancien mot de passe incorrect."
            });
        }

        // Valider le nouveau mot de passe
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                msg: "Le nouveau mot de passe doit contenir au moins 8 caractères."
            });
        }

        // Hachage du nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mise à jour du mot de passe dans la base de données
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        return res.status(200).json({
            success: true,
            msg: "Mot de passe modifié avec succès."
        });

    } catch (error) {
        console.error("Erreur lors de la modification du mot de passe :", error);
        return res.status(500).json({
            success: false,
            msg: error.message
        });
    }
};

// Function to delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id; // Récupérer l'ID de l'utilisateur connecté
        const { password } = req.body; // Récupérer le mot de passe fourni par l'utilisateur

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "Utilisateur non trouvé."
            });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                msg: "Mot de passe incorrect."
            });
        }

        // Supprimer les données associées (tokens, OTP, etc.)
        await PasswordReset.deleteMany({ user_id: userId });
        await Otp.deleteMany({ user_id: userId });
        await OtpReset.deleteMany({ user_id: userId });
        await Blacklist.deleteMany({ user_id: userId });

        // Supprimer l'image de profil si elle existe
        if (user.image && user.image !== '/images/default.png') {
            const imagePath = path.join(__dirname, '../public', user.image);
            await deletefile(imagePath);
        }

        // Supprimer l'utilisateur de la base de données
        await User.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            msg: "Compte supprimé avec succès."
        });

    } catch (error) {
        console.error("Erreur lors de la suppression du compte :", error);
        return res.status(500).json({
            success: false,
            msg: error.message
        });
    }
};
// Fonction pour envoyer l'OTP via Twilio
const sendOtpP = async (mobile, otp) => {
    try {
        console.log(`Envoi de l'OTP ${otp} à ${mobile}...`);
        const message = await client.messages.create({
            body: `Votre code de réinitialisation de mot de passe est : ${otp}`,
            from: TWILIO_PHONE_NUMBER,
            to: mobile
        });
        console.log('Message envoyé avec SID:', message.sid);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'OTP:', error);
    }
};


// 1️⃣ Demande de réinitialisation avec OTP
 const forgotPasswordP = async (req, res) => {
    try {
        console.log('Données reçues:', req.body); // 🔍 Voir les données envoyées
        const { mobile } = req.body;
        
        if (!mobile) {
            return res.status(400).json({ success: false, msg: "Le numéro de téléphone est requis !" });
        }

        const userData = await User.findOne({ mobile });

        if (!userData) {
            return res.status(400).json({ success: false, msg: "Numéro de téléphone non enregistré !" });
        }

        // Générer un OTP
        const otp = randomstring.generate({ length: 6, charset: 'numeric' });

        // Supprimer les anciens OTP et enregistrer le nouveau
        await OtpReset.deleteMany({ user_id: userData._id });
        const otpReset = new OtpReset({ user_id: userData._id, otp, expiresAt: Date.now() + 5 * 60 * 1000 });
        await otpReset.save();

        console.log(`Envoi de l'OTP ${otp} à ${mobile}...`); // 🔍 Vérification
        await sendOtpP(mobile, otp);

        return res.status(200).json({ success: true, msg: "OTP envoyé par SMS. Valide 5 minutes." });

    } catch (error) {
        console.error('Erreur:', error);
        return res.status(500).json({ success: false, msg: error.message });
    }
};


// 2️⃣ Vérification de l'OTP
const verifyOtpPhone = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        // Vérifiez si le champ mobile est présent et valide
        if (!mobile) {
            return res.status(400).json({ success: false, msg: "Le numéro de téléphone est requis !" });
        }

        const userData = await User.findOne({ mobile });

        if (!userData) {
            return res.status(400).json({ success: false, msg: "Numéro de téléphone invalide !" });
        }

        const otpData = await OtpReset.findOne({ user_id: userData._id, otp });

        if (!otpData || otpData.expiresAt < Date.now()) {
            return res.status(400).json({ success: false, msg: "OTP invalide ou expiré !" });
        }

        // Supprimer l'OTP après validation
        await OtpReset.deleteMany({ user_id: userData._id });

        return res.status(200).json({ success: true, msg: "OTP vérifié. Vous pouvez réinitialiser votre mot de passe.", user_id: userData._id });

    } catch (error) {
        return res.status(500).json({ success: false, msg: error.message });
    }
};



const resetPasswordP = async (req, res) => {
    try {
        const { user_id, password, c_password } = req.body;

        // Vérifier si les mots de passe correspondent
        if (password !== c_password) {
            return res.status(400).json({ success: false, msg: "Les mots de passe ne correspondent pas !" });
        }

        // Vérifier si l'utilisateur existe
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, msg: "Utilisateur non trouvé." });
        }

        // Valider le mot de passe
        if (password.length < 8) {
            return res.status(400).json({ success: false, msg: "Le mot de passe doit contenir au moins 8 caractères." });
        }

        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Mise à jour du mot de passe
        await User.findByIdAndUpdate(user_id, { password: hashedPassword });

        return res.status(200).json({ success: true, msg: "Mot de passe réinitialisé avec succès." });

    } catch (error) {
        console.error("Erreur lors de la réinitialisation du mot de passe:", error);
        return res.status(500).json({ success: false, msg: error.message });
    }
};

// Function to handle user registration
const userRegister = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                msg: 'Erreurs de validation',
                errors: errors.array()
            });
        }

        const { name, genre, mobile, email, password } = req.body;

        // Check if the user already exists
        const isExists = await User.findOne({ email });
        if (isExists) {
            return res.status(400).json({
                success: false,
                msg: 'Email déjà utilisé'
            });
        }
        const isExist = await User.findOne({ mobile });
        if (isExist) {
            return res.status(400).json({
                success: false,
                msg: 'mobile déjà utilisé'
            });
        }
        // Hash the password
        const hashPassword = await bcrypt.hash(password, 10);

        // Create a new user instance
        const newUser = new User({
            name,
            genre,
            email,
            mobile,    
            password: hashPassword,
            image: req.file ? `${req.file.filename}` : '/images/default.png'
        });

        // Save the user to the database
        const userData = await newUser.save();

        // Prepare email content for verification
        const subject = 'Vérifiez votre email';
        const content = `<p>Bonjour ${name}, veuillez <a href="http://127.0.0.1:9098/mail-verif/${userData._id}">cliquer ici</a> pour vérifier votre adresse email.</p>`;

        // Send verification email
        await sendMail(email, subject, content);

        return res.status(200).json({
            success: true,
            msg: 'Inscription réussie !',
            user: userData
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription de l\'utilisateur :', error);
        return res.status(500).json({
            success: false,
            msg: 'Échec de l\'inscription de l\'utilisateur ou d\'envoi de l\'email.'
        });
    }
};

// Function to handle email verification
const mailVerification = async (req, res) => {
    try {
        const userId = req.params.id; // Récupère le paramètre ID depuis l'URL

        // Trouver l'utilisateur par userId
        const userData = await User.findOne({ _id: userId });

        if (!userData) {
            // Si l'utilisateur n'est pas trouvé, rendre une vue avec le message "Utilisateur non trouvé !"
            return res.render('mail-verification', { message: 'Utilisateur non trouvé !' });
        }

        // Mettre à jour le champ is_verified de l'utilisateur à 1
        await User.findByIdAndUpdate(userId, { $set: { is_verified: 1 } });

        // Rendre une vue avec le message "Email vérifié avec succès !"
        return res.render('mail-verification', { message: 'Email vérifié avec succès !' });

    } catch (error) {
        console.error('Erreur lors de la vérification de l\'email :', error);
        return res.render('404'); // Rendre une page 404 pour d'autres erreurs
    }
};

// Function to handle sending email verification link again
const sendMailVerification = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                msg: 'Erreurs de validation',
                errors: errors.array()
            });
        }

        const { email } = req.body;

        // Check if the user exists
        const userData = await User.findOne({ email });

        if (!userData) {
            return res.status(400).json({
                success: false,
                msg: "Email n'existe pas"
            });
        }

        if (userData.is_verified === 1) {
            return res.status(400).json({
                success: false,
                msg: `${userData.email} Email est déjà vérifié!`
            });
        }

        // Prepare email content for verification
        const subject = 'Vérifiez votre email';
        const content = `<p>Bonjour ${userData.name}, veuillez <a href="http://127.0.0.1:9098/mail-verif/${userData._id}">cliquer ici</a> pour vérifier votre adresse email.</p>`;

        // Send verification email
        await sendMail(email, subject, content);

        return res.status(200).json({
            success: true,
            msg: 'Lien de vérification envoyé à votre email, veuillez vérifier!'
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi du lien de vérification par email :', error);
        return res.status(500).json({
            success: false,
            msg: 'Échec de l\'envoi du lien de vérification par email.'
        });
    }
};

// Function to handle password reset request
const forgotPassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                msg: 'Errors',
                errors: errors.array()
            });
        }

        const { email } = req.body;
        const userData = await User.findOne({ email });

        if (!userData) {
            return res.status(400).json({
                success: false,
                msg: "Email doesn't exist!"
            });
        }

        const token = randomstring.generate();
        const msg = `<p>Hi ${userData.name}, Please click <a href="http://127.0.0.1:9098/reset-password?token=${token}">here</a> to Reset your Password!</p>`;

        await PasswordReset.deleteMany({ user_id: userData._id });
        const passwordReset = new PasswordReset({
            user_id: userData._id,
            token: token
        });
        await passwordReset.save();
        await sendMail(userData.email, 'Reset Password', msg);

        return res.status(201).json({
            success: true,
            msg: 'Reset Password Link sent to your mail, Please check!'
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
};

// Function to render reset password page
const resetPassword = async (req, res) => {
    try {
        if (req.query.token === undefined) {
            return res.render('404');
        }

        const resetData = await PasswordReset.findOne({ token: req.query.token });

        if (!resetData) {
            return res.render('404');
        }

        return res.render('reset-password', { resetData });

    } catch (error) {
        return res.render('404');
    }
};

// Function to update the password
const updatePassword = async (req, res) => {
    try {
        const { user_id, password, c_password } = req.body;
        const resetData = await PasswordReset.find({ user_id });

        // Check if passwords match
        if (password !== c_password) {
            return res.render('reset-password', { resetData, error: 'Confirm password does not match!' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(c_password, 10);

        // Update the user's password in the database
        await User.findByIdAndUpdate(user_id, {
            $set: {
                password: hashedPassword
            }
        });

        // Delete all password reset tokens for this user
        await PasswordReset.deleteMany({ user_id });

        // Redirect to reset success page
        return res.redirect('/reset-success');

    } catch (error) {
        console.error('Error updating password:', error);
        return res.render('404');
    }
};

// Function to render reset success page
const restSuccess = async (req, res) => {
    try {
        return res.render('reset-success');

    } catch (error) {
        return res.render('404');
    }
};

// Function to generate an access token
const generateAccessToken = async (user) => {
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: "11d" } );
    return token;
};
//{ expiresIn: "2h" }
const generateRefreshToken = async (user) => {
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,);
    return token;
};
// { expiresIn: "4h" }

// Function to handle user login
const loginUser = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                msg: 'Errors',
                errors: errors.array()
            });
        }

        let { identifier, password } = req.body;

        // Afficher l'identifiant pour vérifier la valeur de "identifier"
        console.log("Identifier:", identifier);

        // Si l'identifier est un email, le convertir en minuscules
        if (identifier.includes('@')) {
            identifier = identifier.toLowerCase();
        }

        console.log("Normalized Identifier:", identifier); // Vérifier après la conversion

        // Recherche de l'utilisateur avec l'identifier modifié
        const userData = await User.findOne({
            $or: [
                { email: identifier },
                { mobile: identifier }
            ]
        });

        if (!userData) {
            return res.status(400).json({
                success: false,
                msg: 'Utilisateur non trouvé'
            });
        }

        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                msg: 'Email et mot de passe incorrects !'
            });
        }

        if (userData.is_banned !== undefined && userData.is_banned === true) {
            return res.status(403).json({
                success: false,
                msg: 'Votre compte est banni !!!!'
            });
        }
        
        

     

        const accessToken = await generateAccessToken({ user: userData });
        const refreshToken = await generateRefreshToken({ user: userData });
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);
        return res.status(200).json({
            success: true,
            msg: 'Login Successfully!!',
            user: userData,
            accessToken: accessToken,
            refreshToken:refreshToken,
            tokenType: 'Bearer'
            
        });

    } catch (error) {
        console.error('Erreur de connexion:', error);
        return res.status(500).json({
            success: false,
            msg: 'Une erreur est survenue, veuillez réessayer plus tard.'
        });
    }
};


// Function to get user profile
const userProfile = async (req, res) => {
    try {
        const userId = req.user._id; // Récupérer l'ID de l'utilisateur connecté

        // Récupérer les données les plus récentes depuis MongoDB
        const userData = await User.findById(userId).lean();

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

// Function to update user profile
const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                msg: 'Errors',
                errors: errors.array()
            });
        }

        const { name, mobile, genre } = req.body;
        const data = {
            name,
            mobile,
            genre
        };

        const user_id = req.user._id;

        if (req.file) {
            data.image =  req.file.filename;

            // Fetch the current user to get the old image path
            const oldUser = await User.findOne({ _id: user_id });

            if (oldUser && oldUser.image) {
                const oldFilePath = path.join(__dirname, '../public', oldUser.image);

                // Vérifier si le fichier n'est pas "default.png"
                if (!oldUser.image.includes('default.png')) {
                    console.log(`Attempting to delete old file: ${oldFilePath}`);
                    await deletefile(oldFilePath); // Call to deletefile
                } else {
                    console.log(`Skipping deletion of default.png: ${oldFilePath}`);
                }
            }
        }

        // Update the user with new data
        const userData = await User.findByIdAndUpdate(user_id, {
            $set: data
        }, { new: true });

        return res.status(200).json({
            success: true,
            msg: 'User Updated Successfully!',
            user: userData
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
};

const refreshToken = async(req,res)=>{
    try{
        const userId = req.user._id;
        const userData = await User.findOne({ _id:userId});

        const accessToken =await generateAccessToken({ user:userData})
        const refreshToken = await generateRefreshToken({ user:userData})

        return res.status(200).json({
            success: true,
            msg: 'Token Refreshed! ',
            accessToken:accessToken,
            refreshToken:refreshToken
        });
    }catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
}

const logout = async(req,res)=>{
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


const generateRandom4Digit = async()=>{
    return Math.floor(1000 + Math.random() * 9000); 
}


const sendOpt = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                msg: 'Erreurs de validation',
                errors: errors.array()
            });
        }

        const { email } = req.body;

        // Check if the user exists
        const userData = await User.findOne({ email });

        if (!userData) {
            return res.status(400).json({
                success: false,
                msg: "Email n'existe pas"
            });
        }

        if (userData.is_verified === 1) {
            return res.status(400).json({
                success: false,
                msg: `${userData.email} Email est déjà vérifié!`
            });
        }

        // Prepare email content for verification
        const subject = 'Verification Otp';
        const g_otp = await generateRandom4Digit();

        const oldOtpData = await Otp.findOne({ user_id: userData._id });

        if (oldOtpData) {
            console.log('Existing OTP timestamp:', oldOtpData.timestamp);
            if (oldOtpData.timestamp) {
                const isExpired = oneMinuteExpiry(oldOtpData.timestamp);
                if (!isExpired) {
                    return res.status(400).json({
                        success: false,
                        msg: 'Pls try after some time!'
                    });
                }
            } else {
                console.log('Timestamp is undefined.');
            }
        }

        const cDate = new Date(); // Current time

        // Ensure that the `upsert` option is correct and check the result
        const result = await Otp.findOneAndUpdate(
            { user_id: userData._id },
            { otp: g_otp, timestamp: cDate },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('OTP update result:', result); // Add this log to debug

        const content = `<p>Bonjour ${userData.name}, </br> <h4>${g_otp}</h4></p>`;

        // Send verification email
        await sendMail(email, subject, content);

        return res.status(200).json({
            success: true,
            msg: 'Otp envoyé à votre email, veuillez vérifier!'
        });

    } catch (error) {
        console.error('Error in sendOpt:', error);
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
};

const verifyOpt = async (req, res)=>{
    try{
        const errors = validationResult(req);

        if(!errors.isEmpty()){
            return res.status(400).json({
                success: false,
                msg: 'Errors',
                errors: errors.array()
            });
        }

        const {user_id, otp } = req.body;

        const otpData = await Otp.findOne({
            user_id,
            otp
        });

        if(!otpData){
            return res.status(400).json({
                success: false,
                msg: ' You entered wrong OTP!'
            });
        }
       const isOtpExpired = await threeMinuteExpiry(otpData.timestamp)

       if (isOtpExpired){
        return res.status(400).json({
            success: false,
            msg: ' Your OTP has been Expierd !'
        });

       }

       await User.findByIdAndUpdate({ _id: user_id},{
        $set:{
            is_verified:1
        }
       })

       return res.status(200).json({
        success: true,
        msg: ' Account Verified Successfully!'
    });

    }catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    } 
}
