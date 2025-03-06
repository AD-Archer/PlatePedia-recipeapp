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

// Mock database configuration for JSON-only version
const sequelize = {
  // Mock methods that might be used
  define: () => ({}),
  sync: async () => ({}),
  authenticate: async () => ({}),
  transaction: async (callback) => callback({ commit: async () => {}, rollback: async () => {} }),
  
  // Mock Sequelize operators and functions
  Op: Sequelize.Op,
  fn: () => ({}),
  col: (name) => name,
  where: (...args) => args,
  literal: (text) => text,
  or: (...args) => args,
  
  // Mock query methods
  query: async () => [[]],
  
  // Add any other methods/properties that might be used
};

console.log('Using mock database configuration (JSON-only mode)');

export default sequelize;