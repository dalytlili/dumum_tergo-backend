import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import cloudinary from './cloudinaryConfig.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'camping', // Optionnel
    allowed_formats: ['jpg', 'jpeg', 'png'], // Formats autorisés
    transformation: [
        { width: 800, crop: 'limit', quality: 'auto' }, // Compression automatique
        { fetch_format: 'auto' }
      ],    public_id: (req, file) => {
      return `img-${Date.now()}`; // Nom unique
    },
  },
});

export default multer({ 
  storage: storage,
  limits: {     fileSize: 5 * 1024 * 1024 // Augmenté à 5MB
  } // 512 KB
}).single('image');
