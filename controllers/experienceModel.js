import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    url: String,
    //mediaType: { type: String, enum: ['image', 'video'] }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
 
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});


const Experience = mongoose.model('Experience', experienceSchema);

export default Experience;
