/*
 * Verbindliche Regressionstests für Art. 6 Abs. 3, TR-07, CRA, den
 * Recruiting-Demonstrationsfall sowie dessen Exporte und Berichtssnapshots.
 */
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const elements=new Map();
function element(selector=''){
  if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},tagName:'DIV',value:'',checked:false,addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){},click(){}});
  return elements.get(selector);
}
const storage=new Map(),windowObject={location:{search:''},scrollTo(){},print(){},alert(){}};
const context=vm.createContext({
  console,structuredClone,URLSearchParams,window:windowObject,confirm:()=>true,
  localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  document:{title:'',querySelector:selector=>element(selector),querySelectorAll:()=>[],createElement:()=>element('created-anchor')},
  Blob:class Blob{},URL:{createObjectURL:()=>'',revokeObjectURL(){}}
});
windowObject.window=windowObject;
const root=path.join(__dirname,'..');
vm.runInContext(fs.readFileSync(path.join(root,'guide-reference.js'),'utf8'),context,{filename:'guide-reference.js'});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{filename:'app.js'});
const api=windowObject.__riskAppTest,results=[];

function test(name,fn){
  try{const pass=Boolean(fn());results.push({name,pass});console.log(`${pass?'✓':'✗'} ${name}`);}
  catch(error){results.push({name,pass:false,detail:error.stack||error.message});console.log(`✗ ${name} – ${error.message}`);}
}
function art63State({annex=true,significant='no',profiling='no',material='no',hr14='no',hr15='no',hr16='no',hr17='no'}={}){
  const state=api.recruitingExampleState();
  for(const key of ['annexBiometric','annexCriticalInfrastructure','annexEducation','annexEmployment','annexEssentialServices','annexLawEnforcement','annexMigration','annexJustice'])state.form[key]='no';
  if(annex)state.form.annexEmployment='yes';
  Object.assign(state.form,{significantRisk:significant,profiling,materialInfluenceControl:material,narrowProcedural:hr14,completedResultImprovement:hr15,patternDetection:hr16,preparatoryTask:hr17});
  return state;
}
function evaluateArt63(options){api.setRawStateForTest(art63State(options));return api.evaluateArt63Decision();}
function hash(value){return crypto.createHash('sha256').update(value).digest('hex');}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  return value;
}
function fixedReportData(){const data=structuredClone(api.buildReportData());data.generatedAt='2026-10-05T12:00:00.000Z';return data;}

test('Kein Anhang-III-Anwendungsfall ergibt Art. 6 Abs. 3 NOT_APPLICABLE',()=>evaluateArt63({annex:false}).status==='NOT_APPLICABLE');
test('Anhang III und Profiling Ja ergibt HIGH_RISK',()=>evaluateArt63({profiling:'yes',hr14:'yes'}).status==='HIGH_RISK');
test('Anhang III und materielle Beeinflussung Ja ergibt HIGH_RISK',()=>evaluateArt63({material:'yes',hr14:'yes'}).status==='HIGH_RISK');
for(const [field,label] of [['hr14','HR-14'],['hr15','HR-15'],['hr16','HR-16'],['hr17','HR-17']])test(`${label} allein kann die Ausnahme nach Art. 6 Abs. 3 eröffnen`,()=>evaluateArt63({[field]:'yes'}).status==='NOT_HIGH_RISK_BY_ART_6_3');
test('HR-14 bis HR-17 vollständig Nein ergibt HIGH_RISK',()=>evaluateArt63().status==='HIGH_RISK');
test('Unbekanntes Profiling bei sonst erfüllter Ausnahme ergibt NEEDS_REVIEW',()=>evaluateArt63({profiling:'review',hr14:'yes'}).status==='NEEDS_REVIEW');
test('Teilweise unbekannte HR-14-bis-HR-17-Angaben werden nicht still als Nein behandelt',()=>evaluateArt63({hr14:'yes',hr15:''}).status==='NEEDS_REVIEW');
test('Recruiting-Ranking bleibt trotz menschlicher Endfreigabe HIGH_RISK',()=>{const state=art63State({profiling:'no',material:'yes',hr14:'yes'});Object.assign(state.form,{humanReview:'yes',humanCorrection:'yes'});api.setRawStateForTest(state);return api.evaluateArt63Decision().status==='HIGH_RISK';});
test('Reine Interview-Terminplanung ohne Profiling und materiellen Einfluss lässt die Ausnahmeprüfung zu',()=>{const state=art63State({profiling:'no',material:'no',hr17:'yes'});Object.assign(state.form,{purpose:'Ausschließlich fiktive Interview-Terminplanung.',decisionInfluence:'information'});api.setRawStateForTest(state);return api.evaluateArt63Decision().status==='NOT_HIGH_RISK_BY_ART_6_3';});

