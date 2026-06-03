import type { ReplyRiskLevel, ReplyTemplate, ReplyTemplateField } from '@/features/reply-assistant/domain/types';

type TemplateInput = {
  id: string;
  category: string;
  institutionType: string;
  documentType: string;
  actionType: ReplyTemplate['actionType'];
  title: string;
  riskLevel: ReplyRiskLevel;
  requiresLegalCaution?: boolean;
  requiredFields: string[];
  optionalFields: string[];
  sensitiveFields?: string[];
  attachmentHints?: string[];
  tone: string;
  legalRiskNotes: string;
  subject: string;
  body: string;
  safetyNote: string;
};

function makeFields(requiredFields: string[], optionalFields: string[]): ReplyTemplateField[] {
  return [
    ...requiredFields.map(key => ({ key, labelKey: `reply.field.${key}`, required: true })),
    ...optionalFields.map(key => ({ key, labelKey: `reply.field.${key}`, required: false })),
  ];
}

function defineTemplate(input: TemplateInput): ReplyTemplate {
  return {
    id: input.id,
    locale: 'de',
    version: 1,
    category: input.category,
    institutionType: input.institutionType,
    documentType: input.documentType,
    actionType: input.actionType,
    title: input.title,
    tone: input.tone,
    legalRiskNotes: input.legalRiskNotes,
    requiredFields: input.requiredFields,
    optionalFields: input.optionalFields,
    sensitiveFields: input.sensitiveFields,
    attachmentHints: input.attachmentHints,
    subjectTemplate: input.subject,
    body: input.body,
    safetyNote: input.safetyNote,
    fields: makeFields(input.requiredFields, input.optionalFields),
    safety: {
      riskLevel: input.riskLevel,
      requiresLegalCaution: input.requiresLegalCaution ?? input.riskLevel === 'high',
    },
  };
}

