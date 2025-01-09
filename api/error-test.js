export default function handler(req, res) {
    try {
        // Test database connection
        const { getDb } = require('../config/db.js');
        const sequelize = getDb();
        
        return res.status(200).json({
            status: 'ok',
            environment: process.env.NODE_ENV,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            databaseConfig: {
                dialect: sequelize.options.dialect,
                host: sequelize.options.host,
                database: sequelize.options.database,
                ssl: sequelize.options.dialectOptions.ssl
            }
        });
    } catch (error) {
        console.error('Error test endpoint:', error);
        return res.status(500).json({
            error: error.message,
            stack: error.stack,
            type: error.name,
            code: error.code
        });
    }
} 