/*
 * Zweck und Abdeckung: Führt die grundlegenden Regel-, Zustands-, Migrations- und
 * Persistenztests der Anwendung aus. Dies ist die breite fachliche Regressionssuite.
 * Abgrenzung: Keine vertiefte Berichtssnapshot-, Browser- oder PDF-Prüfung.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = new Map();
function element(selector = '') {
  if (!elements.has(selector)) {
    elements.set(selector, {
      textContent: '',
      innerHTML: '',
      hidden: false,
      disabled: false,
      style: {},
      dataset: {},
      tagName: 'DIV',
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      scrollIntoView() {}
    });
  }
  return elements.get(selector);
}

const storage = new Map();
const pageConsoleMessages = [];
const windowObject = {
  location: { search: '?selftest=1' },
  scrollTo() {},
  print() {}
};
const context = vm.createContext({
  console: {
    log: (...args) => pageConsoleMessages.push({ level: 'log', message: args.join(' ') }),
    warn: (...args) => pageConsoleMessages.push({ level: 'warn', message: args.join(' ') }),
    error: (...args) => pageConsoleMessages.push({ level: 'error', message: args.join(' ') })
  },
  structuredClone,
  URLSearchParams,
  window: windowObject,
  confirm: () => true,
  localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  },
  document: {
    querySelector: selector => element(selector),
    querySelectorAll: () => []
  }
});
windowObject.window = windowObject;

const referenceSource = fs.readFileSync(path.join(__dirname, '..', 'guide-reference.js'), 'utf8');
vm.runInContext(referenceSource, context, { filename: 'guide-reference.js' });
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInContext(source, context, { filename: 'app.js' });

const result = windowObject.__riskSelfTestResult;
if (!result) throw new Error('Die eingebauten Tests wurden nicht ausgeführt.');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const functionNames = [...source.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(match => match[1]);
const duplicateFunctions = functionNames.filter((name, index) => functionNames.indexOf(name) !== index);
const expectedStepTitles = [
  'KI-Tool erfassen',
  'KI-System-Definition und Anwendungsbereich prüfen',
  'Einsatzkontext und Akteursrolle bestimmen',
  'Regulatorische Einordnung und ergänzende Prüfung',
  'Technische Eigenschaften und Risiken bewerten',
  'Organisatorische Rahmenbedingungen bewerten',
  'Einschlägige Pflichten, erforderliche Maßnahmen und weiteren Prüfbedarf ableiten',
  'Bewertungsergebnisse zusammenführen und dokumentieren'
];
const staticTests = [
  {
    name: 'Keine JavaScript-Warnungen oder -Fehler beim Laden',
    pass: pageConsoleMessages.every(entry => !['warn', 'error'].includes(entry.level)),
    detail: pageConsoleMessages.filter(entry => ['warn', 'error'].includes(entry.level)).map(entry => entry.message).join('; ')
  },
  {
    name: 'Mobile und Druckansicht besitzen vollständige Layoutregeln',
    pass: css.includes('@media (max-width: 680px)') && css.includes('@media print') && css.includes('page-break-after: always') && css.includes('display: table-header-group') && !css.includes('height: 297mm') && !css.includes('max-height: 297mm') && !css.includes('overflow: hidden; }\n  .report-page') && (css.match(/{/g) || []).length === (css.match(/}/g) || []).length,
    detail: 'Responsive- oder Druckregeln fehlen beziehungsweise CSS-Klammern sind unausgeglichen.'
  },
  {
    name: 'Erforderliche Navigations- und Fortschrittselemente sind vorhanden',
    pass: ['stepNavigation', 'progressValue', 'progressBar', 'evaluatedCount', 'stepContent', 'nextButton', 'resetButton', 'exampleButton'].every(id => html.includes(`id="${id}"`)),
    detail: 'Mindestens ein erforderliches Oberflächenelement fehlt.'
  },
  {
    name: 'Keine technischen Erzeugerhinweise in den sichtbaren Projektdateien',
    pass: !/<meta[^>]+name=["']generator|data-generator|sourceMappingURL/i.test(`${html}\n${source}\n${css}`),
    detail: 'Projekttexte enthalten einen technischen Erzeugerhinweis.'
  },
  {
    name: 'Jede Funktion ist nur einmal definiert',
    pass: duplicateFunctions.length === 0,
    detail: `Doppelte Funktionen: ${[...new Set(duplicateFunctions)].join(', ')}`
  },
  {
    name: 'Datenmodell verwendet Version 17 mit vollständiger verlustarmer Migrationskette',
    pass: /SCHEMA_VERSION\s*=\s*17/.test(source) && /ki-risikobewertung-masterarbeit-v17/.test(source) && /ki-risikobewertung-masterarbeit-v16/.test(source) && /migrateV16ToV17/.test(source) && /migrateV15ToV16/.test(source) && /migrateV14ToV15/.test(source) && /migrateV13ToV14/.test(source) && /migrateV12ToV13/.test(source) && /migrateV11ToV12/.test(source) && /migrateV10ToV11/.test(source) && /migrateV4ToV5/.test(source) && /migrateToCurrent/.test(source) && html.includes('Prototyp 1.12 · Datenmodell 17') && html.includes('Regelwerk 2.11'),
    detail: 'Version-17-Speicherkennung oder vollständige Migration bis Version 17 fehlt.'
  },
  {
    name: 'Ausschließlich vier Gesamtstatus und stabile Leitfaden-IDs sind umgesetzt',
    pass: ['ASSESSMENT_COMPLETE','ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','ASSESSMENT_NOT_CONCLUDABLE','USE_NOT_CONTINUABLE','TOOL-01','DEF-01','SCOPE-01','ROLE-01','ART5-01','HR-01','TR-01','GPAI-01','CRA-01','RISK-01','ORG-01','DUTY-01','REVIEW-22','TIME-01'].every(token=>`${source}\n${referenceSource}`.includes(token)) && windowObject.__riskAppTest.validateGuideImplementation().valid,
    detail: 'Ein unzulässiger Gesamtstatus oder eine Leitfaden-ID-Zuordnung ist fehlerhaft.'
  },
  {
    name: 'DUTY- und REVIEW-Abdeckung wird aus ausführbaren Pfaden validiert',
    pass: windowObject.__riskAppTest.dutyOperationalResults().length === 47 && windowObject.__riskAppTest.reviewOperationalResults().length === 42 && !windowObject.__riskAppTest.validateGuideImplementation({omit:['DUTY-47']}).valid && !windowObject.__riskAppTest.validateGuideImplementation({omit:['REVIEW-42']}).valid,
    detail: 'Operationale Pfade oder negative Abdeckungsprüfung fehlen.'
  },
  {
    name: 'Alle acht Prüfschritte bleiben erreichbar',
    pass: (source.match(/^\s*\['[^\n]+',\s*'[^\n]+'\],?$/gm) || []).length >= 8 && source.includes('renderStep8') && source.includes('Math.max(0,Math.min(7,next))'),
    detail: 'Die Navigation oder mindestens ein Prüfschritt fehlt.'
  },
  {
    name: 'Die acht fachlichen Prüfschritte besitzen unverändert die vorgegebenen Titel',
    pass: JSON.stringify(windowObject.__riskAppTest.stepTitles) === JSON.stringify(expectedStepTitles),
    detail: 'Mindestens ein Prüfschritt fehlt, ist zusätzlich vorhanden oder wurde umbenannt.'
  }
];
result.results.push(...staticTests);
result.passed = result.results.filter(test => test.pass).length;
result.failed = result.results.filter(test => !test.pass).length;
console.log(`Startfortschritt: ${windowObject.__riskAppTest.completionPercent()} %`);
windowObject.__riskAppTest.loadExample();
const exampleReport = windowObject.__riskAppTest.buildReport(windowObject.__riskAppTest.buildReportData());
console.log(`Musterbericht: ${(exampleReport.match(/<section class="report-page(?:\s|")/g) || []).length} Kapitel · ${windowObject.__riskAppTest.reportCompletionStatus().status}`);
console.log('Musterfall-Prüfung Schritt 1 bis 8:');
windowObject.__riskAppTest.stepTitles.forEach((title, index) => {
  const validation = windowObject.__riskAppTest.getStepValidation(index);
  console.log(`  ${index + 1}. ${title}: ${windowObject.__riskAppTest.stepStatus(index)} · ${validation.items.length} offene Validierungspunkte · ${windowObject.__riskAppTest.stepSubstantiveResult(index)}`);
});
result.results.forEach(test => {
  const mark = test.pass ? '✓' : '✗';
  console.log(`${mark} ${test.name}${test.pass ? '' : ` – ${test.detail}`}`);
});
console.log(`\n${result.passed} bestanden, ${result.failed} fehlgeschlagen`);
process.exitCode = result.failed ? 1 : 0;
