// Define types and fix missing references
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import * as fs from "fs/promises";
import { OpenAI } from "openai";
import * as path from "path";
import type { Document } from "@langchain/core/documents";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Global collection reference
let knowledgeCollection: Chroma | null = null;

// Placeholder for missing functions
async function addSampleDocuments(): Promise<void> {
  console.log("Adding sample documents...");
  // Implement logic to add sample documents
}

// Utility to get file extension
function getFileExtension(filename: string): string {
  return filename.split(".").pop() || "";
}

// Utility to read JSON file content
async function readJsonFile(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.stringify(JSON.parse(data));
}

// Utility to read TXT file content
async function readTxtFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}

async function loadDocumentsFromFiles(): Promise<{
  documents: Array<{ document: string; metadata: any; id: string }>;
  changedFiles: string[];
}> {
  const documentsDir = path.resolve("./src/documents");
  const files = await fs.readdir(documentsDir);
  console.log(`Found ${files.length} files in documents directory`);
  const supportedExtensions = ["json", "txt"];
  const documents: Array<{ document: string; metadata: any; id: string }> = [];
  const changedFiles: string[] = [];

  for (const file of files) {
    const ext = getFileExtension(file).toLowerCase();
    if (!supportedExtensions.includes(ext)) continue;

    const filePath = path.join(documentsDir, file);
    let content = "";

    try {
      if (ext === "json") {
        content = await readJsonFile(filePath);
      } else if (ext === "txt") {
        content = await readTxtFile(filePath);
      }

      documents.push({
        document: content,
        metadata: {
          relativePath: file,
          extension: ext,
        },
        id: `${file}-${Date.now()}`,
      });
      changedFiles.push(file);
    } catch (err) {
      console.log(`Error reading file ${file}:`, err);
    }
  }

  return { documents, changedFiles };
}

// Ensure environment variables are used for collection name and path
const COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || "knowledge_base";
// const CHROMA_DB_PATH = process.env.CHROMA_DB_PATH || "./chroma";

// // Fix `openai` reference
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define `ChatCompletionTool` type
interface ChatCompletionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// Initialize ChromaDB collection with persistence
async function initializeChroma() {
  try {
    // Initialize Chroma with LangChain
    knowledgeCollection = await Chroma.fromExistingCollection(
      new OpenAIEmbeddings(),
      {
        collectionName: COLLECTION_NAME,
        url: `http://localhost:8000`,
      }
    );

    console.log("✓ Connected to existing ChromaDB collection");

    // Check collection stats
    const count = await knowledgeCollection.collection.count();
    console.log(`📊 Existing collection contains ${count} documents`);

    // Load and update documents from files
    await updateDocumentsFromFiles();
  } catch (error) {
    console.error("❌ Error connecting to ChromaDB:", error);
    console.log("📝 Creating new ChromaDB collection...");
    // Initialize OpenAI API

    knowledgeCollection = await new Chroma(new OpenAIEmbeddings(), {
      collectionName: COLLECTION_NAME,
      url: `http://localhost:8000`,
    });

    console.log("✓ Created new ChromaDB collection");

    // Add documents to new collection
    await addSampleDocuments();
  }
}

// Update documents from files (only changed files)
async function updateDocumentsFromFiles(): Promise<void> {
  console.log("🔄 Checking for document updates...");

  const { documents: newDocuments, changedFiles } =
    await loadDocumentsFromFiles();

  if (newDocuments.length > 0) {
    const filesToUpdate = [
      ...new Set(newDocuments.map((doc) => doc.metadata.relativePath)),
    ];

    for (const relativePath of filesToUpdate) {
      try {
        if (knowledgeCollection) {
          const existingDocs = await knowledgeCollection.get({
            where: { relativePath: relativePath },
          });

          if (existingDocs?.ids.length) {
            console.log(
              `🗑️  Removing ${existingDocs.ids.length} old chunks for ${relativePath}`
            );
            await knowledgeCollection.delete({
              ids: existingDocs.ids,
            });
          }
        }
      } catch (error) {
        console.log(`ℹ️  No existing documents found for ${relativePath}`);
      }
    }

    if (knowledgeCollection) {
      await knowledgeCollection.addDocuments(
        newDocuments.map((doc) => ({
          pageContent: doc.document,
          metadata: doc.metadata,
          id: doc.id,
        }))
      );

      console.log(
        `✅ Updated ${newDocuments.length} document chunks from ${changedFiles} changed files`
      );
    }
  } else {
    console.log("✅ No document updates needed");
  }

  if (knowledgeCollection) {
    const totalCount = await knowledgeCollection.collection.count();
    console.log(`📊 Collection now contains ${totalCount} total documents`);
  }
}

