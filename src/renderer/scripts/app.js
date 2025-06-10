// VEO3-Angel Application JavaScript
class VEO3Angel {
    constructor() {
        this.apiBase = '/api';
        this.currentView = 'detailed';
        this.isProcessing = false;
        this.currentPrompt = null;
        this.sessionStats = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing VEO3-Angel');
        
        // Bind event listeners
        this.bindEvents();
        
        // Check configuration status first
        await this.checkConfiguration();
        
        // Check API status
        await this.checkStatus();
        
        // Update UI state
        this.updateCharacterCount();
        this.updateViewMode();
        
        console.log('✅ VEO3-Angel initialized');
    }

    bindEvents() {
        // Main functionality
        document.getElementById('enhanceBtn').addEventListener('click', () => this.enhancePrompt());
        document.getElementById('userPrompt').addEventListener('input', () => this.updateCharacterCount());
        document.getElementById('randomExampleBtn').addEventListener('click', () => this.loadRandomExample());
        
        // View controls
        document.getElementById('viewToggle').addEventListener('click', () => this.toggleView());
        
        // Output controls
        document.getElementById('copyBtn').addEventListener('click', () => this.copyPrompt());
        document.getElementById('saveBtn').addEventListener('click', () => this.savePrompt());
        
        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettings());
        document.getElementById('closeSettingsBtn2').addEventListener('click', () => this.hideSettings());
        document.getElementById('exportSessionBtn').addEventListener('click', () => this.exportSession());
        
        // Provider configuration
        document.getElementById('preferredProvider').addEventListener('change', (e) => this.setPreferredProvider(e.target.value));
        document.getElementById('testAnthropicBtn').addEventListener('click', () => this.testProvider('anthropic'));
        document.getElementById('testOpenrouterBtn').addEventListener('click', () => this.testProvider('openrouter'));
        document.getElementById('testAllProvidersBtn').addEventListener('click', () => this.testAllProviders());
        document.getElementById('enableFallback').addEventListener('change', (e) => this.toggleFallback(e.target.checked));
        
        // OpenRouter model management
        document.getElementById('refreshModelsBtn')?.addEventListener('click', () => this.refreshOpenRouterModels());
        document.getElementById('openrouterModel').addEventListener('change', (e) => this.setOpenRouterDefaultModel(e.target.value));
        
        // Main UI model selector
        document.getElementById('modelSelect')?.addEventListener('change', (e) => this.onMainModelChange(e.target.value));
        
        // Configuration modal
        document.getElementById('configForm').addEventListener('submit', (e) => this.handleConfigSubmit(e));
        document.getElementById('configCancelBtn').addEventListener('click', () => this.hideConfigModal());
        document.getElementById('getApiKeyLink').addEventListener('click', (e) => this.openApiKeyPage(e));
        document.getElementById('providerSelect').addEventListener('change', (e) => this.onProviderSelectionChange(e.target.value));
        
        // Restart modal
        document.getElementById('restartNowBtn').addEventListener('click', () => this.restartApp());
        document.getElementById('restartLaterBtn').addEventListener('click', () => this.hideRestartModal());
        
        // Examples functionality
        document.getElementById('useExamples').addEventListener('change', (e) => this.toggleExamplesSection(e.target.checked));
        document.getElementById('examplesSelect').addEventListener('change', (e) => this.onExampleFileSelected(e.target.value));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Enable/disable enhance button based on input
        document.getElementById('userPrompt').addEventListener('input', (e) => {
            const btn = document.getElementById('enhanceBtn');
            btn.disabled = e.target.value.trim().length === 0 || this.isProcessing;
        });
        
        // Load available example files
        this.loadAvailableExampleFiles();
        
