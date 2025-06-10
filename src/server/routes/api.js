const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const promptProcessor = require('../services/prompt-processor');
const fileManager = require('../services/file-manager');
const anthropicService = require('../services/anthropic');
const openrouterService = require('../services/openrouter');
const providerManager = require('../services/provider-manager');

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/enhance-prompt
router.post('/enhance-prompt', asyncHandler(async (req, res) => {
    const { 
        userPrompt, 
        useExamples = false, 
        includeCategories = true,
        provider = null,
        model = null,
        streaming = false
    } = req.body;

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

    // Handle streaming response
    if (streaming) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        let enhancedPrompt = '';
        
        try {
            const result = await promptProcessor.enhancePrompt(userPrompt.trim(), {
                useExamples,
                includeCategories,
                provider,
                model,
                streaming: true,
                onChunk: (chunk) => {
                    enhancedPrompt += chunk;
                    res.write(`data: ${JSON.stringify({ 
                        type: 'chunk', 
                        content: chunk,
                        timestamp: new Date().toISOString()
                    })}\n\n`);
                }
            });

            // Send final result
            res.write(`data: ${JSON.stringify({ 
                type: 'complete', 
                result: {
                    ...result,
                    enhancedPrompt
                }
            })}\n\n`);

            // Log the request
            await fileManager.logPromptRequest(
                result.userPrompt,
                enhancedPrompt,
                {
                    useExamples,
                    includeCategories,
                    provider: result.provider,
                    model: result.model,
                    usage: result.usage,
                    streaming: true
                }
            );

        } catch (error) {
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                error: error.message 
            })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
        return;
    }

    // Handle non-streaming response
    const result = await promptProcessor.enhancePrompt(userPrompt.trim(), {
        useExamples,
        includeCategories,
        provider,
        model
    });

    // Log the request
    await fileManager.logPromptRequest(
        result.userPrompt,
        result.enhancedPrompt,
        {
            useExamples,
            includeCategories,
            provider: result.provider,
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

// GET /api/configuration-status
router.get('/configuration-status', asyncHandler(async (req, res) => {
    const providerStatus = providerManager.getStatus();
    
    res.json({
        success: true,
        data: {
            configured: providerStatus.configuredProviders.length > 0,
            providerManager: providerStatus,
            legacy: {
                // Keep legacy fields for backward compatibility
                apiKeyConfigured: providerStatus.providers.anthropic?.apiKeyConfigured || false,
                serviceInitialized: providerStatus.providers.anthropic?.initialized || false
            }
        }
    });
}));

// POST /api/configure-api-key (Legacy endpoint for backward compatibility)
router.post('/configure-api-key', asyncHandler(async (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'apiKey is required and must be a non-empty string'
        });
    }

    // Basic validation for Anthropic API key format
    if (!apiKey.startsWith('sk-ant-')) {
        return res.status(400).json({
            error: 'Invalid API key format',
            message: 'Anthropic API keys should start with "sk-ant-"'
        });
    }

    try {
        // Use provider manager to configure Anthropic
        const configResult = await providerManager.configureProvider('anthropic', apiKey);
        
        if (!configResult.success) {
            return res.status(400).json({
                error: 'API key validation failed',
                message: configResult.message
            });
        }

        // If validation successful, save to .env file
        await saveApiKeyToEnv('ANTHROPIC_API_KEY', apiKey);

        res.json({
            success: true,
            data: {
                message: 'API key configured successfully',
                configured: true,
                provider: 'anthropic'
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Configuration failed',
            message: error.message
        });
    }
}));

// POST /api/configure-provider
router.post('/configure-provider', asyncHandler(async (req, res) => {
    const { provider, apiKey, model } = req.body;

    if (!provider || typeof provider !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'provider is required and must be a string'
        });
    }

    if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'apiKey is required and must be a non-empty string'
        });
    }

    // Validate API key format based on provider
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
        return res.status(400).json({
            error: 'Invalid API key format',
            message: 'Anthropic API keys should start with "sk-ant-"'
        });
    }

    if (provider === 'openrouter' && !apiKey.startsWith('sk-or-')) {
        return res.status(400).json({
            error: 'Invalid API key format',
            message: 'OpenRouter API keys should start with "sk-or-"'
        });
    }

    try {
        // Configure the provider
        const configResult = await providerManager.configureProvider(provider, apiKey, { model });
        
        if (!configResult.success) {
            return res.status(400).json({
                error: 'API key validation failed',
                message: configResult.message
            });
        }

        // Save to .env file
        const envKey = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENROUTER_API_KEY';
        await saveApiKeyToEnv(envKey, apiKey);

        res.json({
            success: true,
            data: {
                message: `${provider} configured successfully`,
                configured: true,
                provider: provider
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Configuration failed',
            message: error.message
        });
    }
}));

// POST /api/set-preferred-provider
router.post('/set-preferred-provider', asyncHandler(async (req, res) => {
    const { provider } = req.body;

    if (!provider || typeof provider !== 'string') {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'provider is required and must be a string'
        });
    }

    try {
        providerManager.setPreferredProvider(provider);
        
        res.json({
            success: true,
            data: {
                message: `Preferred provider set to ${provider}`,
                preferredProvider: provider
            }
        });

    } catch (error) {
        res.status(400).json({
            error: 'Failed to set preferred provider',
            message: error.message
        });
    }
}));

// GET /api/providers
router.get('/providers', asyncHandler(async (req, res) => {
    const status = providerManager.getStatus();
    
    res.json({
        success: true,
        data: status
    });
}));

