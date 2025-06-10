const Anthropic = require('@anthropic-ai/sdk');
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
        new winston.transports.File({ filename: 'logs/anthropic.log' })
    ]
});

class AnthropicService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            
            if (!apiKey) {
                logger.warn('ANTHROPIC_API_KEY not found - service will be in configuration required state');
                this.isInitialized = false;
                return { configured: false, message: 'API key configuration required' };
            }

            this.client = new Anthropic({
                apiKey: apiKey
            });

            // Test the connection
            await this.testConnection();
            this.isInitialized = true;
            logger.info('Anthropic service initialized successfully');
            return { configured: true, message: 'Service initialized successfully' };

        } catch (error) {
            logger.error('Failed to initialize Anthropic service:', error);
            this.isInitialized = false;
            return { configured: false, message: `Initialization failed: ${error.message}` };
        }
    }

    async testConnection() {
        try {
            // Simple test message to verify API connectivity
            const response = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 50,
                messages: [{
                    role: 'user',
                    content: 'Hello, please respond with "API connection successful"'
                }]
            });

            logger.info('Anthropic API connection test successful');
            return true;
        } catch (error) {
            logger.error('Anthropic API connection test failed:', error);
            throw new Error(`API connection failed: ${error.message}`);
        }
    }

    async enhancePrompt(userPrompt, systemPrompt, useExamples = false) {
        if (!this.isInitialized) {
            throw new Error('Anthropic service not initialized');
        }

        try {
            logger.info('Processing prompt enhancement request', {
                userPromptLength: userPrompt.length,
                useExamples
            });

            const messages = [{
                role: 'user',
                content: `Please enhance this basic video idea into a detailed VEO3 prompt using the 10-category framework: "${userPrompt}"`
            }];

            const response = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                system: systemPrompt,
                messages: messages,
                temperature: 0.7
            });

            const enhancedPrompt = response.content[0].text;

            logger.info('Prompt enhancement completed', {
                inputLength: userPrompt.length,
                outputLength: enhancedPrompt.length
            });

            return {
                success: true,
                enhancedPrompt,
                usage: response.usage,
                model: 'claude-3-5-sonnet-20241022'
            };

        } catch (error) {
            logger.error('Error enhancing prompt:', error);
            throw new Error(`Failed to enhance prompt: ${error.message}`);
        }
    }

    async analyzePromptCategories(userPrompt, systemPrompt) {
        if (!this.isInitialized) {
            throw new Error('Anthropic service not initialized');
        }

        try {
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

            const response = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: analysisPrompt
                }],
                temperature: 0.3
            });

            const analysisText = response.content[0].text;
            
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
                usage: response.usage
            };

        } catch (error) {
            logger.error('Error analyzing prompt categories:', error);
            throw new Error(`Failed to analyze categories: ${error.message}`);
        }
    }

    async reconfigure(apiKey) {
        try {
            if (!apiKey || typeof apiKey !== 'string') {
                throw new Error('Valid API key is required');
            }

            // Update environment variable
            process.env.ANTHROPIC_API_KEY = apiKey;

            // Create new client
            this.client = new Anthropic({
                apiKey: apiKey
            });

            // Test the connection
            await this.testConnection();
            this.isInitialized = true;
            logger.info('Anthropic service reconfigured successfully');
            
            return { success: true, message: 'Service configured successfully' };

        } catch (error) {
            logger.error('Failed to reconfigure Anthropic service:', error);
            this.isInitialized = false;
            return { success: false, message: `Configuration failed: ${error.message}` };
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
            model: 'claude-3-5-sonnet-20241022'
        };
    }
}

// Export singleton instance
module.exports = new AnthropicService();
