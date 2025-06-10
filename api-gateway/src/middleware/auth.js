import axios from 'axios';
import { serviceRegistry } from '../config/services.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify token with auth service
        const response = await axios.post(`${serviceRegistry.auth.url}/verify`, {}, {
            headers: { Authorization: token },
            timeout: 5000
        });

        // Attach user info to request
        req.user = response.data.user;
        next();
    } catch (error) {
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(503).json({ error: 'Authentication service unavailable' });
    }
};
