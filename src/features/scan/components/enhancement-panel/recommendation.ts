/** Qualitäts-Score → Kurzbeschreibung für die Hinweisleiste */

export interface EnhancementRecommendation {
  title: string;
  description: string;
}

export function getEnhancementRecommendation(qualityScore?: number): EnhancementRecommendation {
  if (typeof qualityScore !== 'number') {
    return {
      title: 'Auto Enhance',
      description: 'Nutze Clean oder Magic für klarere Kanten und stabileres OCR.',
    };
  }
  if (qualityScore < 45) {
    return {
      title: 'Starke Optimierung empfohlen',
      description: 'Magic oder Clean helfen bei schwachem Kontrast und unruhigem Hintergrund.',
    };
  }
  if (qualityScore < 70) {
    return {
      title: 'Leichte Optimierung empfohlen',
      description: 'Clean glättet den Scan, ohne zu aggressiv zu wirken.',
    };
  }
  return {
    title: 'Scan ist bereits stark',
    description: 'Original oder Color behalten mehr Details, wenn der Scan schon sauber ist.',
  };
}
