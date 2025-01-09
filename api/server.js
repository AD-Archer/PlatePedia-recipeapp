import app from '../server.js';

export default async function handler(req, res) {
    return app(req, res);
} 