// models/Stats.js
import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema({
    totalUsers: {
        type: Number,
        default: 0
    },
    monthlyUsers: [{
        month: String,
        count: Number
    }],
    dailyLogins: [{
        date: Date,
        count: Number
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Stats = mongoose.models.Stats || mongoose.model('Stats', statsSchema);
export default Stats;
