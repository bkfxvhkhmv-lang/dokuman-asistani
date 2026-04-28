/**
 * DocumentOrchestratorV4
 * OCR → Rule Engine → Metadata → V4 Upload → Timeline → Sync → Intelligence
 */
import { uploadDocumentV4Safe, explainDocumentSafe } from '../../services/v4Api';
import { extractTextFromImage, analysiereText } from '../../services/visionApi';
import { EventLogger } from '../events/EventLogger';
import { CloudSyncV4 } from '../sync/CloudSyncV4';
import { RuleEngineV4, LocalRule } from '../rules/RuleEngineV4';
import { InstitutionBehaviorModel } from '../intelligence/InstitutionBehaviorModel';
import { AutoWorkflowEngine, type GeneratedWorkflow } from '../intelligence/AutoWorkflowEngine';
import { scheduleDeadlineNotification } from '../../utils';
import * as FileSystem from 'expo-file-system/legacy';

export interface OcrResult {
  rohText:     string;
  confidence:  number | null;
  entityBoxes?: import('../../services/visionApi').EntityBox[];
  typ: string;
  absender: string;
  zusammenfassung: string;
  betrag: number | null;
  frist: string | null;
  risiko: 'hoch' | 'mittel' | 'niedrig';
  iban: string | null;
  aktionen: string[];
}

export interface UploadResult {
  docId: string;
  status: string;
  v4DocId: string | null;
}

export interface ProcessOptions {
  userRules?: LocalRule[];
  lang?: string;
  scheduleNotification?: boolean;
}

export class DocumentOrchestratorV4 {

  // ── 1. Tam pipeline: URI listesi → analiz edilmiş belge ──────────────────────
  static async processImages(
    uris: string[],
    options: ProcessOptions = {},
  ): Promise<OcrResult> {
    const { lang = 'de' } = options;

    // OCR — tüm sayfaları birleştir
    let alleTexte = '';
    let totalConfidence = 0;
    let allEntityBoxes: import('../../services/visionApi').EntityBox[] = [];

    for (const uri of uris) {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { text, confidence, entityBoxes } = await extractTextFromImage(base64);
      if (text) alleTexte += (alleTexte ? '\n\n' : '') + text;
      if (confidence) totalConfidence += confidence;
      if (entityBoxes?.length) allEntityBoxes = [...allEntityBoxes, ...entityBoxes];
    }
    const confidence = uris.length > 0 ? Math.round(totalConfidence / uris.length) : null;

    if (!alleTexte || alleTexte.trim().length < 10) {
      throw new Error('Kein Text erkannt. Bitte deutlicheres Foto aufnehmen.');
    }

    // Temel analiz (regex + keyword)
    const analyse = analysiereText(alleTexte);

    // Rule Engine — yerleşik + kullanıcı kuralları
    const withRules = RuleEngineV4.applyRules(
      { ...analyse, rohText: alleTexte },
      options.userRules ?? [],
    );

    return {
      rohText:         alleTexte,
      confidence,
      entityBoxes:     allEntityBoxes.length > 0 ? allEntityBoxes : undefined,  // #53
      typ:             withRules.typ            ?? analyse.typ,
      absender:        withRules.absender       ?? analyse.absender,
      zusammenfassung: withRules.zusammenfassung ?? analyse.zusammenfassung,
      betrag:          withRules.betrag         ?? analyse.betrag ?? null,
      frist:           withRules.frist          ?? analyse.frist  ?? null,
      risiko:          withRules.risiko         ?? analyse.risiko,
      iban:            withRules.iban           ?? analyse.iban   ?? null,
      aktionen:        analyse.aktionen         ?? [],
    };
  }

  // ── 2. V4 backend'e yükle + event log ────────────────────────────────────────
  static async upload(
    fileUri: string,
    filename: string,
    options: ProcessOptions = {},
  ): Promise<UploadResult> {
    await EventLogger.log('pending', 'DOCUMENT_UPLOADED', { filename });

    const doc = await uploadDocumentV4Safe(fileUri, filename);
    const docId: string = doc.id;

    await EventLogger.log(docId, 'DOCUMENT_UPLOADED', { filename, status: doc.status });

    // Delta sync arka planda
    CloudSyncV4.delta().catch(() => null);

    return { docId, status: doc.status ?? '', v4DocId: docId ?? null };
  }

  // ── 3. Belgeyi AI ile açıkla ─────────────────────────────────────────────────
  static async explain(docId: string, lang: string = 'de'): Promise<string> {
    const result = await explainDocumentSafe(docId, lang);
    return result?.text ?? '';
  }

  // ── 4. Tam akış: tara → analiz et → yükle → bildirim → intelligence ──────────
  static async fullPipeline(
    uris: string[],
    filename: string,
    options: ProcessOptions = {},
  ): Promise<{ ocr: OcrResult; upload: UploadResult; workflow: GeneratedWorkflow }> {
    const ocr = await this.processImages(uris, options);

    // V4'e arka planda yükle (hata sessizce yutulur)
    let upload: UploadResult = { docId: '', status: 'local_only', v4DocId: null };
    try {
      upload = await this.upload(uris[0], filename, options);
    } catch {
      // Çevrimdışı veya sunucu hatası — yerel kayıt yeterli
    }

    // Kurum davranışını öğren
    InstitutionBehaviorModel.learn({ ...ocr, id: upload.docId || 'local' }).catch(() => null);

    // Otomatik workflow oluştur
    const workflow = await AutoWorkflowEngine.generate({ ...ocr, id: upload.docId || 'local' });

    // Frist varsa bildirim planla
    if (options.scheduleNotification && ocr.frist) {
      scheduleDeadlineNotification({ frist: ocr.frist, titel: filename } as any);
    }

    return { ocr, upload, workflow };
  }
}
