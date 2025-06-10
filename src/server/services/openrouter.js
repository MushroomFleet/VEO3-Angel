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

    getAvailableModels() {
        return this.models;
    }

    setDefaultModel(model) {
        if (this.models.includes(model)) {
            this.defaultModel = model;
            logger.info(`Default model changed to: ${model}`);
            return true;
        }
        return false;
    }
}

// Export singleton instance
module.exports = new OpenRouterService();
