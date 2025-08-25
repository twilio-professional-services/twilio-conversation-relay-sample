import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import * as fs from "fs/promises";
import { OpenAI } from "openai";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Global collection reference
let knowledgeCollection: Chroma | null = null;

// Generate content hash for reliable change detection
function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Check if file has changed by comparing with existing document metadata
async function hasFileChanged(
  filePath: string,
  relativePath: string,
  content: string
): Promise<boolean> {
  if (!knowledgeCollection) {
    return true; // If no collection, treat as changed
  }

  try {
    const stats = await fs.stat(filePath);
    const currentHash = generateContentHash(content);

    // Query for existing documents from this file
    const existingDocs = await knowledgeCollection.collection?.get({
      where: { relativePath: relativePath },
    });

    if (!existingDocs || !existingDocs?.metadatas?.length) {
      // No existing documents, this is a new file
      console.log(`📄 New file detected: ${relativePath}`);
      return true;
    }

    // Check the first document's metadata (all docs from same file should have same metadata)
    const storedMetadata = existingDocs.metadatas[0];

    if (!storedMetadata) {
      console.log(`📄 No metadata found for file: ${relativePath}`);
      return true;
    }

    const hasChanged =
      storedMetadata.lastModified !== stats.mtime.getTime() ||
      storedMetadata.size !== stats.size ||
      storedMetadata.contentHash !== currentHash;

    if (hasChanged) {
      console.log(`📄 File changed detected: ${relativePath}`);
      if (
        storedMetadata.lastModified &&
        storedMetadata.lastModified !== stats.mtime.getTime()
      ) {
        console.log(
          `  - Last modified: ${
            typeof storedMetadata.lastModified === "string" ||
            typeof storedMetadata.lastModified === "number"
              ? new Date(storedMetadata.lastModified).toISOString()
              : "unknown"
          } -> ${stats.mtime.toISOString()}`
        );
      }
      if (storedMetadata.size !== stats.size) {
        console.log(`  - Size: ${storedMetadata.size} -> ${stats.size}`);
      }
      if (storedMetadata.contentHash !== currentHash) {
        console.log(
          `  - Content hash: ${storedMetadata.contentHash} -> ${currentHash}`
        );
      }
    } else {
      console.log(`⏭️  File unchanged: ${relativePath}`);
    }

    return hasChanged;
  } catch (error) {
    console.error(`❌ Error checking file ${relativePath}:`, error);
    return true; // If we can't check, assume it changed
  }
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

// Generate stable document ID based on file path and content hash
function generateDocumentId(
  relativePath: string,
  content: string,
  chunkIndex = 0
): string {
  const hash = generateContentHash(content);
  return `doc_${relativePath}_${hash}_${chunkIndex}`;
}

// Split large content into chunks (optional - can be enhanced later)
function chunkContent(content: string, maxChunkSize = 4000): string[] {
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += maxChunkSize) {
    chunks.push(content.slice(i, i + maxChunkSize));
  }

  return chunks;
}

async function loadDocumentsFromFiles(): Promise<{
  documents: Array<{ document: string; metadata: any; id: string }>;
  changedFiles: string[];
}> {
  const documentsDir = path.resolve("./src/documents");

  try {
    await fs.access(documentsDir);
  } catch {
    console.log("📁 Documents directory not found, creating...");
    await fs.mkdir(documentsDir, { recursive: true });
  }

  const files = await fs.readdir(documentsDir);
  console.log(`📁 Found ${files.length} files in documents directory`);

  const supportedExtensions = ["json", "txt"];
  const documents: Array<{ document: string; metadata: any; id: string }> = [];
  const changedFiles: string[] = [];

  for (const file of files) {
    const ext = getFileExtension(file).toLowerCase();
    if (!supportedExtensions.includes(ext)) {
      console.log(`⏭️  Skipping unsupported file: ${file}`);
      continue;
    }

    const filePath = path.join(documentsDir, file);

    try {
      // Read content first to check for changes
      let content = "";
      if (ext === "json") {
        content = await readJsonFile(filePath);
      } else if (ext === "txt") {
        content = await readTxtFile(filePath);
      }

      // Check if file has changed
      const fileChanged = await hasFileChanged(filePath, file, content);

      if (!fileChanged) {
        continue; // Skip unchanged files
      }

      const stats = await fs.stat(filePath);
      const contentHash = generateContentHash(content);

      // Create base metadata that will be included with all chunks
      const baseMetadata = {
        relativePath: file,
        extension: ext,
        lastModified: stats.mtime.getTime(),
        size: stats.size,
        contentHash: contentHash,
        updatedAt: Date.now(),
        fileName: path.basename(file, path.extname(file)),
        fullPath: filePath,
      };

      // Split content into chunks (if needed)
      const chunks = chunkContent(content);

      // Create documents for each chunk
      chunks.forEach((chunk, index) => {
        const documentId = generateDocumentId(file, content, index);

        documents.push({
          document: chunk,
          metadata: {
            ...baseMetadata,
            chunkIndex: index,
            totalChunks: chunks.length,
            chunkId: documentId,
          },
          id: documentId,
        });
      });

      changedFiles.push(file);
      console.log(
        `✅ Queued ${chunks.length} document chunks for file: ${file}`
      );
    } catch (err) {
      console.log(`❌ Error processing file ${file}:`, err);
    }
  }

  console.log(
    `📊 Found ${changedFiles.length} changed files out of ${files.length} total`
  );
  console.log(`📄 Generated ${documents.length} document chunks`);
  return { documents, changedFiles };
}

