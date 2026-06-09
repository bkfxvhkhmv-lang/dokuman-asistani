/** Qualitäts-Score → Kurzbeschreibung für die Hinweisleiste */

export interface EnhancementRecommendation {
  titleKey: string;
  descriptionKey: string;
}

export function getEnhancementRecommendation(qualityScore?: number): EnhancementRecommendation {
  if (typeof qualityScore !== 'number') {
    return {
      titleKey: 'scan.enhance.auto_title',
      descriptionKey: 'scan.enhance.auto_desc',
    };
  }
  if (qualityScore < 45) {
    return {
      titleKey: 'scan.enhance.strong_title',
      descriptionKey: 'scan.enhance.strong_desc',
    };
  }
  if (qualityScore < 70) {
    return {
      titleKey: 'scan.enhance.light_title',
      descriptionKey: 'scan.enhance.light_desc',
    };
  }
  return {
    titleKey: 'scan.enhance.good_title',
    descriptionKey: 'scan.enhance.good_desc',
  };
}
