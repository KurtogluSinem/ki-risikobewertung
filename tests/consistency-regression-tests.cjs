/*
 * Regressionstests der technischen Konsistenzrunde nach Kapitel 4.
 * Die Tests laden bewusst die produktiven Dateien guide-reference.js und app.js.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const elements=new Map();
function element(selector=''){
  if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},tagName:'DIV',value:'',checked:false,addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){}});
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
const api=windowObject.__riskAppTest,tests=[];

function test(name,fn){
  try{const pass=Boolean(fn());tests.push({name,pass});console.log(`${pass?'✓':'✗'} ${name}`);}
  catch(error){tests.push({name,pass:false});console.log(`✗ ${name} – ${error.stack||error.message}`);}
}
function set(next){api.setRawStateForTest(next);return next;}
function cleanState(){
  const next=api.exampleState();
  Object.assign(next.form,{tGeneralRequirements:'yes',tGeneralRequirementsUse:'Anbieterübergreifende Formanforderung für die dokumentierte Transparenzpflicht.',tGeneralRequirementsActor:'obligated',tGeneralRequirementsDuty:'Kennzeichnung klar, unterscheidbar, barrierefrei und maschinenlesbar umsetzen.',tGeneralRequirementsException:'no',tGeneralRequirementsReason:'Die allgemeine Formanforderung gilt für die festgestellte Pflicht.',tGeneralRequirementsEvidence:'Fiktiver Nachweisverweis – Oberflächen- und Exporttest.',tGeneralRequirementsResult:'applicable'});
  next.guideAnswers['TR-06']={value:'yes',sourceField:'tGeneralRequirements'};
  next.form.overallReasoning='Vollständig dokumentierter Referenzfall.';
  next.registers.legal.forEach(item=>Object.assign(item,{status:'resolved',result:'Geklärt.',blocking:'no',ruleBlocking:'no'}));
  next.evaluated=Array(8).fill(true);
  return next;
}
function clone(value){return structuredClone(value);}
function validationOf(candidate){return api.storedStateValidation(candidate,Number(candidate.schemaVersion));}

test('Vollständig dokumentierter Referenzfall besitzt getrennt finalen Dokumentations- und fachlichen Abschlussstatus',()=>{
  set(cleanState());const decision=api.overallDecision(false,true),completion=api.reportCompletionStatus(decision);
  return decision.code==='ASSESSMENT_COMPLETE'&&completion.status==='final'&&completion.documentationStatus==='complete';
});

test('Fehlende Leitfadenfassung verhindert finalen Dokumentationsstatus und wird von REVIEW-14 erkannt',()=>{
  const next=cleanState();next.form.guideVersion='';set(next);
  const completion=api.reportCompletionStatus(api.overallDecision(false,true)),review14=api.reviewOperationalResults().find(item=>item.id==='REVIEW-14');
  return completion.status==='draft'&&completion.documentationStatus==='incomplete'&&review14.value==='review'&&/Leitfaden/i.test(review14.reason);
});

test('Fehlender Toolname verhindert finalen Dokumentationsstatus',()=>{
  const next=cleanState();next.form.toolName='';set(next);
  const completion=api.reportCompletionStatus(api.overallDecision(false,true));
  return completion.status==='draft'&&completion.criticalOpen.some(item=>/Bezeichnung|Toolname|Tool\/ System/i.test(item.text));
});

test('Ein noch nicht bewerteter Prüfschritt verhindert finalen Dokumentationsstatus',()=>{
  const next=cleanState();next.evaluated[0]=false;set(next);
  const completion=api.reportCompletionStatus(api.overallDecision(false,true));
  return completion.status==='draft'&&completion.unevaluated.length===1;
});

test('Ausschließlich fehlende optionale Angaben lassen einen finalen Bericht zu',()=>{
  const next=cleanState();next.form.distribution='';next.form.additionalNotes='';set(next);
  const completion=api.reportCompletionStatus(api.overallDecision(false,true));
  return completion.status==='final'&&completion.documentationStatus==='complete';
});

test('Ein Hindernis bleibt bei zusätzlicher Dokumentationslücke die fachlich vorrangige Entscheidung',()=>{
  const next=cleanState();next.form.guideVersion='';next.registers.regulatory.push({id:'REG-BLOCK',sourceQuestionId:'DUTY-01',dutyCode:'DUTY-01',basis:'Test',requirement:'Zwingende Pflicht',linkedResult:'Test',obligatedRole:'Betreiber',applicability:'current',applicabilityReason:'Aktuell.',fulfillability:'unfulfillable',fulfillabilityReason:'Nachweislich nicht erfüllbar.',beforeRelease:'yes',decisionCritical:'yes',blocking:'yes',owner:'Test',due:'2026-10-01',status:'open',evidence:'Test',priority:'high'});set(next);
  const decision=api.overallDecision(false,true),completion=api.reportCompletionStatus(decision);
  return decision.code==='USE_NOT_CONTINUABLE'&&completion.decision.code==='USE_NOT_CONTINUABLE'&&completion.status==='draft';
});

test('CRA-01 wird unabhängig von der Freitextformulierung als Produktanwendbarkeit erkannt',()=>{
  const run=question=>{const next=cleanState();next.registers.legal=[{id:'CRA-TEST',sourceQuestionId:'CRA-01',craDecisionArea:'product_applicability',question,status:'open',blocking:'no',sourceActive:true}];set(next);return api.evaluateCRA();};
  const first=run('Fällt unser Cloudangebot unter den gesetzlichen Produktbegriff?'),second=run('Ist das Cloudangebot ein Produkt mit digitalen Elementen?');
  return [first,second].every(result=>result.code==='review'&&result.openPrerequisiteReviewIds.includes('CRA-TEST'));
});

test('Offene CRA-Meldefrist wird nicht als offene Produkteigenschaft behandelt',()=>{
  const next=cleanState();next.registers.legal=[{id:'CRA-FRIST',sourceQuestionId:'TIME-02',craDecisionArea:'temporal_applicability',question:'Welche Meldefrist gilt?',status:'open',blocking:'no',sourceActive:true}];set(next);
  const result=api.evaluateCRA();return result.code==='product_only'&&!result.openPrerequisiteReviewIds.includes('CRA-FRIST')&&result.openTemporalReviewIds.includes('CRA-FRIST');
});

test('Offene CRA-Rollenfrage bleibt rollenbezogener Prüfbedarf',()=>{
  const next=cleanState();next.registers.legal=[{id:'CRA-ROLLE',sourceQuestionId:'CRA-08',craDecisionArea:'organizational_role',question:'Welche Rolle hat die Organisation?',status:'open',blocking:'no',sourceActive:true}];set(next);
  const result=api.evaluateCRA();return result.code==='review'&&result.openRoleReviewIds.includes('CRA-ROLLE')&&!result.openPrerequisiteReviewIds.includes('CRA-ROLLE');
});

test('Geklärte und historische CRA-Prüfpunkte beeinflussen das aktuelle Ergebnis nicht',()=>{
  const next=cleanState();next.registers.legal=[{id:'CRA-GEKLAERT',sourceQuestionId:'CRA-01',craDecisionArea:'product_applicability',question:'Produkt?',status:'resolved',sourceActive:true},{id:'CRA-HIST',sourceQuestionId:'CRA-01',craDecisionArea:'product_applicability',question:'Produkt?',status:'open',sourceActive:false}];set(next);
  const result=api.evaluateCRA();return result.code==='product_only'&&result.openPrerequisiteReviewIds.length===0;
});

test('Alteintrag ohne eindeutige CRA-Zuordnung erzeugt einen nachvollziehbaren Zuordnungsbedarf',()=>{
  const next=cleanState();next.registers.legal=[{id:'CRA-ALT',sourceQuestionId:'REVIEW-07',question:'Offene CRA-Frage',legalBasis:'Cyber Resilience Act',status:'open',blocking:'no',sourceActive:true}];set(next);
  const result=api.evaluateCRA();return result.code==='review'&&result.ambiguousCraDependencyIds.includes('CRA-ALT');
});

test('Navigation außerhalb 0 bis 7 wird vor Übernahme abgewiesen',()=>{
  const base=cleanState();return [100,-1,1.5].every(value=>{const candidate=clone(base);candidate.step=value;return !validationOf(candidate).valid;});
});

test('Unbekannter GPAI-Antwortcode wird abgewiesen',()=>{
  const candidate=cleanState();candidate.form.gModel='invalid_test_value';return !validationOf(candidate).valid;
});

test('Widersprüchliche Doppelablage zu GPAI-01 wird ausdrücklich abgewiesen',()=>{
  const candidate=cleanState();candidate.form.gModel='no';candidate.guideAnswers['GPAI-01']={value:'yes',sourceField:'gModel'};return !validationOf(candidate).valid;
});

test('Unvollständiger, aber strukturell gültiger Arbeitsstand bleibt importierbar',()=>{
  const candidate=cleanState();candidate.form.toolName='';candidate.evaluated[0]=false;return validationOf(candidate).valid;
});

test('Fehlgeschlagener Import verändert weder Arbeitsstand noch gespeicherte Daten',()=>{
  set(cleanState());const before=JSON.stringify(api.getState()),storedBefore=[...storage.entries()].map(([key,value])=>`${key}:${value}`).join('|');
  const bad=clone(api.getState());bad.step=100;let rejected=false;try{api.importAssessmentJson(JSON.stringify(bad));}catch{rejected=true;}
  const storedAfter=[...storage.entries()].map(([key,value])=>`${key}:${value}`).join('|');return rejected&&JSON.stringify(api.getState())===before&&storedAfter===storedBefore;
});

test('gObjectType Modell bei verneintem GPAI-Modell wird als aktiver Widerspruch ausgewiesen',()=>{
  const next=cleanState();next.form.gModel='no';next.form.gObjectType='model';set(next);const result=api.evaluateGPAI();
  return result.code==='review'&&result.contradictions.some(item=>/Modell/i.test(item)&&/GPAI/i.test(item));
});

test('Kapitel-4-Prüfstand mit Datenmodell 14 wird auf Datenmodell 16 migriert',()=>{
  const file=path.join(root,'tests','fixtures','ki-risikobewertung-schema14-original.json');
  const parsed=JSON.parse(fs.readFileSync(file,'utf8')),source=parsed.assessment||parsed,expectedId=source.form.internalToolId;
  api.importAssessmentJson(JSON.stringify(parsed));const imported=api.getState();
  return imported.schemaVersion===16&&imported.form.internalToolId===expectedId&&imported.migration.auditTrail.some(item=>item.from===14&&item.to===15)&&imported.migration.auditTrail.some(item=>item.from===15&&item.to===16);
});

test('Älterer Export mit Datenmodell 13 wird zusätzlich verlustwahrend migriert',()=>{
  const file=path.join(root,'tests','fixtures','ki-risikobewertung-schema13-original.json');
  const parsed=JSON.parse(fs.readFileSync(file,'utf8')),source=parsed.assessment||parsed,expectedId=source.form.internalToolId,expectedName=source.form.toolName;
  api.importAssessmentJson(JSON.stringify(parsed));const imported=api.getState();
  return imported.schemaVersion===16&&imported.form.internalToolId===expectedId&&imported.form.toolName===expectedName&&imported.migration.auditTrail.some(item=>item.from===13&&item.to===14)&&imported.migration.auditTrail.some(item=>item.from===14&&item.to===15)&&imported.migration.auditTrail.some(item=>item.from===15&&item.to===16);
});

test('Export und erneuter Import erhalten die fachlichen Eingaben und Register',()=>{
  set(cleanState());const before=api.assessmentExportObject(),expected={form:before.assessment.form,risks:before.assessment.risks,org:before.assessment.org,registers:before.assessment.registers,triggers:before.assessment.triggers};
  api.importAssessmentJson(JSON.stringify(before));const after=api.getState(),actual={form:after.form,risks:after.risks,org:after.org,registers:after.registers,triggers:after.triggers};
  return JSON.stringify(actual)===JSON.stringify(expected);
});

test('Kurz- und Nachweisbericht weisen Status- und CRA-Teilentscheidungen getrennt aus',()=>{
  const next=cleanState();next.form.guideVersion='';next.registers.legal=[{id:'CRA-FRIST-BERICHT',sourceQuestionId:'TIME-02',craDecisionArea:'temporal_applicability',question:'Welche Meldefrist gilt?',status:'open',blocking:'no',sourceActive:true}];set(next);
  const data=api.buildReportData(),compact=api.buildCompactReport(data),evidence=api.buildEvidenceReport(data),needles=['Bearbeitungsstand','Dokumentationsstatus','Fachlicher Bewertungsstatus','Berichtsstatus','Strukturierte offene CRA-Abhängigkeiten','CRA-FRIST-BERICHT','Zeitliche Anwendbarkeit'];
  return data.completion.status==='draft'&&needles.every(text=>compact.includes(text)&&evidence.includes(text));
});

const failed=tests.filter(item=>!item.pass);
console.log(`\n${tests.length-failed.length}/${tests.length} Konsistenz-Regressionstests bestanden`);
if(failed.length)process.exitCode=1;
