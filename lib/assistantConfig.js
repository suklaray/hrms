import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'assistant-config.json');
const ENCRYPTION_KEY = process.env.ASSISTANT_CONFIG_KEY || 'default-key-change-in-production';

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Encrypt sensitive data
function encrypt(text) {
  if (!text) return null;
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt sensitive data
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  mode: 'RULE_BASED', // RULE_BASED or LLM
  preferredLLM: 'GROQ', // BEDROCK or GROQ
  awsRegion: 'us-east-1',
  awsAccessKey: null,
  awsSecretKey: null,
  groqApiKey: null,
  githubToken: null,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system'
};

// Cache config in memory for 5 minutes
let configCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getAssistantConfig() {
  try {
    // Return cached config if still valid
    if (configCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return configCache;
    }

    ensureDataDirectory();
    
    if (!fs.existsSync(CONFIG_FILE)) {
      // Create default config file
      await saveAssistantConfig(DEFAULT_CONFIG);
      configCache = DEFAULT_CONFIG;
      cacheTimestamp = Date.now();
      return DEFAULT_CONFIG;
    }

    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);

    // Decrypt sensitive fields
    const decryptedConfig = {
      ...config,
      awsAccessKey: decrypt(config.awsAccessKey),
      awsSecretKey: decrypt(config.awsSecretKey),
      groqApiKey: decrypt(config.groqApiKey),
      githubToken: decrypt(config.githubToken)
    };

    // Cache the result
    configCache = decryptedConfig;
    cacheTimestamp = Date.now();
    
    return decryptedConfig;

  } catch (error) {
    console.error('Error reading assistant config:', error);
    return DEFAULT_CONFIG;
  }
}

export async function saveAssistantConfig(config) {
  try {
    ensureDataDirectory();

    // Encrypt sensitive fields
    const encryptedConfig = {
      ...config,
      awsAccessKey: encrypt(config.awsAccessKey),
      awsSecretKey: encrypt(config.awsSecretKey),
      groqApiKey: encrypt(config.groqApiKey),
      githubToken: encrypt(config.githubToken),
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(encryptedConfig, null, 2));
    
    // Clear cache when config is updated
    configCache = null;
    cacheTimestamp = 0;
    
    return true;

  } catch (error) {
    console.error('Error saving assistant config:', error);
    return false;
  }
}

export async function updateAssistantMode(mode, updatedBy = 'admin') {
  try {
    const config = await getAssistantConfig();
    config.mode = mode;
    config.updatedBy = updatedBy;
    
    return await saveAssistantConfig(config);
  } catch (error) {
    console.error('Error updating assistant mode:', error);
    return false;
  }
}

export async function testLLMConnection(config) {
  try {
    // Test Bedrock connection
    if (config.preferredLLM === 'BEDROCK' && config.awsAccessKey && config.awsSecretKey) {
      const { BedrockRuntimeClient, ListFoundationModelsCommand } = await import('@aws-sdk/client-bedrock-runtime');
      
      const client = new BedrockRuntimeClient({
        region: config.awsRegion,
        credentials: {
          accessKeyId: config.awsAccessKey,
          secretAccessKey: config.awsSecretKey,
        },
      });

      await client.send(new ListFoundationModelsCommand({}));
      return { success: true, message: 'Bedrock connection successful' };
    }

    // Test Groq connection
    if (config.preferredLLM === 'GROQ' && config.groqApiKey) {
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey: config.groqApiKey });
      
      await groq.models.list();
      return { success: true, message: 'Groq connection successful' };
    }

    return { success: false, message: 'No valid LLM configuration found' };

  } catch (error) {
    return { 
      success: false, 
      message: `Connection failed: ${error.message}` 
    };
  }
}