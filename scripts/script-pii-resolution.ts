import { readDirectoryFiles } from '../src/services/directory.service.ts';
import { ExtractionReaderService } from '../src/services/extraction-reader.service.ts';
import { PIIResolutionService } from '../src/services/pii-resolution.service.ts';
import { join } from 'path';
import { registerScript } from './runner.ts';

/**
 * Test script for PII Resolution Service
 * Resolves and collapses ambiguous PII entries with multi-level grouping
 */
async function runPIIResolutionScript() {
  const dataDir = join(process.cwd(), 'data');
  const files = await readDirectoryFiles(dataDir);
  const jsonFiles = files.filter((f) => f.name.endsWith('.json'));

  if (jsonFiles.length === 0) {
    throw new Error('No JSON files found in data directory');
  }

  for (const file of jsonFiles) {
    const reader = new ExtractionReaderService();
    await reader.loadFromFile(file.path);
    const results = reader.getAllResults();

    const resolutionService = new PIIResolutionService();
    resolutionService.loadFromExtractionResults(results, {
      ambiguous_only: false,
      include_high_confidence_in_conflicts: true,
      normalize_values: true,
    });
    
    const resolution = resolutionService.resolve();

    // Canonical schema (merged from value matches)
    const canonicalSchema = Array.from(resolution.canonical_schema.values())
      .sort((a, b) => b.total_occurrences - a.total_occurrences);

    // Value conflicts: same value, different types
    const valueConflicts = Array.from(resolution.value_groups.values())
      .filter(g => g.has_type_conflict)
      .sort((a, b) => b.occurrences - a.occurrences);

    // Type conflicts: same type, different values
    const typeConflicts = Array.from(resolution.type_groups.values())
      .filter(g => g.has_value_conflict)
      .sort((a, b) => b.occurrences - a.occurrences);

    console.log(`\n📄 ${file.name}`);
    
    // Show canonical schema
    if (canonicalSchema.length > 0) {
      console.log(`\n📋 Canonical PII Schema (${canonicalSchema.length} types):`);
      canonicalSchema.forEach((type, index) => {
        console.log(`\n  ${index + 1}. ${type.canonical_type}`);
        if (type.all_type_names.length > 1) {
          console.log(`     Merged from: ${type.all_type_names.join(', ')}`);
          console.log(`     Value matches: ${type.value_match_count}`);
        }
        console.log(`     Occurrences: ${type.total_occurrences}, Unique Values: ${type.unique_values_count}`);
        console.log(`     Confidence: High=${type.confidence_breakdown.high}, Medium=${type.confidence_breakdown.medium}, Low=${type.confidence_breakdown.low}`);
      });
    }
    
    if (valueConflicts.length > 0) {
      console.log(`\n🔴 Value Conflicts (same value, different types):`);
      valueConflicts.forEach(group => {
        console.log(`  "${group.value}" → Types: ${group.pii_types.join(', ')}`);
      });
    }

    if (typeConflicts.length > 0) {
      console.log(`\n🟡 Type Conflicts (same type, different values):`);
      typeConflicts.forEach(group => {
        console.log(`  "${group.pii_type}" → Values: ${group.values.map(v => `"${v}"`).join(', ')}`);
      });
    }

    if (valueConflicts.length === 0 && typeConflicts.length === 0) {
      console.log(`\n✅ No conflicts found`);
    }
  }
}

registerScript(
  'pii-resolution',
  'Resolve and collapse ambiguous PII entries with multi-level grouping',
  runPIIResolutionScript
);

