/*
This file is used to connect to my database, I use a postgres url but it can be easily swaped
change database url to the requirements for your database langague's requirements, and be sure to
import the packages
*/

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // Disable logging; default: console.log
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // This is necessary for some cloud providers
        }
    }
});

export default sequelize;