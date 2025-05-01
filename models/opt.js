import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    otp: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    }
});

const Otp = mongoose.model('Otp', otpSchema);



export default Otp;