# Twilio Conversation Relay

## Overview

A Twilio Conversation Relay project for building a Voice AI Assistant.

## Features

- REST API endpoint for incoming calls
- WebSocket real-time communication
- Uses OpenAI model and ChatCompletion API in `LLMService`
  - Supports both streaming and non-streaming responses
- Jest for unit testing

## Prerequisites

- Node.js (v16+)
- npm

## Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```sh
   cd <project-directory>
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Copy the sample environment file and configure the environment variables:
   ```sh
   cp .env.sample .env
   ```

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
- `verifyUser`: Verifies user identity (see [src/services/llm/tools/verifyUserIdentity.ts](src/services/llm/tools/verifyUserIdentity.ts))
- `checkPendingBill`: Checks for pending medical bills (see [src/services/llm/tools/checkPendingBill.ts](src/services/llm/tools/checkPendingBill.ts))


## Data

- Mock data (see [src/data/mock-data.ts](src/data/mock-data.ts))

## License

This project is licensed under the MIT License.
