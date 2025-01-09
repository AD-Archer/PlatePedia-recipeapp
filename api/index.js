import app from '../server.js';

export const config = {
    runtime: 'nodejs18'
};

// Wrap the app in an error handler with detailed logging
const handler = async (req, res) => {
    try {
        console.log('Request received:', {
            method: req.method,
            path: req.url,
            headers: req.headers,
            query: req.query,
            body: req.body
        });

        // Add error event listener to catch unhandled errors
        res.on('error', (error) => {
            console.error('Response error:', error);
        });

        const response = await app(req, res);
        return response;
    } catch (error) {
        console.error('Detailed error information:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });

        // Send detailed error response in development
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            } : undefined
        });
    }
};

export default handler; 