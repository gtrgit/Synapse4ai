# Synapse for AI

<div align="center">
  <img src="https://raw.githubusercontent.com/gtrgit/synapse4ai/main/SynapseLogo.png" alt="Synapse Logo" width="150"/>
  <h3>Extending Human Cognition Through AI + Knowledge Graphs</h3>
  <p>
    <a href="https://www.synapse4ai.xyz">Website</a> •
    <a href="#installation">Installation</a> •
    <a href="#features">Features</a> •
    <a href="#usage">Usage</a> •
    <a href="#configuration">Configuration</a>
  </p>
  <p>
    <img src="https://img.shields.io/github/v/release/gtrgit/synapse4ai" alt="Version"/>
    <img src="https://img.shields.io/github/license/gtrgit/synapse4ai" alt="License"/>
    <img src="https://img.shields.io/github/issues/gtrgit/synapse4ai" alt="Issues"/>
  </p>
</div>

## Overview

**Synapse** creates a bidirectional interface between your personal knowledge graph in LogSeq and powerful AI models like Claude, OpenAI, and Grok. It goes beyond simple AI chat by implementing a Tag-Based Gravity System that creates semantic relationships between concepts in your knowledge base.

With Synapse, AI responses are fully integrated into your knowledge graph through intelligent auto-linking, context-aware responses, and automatic entity page creation.

![Synapse for AI](./kevb.gif)


### What is LogSeq?

LogSeq is an open-source knowledge management application that works on top of local plain-text Markdown files. It's designed around linking concepts together in a graph structure, similar to how your brain connects ideas. Unlike traditional note-taking apps, LogSeq allows you to create a network of interconnected thoughts, making it ideal for personal knowledge management, research, and learning. Synapse enhances LogSeq by adding AI capabilities that understand and integrate with this knowledge graph structure.

## Installation

### Step 1: Install LogSeq

1. **Download LogSeq** from the [official website](https://logseq.com/)
   - Available for Windows, macOS, and Linux
   - Choose the appropriate installer for your platform

2. **Install LogSeq**
   - Windows: Run the downloaded .exe installer
   - macOS: Drag the application to your Applications folder
   - Linux: Use the AppImage or appropriate package manager

3. **Set up LogSeq**
   - Launch the application
   - Create a new graph or open an existing one
   - Familiarize yourself with the basic interface

### Step 2: Install Synapse for LogSeq

#### Method 1: Install from LogSeq Marketplace (Recommended)

1. **Open LogSeq**
   - Launch LogSeq and open your graph

2. **Open Plugins Marketplace**
   - Click on the three dots (⋮) in the right sidebar
   - Select "Plugins"
   - Click "Marketplace"

3. **Find and Install Synapse**
   - Search for "Synapse for LogSeq" or "Synapse4AI"
   - Click "Install"
   - Restart LogSeq when prompted

#### Method 2: Manual Installation

1. **Download Synapse**
   - Go to the [Releases page](https://github.com/gtrgit/synapse4ai/releases)
   - Download the latest release zip file

2. **Install in LogSeq**
   - Open LogSeq
   - Click on the three dots (⋮) in the right sidebar
   - Select "Plugins"
   - Click on "Load unpacked plugin". If not available, see NOTE below.
   - Select the downloaded zip file

3. **Enable the Plugin**
   - After installation, click the toggle to enable Synapse
   - Restart LogSeq to apply changes
  
   - NOTE: Developer mode is required to add a local plugin manually. Go to top-right ...
   - Settings/Advanced/Developer mode = On

## Features

- **Multi-Provider AI Integration**: Seamlessly use Claude, OpenAI, or Grok with simple switching between providers
- **Intelligent Auto-Linking**: Automatically adds [[brackets]] around important concepts to organically grow your knowledge graph
- **Knowledge Graph Mode**: Create dedicated pages for comprehensive responses with proper semantic linking
- **Entity Page Creation**: Automatically create pages for concepts mentioned in AI responses
- **Semantic Concept Mapping**: Discover hidden connections between ideas in your knowledge graph
- **Tag-Based Gravity System**: Create intuitive knowledge relationships through shared tags
- **Native Block Formatting**: AI responses appear as native LogSeq blocks with proper hierarchy

## Usage

### Slash Commands

- `/synapse` - Show help and available commands
- `/ai` - Create an AI prompt with current page context
- `/ask` - Submit the current block as a prompt to AI
- `/apikey` - Configure your API keys

### Response Modes

#### Knowledge Graph Mode (Default)
- Creates a dedicated page for each response with proper linking
- Automatically creates entity pages for concepts mentioned
- Example: `/ai What are the key components of a distributed system?`

#### Inline Mode
- Add `--kgoff` to your prompt for an inline response
- Response appears directly under your prompt in the current page
- Example: `/ai What are the key components of a distributed system? --kgoff`

### Context Gathering

Synapse automatically gathers context from:
- Current page content
- Block hierarchy
- Page properties and tags

This context enriches AI responses with awareness of your existing knowledge graph.

## Configuration

### Setting Up API Keys

1. **Run the API Key Setup Command**
   - Type `/apikey` in any block
   - Follow the instructions to configure your API keys

2. **Using the Settings UI**
   - Click the Synapse icon in the toolbar
   - Enter your API keys for each provider
   - Select your active provider

### Provider Selection

You can quickly switch between providers using:
- `/provider_claude` - Switch to Claude
- `/provider_openai` - Switch to OpenAI
- `/provider_grok` - Switch to Grok

### Advanced Settings

Access additional settings via the Synapse settings page:
- Auto-linking behavior
- Entity page creation
- Default response modes

## Examples

### Creating a Knowledge Page

```
/ai Explain the concept of extended cognition and how it relates to knowledge management systems
```

This will create a fully linked knowledge page about extended cognition with proper connections to related concepts in your graph.

### Asking a Quick Question

```
/ai What are the main benefits of graph-based note-taking? --kgoff
```

This will provide an inline response about graph-based note-taking without creating a separate page.

### Using Page Context

1. Navigate to a page about a specific topic
2. Use `/ai` to create a prompt
3. Ask a question related to the page content
4. Synapse will use the page content as context for the response

## Troubleshooting

### Common Issues

- **API Key Errors**: Ensure you've correctly entered your API keys for each provider
- **Slow Responses**: Large knowledge graphs may require more time for context processing
- **Plugin Not Loading**: Try restarting LogSeq or reinstalling the plugin

### Getting Help

- Report issues on [GitHub](https://github.com/gtrgit/synapse4ai/issues)
- Join our [Discord community](https://discord.gg/DNTHsGZeGR)
- Contact support at grant@netrunners.xyz

## Privacy & Security

- All API keys are stored locally and never transmitted except to the respective AI providers
- Your knowledge graph data is processed locally before being used in prompts
- Only the specific context needed is sent to AI providers, never your entire graph

## License

Synapse for LogSeq is licensed under the MIT License. See [LICENSE](LICENSE) for more information.

## Support the Project

If you find Synapse valuable, please consider:
- Starring the repository on GitHub
- Sharing with fellow LogSeq users
- Becoming a sponsor:

<div align="center">
  <a href="https://github.com/sponsors/gtrgit">
    <img src="https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white" alt="Sponsor gtrgit"/>
  </a>
</div>

---

<div align="center">
  <p>SYNAPSE4AI © 2025 - EXTENDING HUMAN COGNITION</p>
  <p>Created by <a href="https://github.com/gtrgit">Grant Ryan</a></p>
</div>
