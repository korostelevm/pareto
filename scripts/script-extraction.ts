import { extractSchemaFromText } from '../src/services/extraction.service.ts';
import { validateOpenAIConfig } from '../src/services/openai.service.ts';
import { loadSchemaFromJsonFile } from '../src/utils/schema.util.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerScript } from './runner.ts';

// Hardcoded chunk of text to extract from
const SAMPLE_TEXT = `
John Smith
123 Main Street, Apt 4B
New York, NY 10001
Phone: (555) 123-4567
Email: john.smith@email.com

Social Security Number: ***-**-1234
Date of Birth: January 15, 1985
Driver's License: D123-4567-890123
`;

// Get the current directory (needed for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load individual schema from JSON file
const schemaPath = path.join(__dirname, '..', 'src', 'utils', 'individual.schema.json');
const individualSchema = loadSchemaFromJsonFile(schemaPath);

/**
 * Demonstrate schema extraction from text using OpenAI with individual schema
 */
async function runExtractionScript() {
  // Validate OpenAI API key is configured
  validateOpenAIConfig();
  
  // Define the extraction prompt
  const prompt = `
    Extract all personally identifiable information (PII) from the provided text.
    Identify the individual's name, address, phone number, and any other PII candidates.
    For each PII candidate, determine the type, confidence level, and context.
  `;
  
  // Extract the data
  const extractedData = await extractSchemaFromText<any>(
    prompt,
    SAMPLE_TEXT,
    individualSchema
  );
  
  console.log(JSON.stringify(extractedData, null, 2));
}

registerScript(
  'extraction',
  'Demonstrate schema extraction from text using OpenAI',
  runExtractionScript
);

