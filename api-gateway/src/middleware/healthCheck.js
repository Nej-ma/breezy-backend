import axios from 'axios';
import { serviceRegistry } from '../config/services.js';

export const healthCheck = async (req, res) => {
    const results = {
        gateway: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        },
        services: {}
    };

    // Check each service health
    for (const [key, service] of Object.entries(serviceRegistry)) {
        try {
            const response = await axios.get(`${service.url}${service.healthPath}`, {
                timeout: 5000
            });
            results.services[key] = {
                name: service.name,
                status: 'healthy',
                url: service.url,
                responseTime: response.headers['x-response-time'] || 'N/A'
            };
        } catch (error) {
            results.services[key] = {
                name: service.name,
                status: 'unhealthy',
                url: service.url,
                error: error.message
            };
        }
    }

    // Determine overall health
    const unhealthyServices = Object.values(results.services).filter(s => s.status === 'unhealthy');
    const overallStatus = unhealthyServices.length === 0 ? 'healthy' : 'degraded';

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
        ...results,
        overall: overallStatus
    });
};
