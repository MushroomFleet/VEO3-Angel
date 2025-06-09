const fs = require('fs-extra');
const path = require('path');
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
        new winston.transports.File({ filename: 'logs/file-manager.log' })
    ]
});

class FileManager {
    constructor() {
        this.sessionLog = [];
        this.sessionStartTime = new Date();
        this.logsDir = path.join(process.cwd(), 'logs');
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Ensure logs directory exists
            await fs.ensureDir(this.logsDir);
            
            // Create session log file
            this.sessionLogFile = path.join(
                this.logsDir, 
                `session-${this.formatDate(this.sessionStartTime)}.log`
            );
            
            // Write session start header
            await this.writeSessionHeader();
            
            this.isInitialized = true;
            logger.info('File manager initialized successfully', {
                logsDir: this.logsDir,
                sessionLogFile: this.sessionLogFile
            });
            
        } catch (error) {
            logger.error('Failed to initialize file manager:', error);
            throw error;
        }
    }

    async writeSessionHeader() {
        const header = [
            '='.repeat(80),
            `VEO3-Angel Session Log`,
            `Started: ${this.sessionStartTime.toISOString()}`,
            `Application: ${process.env.APP_NAME || 'VEO3-Angel'} v${process.env.APP_VERSION || '1.0.0'}`,
            '='.repeat(80),
            ''
        ].join('\n');

        await fs.writeFile(this.sessionLogFile, header, 'utf8');
    }

    async logPromptRequest(userPrompt, enhancedPrompt, metadata = {}) {
        if (!this.isInitialized) {
            throw new Error('File manager not initialized');
        }

        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                userPrompt,
                enhancedPrompt,
                metadata
            };

            // Add to session log array
            this.sessionLog.push(logEntry);

            // Format for file output
            const fileEntry = [
                `[${timestamp}] PROMPT REQUEST`,
                `-`.repeat(50),
                `INPUT: ${userPrompt}`,
                '',
                `OUTPUT: ${enhancedPrompt}`,
                '',
                `METADATA: ${JSON.stringify(metadata, null, 2)}`,
                '='.repeat(80),
                ''
            ].join('\n');

            // Append to session log file
            await fs.appendFile(this.sessionLogFile, fileEntry, 'utf8');

            logger.info('Prompt request logged', {
                timestamp,
                inputLength: userPrompt.length,
                outputLength: enhancedPrompt.length
            });

            return logEntry;

        } catch (error) {
            logger.error('Error logging prompt request:', error);
            throw error;
        }
    }

    async savePromptToFile(prompt, filename, filepath) {
        try {
            // Ensure the directory exists
            await fs.ensureDir(path.dirname(filepath));

            // Create full file path
            const fullPath = path.join(filepath, filename);

            // Add timestamp and metadata header
            const timestamp = new Date().toISOString();
            const fileContent = [
                `# VEO3 Enhanced Prompt`,
                `# Generated: ${timestamp}`,
                `# Created with VEO3-Angel`,
                '',
                prompt
            ].join('\n');

            // Write the file
            await fs.writeFile(fullPath, fileContent, 'utf8');

            logger.info('Prompt saved to file', {
                filename,
                filepath: fullPath,
                size: fileContent.length
            });

            return {
                success: true,
                filename,
                filepath: fullPath,
                size: fileContent.length,
                timestamp
            };

        } catch (error) {
            logger.error('Error saving prompt to file:', error);
            throw error;
        }
    }

    async getSessionLog() {
        return {
            sessionStartTime: this.sessionStartTime,
            logCount: this.sessionLog.length,
            logs: this.sessionLog,
            sessionFile: this.sessionLogFile
        };
    }

    async exportSessionLog(exportPath, filename) {
        try {
            const sessionData = await this.getSessionLog();
            
            // Create export content
            const exportContent = [
                `# VEO3-Angel Session Export`,
                `# Session Started: ${sessionData.sessionStartTime.toISOString()}`,
                `# Total Requests: ${sessionData.logCount}`,
                `# Exported: ${new Date().toISOString()}`,
                '',
                '='.repeat(80),
                ''
            ].join('\n');

            // Add each log entry
            const logEntries = sessionData.logs.map(log => [
                `## Request - ${log.timestamp}`,
                '',
                `**Input:**`,
                log.userPrompt,
                '',
                `**Enhanced Output:**`,
                log.enhancedPrompt,
                '',
                `**Metadata:**`,
                '```json',
                JSON.stringify(log.metadata, null, 2),
                '```',
                '',
                '-'.repeat(80),
                ''
            ].join('\n')).join('\n');

            const fullContent = exportContent + logEntries;
            const fullPath = path.join(exportPath, filename);

            await fs.writeFile(fullPath, fullContent, 'utf8');

            return {
                success: true,
                filepath: fullPath,
                logCount: sessionData.logCount,
                size: fullContent.length
            };

        } catch (error) {
            logger.error('Error exporting session log:', error);
            throw error;
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateTime(date) {
        return date.toISOString().replace(/[:.]/g, '-').split('.')[0];
    }

    generateFilename(prompt, maxLength = 50) {
        // Create safe filename from prompt
        const safePrompt = prompt
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .substring(0, maxLength);

        const timestamp = this.formatDateTime(new Date());
        return `veo3-prompt-${safePrompt}-${timestamp}.txt`;
    }

    async cleanupOldLogs(daysToKeep = 30) {
        try {
            const files = await fs.readdir(this.logsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            let cleanedCount = 0;

            for (const file of files) {
                if (file.startsWith('session-') && file.endsWith('.log')) {
                    const filePath = path.join(this.logsDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        await fs.remove(filePath);
                        cleanedCount++;
                    }
                }
            }

            logger.info(`Cleaned up ${cleanedCount} old log files`);
            return cleanedCount;

        } catch (error) {
            logger.error('Error cleaning up old logs:', error);
            throw error;
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            sessionStartTime: this.sessionStartTime,
            logCount: this.sessionLog.length,
            sessionLogFile: this.sessionLogFile,
            logsDirectory: this.logsDir
        };
    }
}

// Export singleton instance
module.exports = new FileManager();
