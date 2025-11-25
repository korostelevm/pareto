import { PIICandidate, IndividualRecord, ExtractionResults } from './extraction-reader.service.ts';

/**
 * Represents a single occurrence of a PII candidate with its source file
 */
export interface PIIOccurrence {
  candidate: PIICandidate;
  file_name: string;
  file_path: string;
}

/**
 * Group of files that share the same name/address/phone
 */
export interface IdentityGroup {
  /** The identity value (name, address, or phone) */
  value: string;
  
  /** The field type */
  field: 'name' | 'address' | 'phone';
  
  /** Files that share this identity */
  files: Array<{
    file_name: string;
    file_path: string;
  }>;
  
  /** Number of files */
  count: number;
}

/**
 * Group of PII candidates that share the same value but may have different types
 * This identifies cases where the same value was classified as different PII types
 */
export interface ValueGroup {
  /** The actual value that appears in multiple contexts */
  value: string;
  
  /** All PII types this value was identified as */
  pii_types: string[];
  
  /** All unique contexts where this value appeared */
  contexts: string[];
  
  /** All contexts (including duplicates) */
  all_contexts: string[];
  
  /** Confidence breakdown across all occurrences */
  confidence_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
  
  /** Total number of occurrences */
  occurrences: number;
  
  /** Files where this value appeared */
  files: string[];
  
  /** Detailed occurrences for reference */
  occurrences_detail: PIIOccurrence[];
  
  /** Flag indicating if this is ambiguous (has multiple types or medium/low confidence) */
  is_ambiguous: boolean;
  
  /** Flag indicating type conflict (same value, different types) */
  has_type_conflict: boolean;
}

/**
 * Group of PII candidates that share the same type but have different values
 * This identifies cases where the same PII type appears with different values
 */
export interface TypeGroup {
  /** The PII type */
  pii_type: string;
  
  /** All unique values identified as this type */
  values: string[];
  
  /** All unique contexts where this type appeared */
  contexts: string[];
  
  /** All contexts (including duplicates) */
  all_contexts: string[];
  
  /** Confidence breakdown across all occurrences */
  confidence_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
  
  /** Total number of occurrences */
  occurrences: number;
  
  /** Files where this type appeared */
  files: string[];
  
  /** Detailed occurrences for reference */
  occurrences_detail: PIIOccurrence[];
  
  /** Flag indicating if this is ambiguous (has multiple values or medium/low confidence) */
  is_ambiguous: boolean;
  
  /** Flag indicating value conflict (same type, different values) */
  has_value_conflict: boolean;
  
  /** Number of unique values (if > 1, indicates potential conflict) */
  unique_value_count: number;
}

/**
 * Conflict record for ambiguous cases
 */
export interface PIIConflict {
  /** Type of conflict */
  conflict_type: 'value_type_mismatch' | 'type_value_mismatch' | 'confidence_issue';
  
  /** Description of the conflict */
  description: string;
  
  /** Related value (if applicable) */
  value?: string;
  
  /** Related PII type (if applicable) */
  pii_type?: string;
  
  /** Affected files */
  files: string[];
  
  /** Severity level */
  severity: 'high' | 'medium' | 'low';
  
  /** Detailed occurrences */
  occurrences: PIIOccurrence[];
}

/**
 * Unified PII type schema entry
 */
export interface UnifiedPIIType {
  /** Canonical type name */
  canonical_type: string;
  
  /** All variations of this type found */
  variations: string[];
  
  /** Total occurrences across all files */
  total_occurrences: number;
  
  /** Number of unique values */
  unique_values_count: number;
  
  /** Confidence breakdown */
  confidence_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
  
  /** Files where this type appears */
  files: string[];
}

/**
 * Comprehensive resolution result containing all collapsed and flagged data
 */
export interface PIIResolutionResult {
  /** Groups collapsed by value (same value, different types) */
  value_groups: Map<string, ValueGroup>;
  
