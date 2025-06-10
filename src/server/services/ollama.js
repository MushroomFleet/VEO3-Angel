const { Ollama } = require('ollama');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/ollama.log' })
    ]
});

class OllamaService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.defaultModel = 'llama3.2:1b';
        this.host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
        this.availableModels = [];
        this.modelsCacheTime = null;
        this.modelsCacheDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    async initialize() {
        try {
            logger.info('Initializing Ollama service...');
            
            this.client = new Ollama({
                host: this.host
            });

            // Test the connection and get available models
            await this.testConnection();
            
            // Load available models
            await this.fetchAvailableModels();
            
            this.isInitialized = true;
            logger.info('Ollama service initialized successfully');
            return { 
                configured: true, 
                message: `Ollama service connected successfully at ${this.host}`,
                modelsCount: this.availableModels.length
            };

        } catch (error) {
            logger.error('Failed to initialize Ollama service:', error);
            this.isInitialized = false;
            
            // Provide helpful error messages
            let message = 'Ollama service not available';
            if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                message = 'Ollama is not running. Please start Ollama and ensure it\'s accessible at ' + this.host;
            } else if (error.code === 'ENOTFOUND') {
                message = 'Cannot connect to Ollama host: ' + this.host;
            } else {
                message = `Ollama connection failed: ${error.message}`;
            }
            
            return { configured: false, message };
        }
    }

    async testConnection() {
        try {
            // Test basic connectivity by listing models
            const models = await this.client.list();
            logger.info('Ollama connection test successful');
            return true;
        } catch (error) {
            logger.error('Ollama connection test failed:', error);
            throw new Error(`Connection failed: ${error.message}`);
        }
    }

    async fetchAvailableModels(force = false) {
        // Check if we have cached models and they're still fresh
        if (!force && this.modelsCacheTime && 
            (Date.now() - this.modelsCacheTime) < this.modelsCacheDuration &&
            this.availableModels.length > 0) {
            logger.info('Using cached Ollama models data');
            return {
                success: true,
                models: this.availableModels,
                cached: true
            };
        }

        if (!this.isInitialized && !this.client) {
            logger.warn('Cannot fetch models - Ollama service not initialized');
            return {
                success: false,
                message: 'Service not initialized',
                models: []
            };
        }

        try {
            logger.info('Fetching available models from Ollama');
            
            const response = await this.client.list();
            
            if (!response.models || !Array.isArray(response.models)) {
                throw new Error('Invalid response format from Ollama');
            }

            // Format models for consistency with other providers
            const formattedModels = response.models.map(model => ({
                id: model.name,
                name: model.name,
                size: model.size,
                modified_at: model.modified_at,
                digest: model.digest,
                details: model.details || {}
            }));

            // Update cache
            this.availableModels = formattedModels;
            this.modelsCacheTime = Date.now();

            // Set default model if none set or current default not available
            if (formattedModels.length > 0) {
                const hasDefault = formattedModels.some(model => model.id === this.defaultModel);
                if (!hasDefault) {
                    // Prefer llama models, then any available model
                    const llamaModel = formattedModels.find(model => 
                        model.id.toLowerCase().includes('llama'));
                    this.defaultModel = llamaModel ? llamaModel.id : formattedModels[0].id;
                    logger.info(`Default model set to: ${this.defaultModel}`);
                }
            }

            logger.info(`Successfully fetched ${formattedModels.length} available models from Ollama`);
            
            return {
                success: true,
                models: formattedModels,
                cached: false,
                totalModels: formattedModels.length
            };

        } catch (error) {
            logger.error('Failed to fetch available models from Ollama:', error);
            
            return {
                success: false,
                message: `Failed to fetch models: ${error.message}`,
                models: [],
                error: error.message
            };
        }
    }

    async enhancePrompt(userPrompt, systemPrompt, useExamples = false, model = null) {
        if (!this.isInitialized) {
            throw new Error('Ollama service not initialized');
        }

        try {
            logger.info('Processing prompt enhancement request', {
                userPromptLength: userPrompt.length,
                useExamples,
                model: model || this.defaultModel
            });

            const selectedModel = model || this.defaultModel;
            
            // Check if model is available
            if (!await this.isModelAvailable(selectedModel)) {
                throw new Error(`Model '${selectedModel}' is not available. Please pull the model first.`);
            }

            const response = await this.client.generate({
                model: selectedModel,
                prompt: `${systemPrompt}\n\nPlease enhance this basic video idea into a detailed VEO3 prompt using the 10-category framework: "${userPrompt}"`,
                stream: false
            });

            const enhancedPrompt = response.response;

            logger.info('Prompt enhancement completed', {
                inputLength: userPrompt.length,
                outputLength: enhancedPrompt.length,
                model: selectedModel
            });

            return {
                success: true,
                enhancedPrompt,
                model: selectedModel,
                provider: 'ollama',
                // Ollama doesn't provide detailed usage stats like cloud providers
                usage: {
                    prompt_tokens: Math.floor(userPrompt.length / 4), // Rough estimate
                    completion_tokens: Math.floor(enhancedPrompt.length / 4),
                    total_time: response.total_duration || 0,
                    load_duration: response.load_duration || 0,
                    prompt_eval_duration: response.prompt_eval_duration || 0,
                    eval_duration: response.eval_duration || 0
                }
            };

        } catch (error) {
            logger.error('Error enhancing prompt:', error);
            throw new Error(`Failed to enhance prompt: ${error.message}`);
        }
    }

    async enhancePromptStreaming(userPrompt, systemPrompt, useExamples = false, model = null, onChunk = null) {
        if (!this.isInitialized) {
            throw new Error('Ollama service not initialized');
        }

        try {
            logger.info('Processing streaming prompt enhancement request', {
                userPromptLength: userPrompt.length,
                useExamples,
                model: model || this.defaultModel
            });

            const selectedModel = model || this.defaultModel;
            
            // Check if model is available
            if (!await this.isModelAvailable(selectedModel)) {
                throw new Error(`Model '${selectedModel}' is not available. Please pull the model first.`);
            }

            const stream = await this.client.generate({
                model: selectedModel,
                prompt: `${systemPrompt}\n\nPlease enhance this basic video idea into a detailed VEO3 prompt using the 10-category framework: "${userPrompt}"`,
                stream: true
            });

            let enhancedPrompt = '';
            let finalResponse = null;

            for await (const chunk of stream) {
                if (chunk.response) {
                    const content = chunk.response;
                    enhancedPrompt += content;
                    
                    // Call the chunk callback if provided
                    if (onChunk) {
                        onChunk(content);
                    }
                }

                // Capture final response data
                if (chunk.done) {
                    finalResponse = chunk;
                }
            }

            logger.info('Streaming prompt enhancement completed', {
                inputLength: userPrompt.length,
                outputLength: enhancedPrompt.length,
                model: selectedModel
            });

            return {
                success: true,
                enhancedPrompt,
                model: selectedModel,
                provider: 'ollama',
                usage: {
                    prompt_tokens: Math.floor(userPrompt.length / 4),
                    completion_tokens: Math.floor(enhancedPrompt.length / 4),
                    total_time: finalResponse?.total_duration || 0,
                    load_duration: finalResponse?.load_duration || 0,
                    prompt_eval_duration: finalResponse?.prompt_eval_duration || 0,
                    eval_duration: finalResponse?.eval_duration || 0
                }
            };

        } catch (error) {
            logger.error('Error in streaming prompt enhancement:', error);
            throw new Error(`Failed to enhance prompt: ${error.message}`);
        }
    }

    async analyzePromptCategories(userPrompt, systemPrompt, model = null) {
        if (!this.isInitialized) {
            throw new Error('Ollama service not initialized');
        }

        try {
            const selectedModel = model || this.defaultModel;
            
            // Check if model is available
            if (!await this.isModelAvailable(selectedModel)) {
                throw new Error(`Model '${selectedModel}' is not available. Please pull the model first.`);
            }

            const analysisPrompt = `
${systemPrompt}

Please analyze this video idea and break it down into the 10 VEO3 categories. Return a JSON object with each category and your analysis:

Categories:
1. Scene Description
2. Visual Style  
3. Camera Movement
4. Main Subject
5. Background Setting
6. Lighting/Mood
7. Audio Cue
8. Color Palette
9. Dialogue/Background Noise
10. Subtitles and Language

User's idea: "${userPrompt}"

Return only valid JSON in this format:
{
  "sceneDescription": "analysis...",
  "visualStyle": "analysis...",
  "cameraMovement": "analysis...",
  "mainSubject": "analysis...",
  "backgroundSetting": "analysis...",
  "lightingMood": "analysis...",
  "audioCue": "analysis...",
  "colorPalette": "analysis...",
  "dialogue": "analysis...",
  "subtitles": "analysis..."
}`;

            const response = await this.client.generate({
                model: selectedModel,
                prompt: analysisPrompt,
                stream: false
            });

            const analysisText = response.response;
            
            // Try to parse JSON from response
            let categories;
            try {
                // Extract JSON from response (in case there's extra text)
                const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    categories = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (parseError) {
                logger.warn('Failed to parse category analysis as JSON, returning raw text');
                categories = { error: 'Failed to parse analysis', rawResponse: analysisText };
            }

            return {
                success: true,
                categories,
                model: selectedModel,
                provider: 'ollama',
                usage: {
                    prompt_tokens: Math.floor(analysisPrompt.length / 4),
                    completion_tokens: Math.floor(analysisText.length / 4),
                    total_time: response.total_duration || 0
                }
            };

        } catch (error) {
            logger.error('Error analyzing prompt categories:', error);
            throw new Error(`Failed to analyze categories: ${error.message}`);
        }
    }

    async pullModel(modelName) {
        if (!this.client) {
            throw new Error('Ollama service not initialized');
        }

        try {
            logger.info(`Pulling model: ${modelName}`);
            
            const stream = await this.client.pull({
                model: modelName,
                stream: true
            });

            for await (const chunk of stream) {
                if (chunk.status) {
                    logger.info(`Pull progress: ${chunk.status}`);
                }
            }

            // Refresh available models after pulling
            await this.fetchAvailableModels(true);
            
            logger.info(`Successfully pulled model: ${modelName}`);
            return {
                success: true,
                message: `Model '${modelName}' pulled successfully`
            };

        } catch (error) {
            logger.error(`Failed to pull model ${modelName}:`, error);
            throw new Error(`Failed to pull model: ${error.message}`);
        }
    }

    async deleteModel(modelName) {
        if (!this.client) {
            throw new Error('Ollama service not initialized');
        }

        try {
            logger.info(`Deleting model: ${modelName}`);
            
            await this.client.delete({
                model: modelName
            });

            // Refresh available models after deletion
            await this.fetchAvailableModels(true);
            
            logger.info(`Successfully deleted model: ${modelName}`);
            return {
                success: true,
                message: `Model '${modelName}' deleted successfully`
            };

        } catch (error) {
            logger.error(`Failed to delete model ${modelName}:`, error);
            throw new Error(`Failed to delete model: ${error.message}`);
        }
    }

    async isModelAvailable(modelName) {
        const models = await this.fetchAvailableModels();
        
        if (models.success) {
            return models.models.some(model => model.id === modelName);
        }
        
        return false;
    }

    async reconfigure(host = null) {
        try {
            if (host && typeof host === 'string') {
                this.host = host;
                process.env.OLLAMA_HOST = host;
            }

            // Create new client with updated host
            this.client = new Ollama({
                host: this.host
            });

            // Test the connection
            await this.testConnection();
            
            // Reload available models
            await this.fetchAvailableModels(true);
            
            this.isInitialized = true;
            logger.info('Ollama service reconfigured successfully');
            
            return { 
                success: true, 
                message: `Ollama configured successfully at ${this.host}`,
                modelsCount: this.availableModels.length
            };

        } catch (error) {
            logger.error('Failed to reconfigure Ollama service:', error);
            this.isInitialized = false;
            return { success: false, message: `Configuration failed: ${error.message}` };
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            host: this.host,
            defaultModel: this.defaultModel,
            availableModels: this.availableModels.map(model => model.id),
            modelsCount: this.availableModels.length,
            provider: 'ollama',
            lastModelsFetch: this.modelsCacheTime ? new Date(this.modelsCacheTime).toISOString() : null
        };
    }

    getAvailableModels() {
        return this.availableModels.map(model => model.id);
    }

    setDefaultModel(model) {
        if (this.availableModels.some(m => m.id === model)) {
            this.defaultModel = model;
            logger.info(`Default model changed to: ${model}`);
            return true;
        }
        return false;
    }

    clearModelsCache() {
        this.availableModels = [];
        this.modelsCacheTime = null;
        logger.info('Ollama models cache cleared');
    }

    // Get popular/recommended models for download
    getRecommendedModels() {
        return [
            {
                id: 'llama3.2:1b',
                name: 'Llama 3.2 1B',
                description: 'Fast and lightweight model, good for quick responses',
                size: '~1.3GB'
            },
            {
                id: 'llama3.2:3b',
                name: 'Llama 3.2 3B',
                description: 'Balanced performance and speed',
                size: '~2GB'
            },
            {
                id: 'llama3.1:8b',
                name: 'Llama 3.1 8B',
                description: 'High quality responses, requires more resources',
                size: '~4.7GB'
            },
            {
                id: 'phi3:mini',
                name: 'Phi-3 Mini',
                description: 'Microsoft\'s compact model, efficient for text tasks',
                size: '~2.3GB'
            },
            {
                id: 'gemma2:2b',
                name: 'Gemma 2 2B',
                description: 'Google\'s efficient model for creative tasks',
                size: '~1.6GB'
            }
        ];
    }
}

// Export singleton instance
module.exports = new OllamaService();
