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
        // Initialize prompt processor with system prompt
        await promptProcessor.initialize();
        console.log('✅ Prompt processor initialized');
        
        // Initialize file manager
        await fileManager.initialize();
        console.log('✅ File manager initialized');
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 VEO3-Angel server running on http://localhost:${PORT}`);
            console.log('📝 System prompt loaded and ready');
            console.log('🎬 Ready to enhance VEO3 prompts!');
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
