import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    complainant: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'complainantModel'
    },
    complainantModel: {
        type: String,
        required: true,
        enum: ['User', 'Vendor']
    },
    accused: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'accusedModel'
    },
    accusedModel: {
        type: String,
        required: true,
        enum: ['User', 'Vendor']
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved', 'rejected'],
        default: 'pending'
    },
    adminResponse: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
