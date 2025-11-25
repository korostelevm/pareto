import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment variables
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Validates that the OpenAI API key is configured
 * @throws Error if OPENAI_API_KEY is not set
 */
export function validateOpenAIConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set. Please create a .env file with your OpenAI API key.');
  }
}

