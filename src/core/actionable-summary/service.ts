import { z } from 'zod';

export const ActionableSummarySchema = z.object({
  kurum: z.string(),
  tutar: z.string().nullable(),
  deadline: z.string().nullable(),
  eylem: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  ozet: z.string(),           // Tek cümlelik karar özeti
  oneriler: z.array(z.string())
});

export type ActionableSummary = z.infer<typeof ActionableSummarySchema>;

export class ActionableSummaryEngine {
  static generate(summaryData: any): ActionableSummary {
    return {
      kurum: summaryData.kurum || "Bilinmeyen Kurum",
      tutar: summaryData.tutar || null,
      deadline: summaryData.deadline || null,
      eylem: summaryData.eylem || "Belge incelenmeli",
      risk: summaryData.risk || "medium",
      ozet: this.createOzet(summaryData),
      oneriler: this.generateOneriler(summaryData)
    };
  }

  private static createOzet(data: any): string {
    if (data.tutar && data.deadline) {
      return `${data.kurum} sizden ${data.tutar} istiyor. ${data.deadline} tarihine kadar ${data.eylem.toLowerCase()}.`;
    }
    return `${data.kurum} ile ilgili önemli bir belge. ${data.eylem}.`;
  }

  private static generateOneriler(data: any): string[] {
    const oneriler: string[] = [];
    if (data.deadline) oneriler.push("Deadline'ı takvime ekleyin");
    if (data.tutar) oneriler.push("Ödeme planı oluşturun");
    oneriler.push("Belgeyi yedekleyin");
    return oneriler;
  }
}