test('Annex-III-Hochrisiko, Betreiber und personenbezogene Entscheidung aktiviert TR-07',()=>{api.setRawStateForTest(api.recruitingExampleState());const result=api.evaluateTR07();return result.status==='APPLICABLE'&&result.primaryLegalBasis==='Art. 26 Abs. 11 EU AI Act'&&result.applicableDate==='2027-12-02';});
test('Nur Annex-I-Hochrisiko aktiviert TR-07 nicht automatisch',()=>{const state=art63State({annex:false});Object.assign(state.form,{productCovered:'yes',productSafetyComponent:'yes',annexISection:'A',thirdPartyConformity:'yes',productHighRiskConclusion:'yes',annexHighRiskConclusion:'no',tHighRiskAffectedInfo:'no'});api.setRawStateForTest(state);return api.evaluateTR07().status==='NOT_APPLICABLE';});
test('Wirksame Art.-6-Abs.-3-Ausnahme deaktiviert TR-07',()=>{const state=art63State({hr14:'yes'});Object.assign(state.form,{annexHighRiskConclusion:'exception',tHighRiskAffectedInfo:'no'});api.setRawStateForTest(state);return api.evaluateTR07().status==='NOT_APPLICABLE';});
test('Recruiting-Chatbot plus Ranking führt Art. 26 Abs. 11 und Art. 50 parallel',()=>{const state=api.recruitingExampleState();Object.assign(state.form,{role_provider:true,roleProviderFact:'yes',tInteraction:'yes',tInteractionUse:'Fiktiver Recruiting-Chatbot beantwortet Fragen von Bewerbenden.',tInteractionActor:'provider',tInteractionDuty:'Information über die Interaktion mit einem KI-System.',tInteractionException:'no',tInteractionReason:'Unmittelbare Interaktion liegt vor.',tInteractionEvidence:'Fiktiver Nachweisverweis – Oberflächenkonzept.',tInteractionResult:'applicable',tGeneralRequirements:'yes',transparencyConclusion:'provider',transparencyBasis:'Art. 50 Abs. 1 ist für die Chatbot-Interaktion einschlägig.',transparencyEvidence:'Fiktiver Nachweisverweis – Kennzeichnung.'});api.setRawStateForTest(state);const tr07=api.evaluateTR07(),art50=api.evaluateTransparency();return tr07.status==='APPLICABLE'&&art50.code==='provider'&&art50.items.some(item=>item.key==='tInteraction'&&item.code==='applicable');});

test('HR-03 leer und Produktpfad inaktiv blockiert die Validierung nicht',()=>{const state=api.recruitingExampleState();state.form.annexISection='';api.setRawStateForTest(state);const validation=api.getStepValidation(3);return !validation.items.some(item=>/Abschnitt des Anhangs I|HR-03/.test(item.text));});
test('Alter HR-03-Wert wirkt nach Deaktivierung des Produktpfads nicht weiter',()=>{const state=api.recruitingExampleState();state.form.annexISection='A';api.setRawStateForTest(state);const exported=api.assessmentExportObject();return api.evaluateProductHighRisk().code==='no'&&exported.assessmentSummary.article6Paragraph1.annexISection===null&&exported.assessmentSummary.article6Paragraph1.annexISectionStatus==='notApplicable';});
test('Profiling-Änderung von Nein auf Ja klassifiziert sofort neu zu HIGH_RISK',()=>{const state=art63State({profiling:'no',hr14:'yes'});api.setRawStateForTest(state);const before=api.evaluateArt63Decision().status;state.form.profiling='yes';api.setRawStateForTest(state);return before==='NOT_HIGH_RISK_BY_ART_6_3'&&api.evaluateArt63Decision().status==='HIGH_RISK';});

