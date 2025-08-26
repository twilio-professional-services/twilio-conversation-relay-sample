# Twilio ConversationRelay

## Disclaimer

This software is to be considered "sample code", a Type B Deliverable, and is delivered "as-is" to the user. Twilio bears no responsibility to support the use or implementation of this software.

## Overview

A Twilio ConversationRelay project for building a Voice AI Assistant.

![ConversationRelay](docs/conversation-relay.png)

## Features

- REST API endpoint for incoming calls
- WebSocket real-time communication
- Abstracted LLM service supporting multiple providers:
  - OpenAI (ChatGPT models)
  - Anthropic (Claude models)
  - Custom LangChain-compatible models
- Abstracted embedding service supporting multiple providers:
  - OpenAI embeddings
  - HuggingFace sentence transformers
  - Custom embedding models
- RAG (Retrieval Augmented Generation) with vector database
- Supports both streaming and non-streaming responses
- Jest for unit testing

## Prerequisites

- Node.js (v20+)
- npm

Before using this project, please follow the setup instructions in [SETUP.md](./SETUP.md).

## Getting Started

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

#### LLM Configuration (Choose one provider)

| Variable Name       | Description                                 | Example Value                         |
| ------------------- | ------------------------------------------- | ------------------------------------- |
| `LLM_PROVIDER`      | The LLM provider to use                     | `openai` or `anthropic`               |
| `LLM_MODEL_NAME`    | The specific model to use (optional)        | `gpt-4` or `claude-3-sonnet-20240229` |
| `LLM_TEMPERATURE`   | Model temperature (optional)                | `0.7`                                 |
| `LLM_STREAMING`     | Enable streaming responses (optional)       | `true`                                |
| `OPENAI_API_KEY`    | Your OpenAI API Key (if using OpenAI)       | `sk-your_openai_key_here`             |
| `ANTHROPIC_API_KEY` | Your Anthropic API Key (if using Anthropic) | `sk-ant-your_anthropic_key_here`      |

#### Embedding Configuration (Optional)

| Variable Name              | Description                                  | Example Value                                                        |
| -------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `EMBEDDING_PROVIDER`       | The embedding provider to use                | `openai`, `huggingface`, or `anthropic`                              |
| `EMBEDDING_MODEL_NAME`     | The specific embedding model (optional)      | `text-embedding-ada-002` or `sentence-transformers/all-MiniLM-L6-v2` |
| `EMBEDDING_BATCH_SIZE`     | Batch size for processing (optional)         | `512`                                                                |
| `HUGGINGFACEHUB_API_TOKEN` | HuggingFace API token (if using HuggingFace) | `hf_your_huggingface_token_here`                                     |

Below is an optional environment variable that has default value that can be overridden:
| Variable Name | Description | Example Value |
|-------------------|--------------------------------------------------|------------------------|
| `PORT` | The port your local server runs on. | `3000` |

5. In the Twilio Console, go to Phone Numbers > Manage > Active Numbers and select an existing phone number (or Buy a number). In your Phone Number configuration settings, update the first A call comes in dropdown to Webhook and set the URL to https://[your-ngrok-domain].ngrok.app/api/incoming-call, ensure HTTP is set to HTTP POST, and click Save configuration.

### Setting Up the Knowledge Base

#### Prerequisites

Before populating the vector database, ensure ChromaDB is running. Follow the setup instructions in [SETUP.md](./SETUP.md).

#### Populating the Vector Database

1. **Prepare your documents**: supports `.txt` and `.json` files
2. **Add documents**: Copy your knowledge base files to the `documents/` folder in the project root
3. **Initialize the vector database**: From the repository root, run:
   ```bash
   npm run init-vectordb
   ```

This process will:

- Read all `.txt` and `.json` files from the `documents/` folder
- Generate embeddings for the content
- Store the embeddings in ChromaDB for RAG-based search

**Note**: Make sure ChromaDB is running before executing the initialization command.

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
