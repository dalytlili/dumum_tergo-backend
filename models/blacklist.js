import mongoose from 'mongoose';

// Définir le schéma de blacklist
const blacklistSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Exporter le modèle Blacklist
const Blacklist = mongoose.model('Blacklist', blacklistSchema);
export default Blacklist;