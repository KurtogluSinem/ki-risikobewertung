/*
 * Zweck und Abdeckung: Sichert die in Kapitel 4 festgestellten
 * Konsistenzkorrekturen gegen Rückfälle ab. Die bewusst widersprüchlichen
 * Ausgangsangaben werden nicht umgedeutet, sondern in Auswertung, Berichten
 * und Export sichtbar gehalten.
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
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  document:{title:'',querySelector:selector=>element(selector),querySelectorAll:()=>[]}
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
function text(html){return html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function state(){return api.exampleState();}
function set(next){api.setRawStateForTest(next);return next;}
function reportPair(){const data=api.buildReportData();return{data,compact:text(api.buildCompactReport(data)),evidence:text(api.buildEvidenceReport(data))};}
function review(id){return api.reviewOperationalResults().find(item=>item.id===id);}
function cleanComparisonState(){
  const s=state();
  s.form.tGeneralRequirements='yes';
  s.form.overallReasoning='Vergleichsfall nach dokumentierter Klärung der CRA-Produktfrage und der Transparenzanforderungen.';
  s.registers.legal.forEach(item=>Object.assign(item,{status:'resolved',result:'Rechtsfrage im Vergleichsfall geklärt.',blocking:'no',ruleBlocking:'no'}));
  return s;
}

test('GPAI ohne Modell bleibt auch in REVIEW-35 und beiden Berichten ohne Relevanz',()=>{
  const s=set(state()),gpai=api.evaluateGPAI(),r35=review('REVIEW-35'),reports=reportPair();
  return s.form.gModel==='no'&&gpai.code==='none'&&/Keine GPAI-Relevanz festgestellt/.test(r35.value)&&/Keine eigenen Anbieterpflichten festgestellt/.test(r35.reason)&&[reports.compact,reports.evidence].every(value=>/Keine GPAI-Relevanz/.test(value)&&!/GPAI-Modell festgestellt/.test(value));
});

test('Betroffenes GPAI-Modell ohne Anbieterrolle bleibt relevant, aber ohne eigene Modell-Anbieterpflichten',()=>{
  const s=state();Object.assign(s.form,{gModel:'yes',gObjectType:'model',gResearchOnly:'no',gSelfProvision:'no',gModification:'no',gSystemicRisk:'no',gCommissionDesignation:'no',gAnnexXIII:'no',gpaiOrganizationRole:'none',gpaiConclusion:'relevant_no_provider'});set(s);
  const gpai=api.evaluateGPAI(),r35=review('REVIEW-35');
  return gpai.code==='relevant_no_provider'&&gpai.ownObligations===false&&/GPAI-Modell betroffen/.test(r35.value)&&/Keine eigenen Anbieterpflichten festgestellt/.test(r35.value);
});

test('Offene CRA-Produktfrage erzwingt Prüfbedarf, ohne die manuelle Ausgangsangabe umzuschreiben',()=>{
  const s=set(state()),before=s.form.craConclusion,cra=api.evaluateCRA(),after=api.getState().form.craConclusion;
  return before==='product_only'&&after===before&&cra.code==='review'&&cra.openPrerequisiteReviewIds.includes('JP-CRA')&&cra.reviewNeeds.some(item=>/Voraussetzung des ausgegebenen CRA-Ergebnisses/.test(item));
});

test('TR-06 und DUTY-26 bleiben als Widerspruch sichtbar; der manuelle Registerstatus bleibt erhalten',()=>{
  const s=set(state()),before=s.registers.regulatory.find(item=>item.id==='REG-DUTY-26')?.status,transparency=api.evaluateTransparency(),after=api.getState().registers.regulatory.find(item=>item.id==='REG-DUTY-26')?.status,reports=reportPair();
  return s.form.tGeneralRequirements==='no'&&before==='fulfilled'&&after==='fulfilled'&&transparency.code==='review'&&transparency.contradictions.some(item=>/TR-06/.test(item)&&/DUTY-26/.test(item))&&[reports.compact,reports.evidence].every(value=>/TR-06/.test(value)&&/DUTY-26/.test(value));
});

test('Eine einschlägige, noch nicht erfüllte Transparenzpflicht bleibt offen und wird nicht als nicht anwendbar behandelt',()=>{
  const s=cleanComparisonState(),duty=s.registers.regulatory.find(item=>item.id==='REG-DUTY-26');Object.assign(duty,{status:'open',fulfillability:'fulfillable',fulfillabilityReason:'Die Pflicht ist grundsätzlich erfüllbar; ihre Umsetzung ist noch offen.',evidence:''});set(s);
  const transparency=api.evaluateTransparency(),reports=reportPair(),current=reports.data.registers.regulatory.find(item=>item.id==='REG-DUTY-26');
  return transparency.code==='provider'&&current?.applicability==='current'&&current?.status==='open'&&reports.data.applicableDuties.some(item=>item.id==='REG-DUTY-26'&&item.status==='open')&&[reports.compact,reports.evidence].every(value=>value.includes('DUTY-26')&&value.includes('Offen'));
});

test('Abweichende Bewertungs- und Aktualisierungsdaten verlangen eine Begründung und bleiben im Bericht getrennt',()=>{
  const s=state();Object.assign(s.form,{assessmentDate:'2026-09-16',assessmentUpdate:'2026-10-04',assessmentUpdateReason:''});set(s);
  const missingBefore=api.getStepValidation(0).missing.some(item=>/Grund und Umfang/.test(item));
  s.form.assessmentUpdateReason='Kapitel-4-Konsistenzprüfung ohne Änderung der Ausgangsangaben.';set(s);
  const missingAfter=api.getStepValidation(0).missing.some(item=>/Grund und Umfang/.test(item)),reports=reportPair();
  return missingBefore&&!missingAfter&&[reports.compact,reports.evidence].every(value=>value.includes('16.9.2026')&&value.includes('4.10.2026')&&value.includes('Kapitel-4-Konsistenzprüfung'));
});

test('Aktuelles, erwartetes und verifiziertes Risiko bleiben getrennt; Zielkriterium ist kein Wirksamkeitsnachweis',()=>{
  const s=state();Object.assign(s.risks[0],{currentRisk:'high',expectedResidual:'low',verifiedResidual:'medium',treatmentStatus:'implemented',effectivenessCriterion:'Fehlklassifikationsquote unter 2 Prozent.',effectivenessEvidence:''});set(s);
  const reports=reportPair(),serialized=JSON.stringify(reports.data.snapshotState.risks[0]);
  return serialized.includes('"currentRisk":"high"')&&serialized.includes('"expectedResidual":"low"')&&serialized.includes('"verifiedResidual":"medium"')&&reports.data.riskLevels[0]==='high'&&[reports.compact,reports.evidence].every(value=>/Wirksamkeitskriterium/.test(value)&&!/Wirksamkeitsnachweis[^.]{0,80}Fehlklassifikationsquote unter 2 Prozent/.test(value));
});

test('Offene rechtliche Punkte behalten ihre dokumentierte Blockierungswirkung und beeinflussen den Status regelbasiert',()=>{
  const nonBlocking=cleanComparisonState();nonBlocking.registers.legal=[{id:'JP-VERGLEICH',question:'Nicht blockierende Rechtsfrage',status:'inReview',blocking:'no',ruleBlocking:'no',owner:'Rechtsabteilung',due:'2026-10-31',result:'Prüfung beauftragt.',legalBasis:'Fallbezogene Prüfung',sourceStep:'4'}];set(nonBlocking);const statusA=api.overallDecision(false,true).code;
  const blocking=cleanComparisonState();blocking.registers.legal=[{id:'JP-VERGLEICH',question:'Blockierende Rechtsfrage',status:'inReview',blocking:'yes',ruleBlocking:'yes',blockingReason:'Vor dem Pilotbetrieb zu klären.',ruleBlockingReason:'Vor dem Pilotbetrieb zu klären.',owner:'Rechtsabteilung',due:'2026-10-31',result:'Prüfung beauftragt.',legalBasis:'Fallbezogene Prüfung',sourceStep:'4'}];set(blocking);const statusB=api.overallDecision(false,true).code;
  return statusA==='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES'&&statusB==='ASSESSMENT_NOT_CONCLUDABLE'&&api.getState().registers.legal.find(item=>item.id==='JP-VERGLEICH')?.blocking==='yes';
});

test('Export enthält Eingaben, Versionen und abgeleitete Ergebnisse; Import erhält die manuellen Angaben verlustfrei',()=>{
  const s=state();Object.assign(s.form,{assessmentUpdate:'2026-10-04',assessmentUpdateReason:'Dokumentierte Konsistenzprüfung.',guideVersion:'Version 2.0 – vorläufige Fassung'});set(s);
  const exported=api.assessmentExportObject(),manualBefore={craConclusion:exported.assessment.form.craConclusion,tGeneralRequirements:exported.assessment.form.tGeneralRequirements,duty26:exported.assessment.registers.regulatory.find(item=>item.id==='REG-DUTY-26')?.status};
  const imported=api.importAssessmentJson(JSON.stringify(exported));
  return exported.schemaVersion===14&&exported.versions.dataModelVersion==='14'&&Boolean(exported.derivedResults.resultSignature)&&exported.assessment.form.assessmentUpdateReason==='Dokumentierte Konsistenzprüfung.'&&imported.form.guideVersion==='Version 2.0 – vorläufige Fassung'&&imported.form.craConclusion===manualBefore.craConclusion&&imported.form.tGeneralRequirements===manualBefore.tGeneralRequirements&&imported.registers.regulatory.find(item=>item.id==='REG-DUTY-26')?.status===manualBefore.duty26;
});

test('Der Musterfall kennzeichnet alle Nachweisangaben ausdrücklich als fiktive Verweise',()=>{
  const s=state(),values=[];
  Object.entries(s.form).forEach(([key,value])=>{if(/(?:Evidence|EvidenceSource)$/i.test(key)||['otherEvidence','infoSources','evidenceInventory'].includes(key))if(value)values.push(value);});
  s.risks.forEach(risk=>['controlEvidence','effectivenessEvidence'].forEach(key=>{if(risk[key])values.push(risk[key]);}));
  Object.values(s.org).forEach(area=>{if(area.evidence)values.push(area.evidence);});
  Object.values(s.registers).flat().forEach(item=>{if(item.evidence)values.push(item.evidence);});
  return values.length>0&&values.every(value=>String(value).startsWith('Fiktiver Nachweisverweis – '));
});

const failed=tests.filter(item=>!item.pass);
console.log(`\n${tests.length-failed.length}/${tests.length} Kapitel-4-Konsistenztests bestanden`);
if(failed.length)process.exitCode=1;
