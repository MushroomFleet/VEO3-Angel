# VEO3-Angel 🎬✨

**VEO3-Angel** is a desktop application that transforms basic video ideas into detailed, optimized prompts for Google's VEO3 video generation model. Built with Electron, Express, and powered by multiple AI providers (Anthropic Claude & OpenRouter), it provides an intuitive interface for creating professional-grade video prompts with access to 300+ AI models.

## [Check Releases for the Windows Installer](https://github.com/MushroomFleet/VEO3-Angel/releases)

![VEO3-Angel Interface](https://github.com/MushroomFleet/VEO3-Angel/blob/main/veo3-angel.png)

## Features

### 🎯 Core Functionality
- **Smart Prompt Enhancement**: Transform simple ideas into detailed VEO3 prompts
- **Multi-Provider Support**: Choose between Anthropic Claude or 300+ OpenRouter models
- **10-Category Analysis**: Break down prompts into VEO3's optimal structure
- **Enhanced Example Library**: Modular collections of proven VEO3 prompts
- **Real-time Processing**: Instant enhancement with your preferred AI model

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
- **AI Provider API Key** (choose one):
  - **Anthropic API Key** ([Get one here](https://console.anthropic.com/)) - Access to Claude models
  - **OpenRouter API Key** ([Get one here](https://openrouter.ai/)) - Access to 300+ models including Claude, GPT, Gemini, and more

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
4. **Configure your API key** (choose one or both):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your preferred provider's API key:
   
   **For Anthropic Claude:**
   ```
   ANTHROPIC_API_KEY=sk-ant-your_actual_api_key_here
   ```
   
   **For OpenRouter (300+ models):**
   ```
   OPENROUTER_API_KEY=sk-or-your_actual_api_key_here
   ```
   
   **For both providers:**
   ```
   ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
   OPENROUTER_API_KEY=sk-or-your_openrouter_key_here
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
| `ANTHROPIC_API_KEY` | Your Anthropic Claude API key | ✅ One provider required |
| `OPENROUTER_API_KEY` | Your OpenRouter API key | ✅ One provider required |
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
- Check your API keys in `.env` file:
  - `ANTHROPIC_API_KEY` should start with `sk-ant-`
  - `OPENROUTER_API_KEY` should start with `sk-or-`
- Verify internet connection
- Ensure API key has sufficient credits
- Try the first-time setup configuration popup

**❌ "Invalid API key format"**
- Anthropic keys must start with `sk-ant-`
- OpenRouter keys must start with `sk-or-`
- Check for extra spaces or missing characters

**❌ "Examples not loading"**
- Check that examples files are present in `assets/examples/`
- Try restarting the application
- Check console logs for path errors

**❌ "Server failed to start"**
- Check if port 3000 is available
- Run `npm install` to ensure dependencies
- Check logs in the console

**❌ "Enhancement takes too long"**
- Large prompts may take 30-60 seconds
- Check your internet connection
- Try switching AI provider (Anthropic vs OpenRouter)
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

VEO3-Angel supports multiple AI providers with different pricing:

### Anthropic Claude
- **Average cost**: $0.01-0.05 per prompt enhancement
- **Model used**: Claude 3.5 Sonnet
- **Typical usage**: 1000-3000 tokens per request
- **Monitor usage**: [Anthropic Console](https://console.anthropic.com/)

### OpenRouter (300+ Models)
- **Average cost**: $0.001-0.10 per prompt enhancement (varies by model)
- **Popular models**: GPT-4, Claude, Gemini, Llama, Mistral
- **Benefits**: Model variety, competitive pricing, fallback options
- **Monitor usage**: [OpenRouter Dashboard](https://openrouter.ai/activity)

**Cost-saving tips:**
- Start with OpenRouter for model variety and competitive pricing
- Use Anthropic direct for guaranteed Claude access
- Configure both providers for automatic fallback

## What's New in v1.9.0

### 🚀 Major Features
- **Multi-Provider Support**: Added OpenRouter integration alongside Anthropic Claude
- **300+ AI Models**: Access to GPT, Claude, Gemini, Llama, Mistral, and more via OpenRouter
- **Enhanced First-Time Setup**: Improved configuration popup with proper API key validation
- **Fixed Examples System**: Resolved path issues preventing examples from loading in installed versions

### 🔧 Technical Improvements
- **Smart API Key Validation**: Proper validation for both Anthropic (`sk-ant-`) and OpenRouter (`sk-or-`) keys
- **Modular Examples**: Enhanced example library with organized collections
- **Better Error Handling**: Improved user feedback for configuration issues
- **Path Resolution**: Fixed examples directory detection for both development and production

### 🎯 User Experience
- **Provider Selection**: Choose your preferred AI provider during setup
- **Fallback Support**: Automatic switching between providers if one fails
- **Cost Optimization**: Compare pricing across different models and providers
- **Enhanced Validation**: Clear error messages for API key format issues

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