// Fix `query` property and handle nullable objects
async function retrieveRelevantDocuments(
  query: string,
  numResults = 3
): Promise<any[]> {
  if (!knowledgeCollection) {
    throw new Error("Knowledge collection is not initialized.");
  }

  const results = await knowledgeCollection.query({
    queryTexts: [query], // Corrected property name
    nResults: numResults,
  });

  if (!results || !results.documents || !results.distances) {
    return [];
  }

  return results.documents[0].map((doc: any, index: number) => ({
    document: doc,
    relevanceScore: 1 - (results.distances[0]?.[index] || 0), // Added null check
  }));
}

// // Adjust `tools` type
// const tools: ChatCompletionTool[] = [
//   {
//     type: "function",
//     function: {
//       name: "retrieve_relevant_documents",
//       description: "Retrieve relevant documents from the knowledge base",
//       parameters: {
//         type: "object",
//         properties: {
//           query: { type: "string", description: "The query text" },
//           num_results: {
//             type: "number",
//             description: "Number of results to retrieve",
//             default: 3,
//           },
//         },
//         required: ["query"],
//       },
//     },
//   },
// ];

// Handle RAG tool calls
async function handleToolCall(toolCall: any): Promise<void> {
  console.log("Handling tool call:", toolCall);
  if (toolCall.function.name === "search_knowledge_base") {
    const args = JSON.parse(toolCall.function.arguments);
    const documents = await retrieveRelevantDocuments(
      args.query,
      args.num_results || 3
    );
  }
}

// // Resolve `completion` type mismatch
// async function getChatCompletion(messages: any[], useRAG = true): Promise<any> {
//   let completion;

//   if (useRAG) {
//     const relevantDocs = await retrieveRelevantDocuments(
//       messages[messages.length - 1].content
//     );
//     completion = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [
//         ...messages,
//         {
//           role: "system",
//           content: `Relevant documents: ${JSON.stringify(relevantDocs)}`,
//         },
//       ],
//       tools, // Corrected tools type
//     });
//   } else {
//     completion = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages,
//     });
//   }

//   return completion;
// }

export async function searchKnowledgeBase(
  query: string,
  numResults = 3
): Promise<any[]> {
  // Auto-initialize if not connected
  if (!knowledgeCollection) {
    console.log("ChromaDB not initialized, initializing with defaults...");
    await initializeChroma();
  }

  if (!knowledgeCollection) {
    throw new Error("Failed to initialize ChromaDB connection.");
  }

  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty.");
  }

  try {
    const results = await knowledgeCollection.similaritySearch(
      query.trim(),
      numResults
    );

    if (!results || !results.length) {
      return [];
    }

    const documents = results || [];

    return documents.map((doc: any, index: number) => ({
      id: doc.id || `doc_${index}`,
      document: doc.pageContent || doc.content || doc,
      metadata: doc.metadata || {},
      relevanceScore: doc.relevanceScore || 1,
      distance: doc.distance || 0,
    }));
  } catch (error) {
    console.error("Search error:", error);
    throw new Error(`Search failed: ${error}`);
  }
}

initializeChroma();

(async () => {
  const results1 = await searchKnowledgeBase("is there parking?");
  console.log(results1);
})();