  /** Groups collapsed by type (same type, different values) */
  type_groups: Map<string, TypeGroup>;
  
  /** Groups by identity fields (name, address, phone) */
  identity_groups: {
    name: Map<string, IdentityGroup>;
    address: Map<string, IdentityGroup>;
    phone: Map<string, IdentityGroup>;
  };
  
  /** Unified schema of all PII types */
  unified_schema: Map<string, UnifiedPIIType>;
  
  /** Array of all identified conflicts */
  conflicts: PIIConflict[];
  
  /** Summary statistics */
  summary: {
    total_ambiguous_candidates: number;
    total_value_groups: number;
    total_type_groups: number;
    value_conflicts_count: number;
    type_conflicts_count: number;
    total_conflicts: number;
    total_unified_types: number;
  };
  
  /** Filter options used */
  options: ResolutionOptions;
}

/**
 * Options for resolution filtering
 */
export interface ResolutionOptions {
  /** Only process ambiguous (medium/low confidence) PII */
  ambiguous_only: boolean;
  
  /** Minimum confidence level to include */
  min_confidence?: 'high' | 'medium' | 'low';
  
  /** Include high confidence items in conflict detection */
  include_high_confidence_in_conflicts: boolean;
  
  /** Normalize values before grouping (e.g., trim, lowercase) */
  normalize_values: boolean;
}

/**
 * Service for resolving and collapsing ambiguous PII entries
 */
export class PIIResolutionService {
  private occurrences: PIIOccurrence[] = [];
  private records: IndividualRecord[] = [];

  /**
   * Check if a PII type is an identity-related type (should be excluded from conflicts)
   */
  private isIdentityType(piiType: string): boolean {
    const normalizedType = piiType.toLowerCase();
    const identityTypes = [
      'name', 'customer name', 'subscriber name', 'employee name',
      'address', 'home address', 'mailing address', 'billing address', 'service address',
      'phone', 'phone number', 'telephone', 'contact phone'
    ];
    return identityTypes.some(type => normalizedType.includes(type));
  }

  /**
   * Load PII candidates from extraction results
   */
  loadFromExtractionResults(results: ExtractionResults, options: ResolutionOptions): void {
    this.occurrences = [];
    this.records = results.files;
    
    for (const file of results.files) {
      // Normalize identity fields for comparison
      const normalizedName = file.name ? this.normalizeValue(file.name) : null;
      const normalizedAddress = file.address ? this.normalizeValue(file.address) : null;
      const normalizedPhone = file.phone ? this.normalizeValue(file.phone) : null;
      
      for (const candidate of file.pii_candidates) {
        // Skip identity-related PII types (Name, Address, Phone) - they're handled by identity grouping
        if (this.isIdentityType(candidate.pii_type)) {
          continue;
        }
        
        // Skip candidates that match top-level identity fields (even if not identity type)
        const candidateValue = options.normalize_values 
          ? this.normalizeValue(candidate.value)
          : candidate.value;
        
        // Skip if this candidate matches a top-level field
        if (
          (normalizedName && candidateValue === normalizedName) ||
          (normalizedAddress && candidateValue === normalizedAddress) ||
          (normalizedPhone && candidateValue === normalizedPhone)
        ) {
          continue;
        }
        
        // Apply filters
        if (options.ambiguous_only && candidate.confidence === 'high') {
          continue;
        }
        
        if (options.min_confidence) {
          const confidenceOrder = { low: 0, medium: 1, high: 2 };
          if (confidenceOrder[candidate.confidence] < confidenceOrder[options.min_confidence]) {
            continue;
          }
        }
        
        this.occurrences.push({
          candidate,
          file_name: file.file_name,
          file_path: file.file_path,
        });
      }
    }
  }

  /**
   * Normalize a value for comparison
   */
  private normalizeValue(value: string): string {
    return value.trim().toLowerCase();
  }

