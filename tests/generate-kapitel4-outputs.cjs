/*
 * Erzeugt den versionierten Kapitel-4-JSON-Prüfstand und übernimmt die zuvor
 * technisch sowie visuell geprüften Musterberichte in einen getrennten,
 * von Git ausgeschlossenen Ausgabeordner.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..'),output=path.join(root,'output','kapitel4'),pdfOutput=path.join(root,'output','pdf');
const elements=new Map();
function element(selector=''){
  if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},tagName:'DIV',addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){}});
  return elements.get(selector);
}
const storage=new Map(),windowObject={location:{search:''},scrollTo(){},print(){}};
const context=vm.createContext({
  console,structuredClone,URLSearchParams,window:windowObject,confirm:()=>true,
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  document:{title:'',querySelector:selector=>element(selector),querySelectorAll:()=>[]}
});
windowObject.window=windowObject;
vm.runInContext(fs.readFileSync(path.join(root,'guide-reference.js'),'utf8'),context,{filename:'guide-reference.js'});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{filename:'app.js'});

const api=windowObject.__riskAppTest,sample=api.exampleState();
api.setRawStateForTest(sample);
const exported=api.assessmentExportObject();
if(exported.schemaVersion!==17||exported.versions.prototypeVersion!=='1.12'||exported.versions.ruleSetVersion!=='2.11'||exported.assessment.form.internalToolId!=='TOOL-DOK-001'||exported.derivedResults.decision.code!=='ASSESSMENT_NOT_CONCLUDABLE')throw new Error('Der Kapitel-4-Prüfstand besitzt nicht den erwarteten Versionierungs- oder Bewertungsstatus.');

fs.mkdirSync(output,{recursive:true});
const files={
  json:'ki-risikobewertung-TOOL-DOK-001-Kapitel4-Pruefstand.json',
  compact:'KI-Risikobewertung-Kurzbericht-TOOL-DOK-001-Kapitel4-Pruefstand.pdf',
  evidence:'KI-Risikobewertung-Nachweisbericht-TOOL-DOK-001-Kapitel4-Pruefstand.pdf'
};
fs.writeFileSync(path.join(output,files.json),`${JSON.stringify(exported,null,2)}\n`,'utf8');
fs.copyFileSync(path.join(pdfOutput,'KI-Risikobewertung-Kurzbericht-TOOL-DOK-001.pdf'),path.join(output,files.compact));
fs.copyFileSync(path.join(pdfOutput,'KI-Risikobewertung-Nachweisbericht-TOOL-DOK-001.pdf'),path.join(output,files.evidence));

console.log(JSON.stringify({output,resultSignature:exported.derivedResults.resultSignature,decision:exported.derivedResults.decision.code,files},null,2));
