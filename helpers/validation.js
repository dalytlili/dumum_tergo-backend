import { check } from 'express-validator';

// Définir les validateurs pour l'enregistrement
export const registerValidator = [
   // check('name', 'Name is required!!!').notEmpty(),
  // check('name', 'name is required').not().isEmpty(),
    check('lastname', 'Lastname is required').not().isEmpty(),
    check('email', 'Invalid email').isEmail().normalizeEmail({
        gmail_remove_dots: true
    }),
    check('mobile', 'Mobile No. should contain exactly 8 digits').isLength({
        min: 8,
        max: 8
    }),
    check('password', 'Password must be greater than 6 characters, and contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .isStrongPassword({
        minLength: 6,
        minUppercase: 1,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }),
    check('image').custom((value, { req }) => {
        if (!req.file) {
            throw new Error("Please upload an image (Jpeg, PNG)");
        }
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(req.file.mimetype)) {
            return true;
        } else {
            throw new Error("Please upload an image (Jpeg, PNG)");
        }
    })
];



export const sendMailVerificationValidator = [
    check('email', 'Invalid email').isEmail().normalizeEmail({
        gmail_remove_dots: true
    }),
];
export const passwordResetValidator = [
    check('email', 'Invalid email').isEmail().normalizeEmail({
        gmail_remove_dots: true
    }),
];

export const loginValidator =[
    check('email', 'Invalid email').isEmail().normalizeEmail({
        gmail_remove_dots: true
    }),
    check('password', 'Password is required').not().isEmpty(),
];

export const updateProfileValidator = [
    check('name', 'Name is required').not().isEmpty(),
    check('lastname', 'Lastname is required').not().isEmpty(),
    
    check('mobile', 'Mobile No. should contain exactly 8 digits').isLength({
        min: 8,
        max: 8
    }),
    
    
];
export const optMailValidation = [
    check('email', 'Invalid email').isEmail().normalizeEmail({
        gmail_remove_dots: true
    }),
];
export const verifyOptValidator =[
    check('user_id', 'User Id is required').not().isEmail(),
    check('otp', 'Otp is required').not().isEmpty(),
];