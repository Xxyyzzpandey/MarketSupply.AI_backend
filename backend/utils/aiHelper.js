import { pipeline } from "@xenova/transformers";

let extractor = null;

/**
 * Singleton function to get the embedding pipeline.
 * Ensures the model is only loaded into memory once.
 */
export const getEmbedder = async () => {
  if (!extractor) {
    console.log("🚀 Loading AI Embedding Model into RAM...");
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("✅ Model Loaded successfully.");
  }
  return extractor;
};

/**
 * Helper to convert text to a standard array of numbers
 */
export const generateVector = async (text) => {
  const model = await getEmbedder();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};