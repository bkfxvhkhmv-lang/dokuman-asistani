import * as LucideCalendar from 'expo-calendar';
// expo-notifications must NOT be statically imported — removed from Expo Go SDK 53+
// Use lazy import pattern below instead
import { getTageVerbleibend } from '@/utils/formatters';
import type { Dokument } from '@/store';
import {
  ensureAndroidDefaultNotificationChannel,
  withAndroidNotificationChannel,
} from '@/services/SmartNotificationsService';

// Lazy loader — resolved only when scheduling is actually called
async function getNotifications() {
  const mod = await import('expo-notifications');
  return { Notifications: mod.default ?? mod, SchedulableTriggerInputTypes: mod.SchedulableTriggerInputTypes };
}

export async function addToLucideCalendar(dok: Dokument): Promise<boolean> {
  try {
    const { status } = await LucideCalendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return false;
    const cals = await LucideCalendar.getCalendarsAsync(LucideCalendar.EntityTypes.EVENT);
    const cal = cals.find(c => c.allowsModifications) || cals[0];
    if (!cal) return false;
    const start = new Date(dok.frist!); start.setHours(9, 0, 0, 0);
    const end   = new Date(dok.frist!); end.setHours(10, 0, 0, 0);
    await LucideCalendar.createEventAsync(cal.id, {
      title: `BriefPilot · ${dok.titel}`,
      startDate: start,
      endDate: end,
      allDay: false,
      notes: dok.zusammenfassung ?? undefined,
      alarms: [
        { relativeOffset: -24 * 60 },
        { relativeOffset: -120 },
      ],
    });
    return true;
  } catch (e) { console.warn('[calendar] addToLucideCalendar error', e); return false; }
}

export const addToCalendar = addToLucideCalendar;

export interface HatirlaticiSablon { id: string; icon: string; label: string; aySayisi: number; hinweis: string }

export const HATIRLATICI_SABLONLARI: HatirlaticiSablon[] = [
  { id: 'reisepass',     icon: '🛂', label: 'Reisepass',        aySayisi: 6,  hinweis: '6 Monate vor Ablauf erneuern' },
  { id: 'fuehrerschein', icon: '🪪', label: 'Führerschein',     aySayisi: 12, hinweis: 'Jährliche Erinnerung' },
  { id: 'tuev',          icon: '🚗', label: 'TÜV / HU',         aySayisi: 11, hinweis: '1 Monat vor Ablauf' },
  { id: 'versicherung',  icon: '', label: 'Versicherung',     aySayisi: 11, hinweis: 'Jahreserinnerung' },
  { id: 'mietvertrag',   icon: '🏠', label: 'Mietvertrag',      aySayisi: 12, hinweis: 'Jährliche Überprüfung' },
  { id: 'steuern',       icon: '📊', label: 'Steuererklärung',  aySayisi: 12, hinweis: 'Jährliche Erinnerung' },
  { id: 'impfung',       icon: '💉', label: 'Impfung',          aySayisi: 11, hinweis: '1 Monat vor Ablauf' },
  { id: 'aufenthalts',   icon: '📋', label: 'Aufenthaltstitel', aySayisi: 3,  hinweis: '3 Monate vor Ablauf erneuern' },
];

export async function sablonHatirlaticiPlanle(dok: Dokument, sablon: HatirlaticiSablon): Promise<{ notifId: string; hedef: string } | null> {
  try {
    const { Notifications, SchedulableTriggerInputTypes } = await getNotifications();
    const jetzt = new Date(), hedef = new Date(jetzt);
    hedef.setMonth(hedef.getMonth() + sablon.aySayisi);
    hedef.setHours(9, 0, 0, 0);
    if (hedef <= jetzt) return null;
    await ensureAndroidDefaultNotificationChannel();
    const content = withAndroidNotificationChannel({
      title: `Bildirim  ${sablon.label} — Erinnerung`,
      body: `${dok.titel}: ${sablon.hinweis}`,
      data: { dokId: dok.id, sablonId: sablon.id },
    });
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: hedef },
    });
    return { notifId: id, hedef: hedef.toISOString() };
  } catch (e) { console.warn('[calendar] sablonHatirlaticiPlanle error', e); return null; }
}

