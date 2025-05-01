import twilio from 'twilio';
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export const sendOtp = async (mobile, otp) => {
    try {
        await client.messages.create({
            body: `Votre OTP de connexion est : ${otp} (Sent from your Twilio trial account)`,
            from: TWILIO_PHONE_NUMBER, // Doit être un numéro Twilio valide
            to: mobile, // Doit être un numéro vérifié si compte d'essai
        });
        console.log(`OTP envoyé à ${mobile}: ${otp}`);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'OTP:', error);
        throw new Error('Erreur lors de l\'envoi de l\'OTP!!!');
    }
};
