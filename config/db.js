/*
This file is used to connect to my database, I use a postgres url but it can be easily swaped
change database url to the requirements for your database langague's requirements, and be sure to
import the packages
*/

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    ssl: true,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});


export const getDb = () => {
    if (!sequelize) {
        sequelize = new Sequelize(process.env.DATABASE_URL, {
            dialect: 'postgres',
            protocol: 'postgres',
            logging: false, // Disable logging; default: console.log
        });
    }
    return sequelize;
};

export { sequelize };
export default sequelize;