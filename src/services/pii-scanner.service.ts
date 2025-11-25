import { z } from 'zod';
import { extractSchemaFromText } from './extraction.service.ts';
import { chunkFileFromDisk, chunkFileContent } from './file.service.ts';

/**
 * Zod schema for PII candidates
 */
const PIICandidateSchema = z.object({
  value: z.string().describe('The actual PII value found in the document'),
  pii_type: z.string().describe('The type or category of PII detected'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level that this is actually PII'),
  context: z.string().optional().describe('Brief context where this PII was found'),
});

/**
 * Zod schema for PII extraction results
 */
const PIIExtractionSchema = z.object({
  name: z.string().optional().describe('Full name of the individual'),
  address: z.string().optional().describe('Complete address of the individual'),
  phone: z.string().optional().describe('Phone number of the individual'),
  pii_candidates: z.array(PIICandidateSchema).describe('Array of detected PII candidates'),
});

export type PIICandidate = z.infer<typeof PIICandidateSchema>;
export type PIIExtractionResult = z.infer<typeof PIIExtractionSchema>;

/**
 * System prompt for PII scanning
 */
const PII_SCANNER_SYSTEM_PROMPT = `You are a PII (Personally Identifiable Information) scanner. Your task is to identify and extract all personally identifiable information from the provided text.

PII includes but is not limited to:
- Names
- Social Security Numbers
- Driver's License Numbers
- Passport Numbers
- Credit Card Numbers
- Bank Account Numbers
- Phone Numbers
- Email Addresses
- Dates of Birth
- Home Addresses
- Employer Information
- Medical Information
- Financial Information
- Vehicle Identification Numbers
- License Plate Numbers
- Policy Numbers

For each PII candidate found:
1. Extract the exact value as it appears
2. Determine the PII type/category (let the AI decide the most appropriate label)
3. Assess confidence level (high, medium, or low)
4. Provide context about where it was found

Be thorough but avoid false positives. If something looks like PII but you're uncertain, mark it with "low" confidence.`;

/**
 * Extracts PII from a file using OpenAI with specified chunk size and overlap
 * @param filePath - Path to the file to scan
 * @param chunkSize - Size of each chunk in characters (default: 2000)
 * @param overlapPercentage - Percentage overlap between chunks (default: 30)
 * @returns Promise resolving to combined PII extraction results from all chunks
 */
export async function scanFileForPII(
  filePath: string,
  chunkSize: number = 2000,
  overlapPercentage: number = 30
): Promise<{
  file: string;
  chunks_scanned: number;
  total_pii_found: number;
  results: PIIExtractionResult[];
  combined_pii: PIICandidate[];
}> {
  try {
    // Chunk the file
    const chunks = await chunkFileFromDisk(filePath, chunkSize, overlapPercentage);
    console.log(`📄 Scanning file: ${filePath}`);
    console.log(`📦 Total chunks: ${chunks.length}`);

    const allResults: PIIExtractionResult[] = [];
    const uniquePII = new Map<string, PIICandidate>();

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n🔍 Processing chunk ${chunk.index + 1}/${chunks.length}...`);

      try {
        const result = await extractSchemaFromText<PIIExtractionResult>(
          PII_SCANNER_SYSTEM_PROMPT,
          chunk.content,
          PIIExtractionSchema
        );

        allResults.push(result);

        // Deduplicate PII candidates across chunks
        if (result.pii_candidates && result.pii_candidates.length > 0) {
          result.pii_candidates.forEach((candidate) => {
            const key = `${candidate.value.toLowerCase()}_${candidate.pii_type}`;
            if (!uniquePII.has(key) || candidate.confidence === 'high') {
              uniquePII.set(key, candidate);
            }
          });
        }

        console.log(`  ✓ Found ${result.pii_candidates?.length || 0} PII candidates in this chunk`);
      } catch (chunkError) {
        console.error(`  ✗ Error processing chunk ${chunk.index + 1}:`, chunkError);
        // Continue with next chunk instead of failing entirely
      }
    }

    const combinedPII = Array.from(uniquePII.values());

    console.log(`\n📊 Scan Summary:`);
    console.log(`  Total chunks scanned: ${chunks.length}`);
    console.log(`  Total PII candidates found: ${combinedPII.length}`);

    return {
      file: filePath,
      chunks_scanned: chunks.length,
      total_pii_found: combinedPII.length,
      results: allResults,
      combined_pii: combinedPII,
    };
  } catch (error) {
    console.error(`Failed to scan file for PII: ${error}`);
    throw error;
  }
}

/**
 * Extracts PII from raw text content (no file I/O)
 * @param textContent - The text content to scan
 * @param chunkSize - Size of each chunk in characters (default: 2000)
 * @param overlapPercentage - Percentage overlap between chunks (default: 30)
 * @returns Promise resolving to combined PII extraction results
 */
export function chunkAndScanText(
  textContent: string,
  chunkSize: number = 2000,
  overlapPercentage: number = 30
): {
  chunks_created: number;
  process: () => Promise<{
    total_pii_found: number;
    results: PIIExtractionResult[];
    combined_pii: PIICandidate[];
  }>;
} {
  const chunks = chunkFileContent(textContent, chunkSize, overlapPercentage);

  return {
    chunks_created: chunks.length,
    process: async () => {
      const allResults: PIIExtractionResult[] = [];
      const uniquePII = new Map<string, PIICandidate>();

      for (const chunk of chunks) {
        try {
          const result = await extractSchemaFromText<PIIExtractionResult>(
            PII_SCANNER_SYSTEM_PROMPT,
            chunk.content,
            PIIExtractionSchema
          );

          allResults.push(result);

          if (result.pii_candidates && result.pii_candidates.length > 0) {
            result.pii_candidates.forEach((candidate) => {
              const key = `${candidate.value.toLowerCase()}_${candidate.pii_type}`;
              if (!uniquePII.has(key) || candidate.confidence === 'high') {
                uniquePII.set(key, candidate);
              }
            });
          }
        } catch (error) {
          console.error(`Error processing chunk: ${error}`);
        }
      }

      const combinedPII = Array.from(uniquePII.values());
      return {
        total_pii_found: combinedPII.length,
        results: allResults,
        combined_pii: combinedPII,
      };
    },
  };
}

