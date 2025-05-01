// models/Location.js
import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: false },
  //latitude: { type: Number, required: false },   // Optionnel: Pour des recherches géographiques
  //longitude: { type: Number, required: false },   // Optionnel: Pour des recherches géographiques
}, { timestamps: true });

const Location = mongoose.model('Location', locationSchema);
export default Location;