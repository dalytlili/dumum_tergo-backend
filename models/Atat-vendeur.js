import mongoose from 'mongoose';

const statsVendorSchema = new mongoose.Schema({
    totalVendors: {
        type: Number,
        default: 0
    },
    activeVendors: {
        type: Number,
        default: 0
    },
    monthlyVendors: [{
        month: String,
        count: Number
    }],
    dailyLogins: [{
        date: Date,
        count: Number
    }],
    profileCompletions: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const StatsVendor = mongoose.models.StatsVendor || mongoose.model('StatsVendor', statsVendorSchema);
export default StatsVendor;
