# Slack Notification Module

This module provides complete functionality for sending notifications via Slack, including support for both the official Slack API and webhooks.

## Features

- ✅ Send simple messages via the official Slack API
- ✅ Send messages via Slack webhook
- ✅ Support for formatted messages with blocks
- ✅ Creation of interactive buttons
- ✅ Support for attachments
- ✅ Automatic retry with exponential backoff
- ✅ `SlackNotifier` class for simplified usage
- ✅ Robust error handling
- ✅ Full TypeScript typings

## Installation

The module is already included in the `@starbemtech/star-node-stack-helper` library. No additional dependencies are required.

## Configuration

### 1. Official Slack API

To use the official API, you need a Bot User OAuth Token:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Go to "OAuth & Permissions"
4. Add the following scopes:
   - `chat:write` - Send messages
   - `chat:write.public` - Send messages to public channels
   - `chat:write.customize` - Customize bot name and icon
5. Install the app in your workspace
6. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 2. Slack Webhook

To use webhooks:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Go to "Incoming Webhooks"
4. Enable "Activate Incoming Webhooks"
5. Click "Add New Webhook to Workspace"
6. Select the channel and copy the webhook URL

## Basic Usage

### Sending a Simple Message