export async function scheduleFristLocalNotifications(dok: Dokument): Promise<void> {
  try {
    if (!dok.frist || dok.erledigt) return;
    const { Notifications, SchedulableTriggerInputTypes } = await getNotifications();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await ensureAndroidDefaultNotificationChannel();

    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const row of existing) {
      const d = row.content.data as { dokId?: string; kind?: string };
      if (d?.kind === 'fristReminder' && d?.dokId === dok.id) {
        await Notifications.cancelScheduledNotificationAsync(row.identifier);
      }
    }

    const fristDt = new Date(dok.frist);
    const hoch = dok.risiko === 'hoch';
    type When = Date;

    const at = (basis: Date, h: number, m: number) => {
      const z = new Date(basis);
      z.setHours(h, m, 0, 0);
      return z;
    };

    const slots: When[] = [];
    if (hoch) {
      const drei = new Date(fristDt);
      drei.setDate(drei.getDate() - 3);
      slots.push(at(drei, 9, 0));
    }
    const einenTag = new Date(fristDt);
    einenTag.setDate(einenTag.getDate() - 1);
    slots.push(at(einenTag, 9, 0));

    slots.push(at(new Date(fristDt), 8, 0));

    const jetzt = Date.now();
    const uniqMap = new Map<number, Date>();
    for (const d of slots) uniqMap.set(d.getTime(), d);
    const uniq = [...uniqMap.values()].sort((a, b) => a.getTime() - b.getTime());

    const headline = (dok.titel || 'Dokument').slice(0, 120);
    const datumStr = fristDt.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

    let idx = 0;
    for (const when of uniq) {
      if (when.getTime() <= jetzt) continue;
      await Notifications.scheduleNotificationAsync({
        content: withAndroidNotificationChannel({
          title: hoch ? 'BriefPilot · Frist (wichtig)' : 'BriefPilot · Erinnerung',
          body: `${headline} · fällig ${datumStr}`,
          data: { dokId: dok.id, kind: 'fristReminder', slotIndex: `${idx}` },
        }),
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: when },
      });
      idx += 1;
    }
  } catch (e) {
    console.warn('[calendar] scheduleFristLocalNotifications error', e);
  }
}

/** Dokument ilk kayıtta OCR pipeline’dan tetiklenir; V1’de bildirim yalnızca takvim ekleme sonrası planlanır. */
export async function scheduleDeadlineNotification(_dok: Dokument): Promise<void> {
  return Promise.resolve();
}

export interface HatirlatmaVorschlag { tageVorher: number; datum: Date; label: string; datum_label: string; dringend: boolean }

export function berechneOptimaleHatirlatmaZeit(dok: Dokument | null | undefined): HatirlatmaVorschlag[] {
  if (!dok) return [];
  const tage = getTageVerbleibend(dok.frist);
  const vorschlaege: HatirlatmaVorschlag[] = [];
  const typDefaults: Record<string, number[]> = { Bußgeld:[1,3], Mahnung:[1,2], Steuerbescheid:[3,7,14], Behörde:[3,7], Rechnung:[3,5], Versicherung:[7,14], Vertrag:[7,30], Termin:[1,2], Sonstiges:[3,7] };
  const basisTage = typDefaults[dok.typ] || [3, 7];
  if (dok.frist) {
    const fristDat = new Date(dok.frist);
    for (const t of basisTage) {
      if (tage === null || tage > t) {
        const datum = new Date(fristDat); datum.setDate(datum.getDate() - t);
        if (datum > new Date()) vorschlaege.push({ tageVorher: t, datum, label: t === 1 ? '1 Tag vor Frist' : `${t} Tage vor Frist`, datum_label: datum.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }), dringend: t <= 2 });
      }
    }
  }
  if (dok.risiko === 'hoch' && tage !== null && tage <= 7 && tage > 0) {
    const morgen = new Date(); morgen.setDate(morgen.getDate() + 1); morgen.setHours(9, 0, 0, 0);
    if (!vorschlaege.some(v => v.tageVorher === 1)) vorschlaege.push({ tageVorher: 1, datum: morgen, label: 'Sofort — hohes Risiko', datum_label: 'Morgen früh 09:00', dringend: true });
  }
  return vorschlaege;
}
