import express from 'express';
import { clearCache } from '../utils/dataSync.js'; // Adjust the import based on your structure

const router = express.Router();

router.get('/clear-cache', (req, res) => {
    clearCache(); // Call your cache clearing function
    res.send('Cache cleared!');
});

export default router; 