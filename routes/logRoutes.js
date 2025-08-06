import express from 'express';
import fs from 'fs';
import path from 'path';
import verifyAdmin from '../middleware/verifyadmin.js';
import 'dotenv/config'; // Loads .env file contents into process.env

const router = express.Router();

/**
 * @route   GET /api/logs
 * @desc    Get all logs from an external directory specified in .env
 * @access  Public
 */
router.get('/', verifyAdmin, async (req, res) => {
    try {
        // Get the absolute path to the logs directory from environment variables
        // const logsDir = process.env.LOGS_DIRECTORY_PATH;
        const logsDir = "/home/user/projects/Research-To-Commercialization-Backend/logs";

        // Check if the environment variable is set
        if (!logsDir) {
            console.error('LOGS_DIRECTORY_PATH environment variable not set.');
            return res.status(500).send('Server configuration error: Log directory path not specified.');
        }

        // Use fs.promises for a cleaner async/await experience without wrapping in a new Promise
        const readLogFile = (fileName) => {
            return fs.promises.readFile(path.join(logsDir, fileName), 'utf8')
                .catch(err => {
                    // If the file is not found, return an empty string
                    if (err.code === 'ENOENT') {
                        console.warn(`Log file not found: ${fileName}, returning empty content.`);
                        return '';
                    }
                    // For other errors, re-throw them to be caught by the outer catch block
                    throw err;
                });
        };

        const chatHistory = await readLogFile('chat_history.log');
        const studyClicks = await readLogFile('study_clicks.log');

        res.json({
            chatHistory,
            studyClicks
        });

    } catch (error) {
        console.error('Error reading log files:', error);
        res.status(500).send('Server Error');
    }
});

export default router;
