import express from 'express';
import passport from "../config/passport.js"; // تأكد من أن المسار صحيح

import {
    mailVerification,
    resetPassword,
    updatePassword,
    restSuccess,
    verifyOtpPhone,
    forgotPassword,
    resetPasswordP,
    forgotPasswordP,
    sendOtpP
} from '../controllers/userController.js';

import bodyParser from 'body-parser';

const router = express.Router();
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.use(bodyParser.json());


router.use(bodyParser.urlencoded({extended:true}))
router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        const token = generateJWT(req.user);  

        res.redirect(`dumumtergo://callback?token=${token}`); 
    }
);

router.get('/mail-verif/:id', mailVerification); 
router.get('/reset-password', resetPassword); 
router.post('/reset-password', updatePassword); 
router.get('/reset-success', restSuccess)

router.post('/forgot-passwordP', forgotPasswordP);
router.post('/verifyOtpPhone', verifyOtpPhone);
router.post('/reset-password', resetPasswordP);
router.post('/send-opt', sendOtpP);


export default router;
