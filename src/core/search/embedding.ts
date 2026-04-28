// Client-side embedding is not implemented — all vector search goes through the backend.
// The backend uses MiniLM-L6-v2 (ONNX) for embedding generation.
export async function embedText(_text: string): Promise<number[]> {
  throw new Error('On-device embedding not implemented. Use HybridSearchEngineV4 which calls the backend.');
}
