const express = require('express');
const router = express.Router();
const promptProcessor = require('../services/prompt-processor');
const fileManager = require('../services/file-manager');

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/enhance-prompt
router.post('/enhance-prompt', asyncHandler(async (req, res) => {
    const { userPrompt, useExamples = false, includeCategories = true } = req.body;

    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'userPrompt is required and must be a non-empty string'
        });
    }

    if (userPrompt.length > 5000) {
        return res.status(400).json({
            error: 'Input too long',
            message: 'userPrompt must be less than 5000 characters'
        });
    }

    const result = await promptProcessor.enhancePrompt(userPrompt.trim(), {
        useExamples,
        includeCategories
    });

    // Log the request
    await fileManager.logPromptRequest(
        result.userPrompt,
        result.enhancedPrompt,
        {
            useExamples,
            includeCategories,
            model: result.model,
            usage: result.usage
        }
    );

    res.json({
        success: true,
        data: result
    });
}));

// GET /api/examples
router.get('/examples', asyncHandler(async (req, res) => {
    const { category, random } = req.query;

    if (random === 'true') {
        const example = promptProcessor.getRandomExample();
        return res.json({
            success: true,
            data: example
        });
    }

    if (category) {
        const examples = promptProcessor.getExamplesByCategory(category);
        return res.json({
            success: true,
            data: examples
        });
    }

    const examples = promptProcessor.getExamples();
    res.json({
        success: true,
        data: examples
    });
}));

// POST /api/save-prompt
router.post('/save-prompt', asyncHandler(async (req, res) => {
    const { prompt, filename, filepath } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'prompt is required and must be a string'
        });
    }

    if (!filename || typeof filename !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'filename is required and must be a string'
        });
    }

    if (!filepath || typeof filepath !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'filepath is required and must be a string'
        });
    }

    const result = await fileManager.savePromptToFile(prompt, filename, filepath);

    res.json({
        success: true,
        data: result
    });
}));

// GET /api/session-log
router.get('/session-log', asyncHandler(async (req, res) => {
    const sessionData = await fileManager.getSessionLog();

    res.json({
        success: true,
        data: sessionData
    });
}));

// POST /api/export-session
router.post('/export-session', asyncHandler(async (req, res) => {
    const { exportPath, filename } = req.body;

    if (!exportPath || typeof exportPath !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'exportPath is required and must be a string'
        });
    }

    if (!filename || typeof filename !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'filename is required and must be a string'
        });
    }

    const result = await fileManager.exportSessionLog(exportPath, filename);

    res.json({
        success: true,
        data: result
    });
}));

// GET /api/status
router.get('/status', asyncHandler(async (req, res) => {
    const status = {
        server: 'running',
        timestamp: new Date().toISOString(),
        promptProcessor: promptProcessor.getStatus(),
        fileManager: fileManager.getStatus()
    };

    res.json({
        success: true,
        data: status
    });
}));

// POST /api/generate-filename
router.post('/generate-filename', asyncHandler(async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'prompt is required and must be a string'
        });
    }

    const filename = fileManager.generateFilename(prompt);

    res.json({
        success: true,
        data: { filename }
    });
}));

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('API Error:', error);

    // Check if it's a known API error
    if (error.message.includes('API connection failed')) {
        return res.status(503).json({
            error: 'Service unavailable',
            message: 'Unable to connect to AI service. Please check your API key configuration.'
        });
    }

    if (error.message.includes('ANTHROPIC_API_KEY')) {
        return res.status(500).json({
            error: 'Configuration error',
            message: 'API key not configured. Please set ANTHROPIC_API_KEY in your .env file.'
        });
    }

    // Generic error response
    res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
    });
});

module.exports = router;