test('Reiner SaaS-Fall ist kein CRA-Produkt',()=>{api.setRawStateForTest(api.recruitingExampleState());return api.evaluateCRA().code==='no';});
test('CRA-Produkt bei ausschließlicher Nutzerstellung erzeugt keine eigene Wirtschaftsakteursrolle',()=>{const state=api.recruitingExampleState();Object.assign(state.form,{craDigitalProduct:'yes',craSaasOnly:'no',craSeparateSoftwareComponent:'yes',craUseOnly:'yes',craRoleManufacturer:'no',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'no',craRole:'none',craProductClass:'other',craConclusion:'product_only'});api.setRawStateForTest(state);const result=api.evaluateCRA();return result.code==='product_only'&&result.roleOutcome==='user_only'&&!result.ownObligations;});
test('Hersteller-Meldepflicht beginnt am 11.09.2026',()=>{const state=api.recruitingExampleState();Object.assign(state.form,{craDigitalProduct:'yes',craSaasOnly:'no',craSeparateSoftwareComponent:'yes',craUseOnly:'no',craRoleManufacturer:'yes',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'no',craRole:'manufacturer',craProductClass:'other',craConclusion:'yes'});api.setRawStateForTest(state);const duty=api.requiredHighRiskDuties().find(item=>item.code==='DUTY-35');return duty&&api.dutyTemporalMeta(duty).applicableDate==='2026-09-11';});
test('Steward-Meldepflicht beginnt am 11.12.2027',()=>{const state=api.recruitingExampleState();Object.assign(state.form,{craDigitalProduct:'yes',craSaasOnly:'no',craSeparateSoftwareComponent:'yes',craUseOnly:'no',craOpenSource:'yes',craRoleManufacturer:'no',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'yes',craRole:'steward',craProductClass:'other',craConclusion:'yes'});api.setRawStateForTest(state);const duty=api.requiredHighRiskDuties().find(item=>item.code==='DUTY-35-S');return duty&&api.dutyTemporalMeta(duty).applicableDate==='2027-12-11';});

