# Assistant System Setup Guide

## Overview
This assistant system supports both rule-based and LLM-powered responses with secure credential management.

## Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.450.0",
    "@headlessui/react": "^1.7.17",
    "groq-sdk": "^0.3.3"
  }
}
```

Install with:
```bash
npm install @aws-sdk/client-bedrock-runtime @headlessui/react groq-sdk
```

## Environment Variables

Add to your `.env.local`:

```env
# Assistant Configuration Encryption Key (change in production)
ASSISTANT_CONFIG_KEY=your-secret-encryption-key-here

# Optional: Default API Keys (can also be set via admin panel)
GROQ_API_KEY=your-groq-api-key
GITHUB_TOKEN=your-github-token

# JWT Secret (should already exist)
JWT_SECRET=your-jwt-secret
```

## File Structure

```
pages/api/assistant/
├── answer.js         # Enhanced with mode switching (your existing file)
├── config.js         # Admin configuration management
└── insights.js       # Existing insights endpoint

lib/
├── assistantConfig.js    # Secure config management
├── llm.js               # Enhanced with Bedrock + contextual data (your existing file)
└── assistantLearning.js  # Existing learning system

Components/
├── EmployeeHelperBot.js     # Your existing bot component
└── AssistantModeToggle.js   # Admin UI component

data/
└── assistant-config.json    # Encrypted config storage (auto-created)
```

## Usage

### 1. Client-side Integration

Your existing `EmployeeHelperBot.js` already uses the correct endpoint:

```javascript
// Your existing code in EmployeeHelperBot.js works as-is
const res = await fetch("/api/assistant/answer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question }),
});
```

### 2. Admin Configuration

Add the toggle component to your admin dashboard:

```javascript
import AssistantModeToggle from '@/Components/AssistantModeToggle';

// In your admin dashboard
<AssistantModeToggle />
```

### 3. API Endpoints

- `POST /api/assistant/answer` - Main assistant (auto-switches based on mode)
- `GET /api/assistant/config` - Get current configuration
- `POST /api/assistant/config` - Update credentials/settings
- `GET /api/assistant/insights` - Existing insights endpoint

### 4. Configuration Options

#### Rule-Based Mode
- Uses existing logic from `answer.js`
- No additional setup required
- Fast, deterministic responses

#### LLM Mode
- **Bedrock**: Requires AWS credentials and region
- **Groq**: Requires Groq API key (free tier available)
- **GitHub**: Optional for fetching HR documentation

## Security Features

- ✅ Credentials encrypted at rest
- ✅ Admin-only access to configuration
- ✅ Automatic fallback to rule-based on LLM failure
- ✅ No sensitive data exposed to client
- ✅ Secure token-based authentication

## Testing

1. **Test Rule-Based Mode**:
   ```bash
   curl -X POST http://localhost:3000/api/assistant/answer \
     -H "Content-Type: application/json" \
     -d '{"question": "show my payslip"}'
   ```

2. **Test Mode Switching** (admin only):
   ```bash
   curl -X POST http://localhost:3000/api/assistant/config \
     -H "Content-Type: application/json" \
     -d '{"action": "updateMode", "mode": "LLM"}' \
     --cookie "token=your-admin-token"
   ```

3. **Test Configuration**:
   ```bash
   curl -X GET http://localhost:3000/api/assistant/config \
     --cookie "token=your-admin-token"
   ```

## Troubleshooting

### Common Issues

1. **"Admin access required"**
   - Ensure user has `role: 'admin'` in JWT token
   - Check token is valid and not expired

2. **"Bedrock connection failed"**
   - Verify AWS credentials are correct
   - Check AWS region is supported
   - Ensure IAM permissions for Bedrock

3. **"Groq connection failed"**
   - Verify API key is valid
   - Check rate limits not exceeded

4. **"Configuration not found"**
   - Config file will be auto-created on first run
   - Check `data/` directory permissions

### Logs

Check server logs for detailed error messages:
```bash
# Development
npm run dev

# Production
pm2 logs your-app-name
```

## Migration from Existing System

1. Keep existing `/api/assistant/answer.js` for backward compatibility
2. Update frontend to use `/api/assistant` gradually
3. Test both endpoints work correctly
4. Remove old endpoint when migration complete

## Performance Considerations

- Document caching reduces GitHub API calls
- Fallback system ensures reliability
- Database queries optimized with retry logic
- LLM responses cached where appropriate