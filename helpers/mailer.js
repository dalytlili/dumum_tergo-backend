import nodemailer from 'nodemailer'; // Import nodemailer correctement

// Création d'un transporteur avec votre configuration SMTP
const transporter = nodemailer.createTransport({
    secure: true,
    host: 'smtp.gmail.com',
    auth: {
        user: 'mohamedalitlili8@gmail.com',
        pass: 'tlri wivu okrg bwin'
    },
    debug: true, // Activer les journaux de débogage (optionnel)
});

// Définition d'une fonction asynchrone pour envoyer des emails
const sendMail = async (email, subject, content) => {
    try {
        const mailOptions = {
            from: 'mohamedalitlili8@gmail.com',
            to: email,
            subject: subject,
            html: content
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email envoyé :', info.messageId);
        return { success: true, msg: 'Email envoyé avec succès' }; // Retourne le message de succès
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email :', error);
        throw error; // Lancer l'erreur pour être capturée par l'appelant
    }
};
const sendBanEmail = async (email, reason = null) => {
    const subject = 'Notification de suspension de votre compte';
    
    const content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d9534f;">Notification de suspension de compte</h2>
            <p>Bonjour,</p>
            <p>Votre compte a été suspendu par un administrateur.</p>
            
            ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
            
            <p>Si vous pensez qu'il s'agit d'une erreur ou pour toute question, 
            veuillez contacter notre équipe de support.</p>
            
            <p>Cordialement,<br>L'équipe d'administration</p>
            
            <hr style="border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #777;">
                Ceci est un message automatique, veuillez ne pas y répondre directement.
            </p>
        </div>
    `;

    try {
        return await sendMail(email, subject, content);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de bannissement :', error);
        throw new Error('Échec de l\'envoi de la notification de bannissement');
    }
};
export { sendMail, sendBanEmail }; // Exporter la fonction sendMail
