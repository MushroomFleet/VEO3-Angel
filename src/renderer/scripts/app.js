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
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Enable/disable enhance button based on input
        document.getElementById('userPrompt').addEventListener('input', (e) => {
            const btn = document.getElementById('enhanceBtn');
            btn.disabled = e.target.value.trim().length === 0 || this.isProcessing;
        });
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
            const includeCategories = this.currentView === 'detailed';
            
            console.log('🔄 Enhancing prompt:', { userPrompt, useExamples, includeCategories });
            
            const response = await fetch(`${this.apiBase}/enhance-prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userPrompt,
                    useExamples,
                    includeCategories
                })
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
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.veo3Angel = new VEO3Angel();
});
