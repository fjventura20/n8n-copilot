// chatbot/debug_workflow_creation.js
// Comprehensive Workflow Creation Debugging Instrumentation

/**
 * Debug Workflow Creation - Comprehensive debugging for workflow creation functionality
 * 
 * This module provides detailed logging and state inspection for:
 * 1. Workflow creation process from start to finish
 * 2. JSON generation and validation
 * 3. n8n API communication and responses
 * 4. Canvas injection and DOM manipulation
 */

class WorkflowCreationDebugger {
  constructor() {
    this.debugPrefix = '[WORKFLOW_DEBUG]';
    this.logLevel = 'verbose'; // 'minimal', 'standard', 'verbose'
    this.startTime = Date.now();
    this.operationCounter = 0;
    
    // Initialize debug state tracking
    this.debugState = {
      workflowOperations: [],
      apiCalls: [],
      jsonOperations: [],
      canvasOperations: [],
      errors: [],
      warnings: []
    };
    
    this.log('WorkflowCreationDebugger initialized', 'info');
  }

  // Core logging method with timestamp and operation counter
  log(message, level = 'info', data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    const operation = ++this.operationCounter;
    
    const logEntry = {
      timestamp,
      elapsed,
      operation,
      level,
      message,
      data
    };

    // Store in debug state
    if (level === 'error') {
      this.debugState.errors.push(logEntry);
    } else if (level === 'warn') {
      this.debugState.warnings.push(logEntry);
    }

    // Console output with formatting
    const prefix = `${this.debugPrefix} [${operation}] [${elapsed}ms]`;
    const fullMessage = `${prefix} ${message}`;
    
    switch (level) {
      case 'error':
        console.error(fullMessage, data || '');
        break;
      case 'warn':
        console.warn(fullMessage, data || '');
        break;
      case 'info':
        console.info(fullMessage, data || '');
        break;
      case 'debug':
        if (this.logLevel === 'verbose') {
          console.debug(fullMessage, data || '');
        }
        break;
      default:
        console.log(fullMessage, data || '');
    }
  }

  // Debug workflow creation initialization
  debugWorkflowCreationInit() {
    this.log('=== WORKFLOW CREATION INITIALIZATION DEBUG START ===', 'info');
    
    // 1. Check global variables and API configuration
    this.log('Step 1: Checking API configuration', 'info');
    this.log('window.n8nApiUrl exists:', 'debug', !!window.n8nApiUrl);
    this.log('window.n8nApiUrl value:', 'debug', window.n8nApiUrl);
    this.log('window.n8nApiKey exists:', 'debug', !!window.n8nApiKey);
    this.log('window.n8nApiKey length:', 'debug', window.n8nApiKey?.length || 0);
    this.log('window.rejectUnauthorized:', 'debug', window.rejectUnauthorized);
    
    // 2. Check current page context
    this.log('Step 2: Checking page context', 'info');
    const currentUrl = window.location.href;
    this.log('Current URL:', 'debug', currentUrl);
    
    const workflowIdMatch = currentUrl.match(/workflow\/([^/?]+)/);
    this.log('Workflow ID match:', 'debug', workflowIdMatch);
    
    if (workflowIdMatch) {
      const workflowId = workflowIdMatch[1];
      this.log('Extracted workflow ID:', 'debug', workflowId);
      this.log('Is new workflow:', 'debug', workflowId === 'new');
    } else {
      this.log('No workflow ID found in URL', 'warn');
    }
    
    // 3. Check required functions availability
    this.log('Step 3: Checking function availability', 'info');
    const requiredFunctions = [
      'injectToCanvas',
      'injectToNewWorkflow',
      'injectToCanvasFallback',
      'processWorkflowJson',
      'extractJsonFromResponse',
      'proxyFetch',
      'mergeWorkflow',
      'cleanWorkflowForPut'
    ];
    
    requiredFunctions.forEach(funcName => {
      const exists = typeof window[funcName] === 'function';
      this.log(`${funcName} function exists:`, 'debug', exists);
      if (!exists) {
        this.debugState.warnings.push({
          timestamp: new Date().toISOString(),
          type: 'missing_function',
          function: funcName,
          impact: 'May cause workflow creation failures'
        });
      }
    });
    
    // 4. Check DOM elements
    this.log('Step 4: Checking DOM elements', 'info');
    const messagesArea = document.getElementById('n8n-builder-messages');
    this.log('Messages area exists:', 'debug', !!messagesArea);
    
    // 5. Test proxyFetch availability
    this.log('Step 5: Testing proxyFetch function', 'info');
    if (typeof window.proxyFetch === 'function') {
      this.log('proxyFetch function available', 'debug');
      // We won't test actual API calls here, just function availability
    } else {
      this.log('proxyFetch function not available', 'error');
    }
    
    this.debugState.workflowOperations.push({
      timestamp: new Date().toISOString(),
      operation: 'initialization_check',
      apiConfigured: !!(window.n8nApiUrl && window.n8nApiKey),
      workflowId: workflowIdMatch?.[1] || null,
      functionsAvailable: requiredFunctions.filter(f => typeof window[f] === 'function').length,
      totalFunctions: requiredFunctions.length
    });
    
    this.log('=== WORKFLOW CREATION INITIALIZATION DEBUG END ===', 'info');
  }

