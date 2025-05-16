


// ███████╗██╗   ██╗███╗   ██╗ █████╗ ██████╗ ███████╗███████╗██╗  ██╗ █████╗ ██╗
// ██╔════╝╚██╗ ██╔╝████╗  ██║██╔══██╗██╔══██╗██╔════╝██╔════╝██║  ██║██╔══██╗██║
// ███████╗ ╚████╔╝ ██╔██╗ ██║███████║██████╔╝███████╗█████╗  ███████║███████║██║
// ╚════██║  ╚██╔╝  ██║╚██╗██║██╔══██║██╔═══╝ ╚════██║██╔══╝  ╚════██║██╔══██║██║
// ███████║   ██║   ██║ ╚████║██║  ██║██║     ███████║███████╗     ██║██║  ██║██║
// ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝     ╚═╝╚═╝  ╚═╝╚═╝


// by Grant Ryan
// www.synapse4ai.xyz
// grant@netrunners.xyz                                                                              
// Films and actors linked to Kevin Bacon

// Global instances
let api = null;
let autoLinker = null;
let contextGatherer = null;
let knowledgeGraphEnhancer = null;


/**
 * Process AI prompt and display response with optional knowledge graph enhancement
 * @param {string} prompt User's prompt text
 * @param {string} blockUuid UUID of the current block
 * @param {string} context Optional context information
 */
async function processPrompt(prompt, blockUuid, context = "") {
  try {
    console.log("Processing prompt:", prompt);
    
    // Ensure blockUuid is a string
    if (typeof blockUuid === 'object' && blockUuid !== null) {
      // If it's an object, try to get the uuid property
      if (blockUuid.uuid) {
        blockUuid = blockUuid.uuid;
      } else {
        throw new Error("Invalid block UUID");
      }
    }
    
    // Initialize API if needed
    if (!api) {
      api = new AIConnector({
        provider: logseq.settings?.provider || 'claude',
        apiKey: logseq.settings?.apiKey
      });
      if (!api.apiKey) {
        throw new Error("API not initialized. Please run /apikey to set up.");
      }
    }
    
    // Insert a loading message
    const loadingBlock = await logseq.Editor.insertBlock(
      blockUuid,
      "⏳ Processing your request...",
      { sibling: true }
    );
    
    // Get the loading block's UUID
    const loadingUuid = loadingBlock.uuid || loadingBlock;
    
    // Detect knowledge graph mode
    const knowledgeGraphMode = prompt.toLowerCase().includes("--kg");
    
    // Create context object
    let contextObj = { text: context, tags: [] };
    if (context) {
      // Extract tags from context
      const tags = contextGatherer.extractTags(context);
      contextObj = { 
        text: context, 
        tags: tags,
        knowledgeGraphMode: knowledgeGraphMode
      };
    }
    
    // Get response
    const response = await api.generateResponse(prompt, contextObj);
    
    // Handle knowledge graph mode with entity pages
    if (knowledgeGraphMode) {
      // Extract title and content
      const { titleSuggestion, fullResponse } = response;
      
      // Create a linked page with the full response
      const pageTitle = await knowledgeGraphEnhancer.createLinkedPage(titleSuggestion, fullResponse);
      
      // Create individual entity pages
      const entityPages = await knowledgeGraphEnhancer.createEntityPages(fullResponse);
      
      // Update loading message with results
      await logseq.Editor.updateBlock(
        loadingUuid, 
        `📝 [[${pageTitle}]] - Response created with detailed information and ${entityPages.length} related entity pages`
      );
      
      return loadingUuid;
    } else {
      // Standard mode - parse response into blocks
      const blocks = autoLinker.parseIntoBlocks(response);
      
      // Update loading block with first block content
      if (blocks.length > 0) {
        await logseq.Editor.updateBlock(loadingUuid, blocks[0].content);
        
        // Insert remaining blocks with proper hierarchy
        if (blocks.length > 1) {
          await autoLinker.insertBlocksIntoLogSeq(loadingUuid, blocks.slice(1));
        }
      } else {
        // Fallback if parsing failed
        await logseq.Editor.updateBlock(loadingUuid, response);
      }
      
      return loadingUuid;
    }
  } catch (error) {
    console.error("Error processing prompt:", error);
    
    // Try to show error message, being careful with the UUID
    try {
      let errorUuid = blockUuid;
      if (typeof errorUuid === 'object' && errorUuid !== null && errorUuid.uuid) {
        errorUuid = errorUuid.uuid;
      }
      
      await logseq.Editor.insertBlock(
        errorUuid,
        `❌ Error: ${error.message}`,
        { sibling: true }
      );
    } catch (e) {
      console.error("Failed to insert error message:", e);
    }
    
    // Show UI error
    logseq.UI.showMsg(`Error: ${error.message}`, "error");
    
    return null;
  }
}

/**
 * Initialize the plugin
 */
