import { extractSchemaFromText } from '../src/services/extraction.service.ts';
import { validateOpenAIConfig } from '../src/services/openai.service.ts';
import { loadSchemaFromJsonFile } from '../src/utils/schema.util.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerScript } from './runner.ts';

// Hardcoded chunk of text to extract from
const SAMPLE_TEXT = `
ACME Corporation
Employee Pay Stub

Employee Name: John Smith
Employee ID: EMP-12345
Pay Period: January 1, 2024 - January 15, 2024
Pay Date: January 20, 2024

Earnings:
Regular Hours: 80 hours @ $45.00/hr = $3,600.00
Overtime: 5 hours @ $67.50/hr = $337.50
Total Gross Pay: $3,937.50

Deductions:
Federal Tax: $590.63
State Tax: $196.88
Social Security: $244.13
Medicare: $57.09
401(k): $393.75
Health Insurance: $150.00
Total Deductions: $1,632.48

Net Pay: $2,305.02

Bank Account: ****1234
`;

// Get the current directory (needed for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load schema from JSON file
const schemaPath = path.join(__dirname, '..', 'src', 'utils', 'pay-stub.schema.json');
const payStubSchema = loadSchemaFromJsonFile(schemaPath);

type PayStub = any;

/**
 * Demonstrate schema extraction from text using OpenAI
 */
async function runExtractionScript() {
  console.log('🚀 Starting extraction demonstration...\n');
  
  // Validate OpenAI API key is configured
  validateOpenAIConfig();
  console.log('✅ OpenAI API key validated\n');
  
  // Define the extraction prompt
  const prompt = `
    Extract all pay stub information from the provided text.
    Extract numerical values without currency symbols or commas.
    For the bank account, extract only the last 4 digits shown.
    Parse dates in a standard format (YYYY-MM-DD if possible, or as shown).
  `;
  
  console.log('📝 Extracting data from text...');
  console.log('Text length:', SAMPLE_TEXT.length, 'characters\n');
  
  // Extract the data
  const extractedData = await extractSchemaFromText<PayStub>(
    prompt,
    SAMPLE_TEXT,
    payStubSchema
  );
  
  console.log('✅ Extraction successful!\n');
  console.log('📊 Extracted Data:');
  console.log('=====================================');
  console.log(JSON.stringify(extractedData, null, 2));
  console.log('=====================================\n');
  
  // Validate specific fields
  console.log('🔍 Validation checks:');
  console.log(`- Employee Name: ${extractedData.employeeName}`);
  console.log(`- Gross Pay: $${extractedData.grossPay.toFixed(2)}`);
  console.log(`- Net Pay: $${extractedData.netPay.toFixed(2)}`);
  console.log(`- Total Deductions: $${extractedData.totalDeductions.toFixed(2)}`);
  
  // Verify calculation
  const calculatedNet = extractedData.grossPay - extractedData.totalDeductions;
  const netPayMatch = Math.abs(calculatedNet - extractedData.netPay) < 0.01;
  console.log(`- Net Pay Calculation: ${netPayMatch ? '✅ Matches' : '❌ Mismatch'}`);
  
  console.log('\n✨ Script completed successfully!');
}

registerScript(
  'extraction',
  'Demonstrate schema extraction from text using OpenAI',
  runExtractionScript
);

