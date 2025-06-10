const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import services
const promptProcessor = require('./services/prompt-processor');
const fileManager = require('./services/file-manager');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from renderer directory
app.use(express.static(path.join(__dirname, '../renderer')));

// API routes
app.use('/api', apiRoutes);

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../renderer/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// Initialize services
async function initializeServer() {
    try {
        // Initialize file manager first (this should always work)
        await fileManager.initialize();
        console.log('✅ File manager initialized');
        
        // Initialize prompt processor (this may fail gracefully if API key is missing)
        const promptResult = await promptProcessor.initialize();
        if (promptResult && !promptResult.configured) {
            console.log('⚠️ Prompt processor partially initialized - API key configuration required');
        } else {
            console.log('✅ Prompt processor initialized');
        }
        
        // Start server regardless of API configuration status
        app.listen(PORT, () => {
            console.log(`🚀 VEO3-Angel server running on http://localhost:${PORT}`);
            
            if (promptResult && !promptResult.configured) {
                console.log('⚠️ API key configuration required - some features will be unavailable');
                console.log('🔧 Please configure your Anthropic API key to enable prompt enhancement');
            } else {
                console.log('📝 System prompt loaded and ready');
                console.log('🎬 Ready to enhance VEO3 prompts!');
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Server shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Server shutting down gracefully');
    process.exit(0);
});

// Start the server
initializeServer();

module.exports = app;