test('Recruiting-Gesamtszenario ist widerspruchsfrei und endet mit offenen Maßnahmen',()=>{api.setRawStateForTest(api.recruitingExampleState());const data=api.buildReportData();return data.decision.code==='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES'&&data.completion.documentationStatus==='complete'&&data.validations.every(item=>item.items.every(issue=>!issue.critical));});
test('Recruiting-Export enthält alle verlangten fachlichen Metadaten',()=>{api.setRawStateForTest(api.recruitingExampleState());const value=api.assessmentExportObject(),summary=value.assessmentSummary;return value.schemaVersion===17&&value.versions.prototypeVersion==='1.12'&&value.versions.ruleSetVersion==='2.11'&&summary.assessmentId==='KIR-REC-2026-001'&&summary.toolId==='TOOL-REC-001'&&summary.article6Paragraph3.status==='HIGH_RISK'&&summary.tr07.status==='APPLICABLE'&&summary.tr07.primaryLegalBasis==='Art. 26 Abs. 11 EU AI Act'&&summary.tr07.applicableDate==='2027-12-02'&&summary.cra.product.code==='no'&&summary.overallStatus.code==='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES'&&summary.technicalRisks.length===3&&Boolean(summary.resultSignature);});
test('Import-/Export-Rundlauf erhält fachliche Ergebnisse und Signatur',()=>{api.setRawStateForTest(api.recruitingExampleState());const first=api.assessmentExportObject();api.importAssessmentJson(JSON.stringify(first));const second=api.assessmentExportObject();return first.assessmentSummary.overallStatus.code===second.assessmentSummary.overallStatus.code&&first.assessmentSummary.article6Paragraph3.status===second.assessmentSummary.article6Paragraph3.status&&first.assessmentSummary.tr07.status===second.assessmentSummary.tr07.status&&first.assessmentSummary.resultSignature===second.assessmentSummary.resultSignature;});
test('Migration von Datenmodell 16 verlangt bei fehlenden neuen Angaben eine Neubewertung',()=>{const legacy=api.recruitingExampleState();legacy.schemaVersion=16;legacy.form.annexISection='A';delete legacy.form.significantRisk;delete legacy.form.craSaasOnly;delete legacy.form.craSeparateSoftwareComponent;delete legacy.form.craUseOnly;const migrated=api.migrateV16ToV17(legacy,16);return migrated.schemaVersion===17&&migrated.form.significantRisk==='review'&&migrated.form.annexISection===''&&migrated.legacyV16InactiveValues.annexISection==='A'&&migrated.migration.needsReassessment===true&&migrated.evaluated[3]===false;});
test('Identische Eingaben erzeugen identische Ergebnisse',()=>{const source=api.recruitingExampleState();api.setRawStateForTest(source);const first=api.buildReportData();api.setRawStateForTest(structuredClone(source));const second=api.buildReportData();return JSON.stringify(first.regulatory)===JSON.stringify(second.regulatory)&&JSON.stringify(first.decision)===JSON.stringify(second.decision);});
test('Ergebnissignatur ist bei identischen Eingaben stabil',()=>{const source=api.recruitingExampleState();api.setRawStateForTest(source);const first=api.buildReportData().resultSignature;api.setRawStateForTest(structuredClone(source));return first===api.buildReportData().resultSignature;});
test('TR-07 wird nicht mehr als primäre Art.-50-Pflicht ausgegeben',()=>{api.setRawStateForTest(api.recruitingExampleState());const data=api.buildReportData(),compact=api.buildCompactReport(data),evidence=api.buildEvidenceReport(data);return data.regulatory.transparency.code==='none'&&data.regulatory.tr07.primaryLegalBasis==='Art. 26 Abs. 11 EU AI Act'&&compact.includes('Information betroffener Personen nach Art. 26 Abs. 11')&&evidence.includes('Primäre Rechtsgrundlage: Art. 26 Abs. 11')&&!data.regulatory.transparency.triggers.some(value=>/TR-07|Art\. 26 Abs\. 11/.test(value));});
test('Annex-III-Pflichten enthalten nicht mehr das Datum 02.08.2026',()=>{api.setRawStateForTest(api.recruitingExampleState());const data=api.buildReportData(),duty20=data.applicableDuties.find(item=>item.dutyCode==='DUTY-20'),compact=api.buildCompactReport(data),annexPayload=JSON.stringify({tr07:data.regulatory.tr07,duty20,annex:data.regulatory.annexHighRisk});return duty20?.applicableDate==='2027-12-02'&&data.regulatory.tr07.applicableDate==='2027-12-02'&&compact.includes('anwendbar ab 02.12.2027')&&!annexPayload.includes('2026-08-02')&&!annexPayload.includes('02.08.2026');});

const golden=require(path.join(__dirname,'fixtures','recruiting-golden.cjs'));
api.setRawStateForTest(api.recruitingExampleState());
const goldenExport=api.assessmentExportObject();goldenExport.exportedAt='2026-10-05T12:00:00.000Z';
const actualGolden={json:hash(JSON.stringify(stable(goldenExport))),compact:hash(api.buildCompactReport(fixedReportData())),evidence:hash(api.buildEvidenceReport(fixedReportData()))};
if(process.env.PRINT_RECRUITING_GOLDENS==='1')console.log(`Aktuelle Recruiting-Snapshots: ${JSON.stringify(actualGolden)}`);
test('Golden Snapshot: JSON-Export des Recruiting-Falls',()=>actualGolden.json===golden.json);
test('Golden Snapshot: Kompaktbericht des Recruiting-Falls',()=>actualGolden.compact===golden.compact);
test('Golden Snapshot: Nachweisbericht des Recruiting-Falls',()=>actualGolden.evidence===golden.evidence);

const failed=results.filter(item=>!item.pass);
console.log(`\n${results.length-failed.length}/${results.length} Recruiting- und Rechtslogiktests bestanden`);
if(failed.length)process.exitCode=1;
