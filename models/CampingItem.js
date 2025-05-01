import mongoose from 'mongoose';

const campingItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: function() { return this.isForSale; },
    min: 0,
    set: v => parseFloat(v) || 0 // Conversion garantie en Number
  },
  rentalPrice: {
    type: Number,
    required: function() { return this.isForRent; },
    min: 0,
    set: v => parseFloat(v) || 0 // Conversion garantie en Number
  },
  category: {
    type: String,
    //enum: ['tente', 'sac de couchage', 'réchaud', 'lampe', 'autre'],
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  stock: {
    type: Number,
   
    min: 0
  },
  isForSale: {
    type: Boolean,
    default: true,
    validate: {
      validator: function(v) {
        // Au moins une des options doit être true
        return v || this.isForRent;
      },
      message: 'L\'article doit être à vendre ou à louer'
    }
  },
  isForRent: {
    type: Boolean,
    default: false
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  condition: {
    type: String,
    //enum: ['neuf', 'occasion', 'comme neuf'],
    required: true
  },
  rentalTerms: {
    type: String
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
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

campingItemSchema.index({ name: 'text', description: 'text' });

const CampingItem = mongoose.model('CampingItem', campingItemSchema);

export default CampingItem;