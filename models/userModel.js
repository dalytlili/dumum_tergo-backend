import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    genre: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true,
        // unique: true // Ajout d'un index unique pour l'email
    },
    mobile: {
        type: String,
        required: false,
        sparse: true // Permet d'accepter null sans imposer l'unicité
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true   // Permet de permettre null pour googleId
    },
    password: { 
        type: String, 
        required: function() { return !this.googleId && !this.facebookId; } // Password nécessaire si l'utilisateur ne se connecte pas via Google/Facebook
    },
    facebookId: { 
        type: String, 
        unique: true, 
        sparse: true   // Permet de permettre null pour facebookId
    },
    is_verified: {
        type: Number,
        default: 0
    },
    image: {
        type: String,
        required: true
    },
    tokenExpiredAt: { 
        type: Date 
    },
    role: {
        type: String,
        enum: ['user', 'admin'], // Accepte uniquement "user" ou "admin"
        default: 'user' // Par défaut, l'utilisateur est un user
    },
    is_banned: {
        type: Boolean,
        default: false
    },
    ban_reason: {
        type: String,
        required: false
    },
    banned_at: {
        type: Date,
        required: false
    },});
    

// Exporter le modèle User
const User = mongoose.model('User', userSchema);
export default User;
