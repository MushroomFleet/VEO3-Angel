const OpenAI = require('openai');
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
        new winston.transports.File({ filename: 'logs/openrouter.log' })
    ]
});

class OpenRouterService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.defaultModel = 'anthropic/claude-3-5-sonnet-20241022';
        this.models = [
            'anthropic/claude-3-5-sonnet-20241022',
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
            'meta-llama/llama-3.1-70b-instruct',
            'google/gemini-pro-1.5'
        ];
        this.availableModels = [];
        this.modelsCacheTime = null;
        this.modelsCacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds
        this.modelsGrouped = {};
    }

    async initialize() {
        try {
            const apiKey = process.env.OPENROUTER_API_KEY;
            
            if (!apiKey) {
                logger.warn('OPENROUTER_API_KEY not found - service will be in configuration required state');
                this.isInitialized = false;
                return { configured: false, message: 'API key configuration required' };
            }

            this.client = new OpenAI({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: apiKey,
                defaultHeaders: {
                    'HTTP-Referer': 'https://veo3-angel.app',
                    'X-Title': 'VEO3-Angel'
                }
            });

            // Test the connection
            await this.testConnection();
            this.isInitialized = true;
            logger.info('OpenRouter service initialized successfully');
            return { configured: true, message: 'Service initialized successfully' };

        } catch (error) {
            logger.error('Failed to initialize OpenRouter service:', error);
            this.isInitialized = false;
            return { configured: false, message: `Initialization failed: ${error.message}` };
        }
    }

    async testConnection() {
        try {
            // Simple test message to verify API connectivity
            const response = await this.client.chat.completions.create({
                model: this.defaultModel,
                max_tokens: 50,
                messages: [{
                    role: 'user',
                    content: 'Hello, please respond with "API connection successful"'
                }]
            });

            logger.info('OpenRouter API connection test successful');
            return true;
        } catch (error) {
            logger.error('OpenRouter API connection test failed:', error);
            throw new Error(`API connection failed: ${error.message}`);
        }
    }

    async enhancePrompt(userPrompt, systemPrompt, useExamples = false, model = null) {
        if (!this.isInitialized) {
            throw new Error('OpenRouter service not initialized');
        }

        try {
            logger.info('Processing prompt enhancement request', {
                userPromptLength: userPrompt.length,
                useExamples,
                model: model || this.defaultModel
            });

            const selectedModel = model || this.defaultModel;
            const messages = [{
                role: 'user',
                content: `Please enhance this basic video idea into a detailed VEO3 prompt using the 10-category framework: "${userPrompt}"`
            }];

            const response = await this.client.chat.completions.create({
                model: selectedModel,
                max_tokens: 4000,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    ...messages
                ],
                temperature: 0.7
            });

            const enhancedPrompt = response.choices[0].message.content;

            logger.info('Prompt enhancement completed', {
                inputLength: userPrompt.length,
                outputLength: enhancedPrompt.length,
                model: selectedModel
            });

            return {
                success: true,
                enhancedPrompt,
                usage: response.usage,
                model: selectedModel,
                provider: 'openrouter'
            };

        } catch (error) {
            logger.error('Error enhancing prompt:', error);
            throw new Error(`Failed to enhance prompt: ${error.message}`);
        }
    }

    async enhancePromptStreaming(userPrompt, systemPrompt, useExamples = false, model = null, onChunk = null) {
        if (!this.isInitialized) {
            throw new Error('OpenRouter service not initialized');
        }

        try {
            logger.info('Processing streaming prompt enhancement request', {
                userPromptLength: userPrompt.length,
                useExamples,
                model: model || this.defaultModel
            });

            const selectedModel = model || this.defaultModel;
            const messages = [{
                role: 'user',
                content: `Please enhance this basic video idea into a detailed VEO3 prompt using the 10-category framework: "${userPrompt}"`
            }];

            const stream = await this.client.chat.completions.create({
                model: selectedModel,
                max_tokens: 4000,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    ...messages
                ],
                temperature: 0.7,
                stream: true
            });

            let enhancedPrompt = '';
            let usage = null;

            for await (const chunk of stream) {
                if (chunk.choices[0]?.delta?.content) {
                    const content = chunk.choices[0].delta.content;
                    enhancedPrompt += content;
                    
                    // Call the chunk callback if provided
                    if (onChunk) {
                        onChunk(content);
                    }
                }

                // Capture usage data from the final chunk
                if (chunk.usage) {
                    usage = chunk.usage;
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
                usage,
                model: selectedModel,
                provider: 'openrouter'
            };

        } catch (error) {
            logger.error('Error in streaming prompt enhancement:', error);
            throw new Error(`Failed to enhance prompt: ${error.message}`);
        }
    }

    async analyzePromptCategories(userPrompt, systemPrompt, model = null) {
        if (!this.isInitialized) {
            throw new Error('OpenRouter service not initialized');
        }

        try {
            const selectedModel = model || this.defaultModel;
            const analysisPrompt = `
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

            const response = await this.client.chat.completions.create({
                model: selectedModel,
                max_tokens: 2000,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ],
                temperature: 0.3
            });

            const analysisText = response.choices[0].message.content;
            
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
                usage: response.usage,
                model: selectedModel,
                provider: 'openrouter'
            };

        } catch (error) {
            logger.error('Error analyzing prompt categories:', error);
            throw new Error(`Failed to analyze categories: ${error.message}`);
        }
    }

    async reconfigure(apiKey, selectedModel = null) {
        try {
            if (!apiKey || typeof apiKey !== 'string') {
                throw new Error('Valid API key is required');
            }

            // Update environment variable
            process.env.OPENROUTER_API_KEY = apiKey;

            // Create new client
            this.client = new OpenAI({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: apiKey,
                defaultHeaders: {
                    'HTTP-Referer': 'https://veo3-angel.app',
                    'X-Title': 'VEO3-Angel'
                }
            });

            // Update default model if provided
            if (selectedModel && this.models.includes(selectedModel)) {
                this.defaultModel = selectedModel;
            }

            // Test the connection
            await this.testConnection();
            this.isInitialized = true;
            logger.info('OpenRouter service reconfigured successfully');
            
            return { success: true, message: 'Service configured successfully' };

        } catch (error) {
            logger.error('Failed to reconfigure OpenRouter service:', error);
            this.isInitialized = false;
            return { success: false, message: `Configuration failed: ${error.message}` };
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            apiKeyConfigured: !!process.env.OPENROUTER_API_KEY,
            defaultModel: this.defaultModel,
            availableModels: this.models,
            provider: 'openrouter'
        };
    }

    async fetchAvailableModels(force = false) {
        // Check if we have cached models and they're still fresh
        if (!force && this.modelsCacheTime && 
            (Date.now() - this.modelsCacheTime) < this.modelsCacheDuration &&
            this.availableModels.length > 0) {
            logger.info('Using cached models data');
            return {
                success: true,
                models: this.availableModels,
                grouped: this.modelsGrouped,
                cached: true
            };
        }

        if (!this.isInitialized) {
            logger.warn('Cannot fetch models - service not initialized');
            return {
                success: false,
                message: 'Service not initialized',
                models: this.models, // Fallback to hardcoded models
                grouped: this.groupModelsByProvider(this.models.map(id => ({ id })))
            };
        }

        try {
            logger.info('Fetching available models from OpenRouter API');
            
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://veo3-angel.app',
                    'X-Title': 'VEO3-Angel',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid response format from OpenRouter API');
            }

            // Filter models to only include those that support chat completions
            const chatModels = data.data.filter(model => {
                // Check if model supports chat completions and is not deprecated
                return model.id && 
                       !model.id.includes('instruct:') && // Skip instruct variants
                       !model.description?.toLowerCase().includes('deprecated') &&
                       model.context_length > 0;
            });

            // Sort by popularity/provider preference
            const sortedModels = this.sortModelsByPreference(chatModels);
            
            // Update cache
            this.availableModels = sortedModels;
            this.modelsGrouped = this.groupModelsByProvider(sortedModels);
            this.modelsCacheTime = Date.now();

            logger.info(`Successfully fetched ${sortedModels.length} available models`);
            
            return {
                success: true,
                models: sortedModels,
                grouped: this.modelsGrouped,
                cached: false,
                totalFetched: data.data.length,
                chatCompatible: sortedModels.length
            };

        } catch (error) {
            logger.error('Failed to fetch available models:', error);
            
            // Fallback to hardcoded models
            const fallbackGrouped = this.groupModelsByProvider(
                this.models.map(id => ({ id, name: id.split('/').pop(), fallback: true }))
            );
            
            return {
                success: false,
                message: `Failed to fetch models: ${error.message}`,
                models: this.models.map(id => ({ id, name: id.split('/').pop(), fallback: true })),
                grouped: fallbackGrouped,
                error: error.message
            };
        }
    }

    sortModelsByPreference(models) {
        // Define provider preference order
        const providerOrder = {
            'anthropic': 1,
            'openai': 2,
            'google': 3,
            'meta-llama': 4,
            'mistral': 5,
            'cohere': 6
        };

        return models.sort((a, b) => {
            const providerA = a.id.split('/')[0];
            const providerB = b.id.split('/')[0];
            
            const orderA = providerOrder[providerA] || 99;
            const orderB = providerOrder[providerB] || 99;
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            
            // Within same provider, sort by name
            return a.id.localeCompare(b.id);
        });
    }

    groupModelsByProvider(models) {
        const grouped = {};
        
        models.forEach(model => {
            const provider = model.id.split('/')[0];
            
            if (!grouped[provider]) {
                grouped[provider] = {
                    name: this.getProviderDisplayName(provider),
                    models: []
                };
            }
            
            grouped[provider].models.push({
                id: model.id,
                name: model.name || model.id.split('/').pop(),
                description: model.description || '',
                contextLength: model.context_length || 0,
                pricing: model.pricing || null,
                fallback: model.fallback || false
            });
        });
        
        return grouped;
    }

    getProviderDisplayName(provider) {
        const providerNames = {
            'anthropic': 'Anthropic',
            'openai': 'OpenAI',
            'google': 'Google',
            'meta-llama': 'Meta (Llama)',
            'mistral': 'Mistral AI',
            'cohere': 'Cohere',
            'huggingface': 'Hugging Face',
            'microsoft': 'Microsoft',
            'perplexity': 'Perplexity',
            'together': 'Together AI'
        };
        
        return providerNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
    }

    async getModelInfo(modelId) {
        const models = await this.fetchAvailableModels();
        
        if (models.success) {
            return models.models.find(model => model.id === modelId) || null;
        }
        
        return null;
    }

    async isModelAvailable(modelId) {
        const models = await this.fetchAvailableModels();
        
        if (models.success) {
            return models.models.some(model => model.id === modelId);
        }
        
        // Fallback to hardcoded list
        return this.models.includes(modelId);
    }

    getAvailableModels() {
        // Return cached models if available, otherwise return hardcoded list
        if (this.availableModels.length > 0) {
            return this.availableModels.map(model => model.id);
        }
        return this.models;
    }

    async getDynamicModels() {
        return await this.fetchAvailableModels();
    }

    setDefaultModel(model) {
        // Check both dynamic and hardcoded models
        const isAvailable = this.availableModels.some(m => m.id === model) || 
                           this.models.includes(model);
        
        if (isAvailable) {
            this.defaultModel = model;
            logger.info(`Default model changed to: ${model}`);
            return true;
        }
        return false;
    }

    clearModelsCache() {
        this.availableModels = [];
        this.modelsGrouped = {};
        this.modelsCacheTime = null;
        logger.info('Models cache cleared');
    }
}

// Export singleton instance
module.exports = new OpenRouterService();
