// ============================================================================
// Variable Substitution System
// Handles {ORG_NAME}, {INDUSTRY}, {USE_CASE_N}, {TONE_NOTES} placeholders
// ============================================================================

import type { Organization } from '@/lib/types';

export interface VariableContext {
  ORG_NAME: string;
  INDUSTRY: string;
  TONE_NOTES: string;
  USE_CASE_1?: string;
  USE_CASE_2?: string;
  USE_CASE_3?: string;
  USE_CASE_4?: string;
  USE_CASE_5?: string;
  [key: string]: string | undefined;
}

/**
 * Build variable context from organization
 */
export function buildVariableContext(org: Organization): VariableContext {
  const context: VariableContext = {
    ORG_NAME: org.name,
    INDUSTRY: org.industry || 'your industry',
    TONE_NOTES: org.tone_notes || 'professional and helpful',
  };

  // Add use cases
  org.example_use_cases.forEach((useCase, index) => {
    context[`USE_CASE_${index + 1}`] = useCase;
  });

  return context;
}

/**
 * Substitute variables in text
 * Replaces {VARIABLE_NAME} with corresponding values
 */
export function substituteVariables(
  text: string,
  context: VariableContext
): string {
  return text.replace(/\{([A-Z_0-9]+)\}/g, (match, variableName) => {
    const value = context[variableName];
    if (value !== undefined) {
      return value;
    }
    // Return placeholder if variable not found
    return `[${variableName}]`;
  });
}

/**
 * Extract variable names from text
 */
export function extractVariables(text: string): string[] {
  const matches = text.match(/\{([A-Z_0-9]+)\}/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

/**
 * Check if text contains unsubstituted variables
 */
export function hasUnsubstitutedVariables(text: string): boolean {
  return /\{[A-Z_0-9]+\}/.test(text);
}

/**
 * Get list of standard variables
 */
export function getStandardVariables(): string[] {
  return [
    'ORG_NAME',
    'INDUSTRY',
    'TONE_NOTES',
    'USE_CASE_1',
    'USE_CASE_2',
    'USE_CASE_3',
    'USE_CASE_4',
    'USE_CASE_5',
  ];
}

/**
 * Validate that all variables in text are standard
 */
export function validateVariables(text: string): {
  valid: boolean;
  unknownVariables: string[];
} {
  const variables = extractVariables(text);
  const standardVars = getStandardVariables();
  const unknownVariables = variables.filter(v => !standardVars.includes(v));
  
  return {
    valid: unknownVariables.length === 0,
    unknownVariables,
  };
}
