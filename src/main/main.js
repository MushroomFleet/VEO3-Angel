const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

class VEO3AngelApp {
    constructor() {
        this.mainWindow = null;
        this.serverProcess = null;
        this.isQuitting = false;
        
        this.init();
    }

    init() {
        // Handle app ready
        app.whenReady().then(() => {
            this.createWindow();
            this.setupMenu();
            this.startServer();
        });

        // Handle window creation on macOS
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        // Handle app quit
        app.on('before-quit', () => {
            this.isQuitting = true;
        });

        app.on('window-all-closed', () => {
            this.cleanup();
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // Security: prevent new window creation
        app.on('web-contents-created', (event, contents) => {
            contents.on('new-window', (event, navigationUrl) => {
                event.preventDefault();
                shell.openExternal(navigationUrl);
            });
        });
    }

    createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true
            },
            icon: this.getAppIcon(),
            title: 'VEO3-Angel - Video Generation Assistant',
            show: false, // Don't show until ready
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
        });

        // Load the app after server starts
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            // Focus the window
            if (process.platform === 'darwin') {
                app.dock.show();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        // Development tools
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }

        console.log('🖥️ Main window created');
    }

    async startServer() {
        try {
            console.log('🚀 Starting server...');
            
            // Import and run the server directly within this process
            const serverPath = path.join(__dirname, '../server/server.js');
            
            // Set up server ready detection
            const originalConsoleLog = console.log;
            let serverReady = false;
            
            console.log = (...args) => {
                originalConsoleLog(...args);
                const message = args.join(' ');
                if (message.includes('VEO3-Angel server running') && !serverReady) {
                    serverReady = true;
                    setTimeout(() => {
                        this.loadApp();
                    }, 1000);
                }
            };
            
            // Require and start the server module
            delete require.cache[require.resolve(serverPath)]; // Clear cache in case of restart
            require(serverPath);
            
            console.log('✅ Server started successfully');
            
            // Restore original console.log after a delay
            setTimeout(() => {
                console.log = originalConsoleLog;
            }, 5000);

        } catch (error) {
            console.error('Failed to start server:', error);
            this.showServerError();
        }
    }

    loadApp() {
        if (this.mainWindow) {
            this.mainWindow.loadURL('http://localhost:3000');
            console.log('📱 Loading application interface');
        }
    }

    showServerError() {
        if (this.mainWindow) {
            dialog.showErrorBox(
                'Server Error',
                'Failed to start the VEO3-Angel server. Please check your configuration and try again.'
            );
        }
    }

    getAppIcon() {
        // Return appropriate icon path for the platform
        const iconName = process.platform === 'win32' ? 'icon.ico' : 
                        process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
        
        return path.join(__dirname, '../../assets', iconName);
    }

    setupMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New Prompt',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            this.sendToRenderer('new-prompt');
                        }
                    },
                    {
                        label: 'Save Prompt',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => {
                            this.sendToRenderer('save-prompt');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Export Session',
                        accelerator: 'CmdOrCtrl+E',
                        click: () => {
                            this.sendToRenderer('export-session');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' },
                    { type: 'separator' },
                    {
                        label: 'Clear Input',
                        accelerator: 'CmdOrCtrl+Backspace',
                        click: () => {
                            this.sendToRenderer('clear-input');
                        }
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Toggle Detailed View',
                        accelerator: 'CmdOrCtrl+D',
                        click: () => {
                            this.sendToRenderer('toggle-view');
                        }
                    },
                    { type: 'separator' },
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Tools',
                submenu: [
                    {
                        label: 'Random Example',
                        accelerator: 'F1',
                        click: () => {
                            this.sendToRenderer('random-example');
                        }
                    },
                    {
                        label: 'Enhance Prompt',
                        accelerator: 'CmdOrCtrl+Return',
                        click: () => {
                            this.sendToRenderer('enhance-prompt');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Settings',
                        accelerator: 'CmdOrCtrl+,',
                        click: () => {
                            this.sendToRenderer('show-settings');
                        }
                    }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About VEO3-Angel',
                        click: () => {
                            this.showAbout();
                        }
                    },
                    {
                        label: 'VEO3 Documentation',
                        click: () => {
                            shell.openExternal('https://deepmind.google/technologies/veo/');
                        }
                    },
                    {
                        label: 'Report Issue',
                        click: () => {
                            shell.openExternal('https://github.com/your-repo/veo3-angel/issues');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'System Information',
                        click: () => {
                            this.showSystemInfo();
                        }
                    }
                ]
            }
        ];

        // macOS specific menu adjustments
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });

            // Window menu for macOS
            template.push({
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            });
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    sendToRenderer(channel, data = null) {
        if (this.mainWindow && this.mainWindow.webContents) {
            this.mainWindow.webContents.executeJavaScript(`
                if (window.veo3Angel && window.veo3Angel.handleMenuAction) {
                    window.veo3Angel.handleMenuAction('${channel}', ${JSON.stringify(data)});
                }
            `);
        }
    }

    showAbout() {
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About VEO3-Angel',
            message: 'VEO3-Angel',
            detail: `Version: 1.6.0
Platform: ${process.platform}
Electron: ${process.versions.electron}
Node.js: ${process.versions.node}

VEO3-Angel is a desktop application that helps enhance basic video ideas into detailed, optimized prompts for Google's VEO3 video generation model.

Created with ❤️ for the video generation community.`,
            buttons: ['OK']
        });
    }

    showSystemInfo() {
        const info = {
            'Application Version': '1.6.0',
            'Electron Version': process.versions.electron,
            'Node.js Version': process.versions.node,
            'Chrome Version': process.versions.chrome,
            'V8 Version': process.versions.v8,
            'OS': `${process.platform} ${process.arch}`,
            'Memory Usage': `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
        };

        const infoText = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'System Information',
            message: 'VEO3-Angel System Information',
            detail: infoText,
            buttons: ['OK', 'Copy to Clipboard']
        }).then((result) => {
            if (result.response === 1) {
                require('electron').clipboard.writeText(infoText);
            }
        });
    }

    cleanup() {
        console.log('🧹 Cleaning up...');
        
        // Since the server runs in the same process, we don't need to kill a separate process
        // The server will shut down when the main process exits
        // We could add graceful shutdown logic here if needed
    }
}

// Create the application instance
new VEO3AngelApp();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