  /**
   * Resolve and collapse ambiguous PII entries
   */
  resolve(options: ResolutionOptions = {
    ambiguous_only: true,
    include_high_confidence_in_conflicts: false,
    normalize_values: true,
  }): PIIResolutionResult {
    if (this.records.length === 0) {
      throw new Error('No records loaded. Call loadFromExtractionResults() first.');
    }

    // Group by identity fields (name, address, phone)
    const identityGroups = this.groupByIdentity(options);
    
    // Group by value (only for PII candidates, not identity fields)
    const valueGroups = this.groupByValue(options);
    
    // Group by type (only for PII candidates, not identity fields)
    const typeGroups = this.groupByType(options);
    
    // Build unified schema
    const unifiedSchema = this.buildUnifiedSchema(typeGroups);
    
    // Identify conflicts
    const conflicts = this.identifyConflicts(valueGroups, typeGroups);
    
    // Build summary
    const summary = {
      total_ambiguous_candidates: this.occurrences.length,
      total_value_groups: valueGroups.size,
      total_type_groups: typeGroups.size,
      value_conflicts_count: Array.from(valueGroups.values()).filter(g => g.has_type_conflict).length,
      type_conflicts_count: Array.from(typeGroups.values()).filter(g => g.has_value_conflict).length,
      total_conflicts: conflicts.length,
      total_unified_types: unifiedSchema.size,
    };

    return {
      value_groups: valueGroups,
      type_groups: typeGroups,
      identity_groups: identityGroups,
      unified_schema: unifiedSchema,
      conflicts,
      summary,
      options,
    };
  }

  /**
   * Build unified schema by aggregating all PII types
   * Groups types that appear together (same value, different type names)
   */
  private buildUnifiedSchema(typeGroups: Map<string, TypeGroup>): Map<string, UnifiedPIIType> {
    const schema = new Map<string, UnifiedPIIType>();
    
    // Find type variations by looking at value groups where same value has different types
    const typeRelations = new Map<string, Set<string>>();
    
    // Build type relationships from value groups
    for (const occurrence of this.occurrences) {
      const type = occurrence.candidate.pii_type;
      if (!typeRelations.has(type)) {
        typeRelations.set(type, new Set());
      }
    }
    
    // Find types that appear together (same value, different types)
    const valueGroups = this.groupByValue({ normalize_values: true, ambiguous_only: false, include_high_confidence_in_conflicts: false });
    for (const valueGroup of valueGroups.values()) {
      if (valueGroup.pii_types.length > 1) {
        // These types are related (same value, different names)
        for (const type1 of valueGroup.pii_types) {
          if (!typeRelations.has(type1)) {
            typeRelations.set(type1, new Set());
          }
          for (const type2 of valueGroup.pii_types) {
            if (type1 !== type2) {
              typeRelations.get(type1)!.add(type2);
            }
          }
        }
      }
    }
    
    // Build schema - each type gets its own entry, with variations listed
    for (const [piiType, group] of typeGroups.entries()) {
      const relatedTypes = typeRelations.get(piiType) || new Set<string>();
      const variations = relatedTypes.size > 0 
        ? Array.from(relatedTypes).sort()
        : [piiType];
      
      schema.set(piiType, {
        canonical_type: piiType,
        variations: variations.length > 1 ? variations : [piiType],
        total_occurrences: group.occurrences,
        unique_values_count: group.unique_value_count,
        confidence_breakdown: group.confidence_breakdown,
        files: Array.from(new Set(group.files)),
      });
    }
    
    return schema;
  }