// GET /api/models
router.get('/models', asyncHandler(async (req, res) => {
    const { provider } = req.query;
    const models = providerManager.getAvailableModels(provider);
    
    res.json({
        success: true,
        data: models
    });
}));

// GET /api/openrouter/models - Fetch all available OpenRouter models
router.get('/openrouter/models', asyncHandler(async (req, res) => {
    const { force = false, grouped = false } = req.query;
    
    try {
        const result = await openrouterService.fetchAvailableModels(force === 'true');
        
        if (grouped === 'true') {
            res.json({
                success: result.success,
                data: {
                    grouped: result.grouped,
                    metadata: {
                        cached: result.cached,
                        totalFetched: result.totalFetched,
                        chatCompatible: result.chatCompatible,
                        timestamp: new Date().toISOString()
                    }
                },
                message: result.message
            });
        } else {
            res.json({
                success: result.success,
                data: {
                    models: result.models,
                    metadata: {
                        cached: result.cached,
                        totalFetched: result.totalFetched,
                        chatCompatible: result.chatCompatible,
                        timestamp: new Date().toISOString()
                    }
                },
                message: result.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch models',
            message: error.message
        });
    }
}));

// POST /api/openrouter/models/refresh - Force refresh the models cache
router.post('/openrouter/models/refresh', asyncHandler(async (req, res) => {
    try {
        // Clear cache first
        openrouterService.clearModelsCache();
        
        // Fetch fresh models
        const result = await openrouterService.fetchAvailableModels(true);
        
        res.json({
            success: result.success,
            data: {
                models: result.models,
                grouped: result.grouped,
                metadata: {
                    totalFetched: result.totalFetched,
                    chatCompatible: result.chatCompatible,
                    refreshedAt: new Date().toISOString()
                }
            },
            message: result.success ? 
                `Successfully refreshed ${result.chatCompatible} models` : 
                result.message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to refresh models',
            message: error.message
        });
    }
}));

// GET /api/openrouter/model/:modelId - Get information about a specific model
router.get('/openrouter/model/:modelId(*)', asyncHandler(async (req, res) => {
    const { modelId } = req.params;
    
    if (!modelId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid input',
            message: 'modelId is required'
        });
    }
    
    try {
        const modelInfo = await openrouterService.getModelInfo(modelId);
        
        if (!modelInfo) {
            return res.status(404).json({
                success: false,
                error: 'Model not found',
                message: `Model '${modelId}' not found in available models`
            });
        }
        
        res.json({
            success: true,
            data: modelInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get model info',
            message: error.message
        });
    }
}));

// POST /api/openrouter/set-default-model - Set the default OpenRouter model
router.post('/openrouter/set-default-model', asyncHandler(async (req, res) => {
    const { model } = req.body;
    
    if (!model || typeof model !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Invalid input',
            message: 'model is required and must be a string'
        });
    }
    
    try {
        // Check if model is available
        const isAvailable = await openrouterService.isModelAvailable(model);
        
        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                error: 'Model not available',
                message: `Model '${model}' is not available or not found`
            });
        }
        
        const success = openrouterService.setDefaultModel(model);
        
        if (success) {
            res.json({
                success: true,
                data: {
                    message: `Default model set to '${model}'`,
                    defaultModel: model
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to set default model',
                message: 'Model validation failed'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to set default model',
            message: error.message
        });
    }
}));

// GET /api/openrouter/status - Get OpenRouter service status including model info
router.get('/openrouter/status', asyncHandler(async (req, res) => {
    try {
        const status = openrouterService.getStatus();
        const modelsData = await openrouterService.getDynamicModels();
        
        res.json({
            success: true,
            data: {
                ...status,
                dynamicModels: {
                    available: modelsData.success,
                    count: modelsData.models ? modelsData.models.length : 0,
                    cached: modelsData.cached,
                    lastFetch: openrouterService.modelsCacheTime ? 
                        new Date(openrouterService.modelsCacheTime).toISOString() : null,
                    error: modelsData.error || null
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get OpenRouter status',
            message: error.message
        });
    }
}));

// POST /api/test-providers
router.post('/test-providers', asyncHandler(async (req, res) => {
    const results = await providerManager.testProviders();
    
    res.json({
        success: true,
        data: results
    });
}));

// POST /api/enable-fallback
router.post('/enable-fallback', asyncHandler(async (req, res) => {
    const { enabled = true } = req.body;
    
    providerManager.enableFallbackMode(enabled);
    
    res.json({
        success: true,
        data: {
            message: `Fallback mode ${enabled ? 'enabled' : 'disabled'}`,
            fallbackEnabled: enabled
        }
    });
}));

// Helper function to save API key to .env file
async function saveApiKeyToEnv(keyName, apiKey) {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    // Read existing .env file if it exists
    if (await fs.pathExists(envPath)) {
        envContent = await fs.readFile(envPath, 'utf8');
    }

    // Check if the key already exists
    const lines = envContent.split('\n');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${keyName}=`)) {
            lines[i] = `${keyName}=${apiKey}`;
            found = true;
            break;
        }
    }

    // If not found, add it
    if (!found) {
        if (envContent && !envContent.endsWith('\n')) {
            envContent += '\n';
        }
        envContent += `${keyName}=${apiKey}\n`;
    } else {
        envContent = lines.join('\n');
    }

    // Write back to file
    await fs.writeFile(envPath, envContent, 'utf8');
    console.log(`✅ ${keyName} saved to .env file`);
}

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