  // Debug JSON extraction and processing
  debugJsonProcessing(testResponse = null) {
    this.log('=== JSON PROCESSING DEBUG START ===', 'info');
    
    // Test JSON extraction with sample responses
    const testResponses = testResponse ? [testResponse] : [
      // Valid JSON in code block
      `Here's your workflow:
\`\`\`json
{
  "name": "Test Workflow",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "position": [100, 100]
    }
  ],
  "connections": {}
}
\`\`\``,
      
      // JSON without code block
      `{
  "name": "Direct JSON",
  "nodes": [],
  "connections": {}
}`,
      
      // Invalid JSON
      `Here's broken JSON:
\`\`\`json
{
  "name": "Broken",
  "nodes": [
    {
      "name": "Test",
      "type": "invalid",
    }
  ]
}
\`\`\``,
      
      // No JSON
      `This response has no JSON content.`
    ];
    
    this.log('Step 1: Testing JSON extraction', 'info');
    
    testResponses.forEach((response, index) => {
      this.log(`Testing response ${index + 1}:`, 'debug');
      
      try {
        if (typeof window.extractJsonFromResponse === 'function') {
          const extracted = window.extractJsonFromResponse(response);
          this.log(`Response ${index + 1} extraction result:`, 'debug', extracted ? 'SUCCESS' : 'NO_JSON');
          
          if (extracted) {
            this.log(`Response ${index + 1} extracted JSON:`, 'debug', {
              name: extracted.name,
              nodesCount: extracted.nodes?.length || 0,
              hasConnections: !!extracted.connections
            });
          }
          
          this.debugState.jsonOperations.push({
            timestamp: new Date().toISOString(),
            operation: 'json_extraction_test',
            responseIndex: index + 1,
            success: !!extracted,
            extractedData: extracted ? {
              name: extracted.name,
              nodesCount: extracted.nodes?.length || 0
            } : null
          });
          
        } else {
          this.log('extractJsonFromResponse function not available', 'error');
        }
      } catch (error) {
        this.log(`Response ${index + 1} extraction error:`, 'error', error.message);
      }
    });
    
    // Test processWorkflowJson function
    this.log('Step 2: Testing processWorkflowJson', 'info');
    const testWorkflowJson = {
      name: "Debug Test Workflow",
      nodes: [
        {
          name: "Debug Start",
          type: "n8n-nodes-base.start",
          position: [100, 100],
          parameters: {}
        },
        {
          name: "Debug HTTP",
          type: "n8n-nodes-base.httpRequest",
          position: [300, 100],
          parameters: {
            url: "https://api.example.com/test"
          }
        }
      ],
      connections: {
        "Debug Start": {
          "main": [
            [
              {
                "node": "Debug HTTP",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      }
    };
    
    try {
      if (typeof window.processWorkflowJson === 'function') {
        this.log('Testing processWorkflowJson with sample data', 'debug');
        // We won't actually call it as it modifies DOM, just verify it exists
        this.log('processWorkflowJson function available', 'debug');
      } else {
        this.log('processWorkflowJson function not available', 'error');
      }
    } catch (error) {
      this.log('processWorkflowJson test error:', 'error', error.message);
    }
    
    this.log('=== JSON PROCESSING DEBUG END ===', 'info');
  }

  // Debug n8n API communication
  async debugApiCommunication() {
    this.log('=== API COMMUNICATION DEBUG START ===', 'info');
    
    // 1. Check API configuration
    this.log('Step 1: Validating API configuration', 'info');
    
    if (!window.n8nApiUrl || !window.n8nApiKey) {
      this.log('API credentials missing - skipping API tests', 'warn');
      this.log('n8nApiUrl:', 'debug', window.n8nApiUrl || 'MISSING');
      this.log('n8nApiKey:', 'debug', window.n8nApiKey ? 'PRESENT' : 'MISSING');
      return;
    }
    
    const apiUrl = window.n8nApiUrl;
    const apiKey = window.n8nApiKey;
    
    this.log('API URL:', 'debug', apiUrl);
    this.log('API Key length:', 'debug', apiKey.length);
    
    // 2. Validate API URL format
    this.log('Step 2: Validating API URL format', 'info');
    const isLocalhost = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
    const isHttps = apiUrl.startsWith('https://');
    const isHttp = apiUrl.startsWith('http://');
    
    this.log('Is localhost:', 'debug', isLocalhost);
    this.log('Is HTTPS:', 'debug', isHttps);
    this.log('Is HTTP:', 'debug', isHttp);
    
    if (!isLocalhost && !isHttps) {
      this.log('Invalid API URL - non-localhost must use HTTPS', 'error');
    }
    
    if (!isHttp && !isHttps) {
      this.log('Invalid API URL - must start with http:// or https://', 'error');
    }
    
    // 3. Test proxyFetch function
    this.log('Step 3: Testing proxyFetch function', 'info');
    
    if (typeof window.proxyFetch !== 'function') {
      this.log('proxyFetch function not available', 'error');
      return;
    }
    
    // Get current workflow ID for testing
    const currentUrl = window.location.href;
    const workflowIdMatch = currentUrl.match(/workflow\/([^/?]+)/);
    
    if (!workflowIdMatch || workflowIdMatch[1] === 'new') {
      this.log('No existing workflow to test API with - skipping API call test', 'warn');
      return;
    }
    
    const workflowId = workflowIdMatch[1];
    this.log('Testing API with workflow ID:', 'debug', workflowId);
    
    // Test GET request to fetch workflow
    try {
      this.log('Step 4: Testing GET workflow API call', 'info');
      const getUrl = `${apiUrl}/api/v1/workflows/${workflowId}`;
      this.log('GET URL:', 'debug', getUrl);
      
      const startTime = Date.now();
      
      const response = await window.proxyFetch(getUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': apiKey
        }
      });
      
      const duration = Date.now() - startTime;
      this.log('API call completed', 'debug', `${duration}ms`);
      
      if (response && typeof response === 'object') {
        this.log('API response received:', 'debug', {
          hasId: !!response.id,
          hasName: !!response.name,
          nodesCount: response.nodes?.length || 0,
          hasConnections: !!response.connections
        });
        
        this.debugState.apiCalls.push({
          timestamp: new Date().toISOString(),
          operation: 'get_workflow_test',
          url: getUrl,
          method: 'GET',
          duration,
          success: true,
          responseData: {
            id: response.id,
            name: response.name,
            nodesCount: response.nodes?.length || 0
          }
        });
        
        // Test workflow cleaning function
        this.log('Step 5: Testing workflow cleaning', 'info');
        if (typeof window.cleanWorkflowForPut === 'function') {
          try {
            const cleaned = window.cleanWorkflowForPut(response);
            this.log('Workflow cleaning successful:', 'debug', {
              hasName: !!cleaned.name,
              hasNodes: !!cleaned.nodes,
              hasConnections: !!cleaned.connections,
              hasSettings: !!cleaned.settings,
              hasStaticData: cleaned.hasOwnProperty('staticData')
            });
          } catch (cleanError) {
            this.log('Workflow cleaning error:', 'error', cleanError.message);
          }
        } else {
          this.log('cleanWorkflowForPut function not available', 'error');
        }
        
      } else {
        this.log('Invalid API response received:', 'error', typeof response);
      }
      
    } catch (apiError) {
      this.log('API call failed:', 'error', apiError.message);
      
      this.debugState.apiCalls.push({
        timestamp: new Date().toISOString(),
        operation: 'get_workflow_test',
        url: `${apiUrl}/api/v1/workflows/${workflowId}`,
        method: 'GET',
        success: false,
        error: apiError.message
      });
    }
    
    this.log('=== API COMMUNICATION DEBUG END ===', 'info');
  }

  // Debug canvas injection process
  debugCanvasInjection(testJson = null) {
    this.log('=== CANVAS INJECTION DEBUG START ===', 'info');
    
    const testWorkflowJson = testJson || {
      name: "Debug Canvas Test",
      nodes: [
        {
          name: "Canvas Test Start",
          type: "n8n-nodes-base.start",
          position: [100, 100],
          parameters: {}
        }
      ],
      connections: {}
    };
    
    // 1. Check injection function availability
    this.log('Step 1: Checking injection functions', 'info');
    const injectionFunctions = [
      'injectToCanvas',
      'injectToNewWorkflow',
      'injectToCanvasFallback'
    ];
    
    injectionFunctions.forEach(funcName => {
      const exists = typeof window[funcName] === 'function';
      this.log(`${funcName} available:`, 'debug', exists);
    });
    
    // 2. Check current page context for injection
    this.log('Step 2: Checking page context for injection', 'info');
    const currentUrl = window.location.href;
    const workflowIdMatch = currentUrl.match(/workflow\/([^/?]+)/);
    
    if (workflowIdMatch) {
      const workflowId = workflowIdMatch[1];
      this.log('Workflow ID for injection:', 'debug', workflowId);
      
      if (workflowId === 'new') {
        this.log('New workflow detected - would use injectToNewWorkflow', 'debug');
      } else {
        this.log('Existing workflow detected - would use injectToCanvas', 'debug');
      }
    } else {
      this.log('No workflow context - injection not possible', 'warn');
    }
    
    // 3. Test merge workflow function
    this.log('Step 3: Testing workflow merging', 'info');
    if (typeof window.mergeWorkflow === 'function') {
      const existingWorkflow = {
        name: "Existing Workflow",
        nodes: [
          {
            name: "Existing Node",
            type: "n8n-nodes-base.start",
            position: [50, 50]
          }
        ],
        connections: {}
      };
      
      try {
        const merged = window.mergeWorkflow(existingWorkflow, testWorkflowJson);
        this.log('Workflow merge successful:', 'debug', {
          originalNodes: existingWorkflow.nodes.length,
          newNodes: testWorkflowJson.nodes.length,
          mergedNodes: merged.nodes.length,
          nodeNamesUnique: merged.nodes.every((node, index, arr) => 
            arr.findIndex(n => n.name === node.name) === index
          )
        });
        
        this.debugState.canvasOperations.push({
          timestamp: new Date().toISOString(),
          operation: 'workflow_merge_test',
          success: true,
          originalNodesCount: existingWorkflow.nodes.length,
          newNodesCount: testWorkflowJson.nodes.length,
          mergedNodesCount: merged.nodes.length
        });
        
      } catch (mergeError) {
        this.log('Workflow merge error:', 'error', mergeError.message);
      }
    } else {
      this.log('mergeWorkflow function not available', 'error');
    }
    
    // 4. Test fallback injection (safe to test)
    this.log('Step 4: Testing fallback injection mechanism', 'info');
    if (typeof window.injectToCanvasFallback === 'function') {
      this.log('Fallback injection function available', 'debug');
      
      // Test clipboard API availability
      const clipboardAvailable = navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
      this.log('Clipboard API available:', 'debug', clipboardAvailable);
      
      if (!clipboardAvailable) {
        this.log('Clipboard API not available - fallback will show JSON directly', 'warn');
      }
    } else {
      this.log('injectToCanvasFallback function not available', 'error');
    }
    
    this.log('=== CANVAS INJECTION DEBUG END ===', 'info');
  }

  // Generate comprehensive debug report
  generateDebugReport() {
    this.log('=== GENERATING WORKFLOW CREATION DEBUG REPORT ===', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime,
      totalOperations: this.operationCounter,
      
      // Current state snapshot
      currentState: {
        apiConfiguration: {
          n8nApiUrl: {
            exists: !!window.n8nApiUrl,
            value: window.n8nApiUrl,
            isLocalhost: window.n8nApiUrl?.includes('localhost') || window.n8nApiUrl?.includes('127.0.0.1'),
            isHttps: window.n8nApiUrl?.startsWith('https://'),
            isValid: this.validateApiUrl(window.n8nApiUrl)
          },
          n8nApiKey: {
            exists: !!window.n8nApiKey,
            length: window.n8nApiKey?.length || 0
          },
          rejectUnauthorized: window.rejectUnauthorized
        },
        
        pageContext: {
          currentUrl: window.location.href,
          workflowId: this.extractWorkflowId(),
          isNewWorkflow: this.extractWorkflowId() === 'new',
          isWorkflowPage: /\/workflow\//.test(window.location.href)
        },
        
        functions: {
          core: {
            injectToCanvas: typeof window.injectToCanvas === 'function',
            injectToNewWorkflow: typeof window.injectToNewWorkflow === 'function',
            injectToCanvasFallback: typeof window.injectToCanvasFallback === 'function',
            processWorkflowJson: typeof window.processWorkflowJson === 'function'
          },
          utilities: {
            extractJsonFromResponse: typeof window.extractJsonFromResponse === 'function',
            mergeWorkflow: typeof window.mergeWorkflow === 'function',
            cleanWorkflowForPut: typeof window.cleanWorkflowForPut === 'function',
            proxyFetch: typeof window.proxyFetch === 'function'
          }
        },
        
        ui: {
          messagesArea: {
            exists: !!document.getElementById('n8n-builder-messages'),
            childrenCount: document.getElementById('n8n-builder-messages')?.children?.length || 0
          },
          clipboardApi: {
            available: !!(navigator.clipboard && navigator.clipboard.writeText)
          }
        }
      },
      
      // Debug state summary
      debugState: this.debugState,
      
      // Issues detected
      issues: this.detectWorkflowIssues()
    };
    
    this.log('Workflow creation debug report generated', 'info', report);
    
    // Also log a formatted summary
    this.logFormattedSummary(report);
    
    return report;
  }

  // Validate API URL format
  validateApiUrl(url) {
    if (!url) return false;
    
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
    const isHttps = url.startsWith('https://');
    const isHttp = url.startsWith('http://');
    
    // Must start with http or https
    if (!isHttp && !isHttps) return false;
    
    // Non-localhost must use HTTPS
    if (!isLocalhost && !isHttps) return false;
    
    return true;
  }

  // Extract workflow ID from current URL
  extractWorkflowId() {
    const match = window.location.href.match(/workflow\/([^/?]+)/);
    return match ? match[1] : null;
  }

  // Detect workflow-specific issues
  detectWorkflowIssues() {
    const issues = [];
    
    // Check API configuration
    if (!window.n8nApiUrl) {
      issues.push({
        type: 'missing_config',
        severity: 'high',
        description: 'n8n API URL not configured',
        impact: 'Cannot create or update workflows via API'
      });
    } else if (!this.validateApiUrl(window.n8nApiUrl)) {
      issues.push({
        type: 'invalid_config',
        severity: 'high',
        description: 'n8n API URL format is invalid',
        impact: 'API calls will fail'
      });
    }
    
    if (!window.n8nApiKey) {
      issues.push({
        type: 'missing_config',
        severity: 'high',
        description: 'n8n API key not configured',
        impact: 'API authentication will fail'
      });
    }
    
    // Check required functions
    const requiredFunctions = [
      'injectToCanvas',
      'processWorkflowJson',
      'extractJsonFromResponse',
      'proxyFetch'
    ];
    
    requiredFunctions.forEach(funcName => {
      if (typeof window[funcName] !== 'function') {
        issues.push({
          type: 'missing_function',
          severity: 'high',
          description: `${funcName} function not available`,
          impact: 'Workflow creation will fail'
        });
      }
    });
    
    // Check page context
    if (!this.extractWorkflowId()) {
      issues.push({
        type: 'invalid_context',
        severity: 'medium',
        description: 'Not on a workflow page',
        impact: 'Cannot inject workflows to canvas'
      });
    }
    
    // Check clipboard API for fallback
    if (!(navigator.clipboard && navigator.clipboard.writeText)) {
      issues.push({
        type: 'missing_feature',
        severity: 'low',
        description: 'Clipboard API not available',
        impact: 'Fallback workflow copy will show JSON directly'
      });
    }
    
    return issues;
  }

  // Log formatted summary
  logFormattedSummary(report) {
    console.group(`${this.debugPrefix} WORKFLOW CREATION SUMMARY REPORT`);
    
    console.log('📊 Session Info:');
    console.log(`   Duration: ${report.sessionDuration}ms`);
    console.log(`   Operations: ${report.totalOperations}`);
    
    console.log('🔧 API Configuration:');
    console.log(`   API URL: ${report.currentState.apiConfiguration.n8nApiUrl.exists ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`   API Key: ${report.currentState.apiConfiguration.n8nApiKey.exists ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`   URL Valid: ${report.currentState.apiConfiguration.n8nApiUrl.isValid ? 'YES' : 'NO'}`);
    
    console.log('📄 Page Context:');
    console.log(`   Workflow ID: ${report.currentState.pageContext.workflowId || 'NONE'}`);
    console.log(`   Is New Workflow: ${report.currentState.pageContext.isNewWorkflow ? 'YES' : 'NO'}`);
    console.log(`   Is Workflow Page: ${report.currentState.pageContext.isWorkflowPage ? 'YES' : 'NO'}`);
    
    console.log('⚙️ Function Availability:');
    const coreFunctions = Object.entries(report.currentState.functions.core);
    const utilityFunctions = Object.entries(report.currentState.functions.utilities);
    
    coreFunctions.forEach(([name, available]) => {
      console.log(`   ${name}: ${available ? 'AVAILABLE' : 'MISSING'}`);
    });
    
    console.log('⚠️ Issues Detected:');
    if (report.issues.length === 0) {
      console.log('   No issues detected');
    } else {
      report.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
        console.log(`      Impact: ${issue.impact}`);
      });
    }
    
    console.log('📈 Debug Operations:');
    console.log(`   Workflow Operations: ${report.debugState.workflowOperations.length}`);
    console.log(`   API Calls: ${report.debugState.apiCalls.length}`);
    console.log(`   JSON Operations: ${report.debugState.jsonOperations.length}`);
    console.log(`   Canvas Operations: ${report.debugState.canvasOperations.length}`);
    console.log(`   Errors: ${report.debugState.errors.length}`);
    console.log(`   Warnings: ${report.debugState.warnings.length}`);
    
    console.groupEnd();
  }

  // Run all debug tests
  async runFullDebugSuite() {
    this.log('🚀 Starting full workflow creation debug suite', 'info');
    
    try {
      this.debugWorkflowCreationInit();
      this.debugJsonProcessing();
      await this.debugApiCommunication();
      this.debugCanvasInjection();
      
      const report = this.generateDebugReport();
      
      this.log('✅ Full workflow debug suite completed successfully', 'info');
      return report;
      
    } catch (error) {
      this.log('❌ Workflow debug suite failed:', 'error', error.message);
      throw error;
    }
  }
}

// Create global debug instance
window.workflowCreationDebugger = new WorkflowCreationDebugger();

// Convenience functions for easy access
window.debugWorkflowCreation = () => window.workflowCreationDebugger.runFullDebugSuite();
window.debugWorkflowInit = () => window.workflowCreationDebugger.debugWorkflowCreationInit();
window.debugWorkflowJson = (response) => window.workflowCreationDebugger.debugJsonProcessing(response);
window.debugWorkflowApi = () => window.workflowCreationDebugger.debugApiCommunication();
window.debugWorkflowCanvas = (json) => window.workflowCreationDebugger.debugCanvasInjection(json);
window.getWorkflowCreationDebugReport = () => window.workflowCreationDebugger.generateDebugReport();

// Auto-run debug on load if in debug mode
if (window.location.search.includes('debug=workflow') || window.localStorage?.getItem('n8n-copilot-debug') === 'workflow') {
  console.log('🔍 Auto-running workflow creation debug suite...');
  setTimeout(() => {
    window.debugWorkflowCreation();
  }, 1000);
}

console.log('🔧 Workflow Creation Debugger loaded. Available functions:');
console.log('   - debugWorkflowCreation() - Run full debug suite');
console.log('   - debugWorkflowInit() - Debug initialization');
console.log('   - debugWorkflowJson(response) - Debug JSON processing');
console.log('   - debugWorkflowApi() - Debug API communication');
console.log('   - debugWorkflowCanvas(json) - Debug canvas injection');
console.log('   - getWorkflowCreationDebugReport() - Get current debug report');