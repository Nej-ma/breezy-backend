import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

/**
 * Synchronise les données d'authentification avec le user-service
 */
export const syncUserAuthData = async (userId, authData) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/api/users/sync-auth-data`, {
      userId,
      ...authData
    });

    console.log(`✅ User auth data synced for user ${userId}:`, authData);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to sync user auth data for user ${userId}:`, error.message);
    
    // On ne fait pas échouer l'opération principale si la sync échoue
    // C'est une opération de "eventual consistency"
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    return null;
  }
};

/**
 * Synchronise le rôle d'un utilisateur
 */
export const syncUserRole = async (userId, role) => {
  return syncUserAuthData(userId, { role });
};

/**
 * Synchronise le statut de suspension d'un utilisateur
 */
export const syncUserSuspension = async (userId, isSuspended, suspendedUntil = null) => {
  return syncUserAuthData(userId, { isSuspended, suspendedUntil });
};
