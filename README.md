# VEO3-Angel 🎬✨

**VEO3-Angel** is a desktop application that transforms basic video ideas into detailed, optimized prompts for Google's VEO3 video generation model. Built with Electron, Express, and powered by Anthropic's Claude AI, it provides an intuitive interface for creating professional-grade video prompts.

![VEO3-Angel Interface](https://github.com/MushroomFleet/VEO3-Angel/blob/main/veo3-angel.png)

## Features

### 🎯 Core Functionality
- **Smart Prompt Enhancement**: Transform simple ideas into detailed VEO3 prompts
- **10-Category Analysis**: Break down prompts into VEO3's optimal structure
- **Example Library**: Built-in collection of proven VEO3 prompts
- **Real-time Processing**: Instant enhancement with Claude AI integration

### 🎨 User Interface
- **Two View Modes**: Detailed (category breakdown) or Basic (input → output)
- **Copy & Save**: Easy clipboard copy and file export
- **Session Logging**: Track and export your prompt enhancement history
- **Keyboard Shortcuts**: Efficient workflow with hotkeys

### 🔧 Technical Features
- **Local Processing**: Runs entirely on your machine
- **Secure API Integration**: Your API keys stay private
- **Cross-Platform**: Windows, macOS, and Linux support
- **Offline Capability**: Works without internet once set up

## Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone or download** this repository
2. **Navigate** to the project directory:
   ```bash
   cd veo3-angel
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Configure your API key**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Build standalone app:**
```bash
npm run build
```

## How to Use

### Basic Workflow

1. **Enter your video idea** in the input field
   - Example: "A person walking on a beach at sunset"

2. **Choose your options**:
   - ✅ Use examples for inspiration (recommended)
   - 🔄 Switch between Detailed/Basic view

3. **Click "Enhance Prompt"** or press `Ctrl+Enter`

4. **Review the results**:
   - **Detailed View**: See 10-category breakdown
   - **Enhanced Prompt**: Copy or save the optimized prompt

5. **Use the enhanced prompt** in VEO3 for better results!

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Enhance Prompt | `Ctrl+Enter` |
| Copy Result | `Ctrl+C` |
| Save Prompt | `Ctrl+S` |
| Random Example | `F1` |
| Settings | `Ctrl+,` |
| Toggle View | `Ctrl+D` |

## VEO3 Prompt Categories

VEO3-Angel structures prompts using these 10 categories:

1. **Scene Description** - Overall scene setup
2. **Visual Style** - Aesthetic and artistic direction
3. **Camera Movement** - How the camera moves
4. **Main Subject** - Primary focus of the video
5. **Background Setting** - Environment and location
6. **Lighting/Mood** - Atmosphere and tone
7. **Audio Cue** - Sound effects and music
8. **Color Palette** - Color scheme and mood
9. **Dialogue/Background Noise** - Speech and ambient sounds
10. **Subtitles & Language** - Text and language settings

## Example Transformation

**Input:**
```
A cat playing with a ball
```

**Enhanced Output:**
```
A close-up cinematic shot of an adorable orange tabby cat with bright green eyes playfully batting at a colorful yarn ball in a cozy living room setting. The camera starts with a wide shot and slowly dollies in to capture the cat's focused expression and quick paw movements. Warm afternoon sunlight streams through nearby windows, creating soft shadows and highlighting the cat's fur texture. The scene features a warm color palette of oranges, creams, and soft browns. The audio includes gentle purring, the soft sound of paws on carpet, and peaceful ambient room tone. Shot in a heartwarming, family-friendly style with shallow depth of field to keep focus on the cat's playful interaction.
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic Claude API key | ✅ Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `SERVER_PORT` | Server port (default: 3000) | No |
| `LOG_LEVEL` | Logging level (info/debug/error) | No |

### Application Settings

Access settings via the gear icon or `Ctrl+,`:
- **API Status**: Check connection health
- **Session Statistics**: View usage stats
- **Export Session**: Download session history

## Development

### Project Structure
```
veo3-angel/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # Frontend (HTML/CSS/JS)
│   └── server/         # Express backend
├── assets/             # System prompt & examples
├── logs/              # Application logs
└── dist/              # Built application
```

### Building from Source

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

### Adding New Features

- **Frontend**: Edit files in `src/renderer/`
- **Backend**: Modify `src/server/` services
- **Electron**: Update `src/main/main.js`
- **Prompts**: Enhance `assets/veo3-assistant-system-prompt.md`

## Troubleshooting

### Common Issues

**❌ "API connection failed"**
- Check your `ANTHROPIC_API_KEY` in `.env`
- Verify internet connection
- Ensure API key has sufficient credits

**❌ "Server failed to start"**
- Check if port 3000 is available
- Run `npm install` to ensure dependencies
- Check logs in the console

**❌ "Enhancement takes too long"**
- Large prompts may take 30-60 seconds
- Check your internet connection
- Try again with shorter input

**❌ "Categories not showing"**
- Switch to "Detailed" view mode
- Categories only appear after enhancement
- Try refreshing the application

### Getting Help

1. **Check the logs** in the console or `logs/` directory
2. **Restart the application** - many issues resolve with a restart
3. **Verify your API key** is correct and has credits
4. **Try a simple test prompt** like "a dog running"

## API Costs

VEO3-Angel uses Anthropic's Claude AI:
- **Average cost**: $0.01-0.05 per prompt enhancement
- **Model used**: Claude 3.5 Sonnet
- **Typical usage**: 1000-3000 tokens per request

Monitor your usage at [Anthropic Console](https://console.anthropic.com/).

## Privacy & Security

- ✅ **Local processing**: Application runs on your machine
- ✅ **API key security**: Keys stored locally only
- ✅ **No data collection**: We don't collect or store your prompts
- ✅ **Session logs**: Kept locally for your reference only

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Acknowledgments

- **Google VEO3** - For the amazing video generation technology
- **Anthropic Claude** - For the prompt enhancement AI
- **Electron** - For cross-platform desktop capabilities
- **The community** - For prompt examples and feedback

## Support

- 🐛 **Report bugs**: [GitHub Issues](https://github.com/your-repo/veo3-angel/issues)
- 💡 **Feature requests**: [GitHub Discussions](https://github.com/your-repo/veo3-angel/discussions)
- 📚 **Documentation**: [Wiki](https://github.com/your-repo/veo3-angel/wiki)

---

**Made with ❤️ for the video generation community**

*Transform your ideas into cinematic VEO3 prompts with VEO3-Angel!*
