import mongoose from 'mongoose';

const campingSchema = new mongoose.Schema({
  lieu: {
    type: String,
    required: [true, 'Le nom du lieu est obligatoire'],
    trim: true,
    maxlength: [100, 'Le nom ne peut excéder 100 caractères']
  },
  date: {
    type: Date,
    required: [true, 'La date est obligatoire'],
    validate: {
      validator: function(value) {
        // La date doit être dans le futur
        return value > Date.now();
      },
      message: 'La date doit être dans le futur'
    }
  },
  description: {
    type: String,
    required: [true, 'La description est obligatoire'],
    trim: true,
    maxlength: [500, 'La description ne peut excéder 500 caractères']
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 && // longitude valide
            coords[1] >= -90 && coords[1] <= 90    // latitude valide
          );
        },
        message: 'Coordonnées géographiques invalides'
      }
    },
    address: {
      type: String,
      required: [true, 'L\'adresse est obligatoire'],
      trim: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',

    
  }],
  images: [{  // Nouveau champ pour les images
    type: String,

  }],
  isActive: {  // Pour activer/désactiver un événement
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,  // Ajoute createdAt et updatedAt automatiquement
  toJSON: { virtuals: true },  // Inclut les virtuals dans les sorties JSON
  toObject: { virtuals: true }
});

// Index géospatial pour les requêtes de proximité
campingSchema.index({ location: '2dsphere' });

// Index pour des recherches plus rapides
campingSchema.index({ date: 1, isActive: 1 });

// Virtual pour la durée restante avant l'événement
campingSchema.virtual('timeRemaining').get(function() {
  return this.date - Date.now();
});

// Middleware pour valider les coordonnées avant sauvegarde
campingSchema.pre('save', function(next) {
  if (this.isModified('location.coordinates')) {
    // Normaliser la précision des coordonnées
    this.location.coordinates = [
      parseFloat(this.location.coordinates[0].toFixed(6)),
      parseFloat(this.location.coordinates[1].toFixed(6))
    ];
  }
  next();
});

// Méthode pour ajouter un participant
campingSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Méthode statique pour trouver les événements à proximité
campingSchema.statics.findNearby = function(coords, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coords
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    date: { $gt: new Date() }
  });
};

const Camping = mongoose.model('Camping', campingSchema);

export default Camping;
