// models/Car.js
import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  color: {
    type: String,
    required: true
  },
  seats: {
    type: Number,
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  // Nouveau champ pour la boîte de vitesses
  transmission: {
    type: String,
    enum: ['manuelle', 'automatique'],
    required: true,
    default: 'manuelle'
  },
  // Nouveau champ pour le kilométrage
  mileagePolicy: {
    type: String,
    enum: ['limitée', 'illimitée'],
    required: true,
    default: 'illimitée'
  },
  // Optionnel: valeur limite si kilométrage limité
  mileageLimit: {
    type: Number,
    required: function() {
      return this.mileagePolicy === 'limitée';
    }
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  images: [String],
  features: [String],
  isAvailable: {
    type: Boolean,
    default: true
  },
  deposit: {
    type: Number,
    required: true,
    default: 2000, // Valeur par défaut en TND
    min: 0 // La caution ne peut pas être négative
  },
  isBanned: {
      type: Boolean,
      default: false
    },
    banReason: {
      type: String,
      default: ''
    },
    bannedAt: {
      type: Date
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
  unavailableDates: [{
    from: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v instanceof Date && !isNaN(v);
        },
        message: props => `${props.value} n'est pas une date valide!`
      }
    },
    to: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v instanceof Date && !isNaN(v) && v > this.from;
        },
        message: props => `La date de fin doit être après la date de début`
      }
    }
  }]
}, { timestamps: true });

const Car = mongoose.model('Car', carSchema);
export default Car;