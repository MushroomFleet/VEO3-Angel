const fs = require('fs-extra');
const path = require('path');
const anthropicService = require('./anthropic');
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
        new winston.transports.File({ filename: 'logs/prompt-processor.log' })
    ]
});

class PromptProcessor {
    constructor() {
        this.systemPrompt = null;
        this.examples = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Load system prompt
            await this.loadSystemPrompt();
            
            // Load examples
            await this.loadExamples();
            
            // Initialize Anthropic service
            await anthropicService.initialize();
            
            this.isInitialized = true;
            logger.info('Prompt processor initialized successfully');
            
        } catch (error) {
            logger.error('Failed to initialize prompt processor:', error);
            throw error;
        }
    }

    async loadSystemPrompt() {
        try {
            const systemPromptPath = path.join(__dirname, '../../../assets/veo3-assistant-system-prompt.md');
            
            if (!await fs.pathExists(systemPromptPath)) {
                throw new Error(`System prompt file not found at: ${systemPromptPath}`);
            }

            this.systemPrompt = await fs.readFile(systemPromptPath, 'utf8');
            logger.info('System prompt loaded successfully', {
                length: this.systemPrompt.length,
                path: systemPromptPath
            });
            
        } catch (error) {
            logger.error('Failed to load system prompt:', error);
            throw error;
        }
    }

    async loadExamples() {
        try {
            const examplesPath = path.join(__dirname, '../../../assets/prompt-examples.md');
            
            if (await fs.pathExists(examplesPath)) {
                const examplesContent = await fs.readFile(examplesPath, 'utf8');
                this.examples = this.parseExamples(examplesContent);
                logger.info('Examples loaded successfully', {
                    exampleCount: this.examples.length,
                    path: examplesPath
                });
            } else {
                logger.warn('Examples file not found, continuing without examples');
                this.examples = [];
            }
            
        } catch (error) {
            logger.warn('Failed to load examples, continuing without:', error);
            this.examples = [];
        }
    }

    parseExamples(content) {
        const examples = [];
        
        try {
            // Split by sections and extract prompts
            const sections = content.split('##');
            
            for (const section of sections) {
                if (section.includes('**Prompt:**')) {
                    const promptMatches = section.match(/\*\*Prompt:\*\*\s*(.*?)(?=\n\n|\n\*\*|$)/gs);
                    
                    if (promptMatches) {
                        for (const match of promptMatches) {
                            const prompt = match.replace(/\*\*Prompt:\*\*\s*/, '').trim();
                            if (prompt && prompt.length > 20) {
                                examples.push({
                                    content: prompt,
                                    section: section.split('\n')[0].trim()
                                });
                            }
                        }
                    }
                }
            }
            
            logger.info(`Parsed ${examples.length} examples from content`);
            return examples;
            
        } catch (error) {
            logger.error('Error parsing examples:', error);
            return [];
        }
    }

    async enhancePrompt(userPrompt, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Prompt processor not initialized');
        }

        try {
            const { useExamples = false, includeCategories = true } = options;
            
            logger.info('Processing prompt enhancement', {
                userPromptLength: userPrompt.length,
                useExamples,
                includeCategories
            });

            let enhancedSystemPrompt = this.systemPrompt;
            
            // Add examples context if requested
            if (useExamples && this.examples.length > 0) {
                const exampleContext = this.buildExampleContext();
                enhancedSystemPrompt += `\n\n## Example Prompts for Reference:\n${exampleContext}`;
            }

            const result = {
                userPrompt,
                enhancedPrompt: null,
                categories: null,
                timestamp: new Date().toISOString(),
                options
            };

            // Get category breakdown if requested
            if (includeCategories) {
                const categoryAnalysis = await anthropicService.analyzePromptCategories(
                    userPrompt, 
                    enhancedSystemPrompt
                );
                result.categories = categoryAnalysis.categories;
            }

            // Get enhanced prompt
            const enhancement = await anthropicService.enhancePrompt(
                userPrompt,
                enhancedSystemPrompt,
                useExamples
            );
            
            result.enhancedPrompt = enhancement.enhancedPrompt;
            result.usage = enhancement.usage;
            result.model = enhancement.model;

            logger.info('Prompt enhancement completed successfully', {
                inputLength: userPrompt.length,
                outputLength: result.enhancedPrompt.length,
                categoriesIncluded: !!result.categories
            });

            return result;

        } catch (error) {
            logger.error('Error processing prompt enhancement:', error);
            throw error;
        }
    }

    buildExampleContext() {
        if (!this.examples || this.examples.length === 0) {
            return '';
        }

        // Get a diverse sample of examples
        const sampleSize = Math.min(5, this.examples.length);
        const sampledExamples = this.examples
            .sort(() => 0.5 - Math.random())
            .slice(0, sampleSize);

        return sampledExamples
            .map((example, index) => `### Example ${index + 1}:\n${example.content}`)
            .join('\n\n');
    }

    getExamplesByCategory(category) {
        if (!this.examples) return [];
        
        return this.examples.filter(example => 
            example.section.toLowerCase().includes(category.toLowerCase())
        );
    }

    getRandomExample() {
        if (!this.examples || this.examples.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * this.examples.length);
        return this.examples[randomIndex];
    }

    getSystemPrompt() {
        return this.systemPrompt;
    }

    getExamples() {
        return this.examples;
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            systemPromptLoaded: !!this.systemPrompt,
            examplesLoaded: !!this.examples,
            exampleCount: this.examples ? this.examples.length : 0,
            anthropicStatus: anthropicService.getStatus()
        };
    }
}

// Export singleton instance
module.exports = new PromptProcessor();
