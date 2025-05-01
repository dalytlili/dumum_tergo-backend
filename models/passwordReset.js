import mongoose from 'mongoose';

// Définir le schéma de l'utilisateur
const passwordResetSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true
    },
   
});

// Exporter le modèle User
const User = mongoose.model('passwordReset', passwordResetSchema);
export default User;