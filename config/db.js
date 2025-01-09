import { Sequelize } from 'sequelize';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not defined in environment variables');
    process.exit(1);
}

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

// Test the connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');
        return true;
    } catch (error) {
        console.error('Unable to connect to database:', error);
        return false;
    }
};

export { sequelize as default, testConnection };