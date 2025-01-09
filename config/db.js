import { sql } from '@vercel/postgres';
import { Sequelize } from 'sequelize';
import 'dotenv/config';

let sequelize;

const initializeDb = async () => {
    if (!sequelize) {
        const databaseUrl = process.env.DATABASE_URL;
        
        if (!databaseUrl) {
            console.error('No database URL found in environment variables');
            throw new Error('Database configuration is missing');
        }

        // Dynamically import pg
        const pg = await import('pg');

        sequelize = new Sequelize(databaseUrl, {
            dialect: 'postgres',
            dialectModule: pg.default,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            logging: console.log // Temporarily enable logging for debugging
        });
    }
    return sequelize;
};

export const getDb = async () => {
    return await initializeDb();
};

// Simple connection test
export const testConnection = async () => {
    try {
        const db = await getDb();
        await db.authenticate();
        console.log('Database connection successful');
        return true;
    } catch (error) {
        console.error('Database connection error:', error);
        return false;
    }
};

const db = await initializeDb();
export default db;