  /**
   * Group files by identity fields (name, address, phone)
   */
  private groupByIdentity(options: ResolutionOptions): {
    name: Map<string, IdentityGroup>;
    address: Map<string, IdentityGroup>;
    phone: Map<string, IdentityGroup>;
  } {
    const nameMap = new Map<string, IdentityGroup>();
    const addressMap = new Map<string, IdentityGroup>();
    const phoneMap = new Map<string, IdentityGroup>();

    for (const record of this.records) {
      // Group by name
      if (record.name) {
        const key = options.normalize_values 
          ? this.normalizeValue(record.name)
          : record.name;
        
        if (!nameMap.has(key)) {
          nameMap.set(key, {
            value: record.name,
            field: 'name',
            files: [],
            count: 0,
          });
        }
        
        const group = nameMap.get(key)!;
        group.files.push({
          file_name: record.file_name,
          file_path: record.file_path,
        });
        group.count++;
      }

      // Group by address
      if (record.address) {
        const key = options.normalize_values 
          ? this.normalizeValue(record.address)
          : record.address;
        
        if (!addressMap.has(key)) {
          addressMap.set(key, {
            value: record.address,
            field: 'address',
            files: [],
            count: 0,
          });
        }
        
        const group = addressMap.get(key)!;
        group.files.push({
          file_name: record.file_name,
          file_path: record.file_path,
        });
        group.count++;
      }

      // Group by phone
      if (record.phone) {
        const key = options.normalize_values 
          ? this.normalizeValue(record.phone)
          : record.phone;
        
        if (!phoneMap.has(key)) {
          phoneMap.set(key, {
            value: record.phone,
            field: 'phone',
            files: [],
            count: 0,
          });
        }
        
        const group = phoneMap.get(key)!;
        group.files.push({
          file_name: record.file_name,
          file_path: record.file_path,
        });
        group.count++;
      }
    }

    return {
      name: nameMap,
      address: addressMap,
      phone: phoneMap,
    };
  }

  /**
   * Group PII candidates by value (same value, different types)
   */
  private groupByValue(options: ResolutionOptions): Map<string, ValueGroup> {
    const valueMap = new Map<string, ValueGroup>();

    for (const occurrence of this.occurrences) {
      const candidate = occurrence.candidate;
      const key = options.normalize_values 
        ? this.normalizeValue(candidate.value)
        : candidate.value;

      if (!valueMap.has(key)) {
        valueMap.set(key, {
          value: candidate.value, // Store original value
          pii_types: [],
          contexts: [],
          all_contexts: [],
          confidence_breakdown: { high: 0, medium: 0, low: 0 },
          occurrences: 0,
          files: [],
          occurrences_detail: [],
          is_ambiguous: false,
          has_type_conflict: false,
        });
      }

      const group = valueMap.get(key)!;
      
      // Add type if not already present
      if (!group.pii_types.includes(candidate.pii_type)) {
        group.pii_types.push(candidate.pii_type);
      }
      
      // Add context
      if (candidate.context) {
        group.all_contexts.push(candidate.context);
        if (!group.contexts.includes(candidate.context)) {
          group.contexts.push(candidate.context);
        }
      }
      
      // Update confidence breakdown
      group.confidence_breakdown[candidate.confidence]++;
      
      // Add file if not already present
      if (!group.files.includes(occurrence.file_name)) {
        group.files.push(occurrence.file_name);
      }
      
      // Add occurrence detail
      group.occurrences_detail.push(occurrence);
      group.occurrences++;
    }

    // Post-process: mark ambiguous and conflicts
    for (const group of valueMap.values()) {
      group.is_ambiguous = 
        group.pii_types.length > 1 || 
        group.confidence_breakdown.medium > 0 || 
        group.confidence_breakdown.low > 0;
      
      group.has_type_conflict = group.pii_types.length > 1;
    }

    return valueMap;
  }

