const anthropicService = require('./anthropic');
const openrouterService = require('./openrouter');
const ollamaService = require('./ollama');
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
        new winston.transports.File({ filename: 'logs/provider-manager.log' })
    ]
});

class ProviderManager {
    constructor() {
        this.providers = {
            anthropic: anthropicService,
            openrouter: openrouterService,
            ollama: ollamaService
        };
        this.preferredProvider = 'anthropic'; // Default to Anthropic for backward compatibility
        this.enableFallback = true;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            logger.info('Initializing provider manager...');
            
            // Initialize all available providers
            const initResults = {};
            for (const [name, service] of Object.entries(this.providers)) {
                try {
                    const result = await service.initialize();
                    initResults[name] = result;
                    logger.info(`Provider ${name} initialization:`, result);
                } catch (error) {
                    logger.error(`Failed to initialize provider ${name}:`, error);
                    initResults[name] = { configured: false, message: error.message };
                }
            }

            // Set preferred provider based on what's available
            const configuredProviders = Object.entries(initResults)
                .filter(([name, result]) => result.configured)
                .map(([name]) => name);

            if (configuredProviders.length === 0) {
                logger.warn('No providers are configured');
                this.isInitialized = false;
                return {
                    success: false,
                    message: 'No AI providers are configured. Please configure at least one API key.',
                    providers: initResults
                };
            }

            // If preferred provider is not configured, switch to first available
            if (!configuredProviders.includes(this.preferredProvider)) {
                this.preferredProvider = configuredProviders[0];
                logger.info(`Preferred provider not available, switching to: ${this.preferredProvider}`);
            }

            this.isInitialized = true;
            logger.info(`Provider manager initialized with ${configuredProviders.length} configured providers`);
            
            return {
                success: true,
                message: `Initialized with providers: ${configuredProviders.join(', ')}`,
                providers: initResults,
                activeProvider: this.preferredProvider
            };

        } catch (error) {
            logger.error('Failed to initialize provider manager:', error);
            this.isInitialized = false;
            return {
                success: false,
                message: `Initialization failed: ${error.message}`
            };
        }
    }

    async enhancePrompt(userPrompt, systemPrompt, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Provider manager not initialized');
        }

        const {
            useExamples = false,
            includeCategories = true,
            provider = null,
            model = null,
            streaming = false,
            onChunk = null
        } = options;

        const targetProvider = provider || this.preferredProvider;
        
        try {
            logger.info('Enhancing prompt', {
                provider: targetProvider,
                userPromptLength: userPrompt.length,
                streaming
            });

            const service = this.providers[targetProvider];
            if (!service || !service.isInitialized) {
                throw new Error(`Provider ${targetProvider} is not available`);
            }

            let result;
            if (streaming && service.enhancePromptStreaming) {
                result = await service.enhancePromptStreaming(
                    userPrompt, 
                    systemPrompt, 
                    useExamples, 
                    model,
                    onChunk
                );
            } else {
                result = await service.enhancePrompt(
                    userPrompt, 
                    systemPrompt, 
                    useExamples,
                    model
                );
            }

            // Add provider info to result
            result.provider = targetProvider;
            result.fallbackUsed = false;

            return result;

        } catch (error) {
            logger.error(`Error with provider ${targetProvider}:`, error);

            // Try fallback if enabled and we have other providers
            if (this.enableFallback && targetProvider !== 'fallback') {
                const fallbackProviders = Object.keys(this.providers)
                    .filter(name => 
                        name !== targetProvider && 
                        this.providers[name].isInitialized
                    );

                if (fallbackProviders.length > 0) {
                    const fallbackProvider = fallbackProviders[0];
                    logger.info(`Attempting fallback to provider: ${fallbackProvider}`);
                    
                    try {
                        const fallbackService = this.providers[fallbackProvider];
                        let result;
                        
                        if (streaming && fallbackService.enhancePromptStreaming) {
                            result = await fallbackService.enhancePromptStreaming(
                                userPrompt, 
                                systemPrompt, 
                                useExamples, 
                                model,
                                onChunk
                            );
                        } else {
                            result = await fallbackService.enhancePrompt(
                                userPrompt, 
                                systemPrompt, 
                                useExamples,
                                model
                            );
                        }

                        result.provider = fallbackProvider;
                        result.fallbackUsed = true;
                        result.originalProvider = targetProvider;
                        result.fallbackReason = error.message;

                        logger.info(`Fallback successful with provider: ${fallbackProvider}`);
                        return result;

                    } catch (fallbackError) {
                        logger.error(`Fallback failed with provider ${fallbackProvider}:`, fallbackError);
                        throw new Error(`Primary provider failed: ${error.message}. Fallback failed: ${fallbackError.message}`);
                    }
                }
            }

            throw error;
        }
    }

    async analyzePromptCategories(userPrompt, systemPrompt, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Provider manager not initialized');
        }

        const { provider = null, model = null } = options;
        const targetProvider = provider || this.preferredProvider;
        
        try {
            const service = this.providers[targetProvider];
            if (!service || !service.isInitialized) {
                throw new Error(`Provider ${targetProvider} is not available`);
            }

            const result = await service.analyzePromptCategories(userPrompt, systemPrompt, model);
            result.provider = targetProvider;
            result.fallbackUsed = false;

            return result;

        } catch (error) {
            logger.error(`Error analyzing categories with provider ${targetProvider}:`, error);

            // Try fallback
            if (this.enableFallback) {
                const fallbackProviders = Object.keys(this.providers)
                    .filter(name => 
                        name !== targetProvider && 
                        this.providers[name].isInitialized
                    );

                if (fallbackProviders.length > 0) {
                    const fallbackProvider = fallbackProviders[0];
                    try {
                        const result = await this.providers[fallbackProvider]
                            .analyzePromptCategories(userPrompt, systemPrompt, model);
                        result.provider = fallbackProvider;
                        result.fallbackUsed = true;
                        return result;
                    } catch (fallbackError) {
                        logger.error(`Category analysis fallback failed:`, fallbackError);
                    }
                }
            }

            throw error;
        }
    }

    async configureProvider(providerName, apiKey, options = {}) {
        try {
            if (!this.providers[providerName]) {
                throw new Error(`Unknown provider: ${providerName}`);
            }

            const service = this.providers[providerName];
            let result;

            // Handle Ollama differently (uses host instead of API key)
            if (providerName === 'ollama') {
                // For Ollama, apiKey parameter is actually the host URL
                result = await service.reconfigure(apiKey || null);
            } else {
                result = await service.reconfigure(apiKey, options.model);
            }

            if (result.success) {
                logger.info(`Provider ${providerName} configured successfully`);
                
                // If this was the first working provider, set it as preferred
                if (!this.isInitialized || !this.providers[this.preferredProvider].isInitialized) {
                    this.preferredProvider = providerName;
                    logger.info(`Set ${providerName} as preferred provider`);
                }
            }

            return result;

        } catch (error) {
            logger.error(`Failed to configure provider ${providerName}:`, error);
            return { success: false, message: error.message };
        }
    }

    setPreferredProvider(providerName) {
        if (!this.providers[providerName]) {
            throw new Error(`Unknown provider: ${providerName}`);
        }

        if (!this.providers[providerName].isInitialized) {
            throw new Error(`Provider ${providerName} is not configured`);
        }

        this.preferredProvider = providerName;
        logger.info(`Preferred provider set to: ${providerName}`);
        return true;
    }

    enableFallbackMode(enabled = true) {
        this.enableFallback = enabled;
        logger.info(`Fallback mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    getStatus() {
        const providerStatuses = {};
        
        for (const [name, service] of Object.entries(this.providers)) {
            providerStatuses[name] = service.getStatus();
        }

        const configuredProviders = Object.entries(providerStatuses)
            .filter(([name, status]) => status.initialized)
            .map(([name]) => name);

        return {
            initialized: this.isInitialized,
            preferredProvider: this.preferredProvider,
            enableFallback: this.enableFallback,
            configuredProviders,
            totalProviders: Object.keys(this.providers).length,
            providers: providerStatuses
        };
    }

    getAvailableModels(providerName = null) {
        if (providerName) {
            const service = this.providers[providerName];
            if (service && service.getAvailableModels) {
                return service.getAvailableModels();
            }
            return [];
        }

        // Return models from all providers
        const allModels = {};
        for (const [name, service] of Object.entries(this.providers)) {
            if (service.getAvailableModels) {
                allModels[name] = service.getAvailableModels();
            }
        }
        return allModels;
    }

    async testProviders() {
        const results = {};
        
        for (const [name, service] of Object.entries(this.providers)) {
            try {
                if (service.isInitialized) {
                    await service.testConnection();
                    results[name] = { success: true, message: 'Connection successful' };
                } else {
                    results[name] = { success: false, message: 'Service not initialized' };
                }
            } catch (error) {
                results[name] = { success: false, message: error.message };
            }
        }

        return results;
    }
}

// Export singleton instance
module.exports = new ProviderManager();
