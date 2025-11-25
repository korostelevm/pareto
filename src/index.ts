import 'dotenv/config';
import { readDirectory } from './services/directory.service.js';
import { readFileContent } from './services/file.service.js';
import { scanFileForPII } from './services/pii-scanner.service.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface IndividualRecord {
  file_name: string;
  file_path: string;
  name?: string;
  address?: string;
  phone?: string;
  pii_candidates: Array<{
    value: string;
    pii_type: string;
    confidence: 'high' | 'medium' | 'low';
    context?: string;
  }>;
}

interface WorkflowResult {
  timestamp: string;
  total_files_processed: number;
  total_pii_found: number;
  files: IndividualRecord[];
}

/**
 * Workflow: Reads 3 files and extracts PII data
 * Stores results in JSON format matching individual.schema.json
 */
async function extractPIIWorkflow() {
  try {
    console.log('🚀 Starting PII Extraction Workflow\n');

    // Sample files to process
    const sampleFiles = [
      '/Users/mike/codes/pareto/samples/james_martinez_bank_statement.txt',
      '/Users/mike/codes/pareto/samples/emily_chen_pay_stub.txt',
      '/Users/mike/codes/pareto/samples/sarah_johnson_medical_record.txt',
    ];

    const results: IndividualRecord[] = [];
    let totalPIIFound = 0;

    // Process each file
    for (let i = 0; i < sampleFiles.length; i++) {
      const filePath = sampleFiles[i];
      console.log(`\n[${i + 1}/${sampleFiles.length}] Processing: ${filePath}`);
      console.log('=' .repeat(60));

      try {
        // Scan file for PII
        const piiScanResult = await scanFileForPII(filePath, 2000, 30);

        // Extract the main name, address, phone from results
        let name: string | undefined;
        let address: string | undefined;
        let phone: string | undefined;

        if (piiScanResult.results.length > 0) {
          const firstResult = piiScanResult.results[0];
          name = firstResult.name;
          address = firstResult.address;
          phone = firstResult.phone;
        }

        // Create record matching individual.schema.json
        const record: IndividualRecord = {
          file_name: filePath.split('/').pop() || 'unknown',
          file_path: filePath,
          ...(name && { name }),
          ...(address && { address }),
          ...(phone && { phone }),
          pii_candidates: piiScanResult.combined_pii,
        };

        results.push(record);
        totalPIIFound += piiScanResult.total_pii_found;

        console.log(`✅ Extracted ${piiScanResult.total_pii_found} PII items from this file\n`);
      } catch (error) {
        console.error(`❌ Error processing file: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }

    // Create final workflow result
    const workflowResult: WorkflowResult = {
      timestamp: new Date().toISOString(),
      total_files_processed: results.length,
      total_pii_found: totalPIIFound,
      files: results,
    };

    // Save results to JSON file
    const outputPath = join('/Users/mike/codes/pareto/data', `pii-extraction-results-${Date.now()}.json`);
    await writeFile(outputPath, JSON.stringify(workflowResult, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📊 WORKFLOW COMPLETED');
    console.log('='.repeat(60));
    console.log(`✓ Files processed: ${results.length}`);
    console.log(`✓ Total PII items found: ${totalPIIFound}`);
    console.log(`✓ Results saved to: ${outputPath}`);
    console.log('='.repeat(60));

    return workflowResult;
  } catch (error) {
    console.error('Workflow error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function main() {
  // Get directory path from command line arguments
  const args = process.argv.slice(2);

  // If no args or first arg is 'extract-pii', run the PII extraction workflow
  if (args.length === 0 || args[0] === 'extract-pii') {
    await extractPIIWorkflow();
    return;
  }

  const directoryPath = args[0];

  try {
    console.log(`Reading directory: ${directoryPath}\n`);
    const entries = await readDirectory(directoryPath);

    // Filter for files only
    const files = entries.filter((entry) => entry.isFile);

    if (files.length === 0) {
      console.log('No files found in directory');
      return;
    }

    console.log(`Found ${files.length} file(s):\n`);

    // Read and display first 100 characters of each file
    for (const file of files) {
      try {
        const fileContent = await readFileContent(file.path);
        const preview =
          typeof fileContent.content === 'string'
            ? fileContent.content.substring(0, 100)
            : fileContent.content.toString('utf-8').substring(0, 100);

        console.log(`--- ${file.name} (${fileContent.size} bytes) ---`);
        console.log(preview);
        if (fileContent.content.length > 100) {
          console.log('...');
        }
        console.log('');
      } catch (error) {
        console.error(
          `Error reading ${file.name}:`,
          error instanceof Error ? error.message : String(error)
        );
        console.log('');
      }
    }

    console.log(`Summary: ${files.length} file(s) processed`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
