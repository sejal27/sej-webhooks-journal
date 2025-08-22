# Webhook Journal Util

A TypeScript CLI tool for testing and interacting with the HubSpot Webhooks Journal API.

## Purpose

This utility allows developers to easily test HubSpot's webhook subscription system and journal data access without building a full application. It provides an interactive interface to manage webhook subscriptions, create object snapshots, and retrieve chronological event data.

## Prerequisites

- HubSpot Developer Account with OAuth app
- Node.js and npm
- OAuth app installed in one or more HubSpot portals

## Setup

1. **Configure credentials:**
   ```bash
   cp env.template .env
   ```

2. **Required environment variables:**
   - `HUBSPOT_CLIENT_ID` - Your HubSpot OAuth app client ID
   - `HUBSPOT_CLIENT_SECRET` - Your HubSpot OAuth app client secret
   - `HUBSPOT_API_BASE_URL` - API base URL (default: https://api.hubapi.com)
   - `DEFAULT_PORTAL_ID` - (Optional) Default portal ID for testing

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

   Or run in development mode:
   ```bash
   npm run dev
   ```

## CLI Features

### 📋 Subscriptions
- List all webhook subscriptions (with portal filtering)
- Create new subscriptions for objects, associations, or events
- Delete individual subscriptions by ID
- Bulk delete all subscriptions for a portal
- Support for all CRM object types and custom objects

### 📸 Snapshots
- Create point-in-time snapshots of CRM objects
- Specify custom properties to include
- Bulk snapshot creation for multiple objects

### 📚 Journal
- Retrieve earliest journal entry
- Retrieve latest journal entry  
- Navigate journal entries using offsets
- **🌊 Stream new journal entries in real-time** - Monitor live events for troubleshooting
- Access chronological event history

## Usage

The CLI provides an interactive menu system. Simply run the tool and follow the prompts to:

1. Select a feature area (Subscriptions, Snapshots, or Journal)
2. Choose specific actions from context-sensitive menus

### 🌊 Real-time Journal Streaming

For debugging webhook subscriptions, the tool provides real-time streaming of journal entries:

**Interactive Mode:**
1. Run the main CLI: `npm run dev`
2. Navigate to "Journal" → "Stream new journal entries"
3. Press Ctrl+C to stop streaming

**Direct Command Mode (Quick Start):**
```bash
npm run stream
```

This launches a dedicated streaming session that:
- ✅ Respects HubSpot's rate limits (30 requests/minute)
- 🔄 Polls for new entries every 2 seconds
- 📊 Shows real-time events as they're published
- 🛑 Can be stopped gracefully with Ctrl+C
- 📈 Displays summary statistics when stopped

**Perfect for:**
- Troubleshooting webhook subscriptions
- Monitoring live CRM activity
- Validating event delivery
- Testing webhook configurations
3. Input required parameters (portal IDs, object types, etc.)
4. View formatted results and error messages

All API operations require valid OAuth credentials and will display helpful error messages if authentication fails.
