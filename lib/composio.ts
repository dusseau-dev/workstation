import { Composio } from "@composio/core";

let instance: Composio | null = null;

export function getComposioClient(): Composio {
  if (!instance) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY is not set");
    }
    instance = new Composio({ apiKey });
  }
  return instance;
}
