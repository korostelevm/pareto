import { readFile } from 'fs/promises';
import { z } from 'zod';

/**
 * Zod schema for validating PII extraction results
 */
const PIICandidateSchema = z.object({
  value: z.string(),
  pii_type: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  context: z.string().optional(),
});

const IndividualRecordSchema = z.object({
  file_name: z.string(),
  file_path: z.string(),
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  pii_candidates: z.array(PIICandidateSchema),
});

const ExtractionResultsSchema = z.object({
  timestamp: z.string(),
  total_files_processed: z.number(),
  total_pii_found: z.number(),
  files: z.array(IndividualRecordSchema),
});

export type PIICandidate = z.infer<typeof PIICandidateSchema>;
export type IndividualRecord = z.infer<typeof IndividualRecordSchema>;
export type ExtractionResults = z.infer<typeof ExtractionResultsSchema>;

/**
 * Query options for filtering extraction results
 */
export interface QueryOptions {
  confidence?: 'high' | 'medium' | 'low';
  piiType?: string;
  fileName?: string;
  searchValue?: string;
}

/**
 * Statistics about extraction results
 */
export interface ExtractionStats {
  total_files: number;
  total_pii_candidates: number;
  pii_by_confidence: {
    high: number;
    medium: number;
    low: number;
  };
  pii_by_type: Record<string, number>;
  files_summary: Array<{
    file_name: string;
    total_pii: number;
    confidence_breakdown: {
      high: number;
      medium: number;
      low: number;
    };
  }>;
}

/**
 * Aggregated PII type with all its contexts
 */
export interface AggregatedPIIType {
  pii_type: string;
  count: number;
  contexts: string[];
  unique_contexts: string[];
  confidence_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Comprehensive aggregation of all PII types and contexts
 */
export interface PIIAggregation {
  pii_types: AggregatedPIIType[];
  all_contexts: string[];
  unique_contexts: string[];
}

/**
 * Service for reading and querying extraction data
 */
export class ExtractionReaderService {
  private data: ExtractionResults | null = null;

  /**
   * Loads extraction results from a JSON file
   * @param filePath - Path to the extraction results JSON file
   * @throws Error if file cannot be read or data is invalid
   */
  async loadFromFile(filePath: string): Promise<ExtractionResults> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      // Validate against schema
      this.data = ExtractionResultsSchema.parse(jsonData);
      return this.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid extraction data format: ${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Gets all extraction results
   * @throws Error if data has not been loaded
   */
  getAllResults(): ExtractionResults {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }
    return this.data;
  }

  /**
   * Gets all PII candidates across all files
   * @throws Error if data has not been loaded
   */
  getAllPIICandidates(): PIICandidate[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    return this.data.files.flatMap((file) => file.pii_candidates);
  }

  /**
   * Gets PII candidates by file name
   * @param fileName - The file name to search for (exact match)
   * @throws Error if data has not been loaded
   */
  getPIIByFileName(fileName: string): PIICandidate[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    const file = this.data.files.find((f) => f.file_name === fileName);
    return file ? file.pii_candidates : [];
  }

  /**
   * Gets PII candidates by file index
   * @param fileIndex - The index of the file (0-based)
   * @throws Error if data has not been loaded or index is out of bounds
   */
  getPIIByFileIndex(fileIndex: number): IndividualRecord {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    if (fileIndex < 0 || fileIndex >= this.data.files.length) {
      throw new Error(`File index ${fileIndex} out of bounds (0-${this.data.files.length - 1})`);
    }

    return this.data.files[fileIndex];
  }

  /**
   * Gets PII candidates filtered by options
   * @param options - Query options for filtering
   * @throws Error if data has not been loaded
   */
  queryPII(options: QueryOptions): PIICandidate[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    let candidates = this.getAllPIICandidates();

    // Filter by confidence
    if (options.confidence) {
      candidates = candidates.filter((c) => c.confidence === options.confidence);
    }

    // Filter by PII type
    if (options.piiType) {
      candidates = candidates.filter((c) =>
        c.pii_type.toLowerCase().includes(options.piiType!.toLowerCase())
      );
    }

    // Filter by file name
    if (options.fileName) {
      const file = this.data.files.find((f) => f.file_name.includes(options.fileName!));
      if (file) {
        candidates = candidates.filter((c) => file.pii_candidates.includes(c));
      } else {
        candidates = [];
      }
    }

    // Search by value
    if (options.searchValue) {
      candidates = candidates.filter((c) =>
        c.value.toLowerCase().includes(options.searchValue!.toLowerCase())
      );
    }

    return candidates;
  }

  /**
   * Gets all unique PII types found
   * @throws Error if data has not been loaded
   */
  getUniquePIITypes(): string[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    const types = new Set<string>();
    this.getAllPIICandidates().forEach((c) => types.add(c.pii_type));
    return Array.from(types).sort();
  }

  /**
   * Gets PII candidates by specific type
   * @param piiType - The PII type to filter by
   * @throws Error if data has not been loaded
   */
  getPIIByType(piiType: string): PIICandidate[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    return this.getAllPIICandidates().filter((c) => c.pii_type === piiType);
  }

