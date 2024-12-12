# Twilio ConversationRelay

## Overview

A Twilio ConversationRelay project for building a Voice AI Assistant.

![ConversationRelay](docs/conversation-relay.png)

## Features

- REST API endpoint for incoming calls
- WebSocket real-time communication
- Uses OpenAI model and ChatCompletion API in `LLMService`
  - Supports both streaming and non-streaming responses
- Jest for unit testing

## Prerequisites

- Node.js (v16+)
- npm

## Setup

### Open ngrok tunnel

When developing & testing locally, you'll need to open an ngrok tunnel that forwards requests to your local development server.
This ngrok tunnel is used for the Twilio ConversationRelay to send and receive data from a websocket.

To spin up an ngrok tunnel, open a Terminal and run:

```
ngrok http 3000
```

Once the tunnel has been initiated, copy the `Forwarding` URL. It will look something like: `https://[your-ngrok-domain].ngrok.app`. You will
need this when configuring environment variables for the middleware in the next section.

Note that the `ngrok` command above forwards to a development server running on port `3000`, which is the default port configured in this application. If you override the `PORT` environment variable covered in the next section, you will need to update the `ngrok` command accordingly.

1. Clone this repository

2. Navigate to the project directory:
   ```sh
   cd twilio-conversation-relay-sample
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Copy the sample environment file and configure the environment variables:
   ```sh
   cp .env.sample .env
   ```

Once created, open `.env` in your code editor. You are required to set the following environment variables for the app to function properly:
| Variable Name | Description | Example Value |
|-------------------|--------------------------------------------------|------------------------|
| `NGROK_DOMAIN` | The forwarding URL of your ngrok tunnel initiated above | `[your-ngrok-domain].ngrok.app` |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID, which can be found in the Twilio Console. | `ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token, which is also found in the Twilio Console. | `your_auth_token_here` |
| `TWILIO_WORKFLOW_SID` | The Taskrouter Workflow SID, which is automatically provisioned with your Flex account. Used to enqueue inbound call with Flex agents. To find this, in the Twilio Console go to TaskRouter > Workspaces > Flex Task Assignment > Workflows |`WWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`|
| `WELCOME_GREETING` | The message automatically played to the caller |
| `OPENAI_API_KEY` | Your OpenAI API Key | `your_api_key_here` |

Below is an optional environment variable that has default value that can be overridden:
| `PORT` | The port your local server runs on. | `3000` |

5. In the Twilio Console, go to Phone Numbers > Manage > Active Numbers and select an existing phone number (or Buy a number). In your Phone Number configuration settings, update the first A call comes in dropdown to Webhook and set the URL to https://[your-ngrok-domain].ngrok.app/api/incoming-call, ensure HTTP is set to HTTP POST, and click Save configuration.

### Run the app

Once dependencies are installed, `.env` is set up, and Twilio is configured properly, run the dev server with the following command:

```
npm run dev
```

### Testing the app

With the development server running, you can now begin testing the Voice AI Assistant. Place a call to the configured phone number and start interacting with your AI Assistant

## Scripts

- `npm run dev`: Start the development server
- `npm run build`: Compile TypeScript
- `npm start`: Run the production build
- `npm test`: Run unit tests

## API Endpoints

- `POST /api/incoming-call`: Process incoming call - Initiates ConversationRelay (see [src/routes/callRoutes.ts](src/routes/callRoutes.ts))
- `POST /api/action`: Handle connect action - Human agent handoff (see [src/routes/connectActionRoutes.ts](src/routes/connectActionRoutes.ts))

## WebSocket

- Real-time communication setup (see [src/services/llm/websocketService.ts](src/services/llm/websocketService.ts))

## Configuration

- Environment variables are loaded from the `.env` file (see [src/config.ts](src/config.ts))

## Controllers

- `handleIncomingCall`: Processes incoming call (see [src/controllers/callController.ts](src/controllers/callController.ts))
- `handleConnectAction`: Handles connect action (see [src/controllers/connectActionController.ts](src/controllers/connectActionController.ts))

## LLM Services

- `LLMService`: Manages interactions with the language model (see [src/services/llm/llmService.ts](src/services/llm/llmService.ts))

### Tools

- `searchCommonMedicalTerms`: Searches common medical terms (see [src/services/llm/tools/searchCommonMedicalTerms.ts](src/services/llm/tools/searchCommonMedicalTerms.ts))
- `humanAgentHandoff`: Handles handoff to a human agent (see [src/services/llm/tools/humanAgentHandoff.ts](src/services/llm/tools/humanAgentHandoff.ts))
- `verifyUserIdentity`: Verifies user identity (see [src/services/llm/tools/verifyUserIdentity.ts](src/services/llm/tools/verifyUserIdentity.ts))
- `checkPendingBill`: Checks for pending medical bills (see [src/services/llm/tools/checkPendingBill.ts](src/services/llm/tools/checkPendingBill.ts))
- `checkHsaAccount`: Checks if the user has an HSA account (see [src/services/llm/tools/checkHsaAccount.ts](src/services/llm/tools/checkHsaAccount.ts))
- `checkPaymentOptions`: Payment options available to the user (see [src/services/llm/tools/checkPaymentOptions.ts](src/services/llm/tools/checkPaymentOptions.ts))

## Data

- Mock data (see [src/data/mock-data.ts](src/data/mock-data.ts))

## License

This project is licensed under the MIT License.
