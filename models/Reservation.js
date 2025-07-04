// models/Reservation.js
import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  // Nouveaux champs ajoutés
  childSeats: {
    type: Number,
    default: 0
  },
  additionalDrivers: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    required: true
  },
  documents: {
    permisRecto: {
      type: String,
      required: true
    },
    permisVerso: {
      type: String,
      required: true
    },
    cinRecto: {
      type: String
    },
    cinVerso: {
      type: String
    },
    passport: {
      type: String
    }
  },
  driverDetails: {
    email: {
      type: String,
      required: true
    },

    phoneNumber: {
      type: String,
      required: true
    },

  }
}, { timestamps: true });

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;
