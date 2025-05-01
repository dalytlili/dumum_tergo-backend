import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from 'passport-facebook';

import User from "../models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

// قم بتوفير App ID و App Secret من Facebook Developer Console
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'displayName', 'email', 'photos'], // Ajouter 'gender'
    scope: ['email'], // Demander la permission 'user_gender'



},
async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Facebook Profile:', profile);

        let user = await User.findOne({ email: profile.emails[0].value });
        let profileImageUrl = profile.photos[0].value.replace(/width=\d+&height=\d+/, 'width=200&height=200');

        if (!user) {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                facebookId: profile.id,
                image: profileImageUrl,
                is_verified: 1,
                genre: profile.gender || 'Autre', // Utiliser le genre de Facebook ou 'Autre' par défaut
                mobile: null, // Numéro de téléphone non disponible
            });
            await user.save();
        } else {
            user.image = profileImageUrl;
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));



// تسلسل المستخدم وتخزين البيانات
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ["profile", "email"],
            prompt: "consent select_account",

            
      

        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Afficher le profil Google pour vérifier les informations
                console.log('Google Profile:', profile);

                // Vérifiez si un utilisateur existe déjà avec cet email
                let user = await User.findOne({ email: profile.emails[0].value });

                if (!user) {
                    // Si l'utilisateur n'existe pas, créez un nouveau compte
                    user = new User({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        googleId: profile.id,
                        image: profile.photos[0].value,
                        is_verified: 1,
                        genre: profile.gender || 'Autre', // Utiliser le genre de Facebook ou 'Autre' par défaut
                        mobile: null, // Numéro de téléphone non disponible
                    });

                    // Sauvegardez l'utilisateur dans la base de données
                    await user.save();
                }

                return done(null, user); // Retourne l'utilisateur trouvé ou créé
            } catch (error) {
                return done(error, null); // Si une erreur survient, elle est renvoyée
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id); // Sérialise l'utilisateur dans la session
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id); // Recherche l'utilisateur par ID
    done(null, user); // Désérialise l'utilisateur
});

export default passport;
