import axios from 'axios';

// Configuration pour communiquer avec l'Auth Service
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

// Fonction pour envoyer un email de confirmation via l'Auth Service
const sendConfirmationEmail = async (email, token) => {
    try {
        console.log(`🔍 Tentative d'envoi d'email via: ${AUTH_SERVICE_URL}/auth/send-verification-email`);
        
        // Appeler l'Auth Service pour envoyer l'email
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/send-verification-email`, {
            email,
            token
        }, {
            timeout: 10000, // 10 secondes timeout
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📧 Email de confirmation envoyé via Auth Service');
        return response.data;
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi d\'email via Auth Service:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        if (error.code === 'ECONNREFUSED') {
            console.error('🔌 Connexion refusée - Auth Service non disponible');
        }
        // Ne pas faire échouer la création d'utilisateur si l'email ne peut pas être envoyé
        console.log('⚠️ Utilisateur créé mais email non envoyé');
        return null;
    }
};

// Fonction placeholder pour la compatibilité
const sendPasswordResetEmail = async (email, token) => {
    console.log('⚠️ Reset password doit être géré par l\'Auth Service directement');
    return null;
};

export {
    sendConfirmationEmail,
    sendPasswordResetEmail
};