        // Load OpenRouter models for main UI dropdown
        this.loadOpenRouterModels();
    }

    async checkStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`);
            const data = await response.json();
            
            if (data.success) {
                this.updateStatus('online', 'Connected');
                this.sessionStats = data.data;
                console.log('📊 Status:', data.data);
            } else {
                this.updateStatus('offline', 'Service Error');
            }
        } catch (error) {
            console.error('❌ Status check failed:', error);
            this.updateStatus('offline', 'Connection Failed');
        }
    }

    updateStatus(status, text) {
        const dot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        dot.className = `w-2 h-2 rounded-full status-${status}`;
        statusText.textContent = text;
        
        // Update settings modal if open
        const apiStatusDot = document.getElementById('apiStatusDot');
        const apiStatusText = document.getElementById('apiStatusText');
        
        if (apiStatusDot && apiStatusText) {
            apiStatusDot.className = `w-2 h-2 rounded-full status-${status}`;
            apiStatusText.textContent = text;
        }
    }

    updateCharacterCount() {
        const textarea = document.getElementById('userPrompt');
        const counter = document.getElementById('charCount');
        const length = textarea.value.length;
        const max = 5000;
        
        counter.textContent = `${length} / ${max}`;
        
        // Update styling based on length
        counter.className = 'text-sm';
        if (length > max * 0.8) {
            counter.classList.add('char-count-warning');
        }
        if (length > max * 0.95) {
            counter.classList.remove('char-count-warning');
            counter.classList.add('char-count-danger');
        }
        if (length <= max * 0.8) {
            counter.classList.remove('char-count-warning', 'char-count-danger');
            counter.classList.add('text-gray-500');
        }
    }

    toggleView() {
        const toggle = document.getElementById('viewToggle');
        const panel = document.getElementById('categoryPanel');
        
        if (this.currentView === 'detailed') {
            this.currentView = 'basic';
            toggle.textContent = 'Basic';
            panel.style.display = 'none';
        } else {
            this.currentView = 'detailed';
            toggle.textContent = 'Detailed';
            panel.style.display = 'block';
        }
        
        console.log(`🔄 View mode: ${this.currentView}`);
    }

    updateViewMode() {
        const panel = document.getElementById('categoryPanel');
        panel.style.display = this.currentView === 'detailed' ? 'block' : 'none';
    }

    async loadRandomExample() {
        try {
            const response = await fetch(`${this.apiBase}/examples?random=true`);
            const data = await response.json();
            
            if (data.success && data.data) {
                document.getElementById('userPrompt').value = data.data.content;
                this.updateCharacterCount();
                this.showToast('Random example loaded!', 'info');
            } else {
                this.showToast('No examples available', 'warning');
            }
        } catch (error) {
            console.error('❌ Failed to load example:', error);
            this.showToast('Failed to load example', 'error');
        }
    }

    async enhancePrompt() {
        if (this.isProcessing) return;
        
        const userPrompt = document.getElementById('userPrompt').value.trim();
        if (!userPrompt) {
            this.showToast('Please enter a video idea first', 'warning');
            return;
        }
        
        this.setProcessingState(true);
        
        try {
            const useExamples = document.getElementById('useExamples').checked;
            const selectedExampleFile = useExamples ? document.getElementById('examplesSelect').value : null;
            const includeCategories = this.currentView === 'detailed';
            
            // Get selected model from main UI or settings
            const mainModelSelect = document.getElementById('modelSelect');
            const settingsModelSelect = document.getElementById('openrouterModel');
            const selectedModel = mainModelSelect?.value || settingsModelSelect?.value || null;
            
            const requestBody = {
                userPrompt,
                useExamples,
                includeCategories
            };
            
            // Add selected example file if examples are enabled and a file is selected
            if (useExamples && selectedExampleFile) {
                requestBody.exampleFile = selectedExampleFile;
            }
            
            // Add model selection if specified
            if (selectedModel) {
                requestBody.model = selectedModel;
            }
            
            console.log('🔄 Enhancing prompt:', requestBody);
            
            const response = await fetch(`${this.apiBase}/enhance-prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentPrompt = data.data;
                this.displayResults(data.data);
                this.showToast('Prompt enhanced successfully!', 'success');
                console.log('✅ Enhancement complete:', data.data);
            } else {
                throw new Error(data.message || 'Enhancement failed');
            }
            
        } catch (error) {
            console.error('❌ Enhancement failed:', error);
            this.showToast(`Enhancement failed: ${error.message}`, 'error');
            this.displayError(error.message);
        } finally {
            this.setProcessingState(false);
        }
    }

    setProcessingState(processing) {
        this.isProcessing = processing;
        const btn = document.getElementById('enhanceBtn');
        const btnText = document.getElementById('enhanceBtnText');
        const spinner = document.getElementById('enhanceSpinner');
        const userPrompt = document.getElementById('userPrompt');
        
        if (processing) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
            btnText.textContent = 'Enhancing...';
            spinner.classList.remove('hidden');
            userPrompt.disabled = true;
            this.updateStatus('loading', 'Processing...');
        } else {
            btn.disabled = userPrompt.value.trim().length === 0;
            btn.classList.remove('btn-loading');
            btnText.textContent = 'Enhance Prompt';
            spinner.classList.add('hidden');
            userPrompt.disabled = false;
            this.updateStatus('online', 'Connected');
        }
    }

    displayResults(data) {
        // Display enhanced prompt
        const output = document.getElementById('enhancedOutput');
        output.textContent = data.enhancedPrompt;
        output.classList.add('has-content');
        
        // Enable action buttons
        document.getElementById('copyBtn').disabled = false;
        document.getElementById('saveBtn').disabled = false;
        
        // Display categories if available
        if (data.categories && this.currentView === 'detailed') {
            this.displayCategories(data.categories);
        }
        
        // Display metadata
        this.displayMetadata(data);
    }

    displayCategories(categories) {
        const grid = document.getElementById('categoriesGrid');
        grid.innerHTML = '';
        
        const categoryLabels = {
            sceneDescription: 'Scene Description',
            visualStyle: 'Visual Style',
            cameraMovement: 'Camera Movement',
            mainSubject: 'Main Subject',
            backgroundSetting: 'Background Setting',
            lightingMood: 'Lighting/Mood',
            audioCue: 'Audio Cue',
            colorPalette: 'Color Palette',
            dialogue: 'Dialogue/Background',
            subtitles: 'Subtitles & Language'
        };
        
        for (const [key, label] of Object.entries(categoryLabels)) {
            const card = document.createElement('div');
            card.className = 'category-card';
            
            const content = categories[key] || 'Not specified';
            const isEmpty = !categories[key] || categories[key].trim() === '';
            
            if (isEmpty) {
                card.classList.add('empty');
            }
            
            card.innerHTML = `
                <h3>${label}</h3>
                <p>${isEmpty ? 'Not analyzed for this prompt' : content}</p>
            `;
            
            grid.appendChild(card);
        }
    }

    displayMetadata(data) {
        const metadata = document.getElementById('promptMetadata');
        metadata.classList.remove('hidden');
        
        const items = [];
        if (data.model) items.push(`Model: ${data.model}`);
        if (data.usage) items.push(`Tokens: ${data.usage.input_tokens || 0} in, ${data.usage.output_tokens || 0} out`);
        if (data.timestamp) items.push(`Generated: ${new Date(data.timestamp).toLocaleTimeString()}`);
        
        metadata.innerHTML = items.map(item => `<span class="metadata-item">${item}</span>`).join('');
    }

    displayError(message) {
        const output = document.getElementById('enhancedOutput');
        output.innerHTML = `
            <div class="error-message">
                <strong>Enhancement Failed</strong><br>
                ${message}
            </div>
        `;
        output.classList.remove('has-content');
        
        // Disable action buttons
        document.getElementById('copyBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;
    }

    async copyPrompt() {
        if (!this.currentPrompt) return;
        
        try {
            await navigator.clipboard.writeText(this.currentPrompt.enhancedPrompt);
            
            // Visual feedback
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('copy-success');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copy-success');
            }, 2000);
            
            this.showToast('Prompt copied to clipboard!', 'success');
        } catch (error) {
            console.error('❌ Copy failed:', error);
            this.showToast('Failed to copy prompt', 'error');
        }
    }

    async savePrompt() {
        if (!this.currentPrompt) return;
        
        try {
            // Generate suggested filename
            const response = await fetch(`${this.apiBase}/generate-filename`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: this.currentPrompt.userPrompt
                })
            });
            
            const data = await response.json();
            const suggestedFilename = data.success ? data.data.filename : 'veo3-prompt.txt';
            
            // Create download
            this.downloadPrompt(this.currentPrompt.enhancedPrompt, suggestedFilename);
            this.showToast('Prompt saved successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showToast('Failed to save prompt', 'error');
        }
    }

    downloadPrompt(content, filename) {
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
    }

    async showSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('hidden');
        
        // Update settings content
        await this.updateSettingsContent();
        
        // Load OpenRouter models if not already loaded
        await this.loadOpenRouterModels();
    }

    hideSettings() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('hidden');
    }

    async updateSettingsContent() {
        try {
            // Update session stats
            const response = await fetch(`${this.apiBase}/session-log`);
            const data = await response.json();
            
            if (data.success) {
                const stats = data.data;
                document.getElementById('statsPromptCount').textContent = stats.logCount;
                document.getElementById('statsSessionStart').textContent = 
                    new Date(stats.sessionStartTime).toLocaleString();
            }
        } catch (error) {
            console.error('❌ Failed to update settings:', error);
        }
    }

    async exportSession() {
        try {
            this.showToast('Exporting session...', 'info');
            
            // Create filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `veo3-angel-session-${timestamp}.md`;
            
            // Get session data and create download
            const response = await fetch(`${this.apiBase}/session-log`);
            const data = await response.json();
            
            if (data.success) {
                // Format session data for export
                const exportContent = this.formatSessionExport(data.data);
                this.downloadPrompt(exportContent, filename);
                this.showToast('Session exported successfully!', 'success');
            } else {
                throw new Error('Failed to get session data');
            }
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showToast('Failed to export session', 'error');
        }
    }

    formatSessionExport(sessionData) {
        const header = [
            '# VEO3-Angel Session Export',
            `**Session Started:** ${new Date(sessionData.sessionStartTime).toLocaleString()}`,
            `**Total Prompts:** ${sessionData.logCount}`,
            `**Exported:** ${new Date().toLocaleString()}`,
            '',
            '---',
            ''
        ].join('\n');
        
        const entries = sessionData.logs.map((log, index) => [
            `## Prompt ${index + 1}`,
            `**Time:** ${new Date(log.timestamp).toLocaleString()}`,
            '',
            '**Original Idea:**',
            log.userPrompt,
            '',
            '**Enhanced Prompt:**',
            log.enhancedPrompt,
            '',
            '---',
            ''
        ].join('\n')).join('\n');
        
        return header + entries;
    }

    handleKeyboard(e) {
        // Ctrl/Cmd + Enter to enhance
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!this.isProcessing) {
                this.enhancePrompt();
            }
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            this.hideSettings();
        }
    }

    async checkConfiguration() {
        try {
            const response = await fetch(`${this.apiBase}/configuration-status`);
            const data = await response.json();
            
            if (data.success && !data.data.configured) {
                console.log('⚠️ API key not configured, showing configuration modal');
                this.showConfigModal();
            } else {
                console.log('✅ API key configured');
            }
        } catch (error) {
            console.error('❌ Configuration check failed:', error);
            // Don't show modal if we can't check - might be a different error
        }
    }

    showConfigModal() {
        const modal = document.getElementById('configModal');
        modal.classList.remove('hidden');
        
        // Focus on the input field
        setTimeout(() => {
            const input = document.getElementById('apiKeyInput');
            if (input) input.focus();
        }, 100);
    }

    hideConfigModal() {
        const modal = document.getElementById('configModal');
        modal.classList.add('hidden');
        
        // Clear the form
        document.getElementById('configForm').reset();
        this.hideConfigMessage();
    }

    async handleConfigSubmit(e) {
        e.preventDefault();
        
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        if (!apiKey) {
            this.showConfigMessage('Please enter your API key', 'error');
            return;
        }
        
        this.setConfigSubmitState(true);
        
        try {
            const response = await fetch(`${this.apiBase}/configure-api-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showConfigMessage('API key configured successfully!', 'success');
                
                // Hide config modal and show restart modal after a delay
                setTimeout(() => {
                    this.hideConfigModal();
                    this.showRestartModal();
                }, 1500);
            } else {
                this.showConfigMessage(data.message || 'Configuration failed', 'error');
            }
            
        } catch (error) {
            console.error('❌ Configuration failed:', error);
            this.showConfigMessage(`Configuration failed: ${error.message}`, 'error');
        } finally {
            this.setConfigSubmitState(false);
        }
    }

    setConfigSubmitState(loading) {
        const submitBtn = document.getElementById('configSubmitBtn');
        const submitText = document.getElementById('configSubmitText');
        const spinner = document.getElementById('configSpinner');
        const input = document.getElementById('apiKeyInput');
        
        if (loading) {
            submitBtn.disabled = true;
            submitText.textContent = 'Testing...';
            spinner.classList.remove('hidden');
            input.disabled = true;
        } else {
            submitBtn.disabled = false;
            submitText.textContent = 'Save & Test';
            spinner.classList.add('hidden');
            input.disabled = false;
        }
    }

    showConfigMessage(message, type) {
        const messageDiv = document.getElementById('configMessage');
        const messageText = document.getElementById('configMessageText');
        
        messageDiv.className = `mt-4 p-3 rounded-md ${
            type === 'success' ? 'bg-green-50 border border-green-200' : 
            type === 'error' ? 'bg-red-50 border border-red-200' : 
            'bg-blue-50 border border-blue-200'
        }`;
        
        messageText.className = `text-sm ${
            type === 'success' ? 'text-green-800' : 
            type === 'error' ? 'text-red-800' : 
            'text-blue-800'
        }`;
        
        messageText.textContent = message;
        messageDiv.classList.remove('hidden');
    }

    hideConfigMessage() {
        const messageDiv = document.getElementById('configMessage');
        messageDiv.classList.add('hidden');
    }

    onProviderSelectionChange(provider) {
        const apiKeySection = document.getElementById('apiKeySection');
        const apiKeyLabel = document.getElementById('apiKeyLabel');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKeyHint = document.getElementById('apiKeyHint');
        const getApiKeyLink = document.getElementById('getApiKeyLink');
        
        if (provider) {
            // Show the API key section
            apiKeySection.classList.remove('hidden');
            
            // Update labels and placeholders based on provider
            if (provider === 'anthropic') {
                apiKeyLabel.textContent = 'Anthropic API Key';
                apiKeyInput.placeholder = 'sk-ant-...';
                apiKeyHint.textContent = 'Your API key is stored locally and securely';
                getApiKeyLink.textContent = 'Get Anthropic API Key →';
                getApiKeyLink.href = 'https://console.anthropic.com/';
            } else if (provider === 'openrouter') {
                apiKeyLabel.textContent = 'OpenRouter API Key';
                apiKeyInput.placeholder = 'sk-or-...';
                apiKeyHint.textContent = 'Access to 300+ models with one API key';
                getApiKeyLink.textContent = 'Get OpenRouter API Key →';
                getApiKeyLink.href = 'https://openrouter.ai/keys';
            }
            
            // Clear any previous input
            apiKeyInput.value = '';
        } else {
            // Hide the API key section
            apiKeySection.classList.add('hidden');
        }
    }

    openApiKeyPage(e) {
        e.preventDefault();
        
        const provider = document.getElementById('providerSelect').value;
        let url = '';
        
        if (provider === 'anthropic') {
            url = 'https://console.anthropic.com/';
        } else if (provider === 'openrouter') {
            url = 'https://openrouter.ai/keys';
        }
        
        if (url) {
            // Use Electron's shell.openExternal if available, otherwise fallback to window.open
            if (window.electronAPI && window.electronAPI.openExternal) {
                window.electronAPI.openExternal(url);
            } else {
                window.open(url, '_blank');
            }
        }
    }

    openAnthropicConsole(e) {
        e.preventDefault();
        
        // Use Electron's shell.openExternal if available, otherwise fallback to window.open
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal('https://console.anthropic.com/');
        } else {
            window.open('https://console.anthropic.com/', '_blank');
        }
    }

    showRestartModal() {
        const modal = document.getElementById('restartModal');
        modal.classList.remove('hidden');
    }

    hideRestartModal() {
        const modal = document.getElementById('restartModal');
        modal.classList.add('hidden');
    }

    restartApp() {
        // Use Electron's app.relaunch if available
        if (window.electronAPI && window.electronAPI.relaunch) {
            window.electronAPI.relaunch();
        } else {
            // Fallback for non-Electron environments
            this.showToast('Please manually restart the application', 'info', 6000);
            this.hideRestartModal();
        }
    }

    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        toast.className = `toast ${type} max-w-sm`;
        toast.innerHTML = `
            <div class="flex items-center">
                <span class="flex-1">${message}</span>
                <button class="ml-2 text-current opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('removing');
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    // Provider Management Methods
    async setPreferredProvider(provider) {
        try {
            const response = await fetch(`${this.apiBase}/set-preferred-provider`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ provider })
            });

            const data = await response.json();
            if (data.success) {
                this.showToast(`Preferred provider set to ${provider}`, 'success');
                await this.updateProviderStatus();
            } else {
                throw new Error(data.message || 'Failed to set preferred provider');
            }
        } catch (error) {
            console.error('❌ Failed to set preferred provider:', error);
            this.showToast(`Failed to set preferred provider: ${error.message}`, 'error');
        }
    }

    async testProvider(provider) {
        const button = document.getElementById(`test${provider.charAt(0).toUpperCase() + provider.slice(1)}Btn`);
        const apiKeyInput = document.getElementById(`${provider}ApiKey`);
        
        if (!apiKeyInput.value.trim()) {
            this.showToast(`Please enter ${provider} API key first`, 'warning');
            return;
        }

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Testing...';

        try {
            // Configure the provider first
            const configResponse = await fetch(`${this.apiBase}/configure-provider`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider: provider,
                    apiKey: apiKeyInput.value.trim(),
                    model: provider === 'openrouter' ? document.getElementById('openrouterModel').value : undefined
                })
            });

            const configData = await configResponse.json();
            if (configData.success) {
                this.showToast(`${provider} configured successfully!`, 'success');
                await this.updateProviderStatus();
            } else {
                throw new Error(configData.message || 'Configuration failed');
            }
        } catch (error) {
            console.error(`❌ ${provider} test failed:`, error);
            this.showToast(`${provider} test failed: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    async testAllProviders() {
        const button = document.getElementById('testAllProvidersBtn');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Testing...';

        try {
            const response = await fetch(`${this.apiBase}/test-providers`, {
                method: 'POST'
            });

            const data = await response.json();
            if (data.success) {
                const results = data.data;
                let message = 'Provider Test Results:\n';
                
                for (const [provider, result] of Object.entries(results)) {
                    message += `${provider}: ${result.success ? '✅ Working' : '❌ Failed'}\n`;
                }
                
                this.showToast('Provider tests completed', 'info', 6000);
                console.log('Provider test results:', results);
                await this.updateProviderStatus();
            } else {
                throw new Error(data.message || 'Test failed');
            }
        } catch (error) {
            console.error('❌ Provider tests failed:', error);
            this.showToast(`Provider tests failed: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    async toggleFallback(enabled) {
        try {
            const response = await fetch(`${this.apiBase}/enable-fallback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });

            const data = await response.json();
            if (data.success) {
                this.showToast(`Fallback mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
            } else {
                throw new Error(data.message || 'Failed to toggle fallback');
            }
        } catch (error) {
            console.error('❌ Failed to toggle fallback:', error);
            this.showToast(`Failed to toggle fallback: ${error.message}`, 'error');
        }
    }

    async updateProviderStatus() {
        try {
            const response = await fetch(`${this.apiBase}/providers`);
            const data = await response.json();
            
            if (data.success) {
                const status = data.data;
                
                // Update provider status indicators
                this.updateProviderStatusUI('anthropic', status.providers.anthropic);
                this.updateProviderStatusUI('openrouter', status.providers.openrouter);
                
                // Update preferred provider selector
                const preferredSelector = document.getElementById('preferredProvider');
                if (preferredSelector && status.preferredProvider) {
                    preferredSelector.value = status.preferredProvider;
                }
                
                // Update session stats
                document.getElementById('statsCurrentProvider').textContent = 
                    status.preferredProvider || 'None';
                
                console.log('Updated provider status:', status);
            }
        } catch (error) {
            console.error('❌ Failed to update provider status:', error);
        }
    }

    updateProviderStatusUI(provider, providerStatus) {
        const statusDot = document.getElementById(`${provider}StatusDot`);
        const statusText = document.getElementById(`${provider}StatusText`);
        
        if (!statusDot || !statusText) return;
        
        if (providerStatus.apiKeyConfigured && providerStatus.initialized) {
            statusDot.className = 'w-2 h-2 bg-green-500 rounded-full';
            statusText.textContent = 'Configured';
            statusText.className = 'text-xs text-green-600';
        } else if (providerStatus.apiKeyConfigured) {
            statusDot.className = 'w-2 h-2 bg-yellow-500 rounded-full';
            statusText.textContent = 'Key set, not tested';
            statusText.className = 'text-xs text-yellow-600';
        } else {
            statusDot.className = 'w-2 h-2 bg-gray-400 rounded-full';
            statusText.textContent = 'Not configured';
            statusText.className = 'text-xs text-gray-600';
        }
    }

    // OpenRouter Model Management Methods
    async loadOpenRouterModels() {
        try {
            const response = await fetch(`${this.apiBase}/openrouter/models?grouped=true`);
            const data = await response.json();
            
            if (data.success) {
                this.populateModelDropdown(data.data.grouped);
                this.showModelStatus(data.data.metadata);
                console.log('📋 Loaded OpenRouter models:', data.data.metadata);
            } else {
                console.warn('⚠️ Failed to load OpenRouter models:', data.message);
                this.showToast('Failed to load models from OpenRouter', 'warning');
            }
        } catch (error) {
            console.error('❌ Error loading OpenRouter models:', error);
            this.showToast('Error loading OpenRouter models', 'error');
        }
    }

    async refreshOpenRouterModels() {
        const button = document.getElementById('refreshModelsBtn');
        if (!button) return;
        
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Refreshing...';
        
        try {
            this.showToast('Refreshing models from OpenRouter...', 'info');
            
            const response = await fetch(`${this.apiBase}/openrouter/models/refresh`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.populateModelDropdown(data.data.grouped);
                this.showModelStatus(data.data.metadata);
                this.showToast(`Refreshed ${data.data.metadata.chatCompatible} models`, 'success');
                console.log('🔄 Models refreshed:', data.data.metadata);
            } else {
                throw new Error(data.message || 'Failed to refresh models');
            }
        } catch (error) {
            console.error('❌ Model refresh failed:', error);
            this.showToast(`Failed to refresh models: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    populateModelDropdown(groupedModels) {
        // Populate both the settings dropdown and main UI dropdown
        this.populateSettingsModelDropdown(groupedModels);
        this.populateMainModelDropdown(groupedModels);
    }

    populateSettingsModelDropdown(groupedModels) {
        const select = document.getElementById('openrouterModel');
        if (!select) return;
        
        // Save current selection
        const currentValue = select.value;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a model...';
        defaultOption.disabled = true;
        select.appendChild(defaultOption);
        
        // Group models by provider
        Object.entries(groupedModels).forEach(([provider, providerData]) => {
            if (providerData.models && providerData.models.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = providerData.name;
                
                providerData.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    
                    // Format display name with context length if available
                    let displayName = model.name;
                    if (model.contextLength) {
                        const contextK = Math.floor(model.contextLength / 1000);
                        displayName += ` (${contextK}K context)`;
                    }
                    if (model.fallback) {
                        displayName += ' [Fallback]';
                    }
                    
                    option.textContent = displayName;
                    option.title = model.description || '';
                    
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });
        
        // Restore selection if it still exists
        if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        } else if (select.options.length > 1) {
            // Default to first available model if no selection
            select.selectedIndex = 1;
        }
    }

    populateMainModelDropdown(groupedModels) {
        const select = document.getElementById('modelSelect');
        if (!select) return;
        
        // Save current selection
        const currentValue = select.value;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Use provider default';
        select.appendChild(defaultOption);
        
        // Collect all models and create popular models section
        const allModels = [];
        Object.entries(groupedModels).forEach(([provider, providerData]) => {
            if (providerData.models && providerData.models.length > 0) {
                providerData.models.forEach(model => {
                    allModels.push({
                        ...model,
                        providerName: providerData.name
                    });
                });
            }
        });
        
        // Popular models (prioritize these)
        const popularModels = [
            'anthropic/claude-3-5-sonnet-20241022',
            'anthropic/claude-3-5-sonnet-20241022-v2',
            'anthropic/claude-3-5-haiku-20241022', 
            'anthropic/claude-3-opus-20240229',
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
            'openai/o1-preview',
            'openai/o1-mini',
            'meta-llama/llama-3.1-70b-instruct',
            'meta-llama/llama-3.1-405b-instruct',
            'google/gemini-pro-1.5',
            'anthropic/claude-3-sonnet-20240229'
        ];
        
        // Create Popular Models group
        const popularGroup = document.createElement('optgroup');
        popularGroup.label = '🌟 Popular Models';
        
        popularModels.forEach(modelId => {
            const model = allModels.find(m => m.id === modelId);
            if (model) {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = `${model.name}`;
                option.title = `${model.providerName} - ${model.description || ''}`;
                popularGroup.appendChild(option);
            }
        });
        
        if (popularGroup.children.length > 0) {
            select.appendChild(popularGroup);
        }
        
        // Group remaining models by provider
        Object.entries(groupedModels).forEach(([provider, providerData]) => {
            if (providerData.models && providerData.models.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = providerData.name;
                
                providerData.models.forEach(model => {
                    // Skip if already in popular section
                    if (popularModels.includes(model.id)) return;
                    
                    const option = document.createElement('option');
                    option.value = model.id;
                    
                    // Shorter display name for main UI
                    let displayName = model.name;
                    if (model.contextLength && model.contextLength >= 100000) {
                        const contextK = Math.floor(model.contextLength / 1000);
                        displayName += ` (${contextK}K)`;
                    }
                    
                    option.textContent = displayName;
                    option.title = model.description || '';
                    
                    optgroup.appendChild(option);
                });
                
                if (optgroup.children.length > 0) {
                    select.appendChild(optgroup);
                }
            }
        });
        
        // Restore selection if it still exists
        if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    }

    showModelStatus(metadata) {
        // Create or update model status info
        let statusDiv = document.getElementById('modelStatus');
        
        if (!statusDiv) {
            // Create status div if it doesn't exist
            const openrouterSection = document.getElementById('openrouterModel').parentElement;
            statusDiv = document.createElement('div');
            statusDiv.id = 'modelStatus';
            statusDiv.className = 'text-xs text-gray-600 mt-2';
            openrouterSection.appendChild(statusDiv);
        }
        
        const statusParts = [];
        if (metadata.chatCompatible) {
            statusParts.push(`${metadata.chatCompatible} models available`);
        }
        if (metadata.cached) {
            statusParts.push('(cached)');
        }
        if (metadata.refreshedAt || metadata.timestamp) {
            const time = new Date(metadata.refreshedAt || metadata.timestamp).toLocaleTimeString();
            statusParts.push(`updated ${time}`);
        }
        
        statusDiv.textContent = statusParts.join(' • ');
    }

    async setOpenRouterDefaultModel(modelId) {
        if (!modelId) return;
        
        try {
            const response = await fetch(`${this.apiBase}/openrouter/set-default-model`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model: modelId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(`Default model set to ${modelId.split('/').pop()}`, 'success');
                console.log('✅ Default model updated:', modelId);
            } else {
                throw new Error(data.message || 'Failed to set default model');
            }
        } catch (error) {
            console.error('❌ Failed to set default model:', error);
            this.showToast(`Failed to set default model: ${error.message}`, 'error');
        }
    }

    onMainModelChange(modelId) {
        if (modelId) {
            const modelName = modelId.split('/').pop() || modelId;
            this.showToast(`Selected model: ${modelName}`, 'info', 2000);
            console.log(`🎯 Model selected: ${modelId}`);
        } else {
            console.log(`🎯 Using provider default model`);
        }
    }

    async getOpenRouterStatus() {
        try {
            const response = await fetch(`${this.apiBase}/openrouter/status`);
            const data = await response.json();
            
            if (data.success) {
                return data.data;
            }
        } catch (error) {
            console.error('❌ Failed to get OpenRouter status:', error);
        }
        return null;
    }

    // Examples Management Methods
    async loadAvailableExampleFiles() {
        try {
            const response = await fetch(`${this.apiBase}/examples/list`);
            const data = await response.json();
            
            if (data.success) {
                this.populateExamplesDropdown(data.data);
                console.log('📋 Loaded example files:', data.data);
            } else {
                console.warn('⚠️ Failed to load example files:', data.message);
            }
        } catch (error) {
            console.error('❌ Error loading example files:', error);
        }
    }

    populateExamplesDropdown(files) {
        const select = document.getElementById('examplesSelect');
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select example collection...';
        select.appendChild(defaultOption);
        
        // Add each example file
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.filename;
            
            // Simple filename transformation: remove .md and replace hyphens with spaces
            const displayName = file.filename.replace('.md', '').replace(/-/g, ' ');
            
            option.textContent = displayName;
            option.title = file.description || '';
            
            select.appendChild(option);
        });
        
        // Set default selection to default-examples.md
        if (files.some(f => f.filename === 'default-examples.md')) {
            select.value = 'default-examples.md';
        }
    }

    toggleExamplesSection(enabled) {
        const section = document.getElementById('examplesSection');
        const checkbox = document.getElementById('useExamples');
        
        if (enabled) {
            section.classList.remove('hidden');
            // If no file is selected, default to default-examples.md
            const select = document.getElementById('examplesSelect');
            if (!select.value && select.options.length > 1) {
                select.value = 'default-examples.md';
            }
        } else {
            section.classList.add('hidden');
        }
        
        console.log(`🔄 Examples section ${enabled ? 'shown' : 'hidden'}`);
    }

    async onExampleFileSelected(filename) {
        if (!filename) return;
        
        try {
            console.log(`📁 Selected example file: ${filename}`);
            
            // Could optionally preview the examples or show count
            const response = await fetch(`${this.apiBase}/examples/file/${filename}`);
            const data = await response.json();
            
            if (data.success) {
                const count = data.data.length;
                this.showToast(`Loaded ${count} examples from ${filename.replace('.md', '')}`, 'info', 2000);
            }
            
        } catch (error) {
            console.error('❌ Error loading example file:', error);
            this.showToast('Error loading selected examples', 'error');
        }
    }

    async loadRandomExample() {
        try {
            // Check if a specific example file is selected
            const useExamples = document.getElementById('useExamples').checked;
            const selectedFile = useExamples ? document.getElementById('examplesSelect').value : null;
            
            let url = `${this.apiBase}/examples?random=true`;
            if (selectedFile) {
                url += `&file=${selectedFile}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success && data.data) {
                document.getElementById('userPrompt').value = data.data.content;
                this.updateCharacterCount();
                
                const source = selectedFile ? selectedFile.replace('.md', '') : 'default collection';
                this.showToast(`Random example loaded from ${source}!`, 'info');
            } else {
                this.showToast('No examples available', 'warning');
            }
        } catch (error) {
            console.error('❌ Failed to load example:', error);
            this.showToast('Failed to load example', 'error');
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.veo3Angel = new VEO3Angel();
});
