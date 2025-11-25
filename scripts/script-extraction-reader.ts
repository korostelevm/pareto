import { readDirectoryFiles } from '../src/services/directory.service.ts';
import { ExtractionReaderService } from '../src/services/extraction-reader.service.ts';
import { join } from 'path';
import { registerScript } from './runner.ts';

/**
 * Aggregate PII types and contexts from all extraction result files in the data directory
 */
async function runExtractionReaderScript() {
  const dataDir = join(process.cwd(), 'data');
  console.log(`📂 Reading extraction result files from: ${dataDir}\n`);

  // Get all files from data directory
  const files = await readDirectoryFiles(dataDir);
  const jsonFiles = files.filter((f) => f.name.endsWith('.json'));

  if (jsonFiles.length === 0) {
    throw new Error('No JSON files found in data directory');
  }

  console.log(`Found ${jsonFiles.length} extraction result file(s):\n`);

  // Process each file
  const allAggregations: Array<{
    file: string;
    aggregation: Awaited<ReturnType<ExtractionReaderService['aggregatePIITypes']>>;
  }> = [];

  for (const file of jsonFiles) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📄 Processing: ${file.name}`);
    console.log('='.repeat(70));

    const reader = new ExtractionReaderService();
    await reader.loadFromFile(file.path);

    const aggregation = reader.aggregatePIITypes();
    allAggregations.push({ file: file.name, aggregation });

    // Display results for this file
    console.log(`\n📊 PII Types Found: ${aggregation.pii_types.length}`);
    console.log(`📝 Total Unique Contexts: ${aggregation.unique_contexts.length}`);
    console.log(`🔢 Total Context Occurrences: ${aggregation.all_contexts.length}\n`);

    // Display each PII type with its contexts
    aggregation.pii_types.forEach((type, index) => {
      console.log(`${index + 1}. ${type.pii_type}`);
      console.log(`   Count: ${type.count}`);
      console.log(`   Confidence: High=${type.confidence_breakdown.high}, Medium=${type.confidence_breakdown.medium}, Low=${type.confidence_breakdown.low}`);
      console.log(`   Unique Contexts (${type.unique_contexts.length}):`);
      type.unique_contexts.forEach((ctx) => {
        const occurrences = type.contexts.filter((c) => c === ctx).length;
        console.log(`     - "${ctx}" (${occurrences}x)`);
      });
      console.log('');
    });

    // Display all unique contexts
    console.log(`\n📋 All Unique Contexts Across File:`);
    aggregation.unique_contexts.forEach((ctx, index) => {
      console.log(`   ${index + 1}. "${ctx}"`);
    });
  }

  // Cross-file aggregation summary
  if (allAggregations.length > 1) {
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('📊 CROSS-FILE AGGREGATION SUMMARY');
    console.log('='.repeat(70));

    // Collect all PII types across all files
    const allTypes = new Map<string, {
      total_count: number;
      files: string[];
      all_contexts: Set<string>;
      confidence: { high: number; medium: number; low: number };
    }>();

    allAggregations.forEach(({ file, aggregation }) => {
      aggregation.pii_types.forEach((type) => {
        if (!allTypes.has(type.pii_type)) {
          allTypes.set(type.pii_type, {
            total_count: 0,
            files: [],
            all_contexts: new Set(),
            confidence: { high: 0, medium: 0, low: 0 },
          });
        }

        const aggregated = allTypes.get(type.pii_type)!;
        aggregated.total_count += type.count;
        aggregated.files.push(file);
        type.unique_contexts.forEach((ctx) => aggregated.all_contexts.add(ctx));
        aggregated.confidence.high += type.confidence_breakdown.high;
        aggregated.confidence.medium += type.confidence_breakdown.medium;
        aggregated.confidence.low += type.confidence_breakdown.low;
      });
    });

    // Display comprehensive list
    console.log(`\n🔍 Comprehensive PII Types Across All Files (${allTypes.size} types):\n`);
    Array.from(allTypes.entries())
      .sort((a, b) => b[1].total_count - a[1].total_count)
      .forEach(([piiType, data], index) => {
        console.log(`${index + 1}. ${piiType}`);
        console.log(`   Total Occurrences: ${data.total_count}`);
        console.log(`   Found in Files: ${data.files.length} (${[...new Set(data.files)].join(', ')})`);
        console.log(`   Confidence: High=${data.confidence.high}, Medium=${data.confidence.medium}, Low=${data.confidence.low}`);
        console.log(`   Unique Contexts (${data.all_contexts.size}):`);
        Array.from(data.all_contexts).sort().forEach((ctx) => {
          console.log(`     - "${ctx}"`);
        });
        console.log('');
      });

    // All unique contexts across all files
    const allUniqueContexts = new Set<string>();
    allAggregations.forEach(({ aggregation }) => {
      aggregation.unique_contexts.forEach((ctx) => allUniqueContexts.add(ctx));
    });

    console.log(`\n📝 All Unique Contexts Across All Files (${allUniqueContexts.size} total):\n`);
    Array.from(allUniqueContexts).sort().forEach((ctx, index) => {
      console.log(`   ${index + 1}. "${ctx}"`);
    });
  }

  console.log(`\n✅ Script completed successfully!`);
  console.log(`   Processed ${jsonFiles.length} file(s)`);
  console.log(`   Found ${allAggregations.reduce((sum, a) => sum + a.aggregation.pii_types.length, 0)} total PII types`);
}

registerScript(
  'extraction-reader',
  'Aggregate PII types and contexts from all extraction result files',
  runExtractionReaderScript
);