  /**
   * Group PII candidates by type (same type, different values)
   */
  private groupByType(options: ResolutionOptions): Map<string, TypeGroup> {
    const typeMap = new Map<string, TypeGroup>();

    for (const occurrence of this.occurrences) {
      const candidate = occurrence.candidate;
      const type = candidate.pii_type;

      if (!typeMap.has(type)) {
        typeMap.set(type, {
          pii_type: type,
          values: [],
          contexts: [],
          all_contexts: [],
          confidence_breakdown: { high: 0, medium: 0, low: 0 },
          occurrences: 0,
          files: [],
          occurrences_detail: [],
          is_ambiguous: false,
          has_value_conflict: false,
          unique_value_count: 0,
        });
      }

      const group = typeMap.get(type)!;
      
      // Normalize value for comparison if needed
      const valueKey = options.normalize_values 
        ? this.normalizeValue(candidate.value)
        : candidate.value;
      
      // Add value if not already present (using normalized key for comparison)
      const existingValue = group.values.find(v => 
        options.normalize_values 
          ? this.normalizeValue(v) === valueKey
          : v === candidate.value
      );
      
      if (!existingValue) {
        group.values.push(candidate.value); // Store original value
      }
      
      // Add context
      if (candidate.context) {
        group.all_contexts.push(candidate.context);
        if (!group.contexts.includes(candidate.context)) {
          group.contexts.push(candidate.context);
        }
      }
      
      // Update confidence breakdown
      group.confidence_breakdown[candidate.confidence]++;
      
      // Add file if not already present
      if (!group.files.includes(occurrence.file_name)) {
        group.files.push(occurrence.file_name);
      }
      
      // Add occurrence detail
      group.occurrences_detail.push(occurrence);
      group.occurrences++;
    }

    // Post-process: mark ambiguous and conflicts
    for (const group of typeMap.values()) {
      group.unique_value_count = group.values.length;
      group.is_ambiguous = 
        group.values.length > 1 || 
        group.confidence_breakdown.medium > 0 || 
        group.confidence_breakdown.low > 0;
      
      group.has_value_conflict = group.values.length > 1;
    }

    return typeMap;
  }

  /**
   * Identify conflicts across value and type groups
   */
  private identifyConflicts(
    valueGroups: Map<string, ValueGroup>,
    typeGroups: Map<string, TypeGroup>
  ): PIIConflict[] {
    const conflicts: PIIConflict[] = [];

    // Conflict 1: Same value, different types (value groups with type conflicts)
    for (const group of valueGroups.values()) {
      if (group.has_type_conflict) {
        conflicts.push({
          conflict_type: 'value_type_mismatch',
          description: `Value "${group.value}" was identified as multiple PII types: ${group.pii_types.join(', ')}`,
          value: group.value,
          files: group.files,
          severity: group.pii_types.length > 2 ? 'high' : 'medium',
          occurrences: group.occurrences_detail,
        });
      }
    }

    // Conflict 2: Same type, different values (type groups with value conflicts)
    for (const group of typeGroups.values()) {
      if (group.has_value_conflict) {
        conflicts.push({
          conflict_type: 'type_value_mismatch',
          description: `PII type "${group.pii_type}" appears with ${group.values.length} different values`,
          pii_type: group.pii_type,
          files: group.files,
          severity: group.values.length > 3 ? 'high' : 'medium',
          occurrences: group.occurrences_detail,
        });
      }
    }

    // Conflict 3: Low confidence issues
    for (const occurrence of this.occurrences) {
      if (occurrence.candidate.confidence === 'low') {
        conflicts.push({
          conflict_type: 'confidence_issue',
          description: `Low confidence PII: "${occurrence.candidate.value}" as "${occurrence.candidate.pii_type}"`,
          value: occurrence.candidate.value,
          pii_type: occurrence.candidate.pii_type,
          files: [occurrence.file_name],
          severity: 'low',
          occurrences: [occurrence],
        });
      }
    }

    return conflicts;
  }

  /**
   * Get all ambiguous PII candidates
   */
  getAmbiguousCandidates(): PIIOccurrence[] {
    return this.occurrences.filter(
      occ => occ.candidate.confidence === 'medium' || occ.candidate.confidence === 'low'
    );
  }
}

