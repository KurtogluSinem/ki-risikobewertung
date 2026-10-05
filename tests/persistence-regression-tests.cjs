/*
 * Regression der Speicher- und Importkette. Die produktiven Dateien
 * guide-reference.js und app.js werden unverändert in einer isolierten Laufzeit geladen.
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
const api=windowObject.__riskAppTest,results=[];

function test(id,name,input,expected,fn){
  try{const actual=fn(),pass=Boolean(actual.pass);results.push({id,name,input,expected,actual:actual.detail,pass});console.log(`${pass?'✓':'✗'} ${id} ${name}${pass?'':` – ${actual.detail}`}`);}
  catch(error){results.push({id,name,input,expected,actual:error.message,pass:false});console.log(`✗ ${id} ${name} – ${error.message}`);}
}

test('F01-PRE','CRA-Herstellerrolle erzeugt einen selbst importierbaren Export','CRA-08: Hersteller über Einzelrollenfeld','Exportvalidierung gültig',()=>{
  const state=api.exampleState();Object.assign(state.form,{craRoleManufacturer:'yes',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'no',craRole:'manufacturer'});state.guideAnswers['CRA-08']={value:'Hersteller',sourceField:'craRoleManufacturer/craRoleRepresentative/craRoleImporter/craRoleDistributor/craRoleSteward'};api.setRawStateForTest(state);api.syncDerivedRegisters();const exported=api.assessmentExportObject(),validation=api.storedStateValidation(exported.assessment,exported.schemaVersion);return{pass:validation.valid,detail:validation.valid?'gültig':validation.issues.join(' | ')};
});

test('F02-PRE','Automatisch erzeugte ORG-22-Maßnahme entspricht dem Registerschema','ORG-22 = partial','blocking = review ist schema-konform',()=>{
  const state=api.exampleState(),area=Object.values(state.org).find(item=>item.criteria?.org22);area.criteria.org22.answer='partial';area.criteria.org22.reason='Teilweise erfüllt; Klärung erforderlich.';api.setRawStateForTest(state);api.syncDerivedRegisters();const current=api.getState(),item=current.registers.organizational.find(entry=>entry.id==='OM-ORG-22'&&entry.sourceActive!==false),validation=api.storedStateValidation(current,current.schemaVersion);return{pass:item?.blocking==='review'&&validation.valid,detail:`blocking=${item?.blocking}; ${validation.valid?'gültig':validation.issues.join(' | ')}`};
});

test('F03-PRE','Listen bestehen keine skalare Auswahlvalidierung','gModel=["yes"], GPAI-01.value=["yes"]','Importvalidierung ungültig',()=>{
  const state=api.exampleState();state.form.gModel=['yes'];state.guideAnswers['GPAI-01']={value:['yes'],sourceField:'gModel'};const validation=api.storedStateValidation(state,state.schemaVersion);return{pass:!validation.valid,detail:validation.valid?'fälschlich gültig':validation.issues.join(' | ')};
});

test('F01-01','Alle CRA-Rollenkombinationen verwenden denselben internen Code','keine, fünf Einzelrollen, Mehrfachrolle, Prüfbedarf, unbeantwortet und abgewählt','Formular und CRA-08 stimmen in jedem Fall überein',()=>{
  const cases=[
    {name:'keine',values:['no','no','no','no','no'],code:'none'},
    ...['manufacturer','representative','importer','distributor','steward'].map((code,index)=>({name:code,values:Array.from({length:5},(_,i)=>i===index?'yes':'no'),code})),
    {name:'mehrfach',values:['yes','no','yes','no','no'],code:'multiple'},
    {name:'prüfbedarf',values:['review','no','no','no','no'],code:'review'},
    {name:'unbeantwortet',values:['','','','',''],code:''}
  ];
  for(const sample of cases){const state=api.exampleState();['craRoleManufacturer','craRoleRepresentative','craRoleImporter','craRoleDistributor','craRoleSteward'].forEach((field,index)=>{state.form[field]=sample.values[index];});api.applyCraRoleDerivation(state);const answer=state.guideAnswers['CRA-08'];if(state.form.craRole!==sample.code||answer.value!==sample.code||answer.sourceField!=='craRole'||answer.sourceFields.length!==5)return{pass:false,detail:`${sample.name}: ${state.form.craRole}/${answer.value}/${answer.sourceField}`};const valid=api.storedStateValidation(state,state.schemaVersion);if(!valid.valid)return{pass:false,detail:`${sample.name}: ${valid.issues.join(' | ')}`};}
  return{pass:true,detail:`${cases.length} Kombinationen gültig`};
});

test('F01-02','Version-15-Fehlstand wird verlustarm migriert','CRA-08 enthält Bezeichnung und zusammengesetzte Quelle','Datenmodell 17 mit Hersteller-Code und Originalnachweis',()=>{
  const legacy=api.exampleState();legacy.schemaVersion=15;Object.assign(legacy.form,{craRole:'manufacturer',craRoleManufacturer:'yes',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'no'});legacy.guideAnswers['CRA-08']={value:'Hersteller',sourceField:'craRoleManufacturer/craRoleRepresentative/craRoleImporter/craRoleDistributor/craRoleSteward'};
  const migrated=api.migrateToCurrent(legacy,15),valid=api.storedStateValidation(migrated,17);
  return{pass:valid.valid&&migrated.form.craRole==='manufacturer'&&migrated.guideAnswers['CRA-08'].value==='manufacturer'&&migrated.guideAnswers['CRA-08'].sourceField==='craRole'&&migrated.legacyV15TechnicalRepairs?.craRole?.guideAnswer?.value==='Hersteller',detail:valid.valid?`${migrated.form.craRole}; Original=${migrated.legacyV15TechnicalRepairs?.craRole?.guideAnswer?.value}`:valid.issues.join(' | ')};
});

test('F01-03','Unveränderte Prüfdatei aus Datenmodell 15 bleibt importierbar','gesicherter Originalexport des vorigen Prototyps','Datenmodell 17, gleiche Fallkennung und gültiger Zustand',()=>{
  const parsed=JSON.parse(fs.readFileSync(path.join(root,'tests','fixtures','ki-risikobewertung-schema15-original.json'),'utf8')),expected=(parsed.assessment||parsed).form.internalToolId,imported=api.importAssessmentJson(JSON.stringify(parsed)),valid=api.storedStateValidation(imported,17);
  return{pass:valid.valid&&imported.schemaVersion===17&&imported.form.internalToolId===expected&&imported.migration.auditTrail.some(item=>item.from===15&&item.to===16)&&imported.migration.auditTrail.some(item=>item.from===16&&item.to===17),detail:valid.valid?`${imported.form.internalToolId}; Migration 15→16→17 vorhanden`:valid.issues.join(' | ')};
});

test('F02-01','Alle 36 Organisationskriterien erzeugen kataloggültige Maßnahmen','jedes Kriterium einzeln = partial','alle erzeugten Auswahlwerte entsprechen dem Registerschema',()=>{
  const seed=api.exampleState();let count=0;
  for(const area of Object.values(seed.org))for(const criterion of Object.values(area.criteria||{})){criterion.answer='partial';criterion.reason='Teilweise erfüllt.';count++;}
  api.setRawStateForTest(seed);api.syncDerivedRegisters();const current=api.getState(),valid=api.storedStateValidation(current,current.schemaVersion),items=current.registers.organizational.filter(item=>item.sourceActive!==false&&/^OM-ORG-/.test(item.id));
  return{pass:count===36&&items.length===36&&valid.valid,detail:`Kriterien=${count}, Maßnahmen=${items.length}, ${valid.valid?'gültig':valid.issues.join(' | ')}`};
});

test('F02-02','ORG-22 und ORG-23 behalten Prüfbedarf semantisch bei','beide Kriterien partial bei einschlägiger Art.-4-Pflicht','decisionCritical=yes, blocking=review und gültige Speicherung',()=>{
  const next=api.exampleState(),area=Object.values(next.org).find(item=>item.criteria?.org22);['org22','org23'].forEach(key=>Object.assign(area.criteria[key],{answer:'partial',reason:'Nachweis noch unvollständig.'}));api.setRawStateForTest(next);api.syncDerivedRegisters();const current=api.getState(),items=['OM-ORG-22','OM-ORG-23'].map(id=>current.registers.organizational.find(item=>item.id===id&&item.sourceActive!==false)),valid=api.storedStateValidation(current,current.schemaVersion);
  return{pass:valid.valid&&items.every(item=>item?.decisionCritical==='yes'&&item?.blocking==='review'),detail:`${items.map(item=>`${item?.id}:${item?.decisionCritical}/${item?.blocking}`).join(', ')}; ${valid.valid?'gültig':valid.issues.join(' | ')}`};
});

test('F02-03','Erfüllt-Teilweise-Erfüllt-Teilweise reaktiviert denselben Verlaufseintrag','ORG-22 Statuswechsel mit manueller Zuständigkeit und Nachweis','keine aktive Dublette und manuelle Angaben bleiben erhalten',()=>{
  const next=api.exampleState(),area=Object.values(next.org).find(item=>item.criteria?.org22);area.criteria.org22.answer='partial';area.criteria.org22.reason='Teilweise.';api.setRawStateForTest(next);api.syncDerivedRegisters();let current=api.getState(),item=current.registers.organizational.find(entry=>entry.id==='OM-ORG-22'&&entry.sourceActive!==false);item.owner='Manuelle Fachstelle';item.evidence='Manueller Nachweis';api.setRawStateForTest(current);
  current=api.getState();Object.values(current.org).find(value=>value.criteria?.org22).criteria.org22.answer='fulfilled';api.setRawStateForTest(current);api.syncDerivedRegisters();current=api.getState();const inactive=current.registers.organizational.find(entry=>entry.id==='OM-ORG-22'&&entry.sourceActive===false);
  Object.values(current.org).find(value=>value.criteria?.org22).criteria.org22.answer='partial';api.setRawStateForTest(current);api.syncDerivedRegisters();current=api.getState();const all=current.registers.organizational.filter(entry=>entry.id==='OM-ORG-22'),active=all.filter(entry=>entry.sourceActive!==false);
  return{pass:Boolean(inactive)&&all.length===1&&active.length===1&&active[0].owner==='Manuelle Fachstelle'&&active[0].evidence==='Manueller Nachweis',detail:`gesamt=${all.length}, aktiv=${active.length}, owner=${active[0]?.owner}, evidence=${active[0]?.evidence}`};
});

test('F02-04','Automatisch erzeugte Einträge aller fünf Registerarten entsprechen ihren Feldkatalogen','Musterfall synchronisieren und alle aktiven Registerarten validieren','regulatory, risk, organizational, expert und legal sind belegt und schema-konform',()=>{
  const state=api.exampleState();api.setRawStateForTest(state);api.syncDerivedRegisters();const current=api.getState(),kinds=['regulatory','risk','organizational','expert','legal'],counts=Object.fromEntries(kinds.map(kind=>[kind,(current.registers[kind]||[]).filter(item=>item.sourceActive!==false).length])),validation=api.storedStateValidation(current,current.schemaVersion);
  return{pass:validation.valid&&kinds.every(kind=>counts[kind]>0),detail:`${kinds.map(kind=>`${kind}=${counts[kind]}`).join(', ')}; ${validation.valid?'gültig':validation.issues.join(' | ')}`};
});

const invalidSamples=[['Liste',['yes']],['leere Liste',[]],['Objekt',{value:'yes'}],['Wahrheitswert wahr',true],['Wahrheitswert falsch',false],['Zahl',1],['unbekannter Text','vielleicht']];
const invalidTargets=[
  ['Formular',state=>{state.form.gModel=structuredClone(state.sample);}],
  ['Leitfadenantwort',state=>{state.guideAnswers['GPAI-01']={value:structuredClone(state.sample),sourceField:'gModel'};}],
  ['Organisation',state=>{Object.values(state.org)[0].criteria.org01.answer=structuredClone(state.sample);}],
  ['Risiko',state=>{state.risks[0].probability=structuredClone(state.sample);}],
  ['Register',state=>{state.registers.regulatory[0].status=structuredClone(state.sample);}],
  ['Neubewertungsauslöser',state=>{state.triggers[0].required=structuredClone(state.sample);}]
];
for(const [targetName,mutate] of invalidTargets)test(`F03-${String(invalidTargets.findIndex(item=>item[0]===targetName)+1).padStart(2,'0')}`,`${targetName}: nicht skalare und unbekannte Auswahlwerte werden abgewiesen`,invalidSamples.map(([name])=>name).join(', '),'jeder manipulierte Zustand ist ungültig',()=>{
  const accepted=[];for(const [name,sample] of invalidSamples){const state=api.exampleState();state.sample=sample;mutate(state);delete state.sample;const validation=api.storedStateValidation(state,state.schemaVersion);if(validation.valid)accepted.push(name);}return{pass:accepted.length===0,detail:accepted.length?`fälschlich gültig: ${accepted.join(', ')}`:'alle abgewiesen'};
});

test('F03-07','Fehlgeschlagener Import verändert weder Zustand noch Speicher','aktueller Stand plus Import mit Listenwert','Fallkennung und gespeicherter JSON-Text bleiben identisch',()=>{
  const stable=api.exampleState();stable.form.internalToolId='TRANSAKTION-STABIL';api.setStateForTest(stable);api.setReportTypeForTest('evidence');const beforeState=api.getState(),beforeReport=api.getActiveReportInfo(),beforeStorage=storage.get('ki-risikobewertung-masterarbeit-v17');const broken=structuredClone(beforeState);broken.form.gModel=['yes'];let rejected=false;try{api.importAssessmentJson(JSON.stringify(broken));}catch{rejected=true;}const after=api.getState(),afterReport=api.getActiveReportInfo(),afterStorage=storage.get('ki-risikobewertung-masterarbeit-v17');return{pass:rejected&&after.form.internalToolId==='TRANSAKTION-STABIL'&&beforeStorage===afterStorage&&JSON.stringify(beforeReport)===JSON.stringify(afterReport),detail:`abgewiesen=${rejected}, Kennung=${after.form.internalToolId}, Speicher unverändert=${beforeStorage===afterStorage}, Bericht unverändert=${JSON.stringify(beforeReport)===JSON.stringify(afterReport)}`};
});

test('F03-08','Nicht lesbarer alleiniger Speicherstand wird nicht überschrieben','syntaktisch defekter aktueller localStorage ohne gültigen Altstand','Rohkopie vorhanden, Speicherung gesperrt und Original unverändert',()=>{
  const previousEntries=[...storage.entries()],previousState=api.getState(),raw='{nicht-lesbar';storage.clear();storage.set('ki-risikobewertung-masterarbeit-v17',raw);const loaded=api.loadState(),backup=storage.get('ki-risikobewertung-masterarbeit-recovery-backup');api.setRawStateForTest(loaded);const saved=api.saveState('Darf nicht gespeichert werden.'),unchanged=storage.get('ki-risikobewertung-masterarbeit-v17')===raw;storage.clear();previousEntries.forEach(([key,value])=>storage.set(key,value));api.setRawStateForTest(previousState);return{pass:loaded.storageRecovery?.blocked===true&&Boolean(backup)&&saved===false&&unchanged,detail:`gesperrt=${loaded.storageRecovery?.blocked}, Rohkopie=${Boolean(backup)}, gespeichert=${saved}, Original unverändert=${unchanged}`};
});

const failed=results.filter(item=>!item.pass);
console.log(`\n${results.length-failed.length}/${results.length} Speicher-/Importregressionen bestanden`);
if(failed.length)process.exitCode=1;
