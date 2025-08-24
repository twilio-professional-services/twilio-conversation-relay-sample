# Prerequisites

## ChromaDB

ChromaDB serves as the vector database for this project's knowledge base search functionality using RAG (Retrieval-Augmented Generation). It stores and retrieves document embeddings to provide relevant context for AI-powered queries.

### Docker Installation

Before running ChromaDB, you need to have Docker installed on your system.

### Installing Docker

#### Windows

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Run the installer and follow the setup wizard
3. Restart your computer when prompted
4. Verify installation by opening Command Prompt or PowerShell and running:
   ```bash
   docker --version
   ```

#### macOS

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Drag Docker.app to your Applications folder
3. Launch Docker Desktop from Applications
4. Verify installation by opening Terminal and running:
   ```bash
   docker --version
   ```

## Running ChromaDB

Once Docker is installed, you can run ChromaDB using the following command:

```bash
docker run -d --rm --name chromadb -p 8000:8000 -v ./chroma:/chroma/chroma -e IS_PERSISTENT=TRUE -e ANONYMIZED_TELEMETRY=TRUE chromadb/chroma:0.6.3
```

### Verifying ChromaDB is Running

After running the command, verify ChromaDB is working by:

1. Check if the container is running:

   ```bash
   docker ps
   ```

2. Test the API endpoint:
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

The ChromaDB API will be available at `http://localhost:8000`.

### Stopping ChromaDB

To stop the ChromaDB container:

```bash
docker stop chromadb
```

## Open ngrok tunnel

When developing & testing locally, you'll need to open an ngrok tunnel that forwards requests to your local development server.
This ngrok tunnel is used for the Twilio ConversationRelay to send and receive data from a websocket.

To spin up an ngrok tunnel, open a Terminal and run:

```
ngrok http 3000
```

Once the tunnel has been initiated, copy the `Forwarding` URL. It will look something like: `https://[your-ngrok-domain].ngrok.app`. You will
need this when configuring environment variables for the middleware in the next section.

Note that the `ngrok` command above forwards to a development server running on port `3000`, which is the default port configured in this application. If you override the `PORT` environment variable covered in the next section, you will need to update the `ngrok` command accordingly.
