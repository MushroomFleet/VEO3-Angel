const fs = require('fs-extra');
const path = require('path');
const providerManager = require('./provider-manager');
const winston = require('winston');

// Helper function to get the correct assets path for both dev and production
function getAssetsPath() {
    // In development, assets are in the project root
    // In production (packaged), we need to check multiple possible locations
    
    const isDev = process.env.NODE_ENV === 'development';
    const isElectronApp = !!process.versions.electron;
    
    if (isDev) {
        // Development mode - assets are relative to project root
        return path.join(__dirname, '../../../assets');
    }
    
    // In packaged electron app, try multiple locations in order of likelihood
    const fallbackPaths = [
        // extraResources location (most likely with our config)
        process.resourcesPath ? path.join(process.resourcesPath, 'assets') : null,
        
        // Standard electron locations
        path.join(process.cwd(), 'assets'),
        path.join(__dirname, '../../../assets'),
        
        // Near executable
        path.join(path.dirname(process.execPath), 'resources', 'assets'),
        path.join(path.dirname(process.execPath), 'assets'),
        
        // App.asar locations (if app is packaged in asar)
        isElectronApp && process.resourcesPath ? path.join(process.resourcesPath, 'app.asar', 'assets') : null,
        
        // Last resort - current working directory
        path.join(process.cwd(), 'resources', 'assets')
    ].filter(Boolean); // Remove null entries
    
    for (const fallbackPath of fallbackPaths) {
        if (fs.existsSync(fallbackPath)) {
            return fallbackPath;
        }
    }
    
    // If nothing works, return the development path and let it fail with a clear error
    return path.join(__dirname, '../../../assets');
}

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
            
            // Initialize provider manager (handles both Anthropic and OpenRouter)
            const providerResult = await providerManager.initialize();
            
            this.isInitialized = true;
            logger.info('Prompt processor initialized successfully');
            
            // Return the configuration status
            return providerResult;
            
        } catch (error) {
            logger.error('Failed to initialize prompt processor:', error);
            throw error;
        }
    }

    async loadSystemPrompt() {
        try {
            const assetsPath = getAssetsPath();
            const systemPromptPath = path.join(assetsPath, 'veo3-assistant-system-prompt.md');
            
            logger.info('Attempting to load system prompt', {
                assetsPath,
                systemPromptPath,
                exists: await fs.pathExists(systemPromptPath)
            });
            
            if (!await fs.pathExists(systemPromptPath)) {
                // Log additional debugging info
                logger.error('System prompt file not found. Debugging info:', {
                    systemPromptPath,
                    assetsPath,
                    assetsExists: await fs.pathExists(assetsPath),
                    cwd: process.cwd(),
                    execPath: process.execPath,
                    resourcesPath: process.resourcesPath,
                    isDev: process.env.NODE_ENV === 'development',
                    isElectron: !!process.versions.electron
                });
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
            // Load default examples from the legacy file if it exists
            const assetsPath = getAssetsPath();
            const legacyExamplesPath = path.join(assetsPath, 'prompt-examples.md');
            
            logger.info('Attempting to load default examples', {
                assetsPath,
                legacyExamplesPath,
                exists: await fs.pathExists(legacyExamplesPath)
            });
            
            if (await fs.pathExists(legacyExamplesPath)) {
                const examplesContent = await fs.readFile(legacyExamplesPath, 'utf8');
                this.examples = this.parseExamples(examplesContent);
                logger.info('Legacy examples loaded successfully', {
                    exampleCount: this.examples.length,
                    path: legacyExamplesPath
                });
            } else {
                // Try to load from default-examples.md in the new structure
                const defaultExamplesPath = path.join(assetsPath, 'examples', 'default-examples.md');
                if (await fs.pathExists(defaultExamplesPath)) {
                    const examplesContent = await fs.readFile(defaultExamplesPath, 'utf8');
                    this.examples = this.parseExamples(examplesContent);
                    logger.info('Default examples loaded from new structure', {
                        exampleCount: this.examples.length,
                        path: defaultExamplesPath
                    });
                } else {
                    logger.warn('No examples files found, continuing without examples', {
                        searchedPaths: [legacyExamplesPath, defaultExamplesPath],
                        assetsPath
                    });
                    this.examples = [];
                }
            }
            
        } catch (error) {
            logger.warn('Failed to load examples, continuing without:', error);
            this.examples = [];
        }
    }

    async loadExamplesFromFile(filename) {
        try {
            const assetsPath = getAssetsPath();
            const examplesPath = path.join(assetsPath, 'examples', filename);
            
            logger.info('Loading examples from specific file', {
                filename,
                examplesPath,
                exists: await fs.pathExists(examplesPath)
            });
            
            if (await fs.pathExists(examplesPath)) {
                const examplesContent = await fs.readFile(examplesPath, 'utf8');
                const examples = this.parseExamples(examplesContent);
                logger.info('Examples loaded from file successfully', {
                    filename,
                    exampleCount: examples.length,
                    path: examplesPath
                });
                return examples;
            } else {
                logger.warn('Example file not found', {
                    filename,
                    searchedPath: examplesPath
                });
                return [];
            }
            
        } catch (error) {
            logger.error('Failed to load examples from file:', error);
            return [];
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
            const { 
                useExamples = false, 
                includeCategories = true,
                provider = null,
                model = null,
                streaming = false,
                onChunk = null,
                exampleFile = null
            } = options;
            
            logger.info('Processing prompt enhancement', {
                userPromptLength: userPrompt.length,
                useExamples,
                includeCategories,
                provider,
                model,
                streaming,
                exampleFile
            });

            let enhancedSystemPrompt = this.systemPrompt;
            
            // Add examples context if requested
            if (useExamples) {
                let examplesForContext = this.examples;
                
                // If a specific example file is requested, load examples from that file
                if (exampleFile) {
                    const fileExamples = await this.loadExamplesFromFile(exampleFile);
                    if (fileExamples.length > 0) {
                        examplesForContext = fileExamples;
                        logger.info(`Using examples from specific file: ${exampleFile}`, {
                            fileExampleCount: fileExamples.length
                        });
                    } else {
                        logger.warn(`No examples found in file ${exampleFile}, falling back to default examples`);
                    }
                }
                
                if (examplesForContext && examplesForContext.length > 0) {
                    const exampleContext = this.buildExampleContextFromArray(examplesForContext);
                    enhancedSystemPrompt += `\n\n## Example Prompts for Reference:\n${exampleContext}`;
                }
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
                const categoryAnalysis = await providerManager.analyzePromptCategories(
                    userPrompt, 
                    enhancedSystemPrompt,
                    { provider, model }
                );
                result.categories = categoryAnalysis.categories;
                result.categoryProvider = categoryAnalysis.provider;
                result.categoryFallback = categoryAnalysis.fallbackUsed;
            }

            // Get enhanced prompt
            const enhancement = await providerManager.enhancePrompt(
                userPrompt,
                enhancedSystemPrompt,
                {
                    useExamples,
                    includeCategories: false, // We handle categories separately
                    provider,
                    model,
                    streaming,
                    onChunk
                }
            );
            
            result.enhancedPrompt = enhancement.enhancedPrompt;
            result.usage = enhancement.usage;
            result.model = enhancement.model;
            result.provider = enhancement.provider;
            result.fallbackUsed = enhancement.fallbackUsed;
            
            if (enhancement.fallbackUsed) {
                result.originalProvider = enhancement.originalProvider;
                result.fallbackReason = enhancement.fallbackReason;
            }

            logger.info('Prompt enhancement completed successfully', {
                inputLength: userPrompt.length,
                outputLength: result.enhancedPrompt.length,
                categoriesIncluded: !!result.categories,
                provider: result.provider,
                fallbackUsed: result.fallbackUsed
            });

            return result;

        } catch (error) {
            logger.error('Error processing prompt enhancement:', error);
            throw error;
        }
    }

    buildExampleContext() {
        return this.buildExampleContextFromArray(this.examples);
    }

    buildExampleContextFromArray(examples) {
        if (!examples || examples.length === 0) {
            return '';
        }

        // Get a diverse sample of examples
        const sampleSize = Math.min(5, examples.length);
        const sampledExamples = examples
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
            providerManager: providerManager.getStatus()
        };
    }
}

// Export singleton instance
module.exports = new PromptProcessor();
