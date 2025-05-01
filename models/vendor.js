import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true,
        unique: true,
        match: /^\+?[1-9]\d{1,14}$/,
    },
    newMobile: { // Champ pour stocker temporairement le nouveau numéro de mobile
        type: String,
        required: false,
        match: /^\+?[1-9]\d{1,14}$/,
    },
    otp: {
        type: String,
        required: false,
    },
    otpExpiresAt: {
        type: Date,
        required: false,
    },
    profileCompleted: {
        type: Boolean,
        default: false,
    },
    image: {
        type: String,
        default: '/images/default.png',
    },
    businessName: {
        type: String,
        required: function () {
            return this.profileCompleted;
        },
    },
    email: {
        type: String,
        required: function () {
            return this.profileCompleted;
        },
    },
    description: {
        type: String,
        required: function () {
            return this.profileCompleted;
        },
    },
    
    
    businessAddress: {
        type: String,
        required: function () {
            return this.profileCompleted;
        },
    },
    subscription: {
        status: {
            type: String,
            enum: ['active', 'inactive', 'expired'],
            default: 'inactive',
        },
        expirationDate: {
            type: Date,
        },
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
    },ratings: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User' // ou le modèle que vous utilisez pour les clients
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Méthode pour vérifier si l'abonnement est expiré
vendorSchema.methods.isSubscriptionExpired = function () {
    if (this.subscription.status === 'active' && this.subscription.expirationDate) {
        return this.subscription.expirationDate < new Date();
    }
    return false;
};

// Middleware pour vérifier l'expiration de l'abonnement avant de sauvegarder
vendorSchema.pre('save', function (next) {
    if (this.isSubscriptionExpired()) {
        this.subscription.status = 'expired';
    }
    next();
});
vendorSchema.methods.calculateAverageRating = function() {
    if (this.ratings.length === 0) {
        this.averageRating = 0;
        this.ratingCount = 0;
        return;
    }
    
    const sum = this.ratings.reduce((total, rating) => total + rating.rating, 0);
    this.averageRating = parseFloat((sum / this.ratings.length).toFixed(1));
    this.ratingCount = this.ratings.length;
};

// Middleware pour recalculer la note moyenne avant de sauvegarder
vendorSchema.pre('save', function(next) {
    if (this.isModified('ratings')) {
        this.calculateAverageRating();
    }
    next();
})

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;