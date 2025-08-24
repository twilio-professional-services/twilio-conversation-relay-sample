// Define types and fix missing references
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OpenAI } from "openai";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Global collection reference
let knowledgeCollection: Chroma | null = null;

// Ensure environment variables are used for collection name and path
const COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || "knowledge_base";
// const CHROMA_DB_PATH = process.env.CHROMA_DB_PATH || "./chroma";

// // Fix `openai` reference
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// // Initialize ChromaDB collection with persistence
async function initializeChroma() {
  try {
    // Initialize Chroma with LangChain
    console.log(COLLECTION_NAME);
    knowledgeCollection = new Chroma(new OpenAIEmbeddings(), {
      collectionName: COLLECTION_NAME,
    });

    console.log("✓ Connected to new ChromaDB collection", knowledgeCollection);
    // knowledgeCollection = await Chroma.fromExistingCollection(
    //   new OpenAIEmbeddings(),
    //   {
    //     collectionName: COLLECTION_NAME,
    //     // url: `http://localhost:8000`,
    //   }
    // );

    console.log("✓ Connected to existing ChromaDB collection");
  } catch (error) {
    console.error("❌ Error connecting to ChromaDB:", error);
  }
}

initializeChroma();

export async function searchKnowledgeBase(params: any): Promise<any[]> {
  //  Auto-initialize if not connected
  if (!knowledgeCollection) {
    console.log("ChromaDB not initialized, initializing with defaults...");
    await initializeChroma();
  }

  const { query, numResults = 1 } = params;

  if (!knowledgeCollection) {
    throw new Error("Failed to initialize ChromaDB connection.");
  }

  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty.");
  }

  try {
    const documents = await knowledgeCollection.similaritySearch(
      query.trim(),
      numResults
    );

    if (!documents || !documents.length) {
      return [];
    }

    const results = documents.map((doc: any, index: number) => ({
      id: doc.id || `doc_${index}`,
      document: doc.pageContent || doc.content || doc,
      metadata: doc.metadata || {},
      relevanceScore: doc.relevanceScore || 1,
      distance: doc.distance || 0,
    }));
    console.log("Search results:", results);
    return results[0].document;
  } catch (error) {
    console.error("Search error:", error);
    throw new Error(`Search failed: ${error}`);
  }
}
