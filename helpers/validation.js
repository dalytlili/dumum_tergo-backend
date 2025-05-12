import { check } from 'express-validator';

// Définir les validateurs pour l'enregistrement
export const registerValidator = [
   // check('name', 'Name is required!!!').notEmpty(),
  // check('name', 'name is required').not().isEmpty(),
    //check('lastname', 'Lastname is required').not().isEmpty(),
    check('email', 'Invalid email').isEmail().normalizeEmail({
        gmail_remove_dots: true
    }),
  //  check('mobile', 'Mobile No. should contain exactly 8 digits').isLength({
     //   min: 8,
     //   max: 8
    //}),
    check('password', 'Password must be greater than 6 characters, and contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .isStrongPassword({
        minLength: 6,
        minUppercase: 1,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }),

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

export const loginValidator = [
    check('identifier', 'Email or mobile is required').not().isEmpty(),
    check('password', 'Password is required').not().isEmpty(),
    
    // Validation conditionnelle pour email ou mobile
    check('identifier').custom((value, { req }) => {
        // Si c'est un email
        if (value.includes('@')) {
            return check('identifier', 'Invalid email')
                .isEmail()
                .normalizeEmail({ gmail_remove_dots: true })
                .run(req);
        } 
        // Si c'est un mobile
        else {
            // Expression régulière pour numéro international:
            // - Commence par + et 1-4 chiffres (indicatif pays)
            // - Suivi de 4-15 chiffres (numéro local)
            const mobileRegex = /^\+\d{1,4}\d{4,15}$/;
            
            if (!mobileRegex.test(value)) {
                throw new Error('Mobile number must be in international format (+code pays numéro)');
            }
            return true;
        }
    })
];
export const updateProfileValidator = [
    //check('name', 'Name is required').not().isEmpty(),
    //check('lastname', 'Lastname is required').not().isEmpty(),
    
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