async function main() {
  console.log("Synapse for LogSeq initializing...");

  // Initialize helper classes
  autoLinker = new AutoLinker();
  await autoLinker.loadExistingConcepts();
  
  contextGatherer = new ContextGatherer();
  knowledgeGraphEnhancer = new KnowledgeGraphEnhancer();

  // Register multi-provider settings schema
  registerMultiProviderSettings();
  
  // Add provider status indicator to the toolbar
  addProviderStatusIndicator();


  
  
  // Initialize API with settings if available
  if (logseq.settings?.apiKey) {
    api = new AIConnector({
      provider: logseq.settings.provider || 'claude',
      apiKey: logseq.settings.apiKey
    });
    console.log(`API initialized with provider: ${logseq.settings.provider || 'claude'}`);
  }
    // Register slash command for Synapse help
    logseq.Editor.registerSlashCommand(
    'synapse',
    async () => {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) return;
      
      // Create header block
      const headerBlock = await logseq.Editor.insertBlock(
        block.uuid,
        "# [[Synapse for LogSeq]] #ai-assistant",
        { sibling: true }
      );
      
      // Add commands section
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "## Available Commands",
        { sibling: false }
      );
      
      const commandsBlock = await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "- Available slash commands:",
        { sibling: false }
      );
      
      // Add command details
      await logseq.Editor.insertBlock(
        commandsBlock.uuid,
        "  - `/synapse` - Show this help message",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        commandsBlock.uuid,
        "  - `/ai` - Create an AI prompt",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        commandsBlock.uuid,
        "  - `/ask` - Submit the current block as a prompt to AI",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        commandsBlock.uuid,
        "  - `/apikey` - Configure your API key",
        { sibling: false }
      );
      
      // Add response modes section with updated descriptions
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "## Response Modes",
        { sibling: false }
      );
      
      const modesBlock = await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "- [[Knowledge Graph Mode]] (default):",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        modesBlock.uuid,
        "  - By default, Synapse creates a dedicated page for each response with proper linking",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        modesBlock.uuid,
        "  - Automatically creates entity pages for concepts mentioned in the response",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        modesBlock.uuid,
        "  - To disable this mode for a single query, add `--kgoff` to your prompt",
        { sibling: false }
      );
      
      const inlineBlock = await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "- [[Inline Mode]]:",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        inlineBlock.uuid,
        "  - Add `--kgoff` to your prompt to get an inline response without creating separate pages",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        inlineBlock.uuid,
        "  - Response will appear directly under your prompt in the current page",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        inlineBlock.uuid,
        "  - To switch back to knowledge graph mode after using inline mode, simply omit `--kgoff` in your next prompt",
        { sibling: false }
      );
      
      // Add configuration section
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "## Configuration",
        { sibling: false }
      );
      
      const configBlock = await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "- Open Synapse settings in LogSeq plugin settings to:",
        { sibling: false }
      );
      
      // Add configuration details
      await logseq.Editor.insertBlock(
        configBlock.uuid,
        "  - Select your preferred AI provider ([[Claude]] / [[OpenAI]] / [[Grok]])",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        configBlock.uuid,
        "  - Configure your API key",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        configBlock.uuid,
        "  - Enable/disable [[Auto-Linking]] feature",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        configBlock.uuid,
        "  - Enable/disable automatic entity page creation",
        { sibling: false }
      );
      
      // Show success message
      logseq.UI.showMsg("Synapse help has been added", "success");
    }
  );
  
  // Register AI prompt command with child block for user input
  logseq.Editor.registerSlashCommand(
    'ai',
    async () => {
      try {
        const block = await logseq.Editor.getCurrentBlock();
        if (!block) return;
        
        // Check if API key is configured
        if (!logseq.settings?.apiKey) {
          await logseq.Editor.insertBlock(
            block.uuid,
            "⚠️ API key not configured. Please run /apikey or configure in settings.",
            { sibling: true }
          );
          return;
        }
        
        // Get context from current page
        const { text: contextText, pageName, tags } = await contextGatherer.gatherPageContext();
        
        // Create prompt header block with context indicator
        let headerText = "🤖 Type your prompt below and use /ask to submit";
        if (contextText && pageName) {
          headerText = `🤖 Type your prompt below and use /ask to submit\n(Context: Using information from current page [[${pageName}]])`;
        }
        
        // Create prompt header block
        const headerBlock = await logseq.Editor.insertBlock(
          block.uuid,
          headerText,
          { sibling: true }
        );
        
        // Get the header block's UUID
        const headerUuid = typeof headerBlock === 'object' ? headerBlock.uuid : headerBlock;
        
        // Create an empty child block for the user to type their prompt
        const promptBlock = await logseq.Editor.insertBlock(
          headerUuid,
          "",  // Empty content for user to fill in
          { sibling: false }  // Make it a child of the header
        );
        
        // Store context for later use
        if (contextText) {
          await logseq.Editor.upsertBlockProperty(
            headerUuid,
            "pageContext",
            contextText
          );
          
          if (tags && tags.length > 0) {
            await logseq.Editor.upsertBlockProperty(
              headerUuid,
              "pageTags",
              tags.join(",")
            );
          }
        }
        
        // Focus the empty prompt block for editing
        if (promptBlock && (promptBlock.uuid || typeof promptBlock === 'string')) {
          const promptUuid = typeof promptBlock === 'object' ? promptBlock.uuid : promptBlock;
          await logseq.Editor.editBlock(promptUuid);
        }
      } catch (error) {
        console.error("Error creating prompt:", error);
        logseq.UI.showMsg(`Error: ${error.message}`, "error");
      }
    }
  );

  // Register ask command to work with nested format
  logseq.Editor.registerSlashCommand(
    'ask',
    async () => {
      try {
        const block = await logseq.Editor.getCurrentBlock();
        if (!block || !block.uuid) {
          logseq.UI.showMsg("Could not determine current block", "warning");
          return;
        }
        
        // Get the prompt text from the current block
        let prompt = block.content || "";
        
        // Check if prompt is empty
        if (!prompt.trim()) {
          logseq.UI.showMsg("Please enter a prompt", "warning");
          return;
        }
        
        // Check if we're in a child block of a prompt header
        let parentBlock = null;
        if (block.parent) {
          try {
            parentBlock = await logseq.Editor.getBlock(block.parent.id);
          } catch (err) {
            console.error("Error getting parent block:", err);
          }
        }
        
        // Initialize API if needed
        if (!api && logseq.settings?.apiKey) {
          api = new AIConnector({
            provider: logseq.settings.provider || 'claude',
            apiKey: logseq.settings.apiKey
          });
        }
        
        // Check if API is initialized
        if (!api) {
          await logseq.Editor.updateBlock(
            block.uuid,
            `${prompt}\n\n⚠️ API key not configured. Please run /apikey or configure in settings.`
          );
          return;
        }
        
        // Update block to show we're processing
        await logseq.Editor.updateBlock(
          block.uuid,
          `${prompt} (processing...)`
        );
        
        // Show loading message
        logseq.UI.showMsg("Processing your request...", "info");
        
        // Check for stored context in parent header block
        let context = "";
        let contextTags = [];
        if (parentBlock && parentBlock.content.includes("Type your prompt below")) {
          // Get context from parent's properties
          const pageContext = await logseq.Editor.getBlockProperty(parentBlock.uuid, "pageContext");
          if (pageContext) {
            context = pageContext;
            
            // Get tags if available
            const tagString = await logseq.Editor.getBlockProperty(parentBlock.uuid, "pageTags");
            if (tagString) {
              contextTags = tagString.split(",").map(t => t.trim());
            }
          }
        }
        
        // If no stored context, gather it fresh
        if (!context) {
          const contextInfo = await contextGatherer.gatherBasicContext(block.uuid);
          context = contextInfo.text;
          contextTags = contextInfo.tags;
        }
        
        // Update prompt block to remove processing indicator
        await logseq.Editor.updateBlock(
          block.uuid,
          prompt
        );
        
        // Get the block after which to insert the response
        // If this is a child of a prompt header, use the parent (header)
        // Otherwise use the current block
        const insertAfterUuid = parentBlock && parentBlock.content.includes("Type your prompt below") 
          ? parentBlock.uuid 
          : block.uuid;
        
        // Process the prompt
        await processPrompt(prompt, insertAfterUuid, context);
        
        // Show success message
        logseq.UI.showMsg("Response added", "success");
      } catch (error) {
        console.error("Error processing request:", error);
        
        // Show error message
        logseq.UI.showMsg(`Error: ${error.message}`, "error");
        
        // Try to update current block with error
        try {
          const block = await logseq.Editor.getCurrentBlock();
          if (block && block.uuid) {
            await logseq.Editor.updateBlock(
              block.uuid,
              `${block.content.replace(" (processing...)", "")}\n\n❌ Error: ${error.message}`
            );
          }
        } catch (err) {
          console.error("Failed to update block with error:", err);
        }
      }
    }
  );



  
  logseq.Editor.registerSlashCommand(
    'apikey',
    async () => {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) return;
      
      // Create informational block pointing to settings
      const headerBlock = await logseq.Editor.insertBlock(
        block.uuid,
        "# API Key Setup for [[Synapse]]",
        { sibling: true }
      );
      
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "## Using the Settings UI",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "1. Click the gear icon in the Synapse toolbar button",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "2. Enter your API keys for each provider you want to use",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "3. Select your active provider from the dropdown",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "## Switching Providers Quickly",
        { sibling: false }
      );
      
      const providerBlock = await logseq.Editor.insertBlock(
        headerBlock.uuid,
        "You can quickly switch between configured providers with these commands:",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        providerBlock.uuid,
        "- `/provider_claude` - Switch to Claude",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        providerBlock.uuid,
        "- `/provider_openai` - Switch to OpenAI",
        { sibling: false }
      );
      
      await logseq.Editor.insertBlock(
        providerBlock.uuid,
        "- `/provider_grok` - Switch to Grok",
        { sibling: false }
      );
      
      // Show settings UI automatically
      logseq.showSettingsUI();
      
      // Show success message
      logseq.UI.showMsg("Opening settings for API key configuration", "success");
    }
  );


  
  // Register save key command with improved block content parsing
  logseq.Editor.registerSlashCommand(
    'savekey',
    async () => {
      try {
        const block = await logseq.Editor.getCurrentBlock();
        if (!block) return;
        
        // Extract provider from block content if specified with the command
        const blockContent = block.content || "";
        const providerMatch = blockContent.match(/\/savekey\s+(\w+)/);
        const providerArg = providerMatch ? providerMatch[1].toLowerCase() : null;
        
        console.log("Block content:", blockContent);
        console.log("Extracted provider:", providerArg);
        
        // Validate provider if specified
        let validProvider = null;
        if (providerArg) {
          if (['claude', 'openai', 'grok'].includes(providerArg)) {
            validProvider = providerArg;
          } else {
            await logseq.Editor.updateBlock(
              block.uuid,
              `⚠️ Invalid provider: "${providerArg}". Available options: claude, openai, grok.`
            );
            logseq.UI.showMsg(`Invalid provider: ${providerArg}`, "warning");
            return;
          }
        }
        
        // Get API key from block content
        let apiKey = blockContent;
        
        // Remove the command part if present
        if (providerMatch) {
          apiKey = apiKey.replace(providerMatch[0], "");
        }
        
        // Handle various formats the key could be in
        apiKey = apiKey
          .replace("Type your Claude API key here and run `/savekey claude`", "")
          .replace("Type your OpenAI API key here and run `/savekey openai`", "")
          .replace("Type your Grok API key here and run `/savekey grok`", "")
          .replace("Type your API key here and run /savekey", "")
          .trim();
        
        // Validate API key
        if (!apiKey || apiKey.length < 10) {
          await logseq.Editor.updateBlock(
            block.uuid,
            `⚠️ Invalid API key. Please enter a valid key (at least 10 characters).`
          );
          logseq.UI.showMsg("Invalid API key - must be at least 10 characters", "warning");
          return;
        }
        
        // Get current settings to determine active provider
        const settings = await logseq.settings;
        
        // Use specified provider or fall back to active provider
        const provider = validProvider || settings.activeProvider || settings.provider || 'claude';
        
        // Set the provider-specific key
        const keyName = `${provider}ApiKey`;
        
        // Update settings with new key
        const updatedSettings = { 
          ...settings,
          [keyName]: apiKey,
          // Also set this as active provider if there isn't one already
          activeProvider: settings.activeProvider || provider
        };
        
        await logseq.updateSettings(updatedSettings);
        
        // Mask the key in the block
        const maskedKey = `****${apiKey.slice(-4)}`;
        await logseq.Editor.updateBlock(
          block.uuid,
          `✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved: ${maskedKey}`
        );
        
        // Reinitialize API with updated settings
        api = new AIConnector(await logseq.settings);
        
        // Show success message
        logseq.UI.showMsg(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved successfully`, "success");
        
        // Update the provider indicator
        updateProviderIndicator();
        
      } catch (error) {
        console.error("Error saving API key:", error);
        logseq.UI.showMsg(`Error: ${error.message}`, "error");
        
        // Update block with error message
        try {
          const block = await logseq.Editor.getCurrentBlock();
          if (block && block.uuid) {
            await logseq.Editor.updateBlock(
              block.uuid,
              `❌ Error saving API key: ${error.message}`
            );
          }
        } catch (err) {
          console.error("Failed to update block with error:", err);
        }
      }
    }
  );




  // Function to reload settings
  function reloadSettings() {
    return new Promise(async (resolve) => {
      try {
        // Get current settings
        const settings = await logseq.settings;
        const activeProvider = settings.activeProvider || settings.provider || 'claude';
        
        // Reinitialize API with the complete settings object
        api = new AIConnector(settings);
        console.log(`API reinitialized with provider: ${activeProvider}`);
        
        resolve(settings);
      } catch (error) {
        console.error("Error reloading settings:", error);
        resolve(null);
      }
    });
  }
  
  // Model handlers with settings reload
  logseq.provideModel({
    showSettings() {
      logseq.showSettingsUI();
    },
    
    async afterSettingsChanged() {
      await reloadSettings();
      updateProviderIndicator(); // Update indicator when settings change
      logseq.UI.showMsg("Settings updated", "success");
    }
  });
  


    //   o
    //   / \
    // /   \
    // /     \
    // /       \
    // /         \
    // o           o
    // / \         /
    // /   \       /
    // /     \     /
    // o       o   o
    // \     / \ /
    // \   /   o
    // \ /
    // o


// Register UI icon in toolbar with embedded network graph SVG
logseq.App.registerUIItem('toolbar', {
  key: 'synapse',
  template: `<a class="button" data-on-click="showSettings">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 500 500" style="vertical-align: middle;">
      <!-- Connection lines -->
      <path d="M215 70 L100 230 L215 400 L350 400 L430 230 L350 70 Z" 
            stroke="#D0D0D0" stroke-width="25" fill="none" />
      <line x1="215" y1="70" x2="350" y2="70" stroke="#87c0f7ff" stroke-width="25" />
      <line x1="100" y1="230" x2="430" y2="230" stroke="#87c0f7ff" stroke-width="25" />
      
      <!-- Nodes -->
      <circle cx="215" cy="70" r="45" fill="#f0c41fff" />
      <circle cx="350" cy="70" r="45" fill="#999999" />
      <circle cx="430" cy="230" r="45" fill="#1ff039ff" />
      <circle cx="350" cy="400" r="45" fill="#999999" />
      <circle cx="215" cy="400" r="45" fill="#f3764cff" />
      <circle cx="100" cy="230" r="45" fill="#999999" />
      
      <!-- Center node (larger) -->
      <circle cx="250" cy="230" r="65" fill="#87c0f7ff" />
    </svg>
  </a>`
});

  // Show welcome message on first load
  setTimeout(() => {
    if (!logseq.settings?.apiKey) {
      logseq.UI.showMsg(
        "Welcome to Synapse! Use /synapse to get started or /apikey to set up your API key",
        "info",
        { timeout: 8000 }
      );
    }
  }, 1000);
  

  // 1. First ensure this function is defined globally, before any function that calls it
async function updateProviderIndicator() {
    try {
      const settings = await logseq.settings;
      const activeProvider = settings.activeProvider || settings.provider || 'claude';
      const providerKey = `${activeProvider}ApiKey`;
      
      const hasValidKey = settings[providerKey] && settings[providerKey].length > 10;
      
      // Update the indicator in DOM
      const indicator = document.getElementById('provider-indicator');
      const nameEl = document.getElementById('provider-name');
      
      if (indicator && nameEl) {
        // Update indicator color
        indicator.className = `provider-indicator ${hasValidKey ? 'provider-active' : 'provider-missing'}`;
        
        // Update provider name
        nameEl.textContent = activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1);
        
        // Update tooltip
        indicator.title = `Using ${activeProvider}${hasValidKey ? '' : ' (API key missing)'}`;
      } else {
        console.log("Provider indicator elements not found in DOM");
      }
    } catch (error) {
      console.error("Error updating provider indicator:", error);
    }
  }


  function addProviderStatusIndicator() {
    // Add custom CSS for the indicator and logo
    logseq.provideStyle(`
      .provider-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 5px;
      }
      .provider-active {
        background-color: #4CAF50;
      }
      .provider-missing {
        background-color: #F44336;
      }
      .provider-name {
        margin-left: 5px;
        font-size: 12px;
      }
      .synapse-logo {
        height: 22px;
        vertical-align: middle;
        margin-right: 5px;
      }
      .synapse-fallback-text {
        font-size: 0.7em; /* 50% smaller text */
        vertical-align: middle;
      }
    `);
  
    // Register UI item for toolbar with logo image
    logseq.App.registerUIItem('toolbar', {
      key: 'synapse',
      template: `
        <div class="synapse-status">
          <a class="button" data-on-click="showSettings">
            <img src="./icon.png" alt="Synapse" class="synapse-logo" onerror="this.onerror=null; this.parentNode.innerHTML='<span class=\"synapse-fallback-text\">Synapse</span>';">
            <span class="provider-name" id="provider-name"></span>
            <span class="provider-indicator" id="provider-indicator"></span>
          </a>
        </div>
      `
    });
    
    // Update the indicator when settings change
    logseq.on('settings:changed', updateProviderIndicator);
    setTimeout(updateProviderIndicator, 1000); // Initial update
  }

  
  // 3. Only then register the provider commands that use these functions
  logseq.Editor.registerSlashCommand(
    'provider_claude',
    async () => {
      await setProvider('claude');
    }
  );
  
  logseq.Editor.registerSlashCommand(
    'provider_openai',
    async () => {
      await setProvider('openai');
    }
  );
  
  logseq.Editor.registerSlashCommand(
    'provider_grok',
    async () => {
      await setProvider('grok');
    }
  );
  
  // 4. Define the shared function to set the provider
  async function setProvider(provider) {
    try {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) return;
      
      // Get current settings
      const currentSettings = await logseq.settings;
      
      // Update settings with new active provider
      const updatedSettings = {
        ...currentSettings,
        activeProvider: provider
      };
      
      // Save updated settings
      await logseq.updateSettings(updatedSettings);
      
      // Get the provider-specific key
      const keyName = `${provider}ApiKey`;
      const hasKey = updatedSettings[keyName] && updatedSettings[keyName].length > 10;
      
      // Update block with confirmation and status
      await logseq.Editor.updateBlock(
        block.uuid,
        `✅ Provider set to: ${provider} ${hasKey ? '(API key configured)' : '(⚠️ API key missing - configure in Settings)'}`
      );
      
      // Update API instance if it exists
      if (api) {
        api.provider = provider;
        api.apiKey = api.getApiKeyForProvider(updatedSettings);
        api.model = api.getDefaultModel();
        
        // Check if we have a key for this provider
        if (api.apiKey) {
          console.log(`API updated to use ${api.provider} model: ${api.model}`);
          logseq.UI.showMsg(`Now using ${provider}`, "success");
        } else {
          console.log(`Warning: No API key found for ${provider}`);
          logseq.UI.showMsg(`Switched to ${provider} but no API key found. Please configure in Settings.`, "warning");
        }
      } else {
        // Initialize API if it doesn't exist
        api = new AIConnector(updatedSettings);
        if (api.apiKey) {
          console.log(`API initialized with provider: ${provider}`);
          logseq.UI.showMsg(`Now using ${provider}`, "success");
        } else {
          console.log(`Warning: No API key found for ${provider}`);
          logseq.UI.showMsg(`Switched to ${provider} but no API key found. Please configure in Settings.`, "warning");
        }
      }
      
      // Update the provider indicator
      try {
        await updateProviderIndicator();
      } catch (indicatorError) {
        console.error("Error updating indicator:", indicatorError);
        // Don't let indicator errors block the main functionality
      }
      
    } catch (error) {
      console.error(`Error setting provider to ${provider}:`, error);
      logseq.UI.showMsg(`Error: ${error.message}`, "error");
    }
  }




    /**
     * Register updated settings schema with multiple API keys
     */
    function registerMultiProviderSettings() {
        logseq.useSettingsSchema([
          {
            key: "website",
            type: "heading",
            title: "Synapse for AI",
            description: "For more information visit <a href='https://synapse4ai.xyz' target='_blank'>synapse4ai.xyz</a>"
        },
        {
            key: "activeProvider",
            type: "enum",
            title: "Active AI Provider",
            description: "Select which AI provider to use",
            default: "claude",
            enumChoices: ["claude", "openai", "grok"],
            enumPicker: "select"
        },
        {
            key: "claudeApiKey",
            type: "string",
            title: "Claude API Key",
            description: "Your API key for Anthropic's Claude",
            inputAs: "password"
        },
        {
            key: "openaiApiKey",
            type: "string",
            title: "OpenAI API Key",
            description: "Your API key for OpenAI's models",
            inputAs: "password"
        },
        {
            key: "grokApiKey",
            type: "string",
            title: "Grok API Key",
            description: "Your API key for xAI's Grok",
            inputAs: "password"
        },
        {
            key: "autoLinking",
            type: "boolean",
            title: "Auto-Linking",
            description: "Automatically add [[brackets]] around concepts",
            default: true
        },
        {
            key: "createEntityPages",
            type: "boolean",
            title: "Create Entity Pages",
            description: "Automatically create pages for entities in responses",
            default: true
        }
        ]);
    }



  console.log("Synapse for LogSeq initialized successfully!");
}

  
  // Shared function to set the provider
  async function setProvider(provider) {
    try {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) return;
      
      // Get current settings
      const currentSettings = await logseq.settings;
      
      // Update settings with new active provider
      const updatedSettings = {
        ...currentSettings,
        activeProvider: provider
      };
      
      // Save updated settings
      await logseq.updateSettings(updatedSettings);
      
      // Get the provider-specific key
      const keyName = `${provider}ApiKey`;
      const hasKey = updatedSettings[keyName] && updatedSettings[keyName].length > 10;
      
      // Update block with confirmation and status
      await logseq.Editor.updateBlock(
        block.uuid,
        `✅ Provider set to: ${provider} ${hasKey ? '(API key configured)' : '(⚠️ API key missing - configure in Settings)'}`
      );
      
      // Update API instance if it exists
      if (api) {
        api.provider = provider;
        api.apiKey = api.getApiKeyForProvider(updatedSettings);
        api.model = api.getDefaultModel();
        
        // Check if we have a key for this provider
        if (api.apiKey) {
          console.log(`API updated to use ${api.provider} model: ${api.model}`);
          logseq.UI.showMsg(`Now using ${provider}`, "success");
        } else {
          console.log(`Warning: No API key found for ${provider}`);
          logseq.UI.showMsg(`Switched to ${provider} but no API key found. Please configure in Settings.`, "warning");
        }
      } else {
        // Initialize API if it doesn't exist
        api = new AIConnector(updatedSettings);
        if (api.apiKey) {
          console.log(`API initialized with provider: ${provider}`);
          logseq.UI.showMsg(`Now using ${provider}`, "success");
        } else {
          console.log(`Warning: No API key found for ${provider}`);
          logseq.UI.showMsg(`Switched to ${provider} but no API key found. Please configure in Settings.`, "warning");
        }
      }
      
      // Update the provider indicator
      updateProviderIndicator();
      
    } catch (error) {
      console.error(`Error setting provider to ${provider}:`, error);
      logseq.UI.showMsg(`Error: ${error.message}`, "error");
    }
  }



// Bootstrap plugin
logseq.ready(main).catch(console.error);// index.js - Synapse for LogSeq - Comprehensive Implementation
// Merged version with nested blocks, multiple AI APIs, and knowledge graph integration
// Global instances





/**
 * AI API Connector for multiple providers
 * Supports Claude, OpenAI, and Grok APIs with enhanced knowledge graph formatting
 */
class AIConnector {
  constructor(settings = {}) {
    this.provider = settings.activeProvider || settings.provider || 'claude';
    this.apiKey = this.getApiKeyForProvider(settings);
    this.model = this.getDefaultModel();
  }
  
   /**
   * Get the appropriate API key for the current provider
   * @param {Object} settings - The plugin settings
   * @returns {string} The API key for the current provider
   */
   getApiKeyForProvider(settings) {
    const provider = this.provider;
    
    // Get provider-specific key
    switch(provider) {
      case 'claude':
        return settings.claudeApiKey || settings.apiKey || '';
      case 'openai':
        return settings.openaiApiKey || settings.apiKey || '';
      case 'grok':
        return settings.grokApiKey || settings.apiKey || '';
      default:
        return settings.claudeApiKey || settings.apiKey || '';
    }
  }

  /**
   * Get default model name based on provider
   * @returns {string} Default model name
   */
  getDefaultModel() {
    switch(this.provider) {
      case 'claude': return 'claude-3-7-sonnet-20250219';
      case 'openai': return 'gpt-4o';
      case 'grok': return 'grok-2';
      default: return 'claude-3-7-sonnet-20250219';
    }
  }


  /**
   * Get the appropriate API key for the current provider
   * @param {Object} settings - The plugin settings
   * @returns {string} The API key for the current provider
   */
  getApiKeyForProvider(settings) {
    const provider = this.provider;
    
    // Get provider-specific key
    switch(provider) {
      case 'claude':
        return settings.claudeApiKey || settings.apiKey || '';
      case 'openai':
        return settings.openaiApiKey || settings.apiKey || '';
      case 'grok':
        return settings.grokApiKey || settings.apiKey || '';
      default:
        return settings.claudeApiKey || settings.apiKey || '';
    }
  }

/**
 * Generate a response using the configured provider with smart fallback
 * @param {string} prompt - User prompt
 * @param {Object} context - Optional context information
 * @returns {Promise<string|Object>} Generated response
 */
async generateResponse(prompt, context = {}) {
    if (!this.apiKey) {
      throw new Error(`No API key configured for ${this.provider}. Please use /apikey to set it up.`);
    }
    
    console.log(`Generating response with ${this.provider} model: ${this.model}`);
    
    // INVERTED LOGIC: Check if knowledge graph mode is explicitly turned OFF
    const kgModeOff = prompt.toLowerCase().includes("--kgoff") || 
                      context.knowledgeGraphModeOff === true;
    
    // Store original provider for fallback purposes
    const originalProvider = this.provider;
    let usedFallback = false;
    
    try {
      // Try with the selected provider
      if (!kgModeOff) {
        console.log("Using knowledge graph response mode (default)");
        return await this.generateKnowledgeGraphResponse(prompt.replace(/--kg/gi, "").trim(), context);
      } else {
        const cleanPrompt = prompt.replace(/--kgoff/gi, "").trim();
        console.log("Knowledge graph mode OFF, using standard response");
        
        switch(this.provider) {
          case 'claude': return await this.generateClaudeResponse(cleanPrompt, context);
          case 'openai': return await this.generateOpenAIResponse(cleanPrompt, context);
          case 'grok': return await this.generateGrokResponse(cleanPrompt, context);
          default: return await this.generateClaudeResponse(cleanPrompt, context);
        }
      }
    } catch (error) {
      console.error(`Error with ${this.provider} API:`, error);
      
      // Only attempt fallback for Grok errors or connectivity issues
      if (this.provider === 'grok' && !usedFallback) {
        const settings = await logseq.settings;
        
        // Try Claude first if available
        if (settings.claudeApiKey && settings.claudeApiKey.length > 10) {
          console.log("Grok API failed. Falling back to Claude...");
          logseq.UI.showMsg("Grok API unavailable. Falling back to Claude...", "info");
          
          // Save current state
          const originalApiKey = this.apiKey;
          const originalModel = this.model;
          
          // Switch to Claude temporarily
          this.provider = 'claude';
          this.apiKey = settings.claudeApiKey;
          this.model = this.getDefaultModel();
          usedFallback = true;
          
          try {
            const response = await this.generateResponse(prompt, context);
            logseq.UI.showMsg("Response generated using Claude (Grok unavailable)", "info");
            
            // Restore original settings
            this.provider = originalProvider;
            this.apiKey = originalApiKey;
            this.model = originalModel;
            
            return response;
          } catch (fallbackError) {
            console.error("Claude fallback also failed:", fallbackError);
            // Restore original settings before trying OpenAI
            this.provider = originalProvider;
            this.apiKey = originalApiKey;
            this.model = originalModel;
            
            // If Claude fails, try OpenAI if available
            if (settings.openaiApiKey && settings.openaiApiKey.length > 10) {
              return this.fallbackToProvider('openai', settings.openaiApiKey, prompt, context);
            }
          }
        } 
        // If no Claude key, try OpenAI if available
        else if (settings.openaiApiKey && settings.openaiApiKey.length > 10) {
          return this.fallbackToProvider('openai', settings.openaiApiKey, prompt, context);
        }
        
        // If we've tried all available fallbacks, throw a helpful error
        throw new Error(`Grok API unavailable and no fallback providers configured. Please set up Claude or OpenAI API keys as fallback options.`);
      }
      
      // If not Grok or no fallback possible, rethrow the original error
      throw error;
    }
  }
  
  /**
   * Helper method for provider fallback
   * @private
   */
  async fallbackToProvider(provider, apiKey, prompt, context) {
    console.log(`Falling back to ${provider}...`);
    logseq.UI.showMsg(`Grok API unavailable. Falling back to ${provider}...`, "info");
    
    // Save current state
    const originalProvider = this.provider;
    const originalApiKey = this.apiKey;
    const originalModel = this.model;
    
    // Switch to fallback provider
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = this.getDefaultModel();
    
    try {
      const response = await this.generateResponse(prompt, context);
      logseq.UI.showMsg(`Response generated using ${provider} (Grok unavailable)`, "info");
      
      // Restore original settings
      this.provider = originalProvider;
      this.apiKey = originalApiKey; 
      this.model = originalModel;
      
      return response;
    } catch (fallbackError) {
      // Restore original settings before propagating error
      this.provider = originalProvider;
      this.apiKey = originalApiKey;
      this.model = originalModel;
      
      console.error(`${provider} fallback also failed:`, fallbackError);
      throw fallbackError;
    }
  }


  
  /**
 * Generate a knowledge graph enhanced response
 * @param {string} prompt - User prompt
 * @param {Object} context - Optional context information 
 * @returns {Promise<Object>} Response with title suggestion and full content
 */
async generateKnowledgeGraphResponse(prompt, context = {}) {
    // Prepare system message for KG response
    const systemMessage = `
  You are an AI assistant helping users build their knowledge graph in LogSeq through the Synapse plugin.
  For this response, you will create a comprehensive knowledge page with the following:
  
  1. TITLE SUGGESTION: Suggest a concise, descriptive title for this knowledge page (without [[brackets]]).
  2. DETAILED CONTENT: Create comprehensive content that:
     - Uses [[Concept Name]] notation for ALL significant concepts, entities, and ideas
     - Uses #tags for categorization and semantic connections
     - Has clear hierarchical structure with headings and nested lists
     - Makes connections to related concepts when possible
  
  IMPORTANT FORMAT: Your response MUST begin with "TITLE: {your title suggestion}" on the first line,
  followed by a blank line, then the detailed content.
  `;
  
    // Format user message with context if available
    let userMessage = prompt;
    if (context && context.text) {
      userMessage = `
  CONTEXT FROM KNOWLEDGE GRAPH:
  ${context.text}
  
  TAGS IN CURRENT CONTEXT:
  ${context.tags ? context.tags.map(t => `#${t}`).join(' ') : ''}
  
  USER QUERY:
  ${prompt}
  
  Please create a knowledge page response starting with "TITLE:" and using [[concept links]] and #tags.
  `;
    }
    
    // Get response from appropriate provider
    let rawResponse;
    console.log(`Using provider ${this.provider} for knowledge graph response`);
    
    try {
      switch(this.provider) {
        case 'openai':
          rawResponse = await this.makeOpenAIRequest(systemMessage, userMessage);
          break;
        case 'grok':
          rawResponse = await this.makeGrokRequest(systemMessage, userMessage);
          break;
        case 'claude':
        default:
          rawResponse = await this.makeClaudeRequest(systemMessage, userMessage);
      }
    } catch (error) {
      console.error(`Error with ${this.provider} API:`, error);
      throw error;
    }
    
    // Extract title and content from response
    const titleMatch = rawResponse.match(/^TITLE:\s*(.+)$/m);
    const titleSuggestion = titleMatch ? titleMatch[1].trim() : "Untitled Knowledge";
    
    // Remove the title line from the full response
    const fullResponse = rawResponse.replace(/^TITLE:\s*.+\n\n?/m, '').trim();
    
    return {
      titleSuggestion,
      fullResponse
    };
  }
  
  /**
   * Make request to Claude API
   * @param {string} systemMessage - System instructions
   * @param {string} userMessage - User message
   * @returns {Promise<string>} Raw response text
   */
  async makeClaudeRequest(systemMessage, userMessage) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4000,
        system: systemMessage,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.content[0].text;
  }
  
  /**
   * Make request to OpenAI API
   * @param {string} systemMessage - System instructions
   * @param {string} userMessage - User message
   * @returns {Promise<string>} Raw response text
   */
  async makeOpenAIRequest(systemMessage, userMessage) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content;
  }
 

/**
 * Make request to Grok API with improved error handling and endpoint testing
 * @param {string} systemMessage - System instructions
 * @param {string} userMessage - User message
 * @returns {Promise<string>} Raw response text
 */
async makeGrokRequest(systemMessage, userMessage) {
    try {
      console.log("Attempting to call Grok API");
      
      // Since we got responses from these endpoints, let's refine our approach
      const potentialEndpoints = [
        {
          url: 'https://api.x.ai/v1/chat/completions',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: {
            model: this.model,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 4000
          }
        },
        {
          url: 'https://api.x.ai/v1/generate', // Try alternative endpoint
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: {
            model: this.model,
            prompt: `${systemMessage}\n\n${userMessage}`,
            max_tokens: 4000
          }
        },
        {
          url: 'https://api.xai.com/v1/chat/completions',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey // Try alternative auth method
          },
          body: {
            model: this.model,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 4000
          }
        }
      ];
      
      // Try each endpoint configuration
      for (const endpoint of potentialEndpoints) {
        try {
          console.log(`Trying Grok endpoint: ${endpoint.url}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
          
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify(endpoint.body),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // Log the status for debugging
          console.log(`${endpoint.url} response status: ${response.status}`);
          
          if (response.ok) {
            const result = await response.json();
            console.log("Grok API response structure:", result);
            
            // Try different possible response structures
            if (result.choices && result.choices[0] && result.choices[0].message) {
              return result.choices[0].message.content;
            } else if (result.content) {
              return result.content;
            } else if (result.response) {
              return result.response;
            } else if (result.text) {
              return result.text;
            } else if (result.message) {
              return result.message;
            } else {
              // If we can't find a standard field, return the whole response
              console.log("Unexpected response structure:", result);
              return JSON.stringify(result);
            }
          } else {
            // Try to get response content even if status is not ok
            try {
              const errorJson = await response.json();
              console.log(`Error response from ${endpoint.url}:`, errorJson);
              // Sometimes APIs return error messages with useful info
              if (errorJson.error && errorJson.error.message) {
                console.log(`API error message: ${errorJson.error.message}`);
              }
            } catch (parseError) {
              const errorText = await response.text();
              console.log(`Error response text from ${endpoint.url}:`, errorText);
            }
          }
        } catch (endpointError) {
          console.error(`Error with endpoint ${endpoint.url}:`, endpointError);
          // Continue to next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      throw new Error("Grok API is currently unavailable. The API might not be publicly accessible yet or requires specific credentials.");
      
    } catch (error) {
      console.error("All Grok API endpoints failed:", error);
      
      // Provide a clear error message
      throw new Error(`Grok API is not currently accessible. Please try Claude or OpenAI instead.`);
    }
  }


  
  /**
   * Generate a response using Claude API
   * @param {string} prompt - User prompt
   * @param {Object} context - Optional context information
   * @returns {Promise<string>} Generated response
   */
  async generateClaudeResponse(prompt, context = {}) {
    try {
      // Prepare system message with Synapse notation instructions
      const systemMessage = `
You are Claude, acting as a knowledge assistant within LogSeq's Synapse plugin. 
Help users extend their knowledge graph by following these Synapse notation rules:

1. ALWAYS use [[Concept Name]] for ALL significant concepts, entities, components, or ideas.
2. Use #tags for categorization and creating semantic connections.
3. Maintain hierarchical structure in responses using proper indentation and lists.
4. Refer to existing concepts in the user's knowledge graph when possible.
5. Structure all responses as properly formatted markdown.
6. Keep responses concise and focused on enhancing the knowledge graph.
`;
      
      // Format user message with context if available
      let userMessage = prompt;
      if (context && context.text) {
        userMessage = `
# Context from knowledge graph
${context.text}

# Tags in current context
${context.tags ? context.tags.map(t => `#${t}`).join(' ') : ''}

# User prompt
${prompt}

Please respond using proper Synapse notation with [[concept links]] and #tags.
`;
      }
      
      return await this.makeClaudeRequest(systemMessage, userMessage);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
  
  /**
   * Generate a response using OpenAI API
   * @param {string} prompt - User prompt
   * @param {Object} context - Optional context information
   * @returns {Promise<string>} Generated response
   */
  async generateOpenAIResponse(prompt, context = {}) {
    try {
      // Prepare system message with Synapse notation instructions
      const systemMessage = `
You are an AI assistant helping users with their LogSeq knowledge graph through the Synapse plugin.
Follow these Synapse notation rules in all responses:

1. ALWAYS use [[Concept Name]] for ALL significant concepts, entities, components, or ideas.
2. Use #tags for categorization and creating semantic connections.
3. Maintain hierarchical structure in responses using proper indentation and lists.
4. Structure all responses as properly formatted markdown.
5. Keep responses concise and focused on enhancing the knowledge graph.
`;
      
      // Format user message with context if available
      let userMessage = prompt;
      if (context && context.text) {
        userMessage = `
Context from my knowledge graph:
${context.text}

Tags: ${context.tags ? context.tags.map(t => `#${t}`).join(' ') : ''}

My query: ${prompt}
`;
      }
      
      return await this.makeOpenAIRequest(systemMessage, userMessage);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
  
  /**
   * Generate a response using Grok API
   * @param {string} prompt - User prompt
   * @param {Object} context - Optional context information
   * @returns {Promise<string>} Generated response
   */
  async generateGrokResponse(prompt, context = {}) {
    try {
      const systemPrompt = `
You are an AI assistant helping users with their LogSeq knowledge graph through the Synapse plugin.
Use [[Concept Name]] notation for important terms and #tags for categories.
Structure all responses as properly formatted markdown with good hierarchical structure.
`;
      
      let userMessage = prompt;
      if (context && context.text) {
        userMessage = `
Context from knowledge graph:
${context.text}

Tags in context: ${context.tags ? context.tags.map(t => `#${t}`).join(' ') : ''}

User question: ${prompt}

Respond using proper LogSeq notation with [[concept links]] and #tags.
`;
      }
      
      return await this.makeGrokRequest(systemPrompt, userMessage);
    } catch (error) {
      console.error('Grok API error:', error);
      throw new Error(`Grok API error: ${error.message}`);
    }
  }
}

/**
 * Process AI prompt and display response with optional knowledge graph enhancement
 * @param {string} prompt User's prompt text
 * @param {string} blockUuid UUID of the current block
 * @param {string} context Optional context information
 */
async function processPrompt(prompt, blockUuid, context = "") {
  try {
    console.log("Processing prompt:", prompt);
    
    // Ensure blockUuid is a string
    if (typeof blockUuid === 'object' && blockUuid !== null) {
      // If it's an object, try to get the uuid property
      if (blockUuid.uuid) {
        blockUuid = blockUuid.uuid;
      } else {
        throw new Error("Invalid block UUID");
      }
    }
    
    // Initialize API if needed
    if (!api) {
      api = new AIConnector({
        provider: logseq.settings?.provider || 'claude',
        apiKey: logseq.settings?.apiKey
      });
      if (!api.apiKey) {
        throw new Error("API not initialized. Please run /apikey to set up.");
      }
    }
    
    // Insert a loading message
    const loadingBlock = await logseq.Editor.insertBlock(
      blockUuid,
      "⏳ Processing your request...",
      { sibling: true }
    );
    
    // Get the loading block's UUID
    const loadingUuid = loadingBlock.uuid || loadingBlock;
    
    // INVERTED LOGIC: Check if knowledge graph mode is explicitly turned OFF
    const kgModeOff = prompt.toLowerCase().includes("--kgoff");
    console.log(`Knowledge graph mode off flag detected: ${kgModeOff}`);
    
    // Create context object
    let contextObj = { text: context, tags: [] };
    if (context) {
      // Extract tags from context
      const tags = contextGatherer.extractTags(context);
      contextObj = { 
        text: context, 
        tags: tags,
        knowledgeGraphModeOff: kgModeOff // Set the OFF flag instead
      };
    } else {
      // Even with no context, still set the KG mode OFF flag if specified
      contextObj.knowledgeGraphModeOff = kgModeOff;
    }
    
    // Log the request
    console.log(`Sending request to API with KG mode ${kgModeOff ? 'OFF' : 'ON (default)'}`);
    
    // Get response (knowledge graph mode is now the default)
    const response = await api.generateResponse(prompt, contextObj);
    
    // Check if we got an object response (KG mode) or string (standard mode)
    const isKGResponse = response && typeof response === 'object' && 
                       response.titleSuggestion && response.fullResponse;
    
    // Handle knowledge graph mode with entity pages (now the default)
    if (isKGResponse) {
      console.log("Processing knowledge graph response");
      
      // Extract title and content
      const { titleSuggestion, fullResponse } = response;
      
      // Create a linked page with the full response
      const pageTitle = await knowledgeGraphEnhancer.createLinkedPage(titleSuggestion, fullResponse);
      
      // Create individual entity pages if enabled
      const createEntityPages = logseq.settings?.createEntityPages !== false;
      let entityPages = [];
      
      if (createEntityPages) {
        entityPages = await knowledgeGraphEnhancer.createEntityPages(fullResponse);
        console.log(`Created ${entityPages.length} entity pages`);
      }
      
      // Update loading message with results
      await logseq.Editor.updateBlock(
        loadingUuid, 
        `📝 [[${pageTitle}]] - Response created with detailed information${
          createEntityPages ? ` and ${entityPages.length} related entity pages` : ''
        }`
      );
      
      return loadingUuid;
    } else {
      // Standard mode (when --kgoff is used) - parse response into blocks
      console.log("Processing standard response (KG mode OFF)");
      const blocks = autoLinker.parseIntoBlocks(response);
      
      // Update loading block with first block content
      if (blocks.length > 0) {
        await logseq.Editor.updateBlock(loadingUuid, blocks[0].content);
        
        // Insert remaining blocks with proper hierarchy
        if (blocks.length > 1) {
          await autoLinker.insertBlocksIntoLogSeq(loadingUuid, blocks.slice(1));
        }
      } else {
        // Fallback if parsing failed
        await logseq.Editor.updateBlock(loadingUuid, response);
      }
      
      return loadingUuid;
    }
  } catch (error) {
    console.error("Error processing prompt:", error);
    
    // Try to show error message, being careful with the UUID
    try {
      let errorUuid = blockUuid;
      if (typeof errorUuid === 'object' && errorUuid !== null && errorUuid.uuid) {
        errorUuid = errorUuid.uuid;
      }
      
      await logseq.Editor.insertBlock(
        errorUuid,
        `❌ Error: ${error.message}`,
        { sibling: true }
      );
    } catch (e) {
      console.error("Failed to insert error message:", e);
    }
    
    // Show UI error
    logseq.UI.showMsg(`Error: ${error.message}`, "error");
    
    return null;
  }
}
/**
 * Basic Auto-Linking System
 * Identifies potential concepts and adds [[brackets]]
 */
class AutoLinker {
  constructor() {
    this.existingConcepts = new Set();
  }
  
  /**
   * Load existing concepts (pages) from LogSeq
   * @returns {Promise<void>}
   */
  async loadExistingConcepts() {
    try {
      const pages = await logseq.Editor.getAllPages();
      this.existingConcepts = new Set(
        pages
          .filter(p => p && p.name)
          .map(p => p.name.trim())
      );
      console.log(`Loaded ${this.existingConcepts.size} existing concepts`);
    } catch (error) {
      console.error('Error loading existing concepts:', error);
    }
  }
  
  /**
   * Process text to add [[brackets]] around concepts
   * @param {string} text - Text to process
   * @returns {string} - Processed text with concept links
   */
  processText(text) {
    if (!text) return '';
    
    // First, protect any existing [[links]] and code blocks
    let processedText = text;
    const protectedSegments = [];
    
    // Protect existing [[links]]
    processedText = processedText.replace(/\[\[(.*?)\]\]/g, (match) => {
      protectedSegments.push(match);
      return `__PROTECTED_${protectedSegments.length - 1}__`;
    });
    
    // Protect code blocks
    processedText = processedText.replace(/```[\s\S]*?```/g, (match) => {
      protectedSegments.push(match);
      return `__PROTECTED_${protectedSegments.length - 1}__`;
    });
    
    // Protect inline code
    processedText = processedText.replace(/`[^`]*`/g, (match) => {
      protectedSegments.push(match);
      return `__PROTECTED_${protectedSegments.length - 1}__`;
    });
    
    // Now process for potential concepts
    // Look for capitalized phrases that might be concepts
    processedText = processedText.replace(/\b([A-Z][a-z0-9]+(?: [A-Z][a-z0-9]+)*)\b/g, (match) => {
      // Skip if it's a common word or too short
      if (match.length < 3) return match;
      
      // Check if it's an existing concept or looks like a proper concept
      if (this.existingConcepts.has(match) || this.shouldBeConceptLink(match)) {
        return `[[${match}]]`;
      }
      
      return match;
    });
    
    // Restore protected segments
    processedText = processedText.replace(/__PROTECTED_(\d+)__/g, (_, index) => {
      return protectedSegments[parseInt(index)];
    });
    
    return processedText;
  }
  
  /**
   * Determine if a phrase should be a concept link
   * @param {string} phrase - Candidate phrase
   * @returns {boolean} - Whether it should be a concept link
   */
  shouldBeConceptLink(phrase) {
    // Skip very common words
    const commonWords = new Set(['The', 'And', 'But', 'Or', 'If', 'Then', 'So', 'Because', 'When', 'Where']);
    if (commonWords.has(phrase)) return false;
    
    // Check if it's a key term (more than one word with capital letters)
    if (phrase.includes(' ') && /^[A-Z]/.test(phrase)) return true;
    
    // Check if it's a technical term or known concept
    const technicalTerms = new Set(['API', 'JSON', 'HTML', 'CSS', 'JavaScript', 'LogSeq', 'Graph', 'Plugin']);
    if (technicalTerms.has(phrase)) return true;
    
    // Default to not linking
    return false;
  }
  
  /**
   * Parse AI response into LogSeq blocks with proper hierarchy
   * @param {string} text - Response text to parse
   * @returns {Array<{content: string, level: number}>} - Array of block objects
   */
  parseIntoBlocks(text) {
    if (!text) return [{ content: "Empty response", level: 0 }];
    
    // Process text to add concept links if auto-linking is enabled
    const processedText = logseq.settings?.autoLinking === false ? 
      text : this.processText(text);
    
    // Split text into lines
    const lines = processedText.split('\n');
    const blocks = [];
    let currentBlock = { content: '', level: 0 };
    let inCodeBlock = false;
    
    lines.forEach(line => {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (currentBlock.content) {
          currentBlock.content += '\n' + line;
        } else {
          currentBlock.content = line;
        }
        return;
      }
      
      // If inside code block, just add the line as is
      if (inCodeBlock) {
        currentBlock.content += '\n' + line;
        return;
      }
      
      // Check for headings
      const headingMatch = line.match(/^(#+)\s+(.+)$/);
      if (headingMatch) {
        // Save previous block if it has content
        if (currentBlock.content) {
          blocks.push(currentBlock);
        }
        
        // Create new block for heading
        currentBlock = {
          content: line,
          level: headingMatch[1].length - 1  // Level based on number of #
        };
        return;
      }
      
      // Check for list items
      const listMatch = line.match(/^(\s*)(-|\*|\+)\s+(.+)$/);
      if (listMatch) {
        // Save previous block if it has content
        if (currentBlock.content) {
          blocks.push(currentBlock);
        }
        
        // Calculate indentation level
        const indentLevel = Math.floor(listMatch[1].length / 2);
        
        // Create new block for list item
        currentBlock = {
          content: `- ${listMatch[3]}`,  // Using - for bullet points
          level: indentLevel + 1  // Add 1 to make it a child of current level
        };
        return;
      }
      
      // Empty line handling
      if (line.trim() === '') {
        if (currentBlock.content) {
          blocks.push(currentBlock);
          currentBlock = { content: '', level: 0 };
        }
        return;
      }
      
      // Normal text line
      if (currentBlock.content) {
        currentBlock.content += '\n' + line;
      } else {
        currentBlock.content = line;
      }
    });
    
    // Add the last block if it has content
    if (currentBlock.content) {
      blocks.push(currentBlock);
    }
    
    // Default block if somehow we got nothing
    if (blocks.length === 0) {
      blocks.push({ content: "No content could be parsed", level: 0 });
    }
    
    return blocks;
  }
  
  /**
   * Insert blocks into LogSeq maintaining hierarchy
   * @param {string} parentUuid - UUID of parent block
   * @param {Array} blocks - Array of block objects
   * @returns {Promise<void>}
   */
  async insertBlocksIntoLogSeq(parentUuid, blocks) {
    // Ensure we have blocks to insert
    if (!blocks || !blocks.length) return;
    
    let previousLevel = 0;
    let parentStack = [parentUuid];
    
    for (const block of blocks) {
      try {
        let targetUuid;
        
        if (block.level > previousLevel) {
          // Child of previous block - get last block's UUID
          targetUuid = parentStack[parentStack.length - 1];
          // Push this as potential parent
          parentStack.push(targetUuid);
        } else if (block.level < previousLevel) {
          // Going up in hierarchy
          const levelsUp = previousLevel - block.level;
          // Pop the stack appropriate number of times
          for (let i = 0; i < levelsUp; i++) {
            parentStack.pop();
          }
          // Get the appropriate parent
          targetUuid = parentStack[parentStack.length - 1];
        } else {
          // Same level - sibling
          targetUuid = parentStack[parentStack.length - 2] || parentUuid;
        }
        
        // Insert the block
        const newBlock = await logseq.Editor.insertBlock(
          targetUuid,
          block.content,
          { sibling: block.level <= previousLevel }
        );
        
        // Update for next iteration
        if (newBlock) {
          if (typeof newBlock === 'object') {
            parentStack[parentStack.length - 1] = newBlock.uuid;
          } else {
            parentStack[parentStack.length - 1] = newBlock;
          }
        }
        
        previousLevel = block.level;
      } catch (error) {
        console.error("Error inserting block:", error);
      }
    }
  }
}

/**
 * Context gatherer to extract relevant information
 * from the LogSeq knowledge graph
 */
class ContextGatherer {
  constructor() {
    this.tagPattern = /#([a-zA-Z0-9\-_]+)/g;
  }
  
  /**
   * Extract tags from text content
   * @param {string} content - Text to extract tags from
   * @returns {string[]} - Array of tags
   */
  extractTags(content) {
    if (!content) return [];
    
    const tags = [];
    let match;
    while ((match = this.tagPattern.exec(content)) !== null) {
      tags.push(match[1]);
    }
    
    // Reset the regex state
    this.tagPattern.lastIndex = 0;
    
    return [...new Set(tags)]; // Return unique tags
  }
  
  /**
   * Gather context from current block and page
   * @param {string} blockUuid - UUID of current block
   * @returns {Promise<Object>} - Context object with text and tags
   */
  async gatherBasicContext(blockUuid) {
    try {
      // Get the current block
      const block = await logseq.Editor.getBlock(blockUuid);
      if (!block) return { text: '', tags: [] };
      
      // Get the page
      const page = await logseq.Editor.getPage(block.page.id);
      if (!page) return { text: '', tags: [] };
      
      let contextText = `# Current Page: ${page.name}\n\n`;
      
      // Add parent context if available
      if (block.parent && block.parent.id) {
        try {
          const parentBlock = await logseq.Editor.getBlock(block.parent.id);
          if (parentBlock) {
            contextText += `## Parent Block\n${parentBlock.content}\n\n`;
          }
        } catch (error) {
          console.error('Error getting parent block:', error);
        }
      }
      
      // Add current block context
      contextText += `## Current Block\n${block.content}\n\n`;
      
      // Try to get sibling blocks for additional context
      try {
        const siblings = await logseq.Editor.getBlocksTree(page.name);
        if (siblings && siblings.length) {
          contextText += `## Related Content\n`;
          // Take up to 3 sibling blocks
          siblings.slice(0, 3).forEach(sibling => {
            if (sibling.uuid !== block.uuid) {
              contextText += `${sibling.content}\n\n`;
            }
          });
        }
      } catch (error) {
        console.error('Error getting sibling blocks:', error);
      }
      
      // Extract tags from block content and page name
      const blockTags = this.extractTags(block.content);
      const pageTags = this.extractTags(page.name);
      
      // Also check page properties for tags
      const propertyTags = [];
      if (page.properties && page.properties.tags) {
        if (Array.isArray(page.properties.tags)) {
          propertyTags.push(...page.properties.tags);
        } else if (typeof page.properties.tags === 'string') {
          propertyTags.push(page.properties.tags);
        }
      }
      
      // Combine all tags
      const allTags = [...new Set([...blockTags, ...pageTags, ...propertyTags])];
      
      return {
        text: contextText,
        tags: allTags,
        pageName: page.name
      };
    } catch (error) {
      console.error('Error gathering context:', error);
      return { text: '', tags: [], pageName: '' };
    }
  }
  
  /**
   * Gather context from the current page
   * @returns {Promise<{text: string, pageName: string, tags: string[]}>} Context information
   */
  async gatherPageContext() {
    try {
      // Get the current page
      const currentPage = await logseq.Editor.getCurrentPage();
      if (!currentPage || !currentPage.name) {
        return { text: "", pageName: "", tags: [] };
      }
      
      // Get the page content
      const blocks = await logseq.Editor.getPageBlocksTree(currentPage.name);
      if (!blocks || !blocks.length) {
        return { text: "", pageName: currentPage.name, tags: [] };
      }
      
      // Combine block content (limit to first 20 blocks to avoid overloading)
      const maxBlocks = 20;
      let contextText = "";
      
      for (let i = 0; i < Math.min(blocks.length, maxBlocks); i++) {
        if (blocks[i].content) {
          contextText += blocks[i].content + "\n\n";
        }
      }
      
      // Get tags from page content
      const pageTags = this.extractTags(contextText);
      
      // Add page properties if available
      if (currentPage.properties) {
        contextText += "Page properties:\n";
        for (const key in currentPage.properties) {
          if (key !== 'id' && key !== 'uuid') {
            contextText += `${key}: ${currentPage.properties[key]}\n`;
            
            // Check for tags in properties
            if (key === 'tags') {
              const propTags = currentPage.properties[key];
              if (Array.isArray(propTags)) {
                propTags.forEach(tag => pageTags.push(tag));
              } else if (typeof propTags === 'string') {
                pageTags.push(propTags);
              }
            }
          }
        }
        contextText += "\n";
      }
      
      if (blocks.length > maxBlocks) {
        contextText += `[Note: Context limited to first ${maxBlocks} blocks. The page has ${blocks.length} blocks in total.]\n`;
      }
      
      return { 
        text: contextText,
        pageName: currentPage.name,
        tags: [...new Set(pageTags)]
      };
    } catch (error) {
      console.error("Error gathering page context:", error);
      return { text: "", pageName: "", tags: [] };
    }
  }
}

/**
 * Knowledge Graph Enhancer
 * Creates linked pages and entity pages
 */
class KnowledgeGraphEnhancer {
  constructor() {
    // Initialize with nothing
  }
  
  /**
   * Create a linked page and return its title
   * @param {string} title Page title
   * @param {string} content Page content
   * @returns {Promise<string>} Page title (cleaned)
   */
  async createLinkedPage(title, content) {
    try {
      // Clean the title - remove any brackets that might be in the title
      const cleanTitle = title.replace(/\[\[|\]\]/g, '').trim();
      
      console.log(`Creating page with title: ${cleanTitle}`);
      
      // First create the page if it doesn't exist
      await logseq.Editor.createPage(cleanTitle, {}, {
        createFirstBlock: false,
        redirect: false
      });
      
      // Get the page to check if it exists
      const page = await logseq.Editor.getPage(cleanTitle);
      if (!page) {
        throw new Error(`Failed to create page: ${cleanTitle}`);
      }
      
      // Clear existing content on the page
      const existingBlocks = await logseq.Editor.getPageBlocksTree(cleanTitle);
      if (existingBlocks && existingBlocks.length > 0) {
        for (const block of existingBlocks) {
          await logseq.Editor.removeBlock(block.uuid);
        }
      }
      
      // Parse content into blocks
      const blocks = autoLinker.parseIntoBlocks(content);
      
      // Add blocks to the page
      if (blocks.length > 0) {
        // Create first block
        const firstBlock = await logseq.Editor.appendBlockInPage(
          cleanTitle,
          blocks[0].content
        );
        
        // If we have more blocks, recursively add them
        if (blocks.length > 1) {
          await autoLinker.insertBlocksIntoLogSeq(firstBlock.uuid, blocks.slice(1));
        }
      }
      
      return cleanTitle;
    } catch (error) {
      console.error("Error creating linked page:", error);
      throw error;
    }
  }
  
  /**
   * Extract entities from content and create pages for each one
   * @param {string} content - The full response content
   * @returns {Promise<Array<string>>} - List of created entity pages
   */
  async createEntityPages(content) {
    // Extract all [[Entity]] references from the content
    const entityRegex = /\[\[(.*?)\]\]/g;
    const entities = new Set();
    let match;
    
    while ((match = entityRegex.exec(content)) !== null) {
      // Add the entity without the brackets
      const entityName = match[1].trim();
      if (entityName) {
        entities.add(entityName);
      }
    }
    
    console.log(`Found ${entities.size} entities in content`);
    
    const createdPages = [];
    
    // For each entity, create a page with relevant content
    for (const entity of entities) {
      try {
        // Extract sections relevant to this entity
        const relevantContent = this.extractEntityContent(content, entity);
        
        if (relevantContent) {
          // Create entity page
          await this.createOrUpdateEntityPage(entity, relevantContent);
          createdPages.push(entity);
        }
      } catch (error) {
        console.error(`Error creating page for ${entity}:`, error);
      }
    }
    
    return createdPages;
  }
  
  /**
   * Extract content relevant to a specific entity
   * @param {string} fullContent - The full content
   * @param {string} entity - The entity name
   * @returns {string} - The content related to this entity
   */
  extractEntityContent(fullContent, entity) {
    // Clean the entity name for regex matching
    const cleanEntity = entity.replace(/\[\[|\]\]/g, '').trim();
    
    // Build regex patterns with the clean entity name
    const entityPattern = new RegExp(`\\[\\[${cleanEntity}\\]\\]`, 'g');
    
    // First attempt: find sections where the entity is mentioned in a parent block
    const lines = fullContent.split('\n');
    let relevantLines = [];
    let inRelevantSection = false;
    let indentLevel = 0;
    
    // First pass: direct mentions in parent lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip if line is empty
      if (!line.trim()) continue;
      
      // Check if this is a parent line mentioning the entity
      const isParentWithEntity = line.match(entityPattern) && 
        (line.trim().startsWith('-') || line.trim().startsWith('#'));
      
      // Get indent level
      const currentIndent = line.search(/\S|$/);
      
      // Start of a relevant section
      if (isParentWithEntity) {
        inRelevantSection = true;
        indentLevel = currentIndent;
        relevantLines.push(line);
        continue;
      }
      
      // In a section, collect child lines until we hit another parent
      if (inRelevantSection) {
        // If we're at the same or lower indent level, section is over
        if (currentIndent <= indentLevel && line.trim().startsWith('-')) {
          inRelevantSection = false;
        } else {
          relevantLines.push(line);
        }
      }
    }
    
    // Second pass: entity is mentioned in child lines
    if (relevantLines.length === 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip if line is empty
        if (!line.trim()) continue;
        
        if (line.match(entityPattern)) {
          // Find the parent block
          let parentIndex = i;
          let parentIndent = line.search(/\S|$/);
          
          // Look backward for the parent
          while (parentIndex > 0) {
            parentIndex--;
            const parentLine = lines[parentIndex];
            const indent = parentLine.search(/\S|$/);
            
            if (indent < parentIndent && parentLine.trim()) {
              // Found the parent
              relevantLines.push(parentLine);
              break;
            }
          }
          
          // Add the current line
          relevantLines.push(line);
        }
      }
    }
    
    // Third pass: check for connections to this entity
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // If the line connects other entities to this one
      const hasEntity = line.match(entityPattern);
      const hasOtherEntity = line.match(/\[\[(?!${cleanEntity}\]\])[^\]]+\]\]/); 
      
      if (hasEntity && hasOtherEntity && !relevantLines.includes(line)) {
        relevantLines.push(line);
      }
    }
    
    // Return extracted content, or null if nothing found
    return relevantLines.length > 0 ? 
      `# ${cleanEntity}\n\n${relevantLines.join('\n')}` :
      null;
  }
  
  /**
   * Create or update an entity page
   * @param {string} entity - The entity name
   * @param {string} content - The content for the page
   */
  async createOrUpdateEntityPage(entity, content) {
    try {
      // Clean the entity name - remove any brackets that might be in the title
      const cleanEntity = entity.replace(/\[\[|\]\]/g, '').trim();
      
      console.log(`Creating/updating entity page: ${cleanEntity}`);
      
      // First create the page if it doesn't exist
      await logseq.Editor.createPage(cleanEntity, {}, {
        createFirstBlock: false,
        redirect: false
      });
      
      // Get the page to check if it exists
      const page = await logseq.Editor.getPage(cleanEntity);
      if (!page) {
        throw new Error(`Failed to create page: ${cleanEntity}`);
      }
      
      // Check for existing content
      const blocks = await logseq.Editor.getPageBlocksTree(cleanEntity);
      
      // If page already has content, append new content with a divider
      if (blocks && blocks.length > 0) {
        // Parse content into blocks
        const newBlocks = autoLinker.parseIntoBlocks(content);
        
        // Add divider block
        await logseq.Editor.appendBlockInPage(
          cleanEntity,
          "---"
        );
        
        // Add reference to main content
        await logseq.Editor.appendBlockInPage(
          cleanEntity,
          "Related information:"
        );
        
        // Add blocks to the page
        if (newBlocks.length > 0) {
          // Create first block
          const firstBlock = await logseq.Editor.appendBlockInPage(
            cleanEntity,
            newBlocks[0].content
          );
          
          // If we have more blocks, recursively add them
          if (newBlocks.length > 1) {
            await autoLinker.insertBlocksIntoLogSeq(firstBlock.uuid, newBlocks.slice(1));
          }
        }
      } else {
        // Fresh page, just add the content
        const newBlocks = autoLinker.parseIntoBlocks(content);
        
        if (newBlocks.length > 0) {
          // Create first block
          const firstBlock = await logseq.Editor.appendBlockInPage(
            cleanEntity,
            newBlocks[0].content
          );
          
          // If we have more blocks, recursively add them
          if (newBlocks.length > 1) {
            await autoLinker.insertBlocksIntoLogSeq(firstBlock.uuid, newBlocks.slice(1));
          }
        }
      }
      
      return cleanEntity;
    } catch (error) {
      console.error(`Error creating/updating page for ${entity}:`, error);
      throw error;
    }
  }
}