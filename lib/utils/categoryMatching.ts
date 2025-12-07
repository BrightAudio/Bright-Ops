/**
 * Category Matching Utilities
 * 
 * Provides extended category matching where related categories are grouped together.
 * For example, searching for "tops" will also include "subs" since they're commonly used together.
 */

// Subcategory groups that should be searched together
export const SUBCATEGORY_GROUPS: Record<string, string[]> = {
  // When searching for tops, also include subs
  'tops': ['tops', 'subs'],
  // When searching for subs, also include tops
  'subs': ['tops', 'subs'],
  // When searching for wedges, also include monitors
  'wedges': ['wedges', 'monitor_wedges', 'monitors'],
  'monitors': ['wedges', 'monitor_wedges', 'monitors'],
  'monitor_wedges': ['wedges', 'monitor_wedges', 'monitors'],
};

/**
 * Get all subcategories that should be included when searching for a specific subcategory
 * @param subcategory - The subcategory being searched
 * @returns Array of all related subcategories to include in search
 */
export function getExtendedSubcategories(subcategory: string): string[] {
  const normalized = subcategory.toLowerCase().trim();
  return SUBCATEGORY_GROUPS[normalized] || [subcategory];
}

/**
 * Check if an item's subcategory matches the search, including extended matches
 * @param itemSubcategory - The item's subcategory
 * @param searchSubcategory - The subcategory being searched for
 * @returns true if there's a match (including extended matches)
 */
export function matchesSubcategory(itemSubcategory: string | null | undefined, searchSubcategory: string): boolean {
  if (!itemSubcategory || !searchSubcategory) return false;
  
  const extendedCategories = getExtendedSubcategories(searchSubcategory);
  const normalizedItem = itemSubcategory.toLowerCase().trim();
  
  return extendedCategories.some(cat => cat.toLowerCase() === normalizedItem);
}

/**
 * Build a Supabase query filter for subcategory that includes extended categories
 * @param subcategory - The subcategory to search for
 * @returns Supabase filter string (e.g., "subcategory.in.(tops,subs)")
 */
export function buildSubcategoryFilter(subcategory: string): string {
  const extended = getExtendedSubcategories(subcategory);
  if (extended.length === 1) {
    return `subcategory.eq.${extended[0]}`;
  }
  return `subcategory.in.(${extended.join(',')})`;
}
