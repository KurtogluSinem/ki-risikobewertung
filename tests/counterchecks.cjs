/*
 * Zweck und Abdeckung: Führt kompakte Gegenprüfungen für besonders kritische
 * Status-, Rollen- und Risikoregeln aus und verhindert falsch positive Ergebnisse.
 * Abgrenzung: Kleine unabhängige Kontrollsuite ohne Vollständigkeits- oder Layoutanspruch.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = new Map();
function element(selector = '') {
  if (!elements.has(selector)) elements.set(selector, {textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},tagName:'DIV',addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){}});
  return elements.get(selector);
}
const storage = new Map();
const windowObject = {location:{search:''},scrollTo(){},print(){}};
const context = vm.createContext({console,structuredClone,URLSearchParams,window:windowObject,confirm:()=>true,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},document:{querySelector:element,querySelectorAll:()=>[]}});
windowObject.window=windowObject;
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','guide-reference.js'),'utf8'),context,{filename:'guide-reference.js'});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),context,{filename:'app.js'});

const checks = vm.runInContext(`(() => {
  const out=[];
  const add=(name,pass,details)=>out.push({name,pass:Boolean(pass),details});

  const temporal=fillRegulatoryNo(freshState());Object.assign(temporal.form,{role_provider:true,tInteraction:'yes',tInteractionUse:'Interaktion',tInteractionActor:'provider',tInteractionDuty:'Information',tInteractionException:'no',tInteractionReason:'Begründung',tInteractionEvidence:'Nachweis',tInteractionResult:'applicable',transparencyConclusion:'provider',transparencyBasis:'Begründung',transparencyEvidence:'Nachweis'});
  const temporalResult=withTemporaryState(temporal,()=>{syncDerivedRegisters();const item=state.registers.regulatory.find(entry=>entry.dutyCode==='DUTY-22');return item?.applicability;});
  add('Pflichten werden ohne Zeitnachweis nicht automatisch aktuell',temporalResult==='not_assessable',temporalResult);

  const prohibited=fillRegulatoryNo(freshState()),key=prohibitedQuestions[0][0];Object.assign(prohibited.form,{[key]:'confirmed',[key+'Use']:'Einsatz',[key+'ElementsResult']:'met',[key+'Elements']:'Merkmale',[key+'Exception']:'none',[key+'Reason']:'Grund',[key+'Evidence']:'Nachweis',[key+'Affected']:'Personen',[key+'LegalOwner']:'Recht',[key+'Critical']:'yes',prohibitionConclusion:'confirmed',gModel:'yes',gSelfProvision:'yes',gObjectType:'model',gpaiOrganizationRole:'provider',gpaiConclusion:'model',gpaiBasis:'Modellbereitstellung',gpaiEvidence:'Modelldokumentation'});
  const pathResult=withTemporaryState(prohibited,()=>({high:evaluateHighRiskSummary().code,transparency:evaluateTransparency().code,gpai:evaluateGPAI().code,cra:evaluateCRA().code}));
  add('Verbot stoppt nur KI-System-Unterpfade, nicht GPAI und CRA',pathResult.high==='not_continued'&&pathResult.transparency==='not_continued'&&pathResult.gpai==='model'&&pathResult.cra==='no',pathResult);

  const reportResult=withTemporaryState(exampleState(),()=>{const report=buildReport(buildReportData());return{has3x3:report.includes('3×3-Risikomatrix'),has4x4:report.includes('4×4-Risikomatrix'),hasProfiles:['Regulatorische Einordnung','Technische Risikobewertung','Organisatorische Bewertung'].every(text=>report.includes(text))};});
  add('Bericht enthält nur die 3×3-Matrix und getrennte Ergebnisprofile',reportResult.has3x3&&!reportResult.has4x4&&reportResult.hasProfiles,reportResult);
  return out;
})()`,context);

checks.forEach(check=>console.log(`${check.pass?'✓':'✗'} ${check.name}: ${JSON.stringify(check.details)}`));
if(checks.some(check=>!check.pass))process.exitCode=1;
