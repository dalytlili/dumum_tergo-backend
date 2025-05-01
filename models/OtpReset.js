import mongoose from 'mongoose';

const OtpResetSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User' // Référence au modèle User
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  versionKey: false // Désactive le champ __v
});

// Index pour la suppression automatique des OTP expirés
OtpResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpReset = mongoose.model('OtpReset', OtpResetSchema);

export default OtpReset;