// Ensure environment variables are used for collection name and path
const COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || "knowledge_base";

// Fix `openai` reference
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

    // const allDocs = await knowledgeCollection.collection?.get({});

    // console.log(`📄 Existing documents: ${allDocs?.ids?.join(", ")}`);

    // knowledgeCollection.collection?.delete({ ids: allDocs?.ids });

    // return;

    // Check collection stats
    const count = await knowledgeCollection.collection?.count();
    console.log(`📊 Existing collection contains ${count} documents`);

    // Load and update documents from files
    await updateDocumentsFromFiles();
  } catch (error) {
    console.error("❌ Error connecting to ChromaDB:", error);
    console.log("📝 Creating new ChromaDB collection...");

    knowledgeCollection = await new Chroma(new OpenAIEmbeddings(), {
      collectionName: COLLECTION_NAME,
      url: `http://localhost:8000`,
    });

    console.log("✓ Created new ChromaDB collection");
  }
}

// Update documents from files (only changed files)
async function updateDocumentsFromFiles(): Promise<void> {
  console.log("🔄 Checking for document updates...");

  const { documents: newDocuments, changedFiles } =
    await loadDocumentsFromFiles();

  if (newDocuments.length > 0) {
    console.log(
      `📝 Processing ${newDocuments.length} document chunks from ${changedFiles.length} changed files`
    );

    const filesToUpdate = [
      ...new Set(newDocuments.map((doc) => doc.metadata.relativePath)),
    ];

    // Remove old documents for changed files
    for (const relativePath of filesToUpdate) {
      try {
        if (knowledgeCollection) {
          const existingDocs = await knowledgeCollection.get({
            where: { relativePath: relativePath },
          });

          if (existingDocs?.ids?.length) {
            console.log(
              `🗑️  Removing ${existingDocs.ids.length} old document chunks for ${relativePath}`
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

    // Add new documents
    if (knowledgeCollection) {
      const langchainDocs = newDocuments.map((doc) => ({
        pageContent: doc.document,
        metadata: doc.metadata,
        id: doc.id,
      }));

      await knowledgeCollection.addDocuments(langchainDocs);

      console.log(
        `✅ Updated ${newDocuments.length} document chunks from ${changedFiles.length} changed files`
      );
      console.log(`📁 Changed files: ${changedFiles.join(", ")}`);
    }
  } else {
    console.log("✅ No document updates needed - all files are up to date");
  }

  if (knowledgeCollection) {
    const totalCount = await knowledgeCollection.collection?.count();
    console.log(`📊 Collection now contains ${totalCount} total documents`);
  }
}

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

    return results.map((doc: any, index: number) => ({
      id: doc.id || `doc_${index}`,
      document: doc.pageContent || doc.content || doc,
      metadata: doc.metadata || {},
      relevanceScore: doc.relevanceScore || 1,
      distance: doc.distance || 0,
      // Include helpful file info in results
      fileName: doc.metadata?.fileName,
      filePath: doc.metadata?.relativePath,
      chunkInfo:
        doc.metadata?.totalChunks > 1
          ? `${doc.metadata.chunkIndex + 1}/${doc.metadata.totalChunks}`
          : null,
    }));
  } catch (error) {
    console.error("Search error:", error);
    throw new Error(`Search failed: ${error}`);
  }
}

// Clean up function to remove documents for deleted files
export async function cleanupDeletedFiles(): Promise<void> {
  console.log("🧹 Cleaning up deleted files...");

  if (!knowledgeCollection) {
    console.log("❌ ChromaDB not initialized");
    return;
  }

  const documentsDir = path.resolve("./src/documents");
  let existingFiles: string[] = [];

  try {
    existingFiles = await fs.readdir(documentsDir);
  } catch (error) {
    console.log("📁 Documents directory not found");
    return;
  }

  const supportedExtensions = ["json", "txt"];
  const validFiles = existingFiles.filter((file) =>
    supportedExtensions.includes(getFileExtension(file).toLowerCase())
  );

  // Get all documents and their file paths
  const allDocs = await knowledgeCollection.get({});

  if (!allDocs?.metadatas?.length) {
    console.log("✅ No documents found for cleanup");
    return;
  }

  // Find unique file paths from document metadata
  const trackedFiles = new Set<string>();
  const fileDocMap = new Map<string, string[]>(); // relativePath -> document IDs

  allDocs.metadatas.forEach((metadata: any, index: number) => {
    if (metadata?.relativePath) {
      trackedFiles.add(metadata.relativePath);

      if (!fileDocMap.has(metadata.relativePath)) {
        fileDocMap.set(metadata.relativePath, []);
      }

      if (allDocs.ids?.[index]) {
        fileDocMap.get(metadata.relativePath)?.push(allDocs.ids[index]);
      }
    }
  });

  let deletedCount = 0;
  for (const trackedFile of trackedFiles) {
    if (!validFiles.includes(trackedFile)) {
      console.log(`🗑️  Removing data for deleted file: ${trackedFile}`);

      const docIds = fileDocMap.get(trackedFile) || [];
      if (docIds.length > 0) {
        await knowledgeCollection.delete({
          ids: docIds,
        });
        console.log(
          `🗑️  Removed ${docIds.length} document chunks for ${trackedFile}`
        );
      }

      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`✅ Cleaned up ${deletedCount} deleted files`);
  } else {
    console.log("✅ No cleanup needed");
  }
}

// Get statistics about the collection
export async function getCollectionStats(): Promise<void> {
  if (!knowledgeCollection) {
    console.log("❌ ChromaDB not initialized");
    return;
  }

  try {
    const totalCount = await knowledgeCollection.collection.count();
    const allDocs = await knowledgeCollection.get({});

    // Analyze documents by file
    const fileStats = new Map<
      string,
      {
        chunks: number;
        lastModified: number;
        size: number;
        extension: string;
      }
    >();

    allDocs.metadatas?.forEach((metadata: any) => {
      if (metadata?.relativePath) {
        const existing = fileStats.get(metadata.relativePath);
        if (existing) {
          existing.chunks++;
        } else {
          fileStats.set(metadata.relativePath, {
            chunks: 1,
            lastModified: metadata.lastModified,
            size: metadata.size,
            extension: metadata.extension,
          });
        }
      }
    });

    console.log("📊 Collection Statistics:");
    console.log(`  Total documents: ${totalCount}`);
    console.log(`  Files tracked: ${fileStats.size}`);

    if (fileStats.size > 0) {
      console.log("\n📁 File breakdown:");
      for (const [filePath, stats] of fileStats.entries()) {
        const lastMod = stats.lastModified
          ? new Date(stats.lastModified).toLocaleString()
          : "unknown";
        console.log(`  ${filePath} (${stats.extension})`);
        console.log(
          `    └─ ${stats.chunks} chunks, ${stats.size} bytes, modified: ${lastMod}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error getting collection stats:", error);
  }
}

// Get all files currently tracked in the collection
export async function getTrackedFiles(): Promise<string[]> {
  if (!knowledgeCollection) {
    return [];
  }

  try {
    const allDocs = await knowledgeCollection.get({});
    const files = new Set<string>();

    allDocs.metadatas?.forEach((metadata: any) => {
      if (metadata?.relativePath) {
        files.add(metadata.relativePath);
      }
    });

    return Array.from(files);
  } catch (error) {
    console.error("❌ Error getting tracked files:", error);
    return [];
  }
}

// initializeChroma();

(async () => {
  // Clean up any deleted files first
  await cleanupDeletedFiles();

  // Show collection statistics
  await getCollectionStats();

  const results1 = await searchKnowledgeBase("is there parking?");
  console.log("\n🔍 Search Results:");
  results1.forEach((result, index) => {
    console.log(
      `${index + 1}. ${result.fileName} ${
        result.chunkInfo ? `(chunk ${result.chunkInfo})` : ""
      }`
    );
    console.log(`   Score: ${result.relevanceScore.toFixed(3)}`);
    console.log(`   Content: ${result.document.substring(0, 200)}...`);
  });
})();