export const germanMvpReplyTemplates: ReplyTemplate[] = [
  defineTemplate({
    id: 'bussgeld_akten_einsicht_009',
    category: 'bussgeld',
    institutionType: 'bussgeldstelle',
    documentType: 'letter',
    actionType: 'request',
    title: 'Antrag auf Akteneinsicht',
    riskLevel: 'low',
    requiresLegalCaution: true,
    requiredFields: ['aktenzeichen', 'name', 'adresse'],
    optionalFields: [],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Reine Informationsbeschaffung. Da noch keine Einlassung zur Sache erfolgt, besteht kein unmittelbares rechtliches Risiko.',
    subject: 'Antrag auf Akteneinsicht – Aktenzeichen: {{aktenzeichen}}',
    body: `Sehr geehrte Damen und Herren,

in der Bußgeldsache gegen mich mit dem Aktenzeichen {{aktenzeichen}} beantrage ich hiermit die Einsicht in die vollständigen Verfahrensakten gemäß § 49 Abs. 1 OWiG.

Zur ordnungsgemäßen Prüfung des mir zur Last gelegten Sachverhalts und zur Vorbereitung einer etwaigen Stellungnahme ist die Einsichtnahme in die behördlichen Unterlagen erforderlich. Ich bitte daher um Übersendung von Aktenkopien oder um die Bereitstellung der Akte in elektronischer Form.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Dieser Antrag dient ausschließlich der Informationsbeschaffung. Er äußert sich nicht zur Schuldfrage. Beachten Sie, dass für die Akteneinsicht oder die Zusendung von Kopien gesetzliche Gebühren anfallen können.',
  }),
  defineTemplate({
    id: 'bussgeld_fristverlaengerung_010',
    category: 'bussgeld',
    institutionType: 'bussgeldstelle',
    documentType: 'letter',
    actionType: 'request',
    title: 'Antrag auf Fristverlängerung zur Stellungnahme',
    riskLevel: 'low',
    requiresLegalCaution: true,
    requiredFields: ['aktenzeichen', 'name', 'adresse', 'neue_frist'],
    optionalFields: ['begruendung_frist'],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Ein Antrag auf Fristverlängerung für das Anhörungsverfahren birgt kaum rechtliche Risiken. Die Behörde ist jedoch nicht verpflichtet, der Verlängerung stattzugeben.',
    subject: 'Antrag auf Fristverlängerung zur Stellungnahme – Aktenzeichen: {{aktenzeichen}}',
    body: `Sehr geehrte Damen und Herren,

in dem Ordnungswidrigkeitenverfahren mit dem Aktenzeichen {{aktenzeichen}} nehme ich Bezug auf Ihr Schreiben bezüglich der Anhörung zum Vorwurf einer Ordnungswidrigkeit.

Da ich für die Prüfung des Sachverhalts und ggf. für die Abstimmung oder Beschaffung von Nachweisen zusätzliche Zeit benötige, beantrage ich hiermit eine Verlängerung der Frist zur Abgabe einer Stellungnahme bis zum {{neue_frist}}.
{{#if begruendung_frist}}

Als Begründung füge ich hinzu: {{begruendung_frist}}
{{/if}}

Ich bitte um eine kurze Bestätigung der Fristverlängerung.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Das Einreichen dieses Antrags garantiert nicht, dass die Bußgeldstelle die Frist verlängert. Senden Sie das Schreiben rechtzeitig ab und prüfen Sie kurz vor Ablauf der ursprünglichen Frist den Status, um Nachteile zu vermeiden.',
  }),
  defineTemplate({
    id: 'bussgeld_photo_anfordern_013',
    category: 'bussgeld',
    institutionType: 'bussgeldstelle',
    documentType: 'letter',
    actionType: 'request',
    title: 'Anforderung des Beweisfotos',
    riskLevel: 'low',
    requiresLegalCaution: false,
    requiredFields: ['aktenzeichen', 'name', 'adresse'],
    optionalFields: [],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Es wird keine Aussage zur Fahrereigenschaft oder Schuld getroffen. Die reine Bitte um Zusendung des Beweisfotos birgt kein rechtliches Risiko.',
    subject: 'Anforderung des Beweisfotos – Aktenzeichen: {{aktenzeichen}}',
    body: `Sehr geehrte Damen und Herren,

in dem Bußgeldverfahren mit dem Aktenzeichen {{aktenzeichen}} habe ich Ihr Schreiben erhalten.

Um den Vorgang prüfen und den Fahrzeugführer zum fraglichen Zeitpunkt eindeutig identifizieren zu können, bitte ich hiermit um das entsprechende Beweisfoto bzw. die Messdaten. Soweit mir bereits ein Foto vorliegt, bitte ich um Übersendung einer gut lesbaren Kopie. Falls mir bisher kein Foto übersandt wurde, bitte ich um erstmalige Übersendung des vorhandenen Beweisfotos.

Nach Erhalt und Sichtung des Fotos werde ich mich zeitnah zum Sachverhalt äußern.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Die Anforderung eines Beweisfotos unterbricht oder stoppt laufende Fristen (z. B. die Einspruchsfrist gegen einen bereits erlassenen Bußgeldbescheid) im Regelfall nicht. Reagieren Sie daher trotzdem innerhalb der gesetzlichen Fristen.',
  }),
  defineTemplate({
    id: 'bussgeld_parking_einspruch_003',
    category: 'bussgeld',
    institutionType: 'bussgeldstelle',
    documentType: 'letter',
    actionType: 'dispute',
    title: 'Einspruch gegen Verwarnungsgeld (Parkverstoß)',
    riskLevel: 'medium',
    requiresLegalCaution: false,
    requiredFields: ['aktenzeichen', 'name', 'adresse', 'einspruch_begruendung'],
    optionalFields: [],
    tone: 'Formell & Bestimmt',
    legalRiskNotes: 'Der Einspruch verhindert die Rechtskraft des Bescheids. Es besteht das Risiko, dass die Behörde den Einspruch ablehnt und das Verfahren an das Amtsgericht abgibt, was mit zusätzlichen Kosten verbunden sein kann.',
    subject: 'Einspruch gegen den Bußgeldbescheid / Verwarnung wegen Parkverstoß – Aktenzeichen: {{aktenzeichen}}',
    body: `Sehr geehrte Damen und Herren,

gegen den Bescheid / die Verwarnung wegen eines vermeintlichen Parkverstoßes mit dem Aktenzeichen {{aktenzeichen}} lege ich hiermit form- und fristgerecht Einspruch ein.

Der Vorwurf wird aus folgenden Gründen bestritten:
{{einspruch_begruendung}}

Ich bitte Sie, den Sachverhalt anhand dieser Angaben erneut zu prüfen und mir das Ergebnis der Prüfung mitzuteilen.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Begründen Sie Ihren Einspruch im Feld "einspruch_begruendung" sachlich und wahrheitsgemäß (z. B. defekter Parkscheinautomat, gültiger Parkausweis lag aus). Das Risiko bei Ablehnung des Einspruchs ist der Übergang in ein teureres gerichtliches Verfahren.',
  }),
  defineTemplate({
    id: 'bussgeld_general_einspruch_005',
    category: 'bussgeld',
    institutionType: 'bussgeldstelle',
    documentType: 'letter',
    actionType: 'dispute',
    title: 'Einspruch zur Fristwahrung gegen den Bußgeldbescheid',
    riskLevel: 'high',
    requiresLegalCaution: true,
    requiredFields: ['aktenzeichen', 'name', 'adresse'],
    optionalFields: [],
    tone: 'Formell & Prozedural',
    legalRiskNotes: 'Verhindert den Eintritt der formellen Rechtskraft des Bescheids. Die Begründung muss zwingend zeitnah nachgereicht werden. Einspruch ohne voreilige Tatsachenbehauptungen minimiert prozessuale Risiken im ersten Schritt.',
    subject: 'Einspruch gegen den Bußgeldbescheid – Aktenzeichen: {{aktenzeichen}}',
    body: `Sehr geehrte Damen und Herren,

gegen den Bußgeldbescheid mit dem Aktenzeichen {{aktenzeichen}} lege ich hiermit form- und fristgerecht Einspruch ein.

Der Einspruch erfolgt zunächst zur Fristwahrung ohne nähere Begründung. Eine ausführliche Begründung wird nachgeholt, sobald mir alle notwendigen Unterlagen vorliegen und die interne Prüfung abgeschlossen ist.

Bitte bestätigen Sie mir den rechtzeitigen Eingang dieses Einspruchs.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Die Frist für den Einspruch beträgt strikt zwei Wochen ab Zustellung des Bußgeldbescheids. Da dieser Einspruch zunächst unbegründet erfolgt, muss die detaillierte Begründung zeitnah nachgeliefert werden, um eine kostenpflichtige Abgabe an das Amtsgericht ohne Gehör zu verhindern.',
  }),
  defineTemplate({
    id: 'jobcenter_unterlagen_nachreichung_004',
    category: 'jobcenter',
    institutionType: 'jobcenter',
    documentType: 'letter',
    actionType: 'submit',
    title: 'Nachreichung von Unterlagen',
    riskLevel: 'low',
    requiresLegalCaution: false,
    requiredFields: ['bg_nummer', 'name', 'adresse', 'unterlagen_liste'],
    optionalFields: ['aktenzeichen'],
    tone: 'Formell & Kooperativ',
    legalRiskNotes: 'Keine rechtlichen Risiken. Das Schreiben dient dem Nachweis, dass der Bürger seiner Mitwirkungspflicht nachgekommen ist.',
    subject: 'Nachreichung von Unterlagen – BG-Nr. {{bg_nummer}}',
    body: `Sehr geehrte Damen und Herren,

unter Bezugnahme auf Ihre Aufforderung zur Mitwirkung bzw. Ihr aktuelles Schreiben reiche ich hiermit die noch ausstehenden Unterlagen zu meiner Bedarfsgemeinschaft ein.
{{#if aktenzeichen}}
Mein Aktenzeichen lautet: {{aktenzeichen}}
{{/if}}

Es handelt sich hierbei um folgende Dokumente:
{{unterlagen_liste}}

Ich bitte um eine kurze Eingangsbestätigung und um die Fortführung der Bearbeitung meines Vorgangs.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Bitte listen Sie im Feld "unterlagen_liste" alle Dokumente übersichtlich auf. Vergewissern Sie sich, dass die Unterlagen vollständig sind, um weitere Verzögerungen bei der Auszahlung zu vermeiden.',
  }),
  defineTemplate({
    id: 'jobcenter_fristverlaengerung_005',
    category: 'jobcenter',
    institutionType: 'jobcenter',
    documentType: 'letter',
    actionType: 'request',
    title: 'Antrag auf Fristverlängerung (Mitwirkung)',
    riskLevel: 'low',
    requiresLegalCaution: false,
    requiredFields: ['bg_nummer', 'name', 'adresse', 'datum_schreiben', 'neue_frist'],
    optionalFields: ['begruendung_frist'],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Wird eingereicht, um Rechtsnachteile wegen verspäteter Einreichung von Unterlagen zu verhindern. Das Jobcenter entscheidet nach Ermessen, ein Rechtsanspruch besteht nicht.',
    subject: 'Antrag auf Fristverlängerung zur Mitwirkung – BG-Nr. {{bg_nummer}}',
    body: `Sehr geehrte Damen und Herren,

in der Angelegenheit der Überprüfung meiner Leistungsvoraussetzungen nehme ich Bezug auf Ihr Schreiben vom {{datum_schreiben}}, mit dem Sie mich zur Einreichung von Unterlagen aufgefordert haben.

Da es mir aus organisatorischen Gründen nicht möglich ist, alle Dokumente innerhalb der gesetzten Frist vollständig zu beschaffen, beantrage ich hiermit eine Verlängerung dieser Frist bis zum {{neue_frist}}.
{{#if begruendung_frist}}

Als Begründung hierfür füge ich hinzu: {{begruendung_frist}}
{{/if}}

Sobald mir die Unterlagen vorliegen, werde ich diese umgehend nachreichen. Ich bitte um eine kurze Bestätigung der neuen Frist.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Das Jobcenter ist nicht gesetzlich verpflichtet, einer Fristverlängerung zuzustimmen. Senden Sie dieses Schreiben rechtzeitig vor Ablauf der ursprünglichen Frist ab, um Leistungskürzungen zu vermeiden.',
  }),
  defineTemplate({
    id: 'jobcenter_sachstandsanfrage_untaetigkeit_013',
    category: 'jobcenter',
    institutionType: 'jobcenter',
    documentType: 'letter',
    actionType: 'request',
    title: 'Sachstandsanfrage zum Antrag',
    riskLevel: 'low',
    requiresLegalCaution: true,
    requiredFields: ['bg_nummer', 'name', 'adresse', 'antrag_datum', 'antrag_typ'],
    optionalFields: [],
    tone: 'Formell & Höflich',
    legalRiskNotes: 'Reine Sachstandsanfrage ohne aggressive rechtliche Schritte. Dient der Beschleunigung des Verfahrens.',
    subject: 'Sachstandsanfrage zu meinem Antrag vom {{antrag_datum}} – BG-Nr. {{bg_nummer}}',
    body: `Sehr geehrte Damen und Herren,

am {{antrag_datum}} habe ich bei Ihnen einen Antrag auf {{antrag_typ}} eingereicht. 

Da mir hierzu bisher noch kein Bescheid oder eine Rückmeldung vorliegt, möchte ich mich höflich nach dem aktuellen Bearbeitungsstand erkundigen. Falls noch Unterlagen oder Angaben meinerseits erforderlich sein sollten, teilen Sie mir dies bitte kurzfristig mit.

Ihre Rückmeldung und eine zeitnahe Bearbeitung würden mir sehr helfen.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Je nach Verfahrensart gelten unterschiedliche Bearbeitungs- und Rechtsbehelfsfristen. Prüfen Sie daher das Datum Ihres Antrags und vorhandene Bescheide sorgfältig.',
  }),
  defineTemplate({
    id: 'jobcenter_antrag_wba_007',
    category: 'jobcenter',
    institutionType: 'jobcenter',
    documentType: 'letter',
    actionType: 'submit',
    title: 'Begleitschreiben zum Weiterbewilligungsantrag (WBA)',
    riskLevel: 'medium',
    requiresLegalCaution: false,
    requiredFields: ['bg_nummer', 'name', 'adresse', 'zeitraum_von'],
    optionalFields: ['aenderungen_details'],
    tone: 'Formell & Informativ',
    legalRiskNotes: 'Begleitschreiben zur Einreichung des WBA-Formulars. Jede Angabe muss wahrheitsgemäß sein; Falschangaben können den Tatbestand des Sozialbetrugs erfüllen.',
    subject: 'Einreichung des Weiterbewilligungsantrags (WBA) – BG-Nr. {{bg_nummer}}',
    body: `Sehr geehrte Damen und Herren,

in der Anlage übersende ich Ihnen meinen Antrag auf Weiterbewilligung der Leistungen zur Sicherung des Lebensunterhalts (Bürgergeld) für den Zeitraum ab {{zeitraum_von}}.
{{#if aenderungen_details}}

Bezüglich meiner persönlichen und finanziellen Verhältnisse teile ich folgende Änderungen mit: {{aenderungen_details}}
{{/if}}

Ich bitte um eine zeitnahe Bearbeitung, um eine lückenlose Weiterzahlung der Leistungen zu gewährleisten.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Bitte prüfen Sie sorgfältig, ob sich Einkommen, Wohnkosten, Bankverbindung oder die Personen in Ihrer Bedarfsgemeinschaft geändert haben. Änderungen müssen wahrheitsgemäß angegeben werden.',
  }),
  defineTemplate({
    id: 'jobcenter_antrag_vorschuss_006',
    category: 'jobcenter',
    institutionType: 'jobcenter',
    documentType: 'letter',
    actionType: 'request',
    title: 'Eilantrag auf Vorschuss bei Mittellosigkeit',
    riskLevel: 'high',
    requiresLegalCaution: true,
    requiredFields: ['bg_nummer', 'name', 'adresse', 'notlage_begruendung'],
    optionalFields: ['konto_details'],
    tone: 'Formell & Dringend',
    legalRiskNotes: 'Wird in einer akuten finanziellen Notlage gestellt. Die Notlage muss real und nachweisbar sein. Missbrauch oder Falschangaben führen zu Sanktionen und Rückforderungen.',
    subject: 'Eilantrag auf einen Vorschuss / eine Vorschusszahlung – BG-Nr. {{bg_nummer}}',
    body: `Sehr geehrte Damen und Herren,

hiermit beantrage ich eine sofortige Vorschusszahlung auf die mir zustehenden Leistungen zur Sicherung des Lebensunterhalts.

Die Auszahlung ist dringend erforderlich, da ich mich in einer akuten finanziellen Notsituation befinde. 
Als Begründung für diese Notlage gebe ich an: {{notlage_begruendung}}

Da meine laufenden Verpflichtungen keinen Aufschub dulden, bitte ich um eine kurzfristige Auszahlung oder um Mitteilung, auf welchem schnellstmöglichen Weg der Vorschuss bereitgestellt werden kann.
{{#if konto_details}}

Meine Bankverbindung lautet: {{konto_details}}
{{/if}}

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Ein Vorschussantrag setzt voraus, dass Ihr Anspruch dem Grunde nach besteht und Sie mittellos sind. Beschreiben Sie Ihre Notlage absolut wahrheitsgemäß. Geben Sie Bankdaten nur ein, wenn Sie sicher sind, dass der Empfänger die zuständige Behörde ist.',
  }),
  defineTemplate({
    id: 'finanzamt_fristverlaengerung_003',
    category: 'finanzamt',
    institutionType: 'finanzamt',
    documentType: 'letter',
    actionType: 'request',
    title: 'Antrag auf Fristverlängerung beim Finanzamt',
    riskLevel: 'low',
    requiresLegalCaution: true,
    requiredFields: ['steuernummer', 'name', 'adresse', 'neue_frist'],
    optionalFields: ['steuerart_jahr', 'begruendung_frist'],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Formloser Antrag auf Fristverlängerung (z.B. für die Steuererklärung). Das Finanzamt entscheidet nach pflichtgemäßem Ermessen, es besteht kein Rechtsanspruch.',
    subject: 'Antrag auf Fristverlängerung – Steuernummer: {{steuernummer}}',
    body: `Sehr geehrte Damen und Herren,

in der steuerlichen Angelegenheit zu der Steuernummer {{steuernummer}}
{{#if steuerart_jahr}}
bezüglich der {{steuerart_jahr}}
{{/if}}
beantrage ich hiermit eine Verlängerung der Frist zur Abgabe bzw. Stellungnahme bis zum {{neue_frist}}.

Die Verlängerung ist erforderlich, da mir noch nicht alle hierfür notwendigen Belege und Unterlagen vollständig vorliegen.
{{#if begruendung_frist}}

Als zusätzliche Begründung füge ich hinzu: {{begruendung_frist}}
{{/if}}

Ich bitte um eine kurze Bestätigung der Fristverlängerung.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Das Finanzamt ist nicht verpflichtet, Fristverlängerungen (insbesondere rückwirkend) zu gewähren. Reichen Sie diesen Antrag rechtzeitig vor Ablauf der aktuellen Frist ein.',
  }),
  defineTemplate({
    id: 'finanzamt_ratenzahlung_005',
    category: 'finanzamt',
    institutionType: 'finanzamt',
    documentType: 'letter',
    actionType: 'request',
    title: 'Antrag auf Ratenzahlung (Stundung)',
    riskLevel: 'medium',
    requiresLegalCaution: true,
    requiredFields: ['steuernummer', 'name', 'adresse', 'bescheid_datum', 'offener_betrag', 'monatliche_rate', 'erste_rate_datum'],
    optionalFields: ['begruendung_finanzielle_lage'],
    tone: 'Formell & Kooperativ',
    legalRiskNotes: 'Erfordert die Offenlegung der Zahlungsschwierigkeiten. Das Finanzamt verlangt bei Bewilligung in der Regel Stundungszinsen. Keine automatische Aussetzung der Vollstreckung.',
    subject: 'Antrag auf Ratenzahlung – Steuernummer: {{steuernummer}}',
    body: `Sehr geehrte Damen und Herren,

bezüglich des Steuerbescheids vom {{bescheid_datum}} zu der Steuernummer {{steuernummer}} beantrage ich hiermit die Bewilligung einer Ratenzahlung für die offene Forderung in Höhe von {{offener_betrag}} Euro.

Aufgrund meiner aktuellen Liquiditätssituation ist es mir nicht möglich, den Gesamtbetrag in einer Summe zu begleichen.
{{#if begruendung_finanzielle_lage}}
Zur Erläuterung meiner finanziellen Situation teile ich Folgendes mit: {{begruendung_finanzielle_lage}}
{{/if}}

Ich schlage daher vor, den offenen Betrag in monatlichen Raten in Höhe von {{monatliche_rate}} Euro zu zahlen. Die erste Rate würde ich zum {{erste_rate_datum}} überweisen.

Ich bitte um Prüfung meines Vorschlags und um eine entsprechende Rückmeldung.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Ein Antrag auf Ratenzahlung schützt Sie nicht automatisch vor Säumniszuschlägen oder Vollstreckungsmaßnahmen. Die Behörde fordert in der Regel zusätzliche Nachweise über Ihre Einnahmen und Ausgaben. Machen Sie im Begründungsfeld nur absolut wahrheitsgemäße Angaben.',
  }),
  defineTemplate({
    id: 'finanzamt_akteneinsicht_007',
    category: 'finanzamt',
    institutionType: 'finanzamt',
    documentType: 'letter',
    actionType: 'request',
    title: 'Antrag auf Akteneinsicht beim Finanzamt',
    riskLevel: 'medium',
    requiresLegalCaution: true,
    requiredFields: ['steuernummer', 'name', 'adresse', 'steuerart_jahr'],
    optionalFields: [],
    tone: 'Formell & Bestimmt',
    legalRiskNotes: 'Dient der Überprüfung von behördlichen Berechnungen. Im Steuerrecht ist der Anspruch auf Akteneinsicht restriktiv geregelt und liegt im Ermessen der Behörde.',
    subject: 'Antrag auf Akteneinsicht – Steuernummer: {{steuernummer}}',
    body: `Sehr geehrte Damen und Herren,

in der steuerlichen Angelegenheit zur Steuernummer {{steuernummer}} beantrage ich hiermit Akteneinsicht bezüglich der {{steuerart_jahr}}.

Zur ordnungsgemäßen Prüfung des Sachverhalts und zur Wahrung meiner Rechte bitte ich um die Bereitstellung bzw. Übersendung der relevanten Unterlagen, Berechnungen und behördlichen Notizen, soweit dies rechtlich möglich ist. Gerne nehme ich diese auch in elektronischer Form entgegen.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Im Steuerrecht besteht nicht in jedem Fall unbesehen ein Anspruch auf Akteneinsicht. Das Finanzamt entscheidet regelmäßig nach pflichtgemäßem Ermessen. Dieser Antrag stoppt keine laufenden Einspruchsfristen!',
  }),
  defineTemplate({
    id: 'finanzamt_einspruch_fristwahrung_002',
    category: 'finanzamt',
    institutionType: 'finanzamt',
    documentType: 'letter',
    actionType: 'dispute',
    title: 'Einspruch zur Fristwahrung (ohne Begründung)',
    riskLevel: 'high',
    requiresLegalCaution: true,
    requiredFields: ['steuernummer', 'name', 'adresse', 'bescheid_typ', 'bescheid_datum'],
    optionalFields: [],
    tone: 'Formell & Prozedural',
    legalRiskNotes: 'Verhindert den Eintritt der formellen Rechtskraft des Bescheids. Die Begründung muss zwingend zeitnah nachgereicht werden. Der Einspruch allein setzt die Zahlungsverpflichtung nicht aus.',
    subject: 'Einspruch zur Fristwahrung gegen den {{bescheid_typ}} vom {{bescheid_datum}} – Steuernummer: {{steuernummer}}',
    body: `Sehr geehrte Damen und Herren,

gegen den {{bescheid_typ}} vom {{bescheid_datum}} zu der Steuernummer {{steuernummer}} lege ich hiermit fristgerecht Einspruch ein.

Der Einspruch erfolgt zunächst zur Fristwahrung ohne nähere Begründung. Eine ausführliche Begründung wird nachgeholt, sobald mir alle notwendigen Unterlagen vorliegen und die Prüfung des Bescheids abgeschlossen ist.

Bitte bestätigen Sie mir den rechtzeitigen Eingang dieses Einspruchs.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Ein Einspruch hemmt die Zahlungspflicht grundsätzlich nicht. Prüfen Sie daher die im Bescheid genannte Zahlungsfrist. Wenn die Zahlung vorläufig ausgesetzt werden soll, kann zusätzlich ein gesonderter Antrag auf Aussetzung der Vollziehung erforderlich sein.',
  }),
  defineTemplate({
    id: 'miete_mangel_anzeige_004',
    category: 'miete',
    institutionType: 'vermieter',
    documentType: 'letter',
    actionType: 'request',
    title: 'Mängelanzeige an den Vermieter',
    riskLevel: 'medium',
    requiresLegalCaution: false,
    requiredFields: ['vermieter_name', 'vermieter_adresse', 'name', 'adresse', 'mietwohnung_lage', 'mangel_beschreibung', 'mangel_festgestellt_datum'],
    optionalFields: ['terminvorschlag'],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Erster Schritt zur formellen Anzeige eines Mangels. Keine eigenmächtige Mietminderung ohne Fristsetzung und präzise rechtliche Prüfung durchführen, da sonst Mietrückstände drohen.',
    subject: 'Mängelanzeige bezüglich der Mietwohnung – {{mietwohnung_lage}}',
    body: `Sehr geehrte(r) Frau/Herr {{vermieter_name}},

hiermit zeige ich Ihnen einen Mangel in der oben genannten Mietwohnung an. 

Der Mangel wurde am {{mangel_festgestellt_datum}} festgestellt und stellt sich wie folgt dar:
{{mangel_beschreibung}}

Nach meinem Verständnis gehört die Erhaltung der Mietsache zum Pflichtenkreis des Vermieters. Ich bitte Sie daher höflich, sich zeitnah um die Prüfung und Behebung des Mangels zu kümmern.
{{#if terminvorschlag}}

Für eine Besichtigung oder die Durchführung der Reparaturarbeiten schlage ich folgenden Termin vor: {{terminvorschlag}}
{{/if}}

Bitte teilen Sie mir kurz mit, wann mit einer Behebung des Mangels zu rechnen ist.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Eine Mängelanzeige ist der erste notwendige Schritt, bevor rechtliche Ansprüche geltend gemacht werden können. Dokumentieren Sie den Mangel unbedingt zusätzlich mit Fotos und führen Sie ein Protokoll. Mindern Sie die Miete nicht eigenständig ohne rechtliche Beratung.',
  }),
  defineTemplate({
    id: 'miete_reparatur_fristsetzung_005',
    category: 'miete',
    institutionType: 'vermieter',
    documentType: 'letter',
    actionType: 'demand',
    title: 'Fristsetzung zur Mängelbeseitigung',
    riskLevel: 'high',
    requiresLegalCaution: true,
    requiredFields: ['vermieter_name', 'vermieter_adresse', 'name', 'adresse', 'mietwohnung_lage', 'mangel_beschreibung', 'mangel_anzeige_datum', 'behebungs_frist'],
    optionalFields: [],
    tone: 'Formell & Bestimmt',
    legalRiskNotes: 'Setzt den Vermieter rechtlich in Verzug. Die gesetzte Frist muss zwingend angemessen sein. Ist die Frist zu kurz, läuft sie unbemerkt nach der rechtlich "angemessenen" Zeit ab.',
    subject: 'Fristsetzung zur Mängelbeseitigung – Mietwohnung: {{mietwohnung_lage}}',
    body: `Sehr geehrte(r) Frau/Herr {{vermieter_name}},

mit Schreiben vom {{mangel_anzeige_datum}} habe ich Sie über folgenden Mangel in der Mietwohnung informiert:
{{mangel_beschreibung}}

Leider wurde dieser Mangel bis zum heutigen Tag nicht behoben. Um Ihnen ausreichend Zeit für die Organisation der Reparatur zu geben, setze ich hiermit eine angemessene Frist zur vollständigen Beseitigung des Mangels bis zum {{behebungs_frist}}.

Ich bitte um eine kurze Bestätigung des geplanten Zeitraums für die Mängelbeseitigung.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Die gesetzte Frist muss angemessen sein (je nach Art des Mangels meistens zwischen 2 Wochen und einem Monat). Setzen Sie kein zu kurzes Datum, da die Fristsetzung sonst rechtlich unwirksam sein könnte. Nach fruchtlosem Ablauf der Frist können weitere Rechte entstehen.',
  }),
  defineTemplate({
    id: 'miete_belegeinsicht_002',
    category: 'miete',
    institutionType: 'vermieter',
    documentType: 'letter',
    actionType: 'request',
    title: 'Bitte um Belegeinsicht (Kaufmännische Prüfung)',
    riskLevel: 'low',
    requiresLegalCaution: false,
    requiredFields: ['vermieter_name', 'vermieter_adresse', 'name', 'adresse', 'abrechnungs_zeitraum', 'abrechnungs_datum'],
    optionalFields: ['unvollstaendige_punkte'],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Der Mieter macht von seinem gesetzlichen Recht Gebrauch, Rechnungen vor einer eventuellen Nachzahlung einzusehen. Einbehalten von Beträgen vor der Bitte um Belegeinsicht ist unzulässig.',
    subject: 'Bitte um Belegeinsicht zur Abrechnung – Zeitraum: {{abrechnungs_zeitraum}}',
    body: `Sehr geehrte(r) Frau/Herr {{vermieter_name}},

ich nehme Bezug auf die von Ihnen vorgelegte Abrechnung vom {{abrechnungs_datum}} für den Zeitraum {{abrechnungs_zeitraum}}.

Zur ordnungsgemäßen Überprüfung der darin aufgeführten Kostenpositionen bitte ich hiermit um Einsicht in die Originalbelege, Rechnungen und Verträge, soweit diese für die Prüfung der Abrechnung erforderlich sind.
{{#if unvollstaendige_punkte}}

Besonders betrifft dies folgende Punkte, bei denen mir nähere Erläuterungen fehlen: {{unvollstaendige_punkte}}
{{/if}}

Bitte teilen Sie mir mit, wann und in welcher Form (z. B. durch Bereitstellung von Kopien gegen Kostenerstattung oder Bereitstellung digitaler Dokumente) ich Einsicht in die Unterlagen nehmen kann.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Der Mieter hat grundsätzlich ein Recht darauf, die Originalbelege beim Vermieter einzusehen, bevor er Nachzahlungen leistet. Eine pauschale Verweigerung der Zahlung ohne vorherige Bitte um Belegeinsicht ist jedoch riskant. Klären Sie vorab, ob für Kopien Kosten anfallen.',
  }),
  defineTemplate({
    id: 'nk_belegeinsicht_002',
    category: 'miete',
    institutionType: 'hausverwaltung',
    documentType: 'letter',
    actionType: 'request',
    title: 'Belegeinsicht zur Nebenkostenabrechnung',
    riskLevel: 'low',
    requiresLegalCaution: false,
    requiredFields: ['hausverwaltung_name', 'hausverwaltung_adresse', 'name', 'adresse', 'abrechnungs_jahr', 'abrechnungs_datum'],
    optionalFields: ['spezifische_positionen'],
    tone: 'Formell & Sachlich',
    legalRiskNotes: 'Formelle Anforderung von Einsichtnahme in Abrechnungsbelege gegenüber einer Hausverwaltung. Setzt keine Fristen außer Kraft und gilt nicht als automatischer Widerspruch.',
    subject: 'Bitte um Belegeinsicht zur Nebenkostenabrechnung {{abrechnungs_jahr}}',
    body: `Sehr geehrte Damen und Herren,

ich habe Ihre Nebenkostenabrechnung vom {{abrechnungs_datum}} für das Kalenderjahr / den Zeitraum {{abrechnungs_jahr}} erhalten.

Um die Zusammensetzung der einzelnen Posten nachvollziehen zu können, bitte ich um Einsicht in die Originalbelege und Rechnungen bzw. um Mitteilung, ob und in welcher Form Kopien oder digitale Unterlagen bereitgestellt werden können.
{{#if spezifische_positionen}}

Ich bitte hierbei insbesondere um die Belege für folgende Positionen: {{spezifische_positionen}}
{{/if}}

Gerne können Sie mir die Unterlagen auch in digitaler Form per E-Mail zukommen lassen. Eventuell anfallende, angemessene Kopierkosten übernehme ich nach vorheriger Absprache selbstverständlich.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Die Anforderung von Belegen entbindet Sie im Regelfall nicht von der Einhaltung der gesetzlichen Einwendungsfrist von 12 Monaten nach Erhalt der Abrechnung. Prüfen Sie, ob Ihr Mietvertrag eine Pauschale für Kopierkosten vorsieht.',
  }),
  defineTemplate({
    id: 'schufa_selbstauskunft_001',
    category: 'schufa',
    institutionType: 'schufa',
    documentType: 'letter',
    actionType: 'request',
    title: 'Antrag auf kostenlose DSGVO-Datenkopie (Schufa)',
    riskLevel: 'low',
    requiresLegalCaution: false,
    requiredFields: ['name', 'adresse', 'geburtsdatum'],
    optionalFields: ['geburtsort', 'vorige_adresse'],
    sensitiveFields: ['geburtsdatum', 'geburtsort', 'vorige_adresse'],
    attachmentHints: ['optional_id_copy_redacted'],
    tone: 'Formell & Bestimmt',
    legalRiskNotes: 'Reines Auskunftsrecht nach Art. 15 DSGVO. Keine Löschungsansprüche oder Rechtsstreitigkeiten im ersten Schritt, daher risikofrei.',
    subject: 'Antrag auf Erteilung einer kostenlosen Datenkopie nach Art. 15 DSGVO',
    body: `Sehr geehrte Damen und Herren,

hiermit beantrage ich die Erteilung einer kostenlosen Auskunft über die zu meiner Person gespeicherten Daten gemäß Art. 15 der Datenschutz-Grundverordnung (DSGVO). Bitte senden Sie mir hierzu die entsprechende Datenkopie an meine unten genannte Adresse zu.

Hier sind meine persönlichen Daten zur eindeutigen Identifikation:
Name: {{name}}
Geburtsdatum: {{geburtsdatum}}
{{#if geburtsort}}
Geburtsort: {{geburtsort}}
{{/if}}
Aktuelle Adresse: {{adresse}}
{{#if vorige_adresse}}
Vorige Adresse: {{vorige_adresse}}
{{/if}}

Ich bitte um eine zeitnahe Bearbeitung meines Antrags innerhalb der gesetzlichen Frist.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Nach Art. 12 Abs. 3 DSGVO muss die Auskunft unverzüglich, spätestens jedoch innerhalb eines Monats erteilt werden. Zur eindeutigen Identifikation kann es in einigen Fällen notwendig sein, dem Schreiben eine Kopie des Personalausweises (Vorder- und Rückseite, sensible Daten geschwärzt) beizufügen.',
  }),
  defineTemplate({
    id: 'inkasso_zahlung_nachweis_003',
    category: 'inkasso',
    institutionType: 'inkasso',
    documentType: 'letter',
    actionType: 'submit',
    title: 'Übersendung des Zahlungsnachweises an das Inkassobüro',
    riskLevel: 'medium',
    requiresLegalCaution: false,
    requiredFields: ['inkasso_name', 'inkasso_adresse', 'aktenzeichen', 'name', 'adresse', 'zahlungs_nachweis_details'],
    optionalFields: [],
    sensitiveFields: ['zahlungs_nachweis_details'],
    attachmentHints: ['payment_receipt'],
    tone: 'Formell & Kooperativ',
    legalRiskNotes: 'Es wird kein Anerkenntnis weiterer Kosten abgegeben und kein pauschaler Verzicht erklärt. Es wird lediglich die Zahlung sachlich dokumentiert.',
    subject: 'Nachweis der Zahlung zur Forderung – Az. {{aktenzeichen}}',
    body: `Sehr geehrte Damen und Herren,

in der Inkassoangelegenheit mit dem Aktenzeichen {{aktenzeichen}} nehme ich Bezug auf Ihr aktuelles Schreiben.

Hiermit teile ich Ihnen mit, dass die zugrunde liegende Forderung bereits beglichen wurde. Als Beleg für die erfolgte Zahlung übersende ich Ihnen im Anhang den entsprechenden Nachweis.

Details zum Zahlungsnachweis:
{{zahlungs_nachweis_details}}

Ich bitte Sie höflich, diesen Nachweis zu prüfen, mein Kundenkonto entsprechend zu aktualisieren und mir mitzuteilen, ob die Angelegenheit damit aus Ihrer Sicht erledigt ist.

Mit freundlichen Grüßen

{{name}}`,
    safetyNote: 'Achten Sie darauf, im Feld "zahlungs_nachweis_details" das genaue Datum der Überweisung, den Betrag und den Verwendungszweck anzugeben. Fügen Sie dem fertigen Schreiben unbedingt eine Kopie des Überweisungsbelegs (z. B. Kontoauszug oder Einzahlungsbeleg) bei.',
  }),
];
