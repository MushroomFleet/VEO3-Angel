// UI Controller for VEO3-Angel - Additional UI interactions and utilities
class UIController {
    constructor() {
        this.init();
    }

    init() {
        this.setupTextareaAutoResize();
        this.setupModalHandlers();
        this.setupTooltips();
        this.setupKeyboardShortcuts();
        console.log('🎨 UI Controller initialized');
    }

    setupTextareaAutoResize() {
        const textarea = document.getElementById('userPrompt');
        if (!textarea) return;

        // Auto-resize textarea as user types
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    setupModalHandlers() {
        // Close modal when clicking outside
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Prevent modal content clicks from closing modal
        const modalContent = modal.querySelector('.relative');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    setupTooltips() {
        // Add hover tooltips for buttons
        const tooltips = {
            'viewToggle': 'Switch between detailed (10-category breakdown) and basic (input → output) views',
            'randomExampleBtn': 'Load a random example prompt to get started',
            'useExamples': 'Include example prompts as inspiration for the AI enhancement',
            'copyBtn': 'Copy the enhanced prompt to your clipboard',
            'saveBtn': 'Download the enhanced prompt as a text file',
            'settingsBtn': 'View application settings and session statistics',
            'enhanceBtn': 'Transform your basic idea into a detailed VEO3 prompt (Ctrl+Enter)'
        };

        Object.entries(tooltips).forEach(([id, tooltip]) => {
            const element = document.getElementById(id);
            if (element) {
                element.title = tooltip;
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save (if prompt exists)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn && !saveBtn.disabled) {
                    saveBtn.click();
                }
            }

            // Ctrl/Cmd + C to copy (if prompt exists)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target.tagName !== 'TEXTAREA') {
                const copyBtn = document.getElementById('copyBtn');
                if (copyBtn && !copyBtn.disabled) {
                    e.preventDefault();
                    copyBtn.click();
                }
            }

            // Ctrl/Cmd + , for settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                document.getElementById('settingsBtn').click();
            }

            // F1 for help/random example
            if (e.key === 'F1') {
                e.preventDefault();
                document.getElementById('randomExampleBtn').click();
            }
        });
    }

    // Utility methods for enhanced UI interactions
    animateButton(buttonId, animation = 'pulse') {
        const button = document.getElementById(buttonId);
        if (!button) return;

        button.classList.add(`animate-${animation}`);
        setTimeout(() => {
            button.classList.remove(`animate-${animation}`);
        }, 1000);
    }

    highlightElement(elementId, duration = 2000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.add('ring-2', 'ring-primary-500', 'ring-opacity-50');
        setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary-500', 'ring-opacity-50');
        }, duration);
    }

    showLoadingState(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const originalContent = element.innerHTML;
        element.innerHTML = `
            <div class="loading-shimmer rounded h-4 w-full mb-2"></div>
            <div class="loading-shimmer rounded h-3 w-3/4 mb-1"></div>
            <div class="loading-shimmer rounded h-3 w-1/2"></div>
        `;

        return () => {
            element.innerHTML = originalContent;
        };
    }

    updateProgress(percentage) {
        // Create or update a progress bar
        let progressBar = document.getElementById('progressBar');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'progressBar';
            progressBar.className = 'fixed top-0 left-0 w-full h-1 bg-primary-500 z-50 transition-all duration-300';
            progressBar.style.width = '0%';
            document.body.appendChild(progressBar);
        }

        progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;

        if (percentage >= 100) {
            setTimeout(() => {
                if (progressBar.parentElement) {
                    progressBar.remove();
                }
            }, 500);
        }
    }

    formatText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    copyToClipboard(text, successMessage = 'Copied to clipboard!') {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text).then(() => {
                this.showNotification(successMessage, 'success');
                return true;
            }).catch(() => {
                return this.fallbackCopyToClipboard(text, successMessage);
            });
        } else {
            return this.fallbackCopyToClipboard(text, successMessage);
        }
    }

    fallbackCopyToClipboard(text, successMessage) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showNotification(successMessage, 'success');
            } else {
                this.showNotification('Failed to copy text', 'error');
            }
            return successful;
        } catch (err) {
            console.error('Fallback copy failed:', err);
            this.showNotification('Failed to copy text', 'error');
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }

    showNotification(message, type = 'info') {
        // Use the main app's toast system if available
        if (window.veo3Angel && window.veo3Angel.showToast) {
            window.veo3Angel.showToast(message, type);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Enhanced category display with animations
    animateCategories() {
        const cards = document.querySelectorAll('.category-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Smooth scroll to element
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    // Theme management (for future dark mode support)
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('veo3-angel-theme', theme);
    }

    getTheme() {
        return localStorage.getItem('veo3-angel-theme') || 'light';
    }

    // Local storage utilities
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(`veo3-angel-${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`veo3-angel-${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }

    // Enhanced error display
    displayEnhancedError(error, containerId = 'enhancedOutput') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const errorTypes = {
            'API connection failed': {
                icon: '🔌',
                title: 'Connection Error',
                description: 'Unable to connect to the AI service. Please check your internet connection and API key.'
            },
            'API key': {
                icon: '🔑',
                title: 'API Key Error',
                description: 'Please check your Anthropic API key in the .env file.'
            },
            'rate limit': {
                icon: '⏱️',
                title: 'Rate Limit Exceeded',
                description: 'Too many requests. Please wait a moment before trying again.'
            },
            'timeout': {
                icon: '⏰',
                title: 'Request Timeout',
                description: 'The request took too long to complete. Please try again.'
            }
        };

        let errorInfo = { icon: '❌', title: 'Error', description: error };

        // Match error type
        for (const [key, info] of Object.entries(errorTypes)) {
            if (error.toLowerCase().includes(key)) {
                errorInfo = info;
                break;
            }
        }

        container.innerHTML = `
            <div class="error-message text-center">
                <div class="text-4xl mb-3">${errorInfo.icon}</div>
                <div class="font-semibold text-lg mb-2">${errorInfo.title}</div>
                <div class="text-sm">${errorInfo.description}</div>
                <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                    Retry
                </button>
            </div>
        `;
    }

    // Accessibility improvements
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Focus management
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });

        firstElement.focus();
    }
}

// Initialize UI Controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiController = new UIController();
});