  /**
   * Gets PII candidates by confidence level
   * @param confidence - The confidence level to filter by
   * @throws Error if data has not been loaded
   */
  getPIIByConfidence(confidence: 'high' | 'medium' | 'low'): PIICandidate[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    return this.getAllPIICandidates().filter((c) => c.confidence === confidence);
  }

  /**
   * Gets detailed statistics about the extraction results
   * @throws Error if data has not been loaded
   */
  getStatistics(): ExtractionStats {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    const allCandidates = this.getAllPIICandidates();

    // Count by confidence
    const confidenceCounts = {
      high: allCandidates.filter((c) => c.confidence === 'high').length,
      medium: allCandidates.filter((c) => c.confidence === 'medium').length,
      low: allCandidates.filter((c) => c.confidence === 'low').length,
    };

    // Count by type
    const typeCounts: Record<string, number> = {};
    allCandidates.forEach((c) => {
      typeCounts[c.pii_type] = (typeCounts[c.pii_type] || 0) + 1;
    });

    // Per-file summary
    const filesSummary = this.data.files.map((file) => {
      const fileCandidates = file.pii_candidates;
      return {
        file_name: file.file_name,
        total_pii: fileCandidates.length,
        confidence_breakdown: {
          high: fileCandidates.filter((c) => c.confidence === 'high').length,
          medium: fileCandidates.filter((c) => c.confidence === 'medium').length,
          low: fileCandidates.filter((c) => c.confidence === 'low').length,
        },
      };
    });

    return {
      total_files: this.data.total_files_processed,
      total_pii_candidates: allCandidates.length,
      pii_by_confidence: confidenceCounts,
      pii_by_type: typeCounts,
      files_summary: filesSummary,
    };
  }

  /**
   * Gets all unique contexts found across all PII candidates
   * @throws Error if data has not been loaded
   */
  getUniqueContexts(): string[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    const contexts = new Set<string>();
    this.getAllPIICandidates().forEach((c) => {
      if (c.context) {
        contexts.add(c.context);
      }
    });
    return Array.from(contexts).sort();
  }

  /**
   * Gets all contexts (including duplicates) found across all PII candidates
   * @throws Error if data has not been loaded
   */
  getAllContexts(): string[] {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    return this.getAllPIICandidates()
      .map((c) => c.context)
      .filter((ctx): ctx is string => ctx !== undefined);
  }

  /**
   * Aggregates all PII types with their contexts and statistics
   * @throws Error if data has not been loaded
   */
  aggregatePIITypes(): PIIAggregation {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    const allCandidates = this.getAllPIICandidates();
    const typeMap = new Map<string, PIICandidate[]>();

    // Group candidates by PII type
    allCandidates.forEach((candidate) => {
      const type = candidate.pii_type;
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type)!.push(candidate);
    });

    // Build aggregated data for each type
    const aggregatedTypes: AggregatedPIIType[] = Array.from(typeMap.entries()).map(([piiType, candidates]) => {
      const contexts = candidates.map((c) => c.context).filter((ctx): ctx is string => ctx !== undefined);
      const uniqueContexts = Array.from(new Set(contexts));

      return {
        pii_type: piiType,
        count: candidates.length,
        contexts,
        unique_contexts: uniqueContexts,
        confidence_breakdown: {
          high: candidates.filter((c) => c.confidence === 'high').length,
          medium: candidates.filter((c) => c.confidence === 'medium').length,
          low: candidates.filter((c) => c.confidence === 'low').length,
        },
      };
    });

    // Sort by count (descending)
    aggregatedTypes.sort((a, b) => b.count - a.count);

    // Get all contexts
    const allContexts = this.getAllContexts();
    const uniqueContexts = this.getUniqueContexts();

    return {
      pii_types: aggregatedTypes,
      all_contexts: allContexts,
      unique_contexts: uniqueContexts,
    };
  }

  /**
   * Gets aggregated data for a specific PII type
   * @param piiType - The PII type to aggregate
   * @throws Error if data has not been loaded
   */
  getAggregatedType(piiType: string): AggregatedPIIType | null {
    if (!this.data) {
      throw new Error('No data loaded. Call loadFromFile() first.');
    }

    const candidates = this.getPIIByType(piiType);
    if (candidates.length === 0) {
      return null;
    }

    const contexts = candidates.map((c) => c.context).filter((ctx): ctx is string => ctx !== undefined);
    const uniqueContexts = Array.from(new Set(contexts));

    return {
      pii_type: piiType,
      count: candidates.length,
      contexts,
      unique_contexts: uniqueContexts,
      confidence_breakdown: {
        high: candidates.filter((c) => c.confidence === 'high').length,
        medium: candidates.filter((c) => c.confidence === 'medium').length,
        low: candidates.filter((c) => c.confidence === 'low').length,
      },
    };
  }

}

/**
 * Factory function to create and initialize a reader service
 * @param filePath - Path to the extraction results JSON file
 */
export async function createExtractionReader(filePath: string): Promise<ExtractionReaderService> {
  const reader = new ExtractionReaderService();
  await reader.loadFromFile(filePath);
  return reader;
}

