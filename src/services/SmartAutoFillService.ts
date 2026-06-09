/** Smart Auto-Fill — geriye dönük import yolu için barrel. Mantık `./smart-autofill/`. */
export type {
  FieldConfidence,
  AutoFillField,
  ExtractedFields,
  AutoFillResult,
  KorrekturVorschlag,
} from '@/services/smart-autofill';
export { runSmartAutoFill, mergeAutoFillIntoDokument } from '@/services/smart-autofill';
