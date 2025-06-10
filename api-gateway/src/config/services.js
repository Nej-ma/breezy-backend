export const serviceRegistry = {
    auth: {
        url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
        name: 'Authentication Service',
        healthPath: '/health'
    },
    user: {
        url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
        name: 'User Service',
        healthPath: '/health'
    },
    post: {
        url: process.env.POST_SERVICE_URL || 'http://post-service:3003',
        name: 'Post Service',
        healthPath: '/health'
    },
    notification: {
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
        name: 'Notification Service',
        healthPath: '/health'
    }
};
