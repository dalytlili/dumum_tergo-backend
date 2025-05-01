import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientType'
  },
  
  recipientType: {
    type: String,
    required: true,
    enum: ['User', 'Vendor']
  },
  type: {
    type: String,
    required: true,
    enum: ['new_reservation', 'reservation_accepted', 'reservation_rejected']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification; 