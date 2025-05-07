import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from "../models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

// Configuration dynamique des URLs de callback
const getCallbackUrl = (provider) => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://dumum-tergo-backend.onrender.com`
    : `http://localhost:${process.env.PORT || 9098}`;
  
  return `${baseUrl}/auth/${provider}/callback`;
};

// Stratégie Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: getCallbackUrl('facebook'),
    profileFields: ['id', 'displayName', 'email', 'photos', 'gender'],
    scope: ['email'],
    enableProof: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        if (!profile.emails || !profile.emails[0]) {
            return done(new Error("Email non fourni par Facebook"), null);
        }

        const email = profile.emails[0].value;
        let user = await User.findOne({ email });
        const profileImageUrl = profile.photos?.[0]?.value?.replace(/width=\d+&height=\d+/, 'width=200&height=200') || '';

        if (!user) {
            user = new User({
                name: profile.displayName,
                email,
                facebookId: profile.id,
                image: profileImageUrl,
                is_verified: true,
                genre: profile.gender || 'Autre',
                mobile: null,
            });
            await user.save();
        } else if (profileImageUrl) {
            user.image = profileImageUrl;
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Stratégie Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: getCallbackUrl('google'),
    scope: ["profile", "email"],
    prompt: "consent select_account"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        if (!profile.emails || !profile.emails[0]) {
            return done(new Error("Email non fourni par Google"), null);
        }

        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                name: profile.displayName,
                email,
                googleId: profile.id,
                image: profile.photos?.[0]?.value || '',
                is_verified: true,
                genre: profile.gender || 'Autre',
                mobile: null,
            });
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Sérialisation
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
