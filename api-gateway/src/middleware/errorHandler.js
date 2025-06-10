export const errorHandler = (err, req, res, next) => {
    console.error('Gateway Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Default error response
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};
