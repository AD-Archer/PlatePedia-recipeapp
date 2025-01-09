import { Sequelize } from 'sequelize';
import 'dotenv/config';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
});

// Initialize database connection
const initDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection successful');
        return sequelize;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
};

export { initDb as getDb };
export { sequelize };
export default sequelize;