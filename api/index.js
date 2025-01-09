import app from '../server.js';

export const config = {
    runtime: 'edge',
    regions: ['iad1']  // This is optional, but can help with performance
};

export default function handler(req, res) {
    return app(req, res);
} 