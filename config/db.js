/*
This file is used to connect to my database, I use a postgres url but it can be easily swaped
change database url to the requirements for your database langague's requirements, and be sure to
import the packages

i am sure there is a better way to do this and check for production and dev enviroments but
if i touch this i am sure it will not work anymore 
*/

import { Sequelize } from 'sequelize';
import 'dotenv/config';
import pg from 'pg';


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