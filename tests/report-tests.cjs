/*
 * Zweck und Abdeckung: Prüft Inhalt, Trennung, Identität und technische
 * Mindestanforderungen von Kurz- und Nachweisbericht. Die Tests arbeiten mit
 * demselben öffentlichen Prüfzugang wie die übrigen Regressionstests.
 * Abgrenzung: Prüft HTML, Signatur und Snapshot-Isolation; PDF-Rendering und Bedienung liegen in eigenen Suiten.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const elements=new Map();
function element(selector=''){if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},tagName:'DIV',addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){}});return elements.get(selector);}
const storage=new Map(),windowObject={location:{search:''},scrollTo(){},print(){}};
const context=vm.createContext({console,structuredClone,URLSearchParams,window:windowObject,confirm:()=>true,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},document:{title:'',querySelector:selector=>element(selector),querySelectorAll:()=>[]}});windowObject.window=windowObject;
const root=path.join(__dirname,'..'),referenceSource=fs.readFileSync(path.join(root,'guide-reference.js'),'utf8'),source=fs.readFileSync(path.join(root,'app.js'),'utf8'),css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
vm.runInContext(referenceSource,context,{filename:'guide-reference.js'});vm.runInContext(source,context,{filename:'app.js'});
const api=windowObject.__riskAppTest,tests=[];
function test(name,fn){try{const pass=Boolean(fn());tests.push({name,pass});console.log(`${pass?'✓':'✗'} ${name}`);}catch(error){tests.push({name,pass:false});console.log(`✗ ${name} – ${error.message}`);}}
function sampleData(){api.setStateForTest(api.exampleState());return api.buildReportData();}
function isRecursivelyFrozen(value,seen=new Set()){if(!value||typeof value!=='object'||seen.has(value))return true;seen.add(value);return Object.isFrozen(value)&&Object.values(value).every(item=>isRecursivelyFrozen(item,seen));}
function embeddedSignature(html){return html.match(/data-result-signature="([^"]+)"/)?.[1]||'';}
function reverseObjectKeys(value){if(Array.isArray(value))return value.map(reverseObjectKeys);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reverseObjectKeys(value[key])]));return value;}

const data=sampleData(),compact=api.buildCompactReport(data),evidence=api.buildEvidenceReport(data);
const compactText=compact.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),evidenceText=evidence.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
test('Kompakter Bericht besitzt genau zehn Berichtskapitel',()=>((compact.match(/<section class="report-page/g)||[]).length===10));
test('Alle zehn vorgesehenen Kapitel sind im kompakten Bericht enthalten',()=>['Dokumentinformationen und Bewertungsstatus','Zusammenfassung der Bewertung','Bewertungsgegenstand und Einsatzkontext','Regulatorische Einordnung','Technische Risikobewertung','Organisatorische Bewertung','Einschlägige Pflichten und Maßnahmen','Offener fachlicher und juristischer Prüfbedarf','Bewertungsstatus und weitere Schritte','Quellen- und Versionsübersicht'].every(text=>compactText.includes(text)));
test('Kompakter Bericht enthält den regelbasierten Bewertungsstatus',()=>compactText.includes(data.decision.label));
test('Kompakter Bericht hält drei Ergebnisprofile getrennt',()=>['Regulatorische Einordnung','Technische Risikobewertung','Organisatorische Bewertung'].every(text=>compactText.includes(text))&&!/Gesamtscore\s*[:=]\s*\d/i.test(compactText));
test('Hohe und nicht bestimmbare Risiken erscheinen mit Begründung',()=>{const s=api.exampleState();s.risks.push({...s.risks[0],riskId:'R-02',description:'Unbekanntes Szenario',probability:'',impact:'',currentRisk:'unknown',consequence:'Folge muss fachlich geklärt werden.',decisionCriticality:'yes'});api.setStateForTest(s);const html=api.buildCompactReport(api.buildReportData());return html.includes('R-01')&&html.includes('R-02')&&html.includes('Wesentliche Begründung');});
test('Aktive Pflichten, offene Maßnahmen und aktive Prüfbedarfe sind enthalten',()=>['DUTY-22','JP-CRA'].every(id=>compact.includes(id))&&compact.includes('RM-R-01')===false);
test('Kompakter Bericht enthält keine vollständigen DUTY-, REVIEW-, ORG- oder Historientabellen',()=>!compact.includes('Operationalisierte Pflichten DUTY-01 bis DUTY-47')&&!compact.includes('Operationalisierte Review-Ergebnisse REVIEW-01 bis REVIEW-42')&&!compact.includes('Einzelkriterien ORG-01 bis ORG-36')&&!compact.includes('Historische beziehungsweise nicht mehr aktive Einträge'));
test('Kompakter Bericht verweist auf den vollständigen Nachweisbericht',()=>compactText.includes('vollständigen Nachweisbericht'));
test('Vollständiger Nachweisbericht bewahrt DUTY-01 bis DUTY-47 und REVIEW-01 bis REVIEW-42',()=>['DUTY-01','DUTY-47','REVIEW-01','REVIEW-42','Operationalisierte Pflichten DUTY-01 bis DUTY-47','Operationalisierte Review-Ergebnisse REVIEW-01 bis REVIEW-42'].every(text=>evidence.includes(text)));
test('Vollständiger Nachweisbericht bewahrt alle Leitfadenkennungen',()=>api.guideReference.every(item=>evidence.includes(item.id)));
test('Vollständiger Nachweisbericht bewahrt Risiken, Organisation, Dokumentation, Trigger und Historie',()=>['Einzelkriterien ORG-01 bis ORG-36','Vollständige Dokumentations- und Reviewangaben','Neubewertungsauslöser REVIEW-22 bis REVIEW-28','Historische beziehungsweise nicht mehr aktive Einträge','Akzeptanz, Restrisiko und Quellreferenzen'].every(text=>evidence.includes(text)));
test('Beide Berichte stammen nachweisbar aus demselben Ergebnisdatensatz',()=>compact.includes(`data-result-signature="${data.resultSignature.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}"`)&&evidence.includes(`data-result-signature="${data.resultSignature.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}"`));
test('Identische vollständige Berichtsdaten erzeugen dieselbe Signatur',()=>{api.setStateForTest(data.snapshotState);return api.buildReportData().resultSignature===data.resultSignature;});
test('Snapshot-Erfassung verändert den interaktiven Zustand nicht',()=>{api.setStateForTest(data.snapshotState);const before=JSON.stringify(api.getState());api.buildReportData();return JSON.stringify(api.getState())===before&&!/syncDerivedRegisters\s*\(/.test(api.buildReportData.toString())&&!/\bstate\s*=/.test(api.buildReportData.toString());});
test('Unsynchronisierte Risikobehandlung wird nur im privaten Snapshot abgeleitet',()=>{const unsynchronized=structuredClone(data.snapshotState);unsynchronized.risks[0].treatmentNeeded='yes';unsynchronized.risks[0].proposedTreatment='SENTINEL-PRIVATE-REGISTERABLEITUNG';unsynchronized.registers.risk=[];api.setRawStateForTest(unsynchronized);const before=JSON.stringify(api.getState()),snapshot=api.buildReportData(),after=JSON.stringify(api.getState()),derived=snapshot.registers.risk.find(item=>item.riskId===unsynchronized.risks[0].riskId);return before===after&&derived?.measure==='SENTINEL-PRIVATE-REGISTERABLEITUNG';});
test('Unsynchronisierter Risikostand wird in einem einheitlichen privaten Kontext vollständig konsistent ausgewertet',()=>{const previous=api.getState(),unsynchronized=structuredClone(data.snapshotState);Object.assign(unsynchronized.risks[0],{treatmentNeeded:'yes',treatmentStatus:'planned',proposedTreatment:'Geplante private Risikobehandlung',owner:'Fachverantwortung',treatmentDue:'2026-10-15',expectedResidual:'low',effectivenessCriterion:'Fehlklassifikationsquote unter 2 Prozent.'});unsynchronized.registers.risk=[];api.setRawStateForTest(unsynchronized);const before=JSON.stringify(api.getState()),snapshot=api.buildReportData(),after=JSON.stringify(api.getState()),privateEntry=snapshot.snapshotState.registers.risk.find(item=>item.id==='RM-R-01'),activeEntry=snapshot.registers.risk.find(item=>item.id==='RM-R-01'),openEntry=snapshot.openMeasures.find(item=>item.id==='RM-R-01'),reason=snapshot.decision.reasons.find(item=>item.code==='RISK-MEASURE-OPEN'&&item.source==='RM-R-01'),activeCount=Object.values(snapshot.registers).flat().length,consistent=before===after&&privateEntry===activeEntry&&activeEntry===openEntry&&Boolean(reason)&&snapshot.completion.decision===snapshot.decision&&snapshot.stepResults[6].startsWith(`${activeCount} aktive Registereinträge`);api.setRawStateForTest(previous);return consistent;});
test('Rekursiv abweichende Objektschlüsselreihenfolge verändert die Signatur nicht',()=>{api.setStateForTest(reverseObjectKeys(data.snapshotState));const signature=api.buildReportData().resultSignature;api.setStateForTest(data.snapshotState);return signature===data.resultSignature;});
test('Öffentliche Berichtsrenderer verlangen einen expliziten Berichtsdatenstand',()=>{for(const renderer of [api.buildCompactReport,api.buildEvidenceReport]){let rejected=false;try{renderer();}catch{rejected=true;}if(!rejected)return false;}return true;});

/*
 * Zeitpunktisolation: Snapshot A wird vor einer breit angelegten Änderung des
 * interaktiven Zustands erzeugt. Alle Sentinel-Werte müssen ausschließlich in
 * Snapshot B erscheinen; beide Renderer bleiben für A bytegleich.
 */
const snapshotABefore=JSON.stringify(data),compactBeforeMutation=compact,evidenceBeforeMutation=evidence;
const changed=structuredClone(data.snapshotState),sentinel={
  assessmentId:'SENTINEL-B-BEWERTUNGS-ID',internalToolId:'SENTINEL-B-TOOL-ID',toolName:'SENTINEL-B-TOOLNAME',provider:'SENTINEL-B-ANBIETER',documentLocation:'SENTINEL-B-ABLAGEORT',regulatory:'SENTINEL-B-REGULATORISCHE-ANTWORT',risk:'SENTINEL-B-RISIKOBESCHREIBUNG',org:'SENTINEL-B-ORG-KRITERIUM',regRegister:'SENTINEL-B-REG-REGISTER',riskRegister:'SENTINEL-B-RISIKO-REGISTER',orgRegister:'SENTINEL-B-ORG-REGISTER',expertRegister:'SENTINEL-B-FACHPRUEF-REGISTER',legalRegister:'SENTINEL-B-RECHTSPRUEF-REGISTER',trigger:'SENTINEL-B-NEUBEWERTUNGSAUSLOESER'
};
Object.assign(changed.form,{assessmentId:sentinel.assessmentId,internalToolId:sentinel.internalToolId,toolName:sentinel.toolName,provider:sentinel.provider,documentLocation:sentinel.documentLocation,pManipulation:'review',pManipulationReason:sentinel.regulatory});
changed.guideAnswers['TOOL-01']={value:sentinel.toolName,sourceField:'toolName'};changed.guideAnswers['TOOL-02']={value:sentinel.provider,sourceField:'provider'};changed.guideAnswers['ART5-01']={value:'review',sourceField:'pManipulation'};
Object.assign(changed.risks[0],{description:sentinel.risk,probability:'1',impact:'1',currentRisk:'low'});
Object.assign(changed.org.governance.criteria.org01,{answer:'partial',reason:sentinel.org});
changed.registers.regulatory.push({id:sentinel.regRegister,requirement:sentinel.regRegister,basis:'Testgrundlage',applicability:'current',status:'open',sourceActive:true});
changed.registers.risk.push({id:sentinel.riskRegister,riskId:changed.risks[0].riskId,measure:sentinel.riskRegister,status:'planned',sourceActive:true});
changed.registers.organizational.push({id:sentinel.orgRegister,measure:sentinel.orgRegister,status:'planned',sourceActive:true});
changed.registers.expert.push({id:sentinel.expertRegister,question:sentinel.expertRegister,status:'open',sourceActive:true});
changed.registers.legal.push({id:sentinel.legalRegister,question:sentinel.legalRegister,status:'open',sourceActive:true});
Object.assign(changed.triggers.find(item=>item.id==='REVIEW-22'),{required:'yes',steps:sentinel.trigger,owner:'SENTINEL-B-TRIGGER-OWNER',due:'2031-12-31'});
api.setStateForTest(changed);
const dataB=api.buildReportData(),allSentinels=Object.values(sentinel),compactAAfterMutation=api.buildCompactReport(data),evidenceAAfterMutation=api.buildEvidenceReport(data),compactB=api.buildCompactReport(dataB),evidenceB=api.buildEvidenceReport(dataB);

test('Kompakter Bericht aus Snapshot A enthält keine späteren Sentinel-Werte',()=>allSentinels.every(value=>!compactAAfterMutation.includes(value)));
test('Nachweisbericht aus Snapshot A enthält keine späteren Sentinel-Werte',()=>allSentinels.every(value=>!evidenceAAfterMutation.includes(value)));
test('Wiederholtes Rendern aus Snapshot A ist bytegleich',()=>compactAAfterMutation===api.buildCompactReport(data)&&evidenceAAfterMutation===api.buildEvidenceReport(data));
test('Interne Renderer sind direkt und ohne Live-Datenzugriff mit Snapshot A aufrufbar',()=>api.buildCompactReportFromSnapshot(data)===compactBeforeMutation&&api.buildEvidenceReportFromSnapshot(data)===evidenceBeforeMutation);
test('Snapshot A bleibt rekursiv eingefroren und unverändert',()=>isRecursivelyFrozen(data)&&JSON.stringify(data)===snapshotABefore);
test('Snapshot B enthält sämtliche später gesetzten Bereiche',()=>{const serialized=JSON.stringify(dataB.snapshotState);return allSentinels.every(value=>serialized.includes(value))&&dataB.snapshotState.form.pManipulation==='review'&&dataB.snapshotState.risks[0].probability==='1'&&dataB.snapshotState.org.governance.criteria.org01.answer==='partial';});
test('Snapshot A und Snapshot B besitzen unterschiedliche Vollinhaltssignaturen',()=>data.resultSignature!==dataB.resultSignature);
test('Kurz- und Nachweisbericht besitzen bei Snapshot A dieselbe Signatur',()=>embeddedSignature(compactAAfterMutation)===data.resultSignature&&embeddedSignature(evidenceAAfterMutation)===data.resultSignature);
test('Kurz- und Nachweisbericht besitzen bei Snapshot B dieselbe Signatur',()=>embeddedSignature(compactB)===dataB.resultSignature&&embeddedSignature(evidenceB)===dataB.resultSignature);
test('Bereits erzeugtes HTML bleibt nach Live-Änderungen bytegleich',()=>compactBeforeMutation===compactAAfterMutation&&evidenceBeforeMutation===evidenceAAfterMutation);
test('Signatur reagiert auf geänderte Risiko- und Organisationswerte',()=>data.riskLevels[0]!==dataB.riskLevels[0]&&data.resultSignature!==dataB.resultSignature);
test('Berichtsrenderer enthalten keinen direkten Zustands- oder Snapshot-Fallback',()=>{const renderers=[api.reportFooter,api.reportHeader,api.reportPage,api.guideReferenceStatus,api.buildReportBase,api.buildCompactReportFromSnapshot,api.buildEvidenceReportFromSnapshot,api.buildCompactReport,api.buildEvidenceReport];return renderers.every(renderer=>!/\bstate\b/.test(renderer.toString())&&!/buildReportData\s*\(/.test(renderer.toString()))&&!source.includes('withReportSnapshot');});

/*
 * Referenzisolation: Nach Snapshot A werden sämtliche sichtbaren globalen
 * Berichtstabellen kontrolliert ersetzt. Nur Snapshot B darf die Sentinelwerte
 * übernehmen; A muss in beiden Renderern und in seiner Signatur unverändert bleiben.
 */
api.setRawStateForTest(data.snapshotState);
const originalReferences=api.getReportReferencesForTest(),changedReferences=structuredClone(originalReferences),referenceSentinels={source:'SENTINEL-QUELLE',literacy:'2099-01-02',formula:'SENTINEL-FORMEL',step:'SENTINEL-PRUEFSCHRITT',area:'SENTINEL-ORGANISATIONSBEREICH',trigger:'SENTINEL-NEUBEWERTUNG',register:'SENTINEL-RISIKOREGISTER',guide:'SENTINEL-LEITFADENLABEL',path:'SENTINEL-REGULATORISCHER-PFAD'};
changedReferences.knowledgeBase.sources[0]=referenceSentinels.source;changedReferences.knowledgeBase.verifiedDates.aiLiteracy=referenceSentinels.literacy;changedReferences.knowledgeBase.matrix.formula=referenceSentinels.formula;changedReferences.steps[0][0]=referenceSentinels.step;changedReferences.orgAreas[0][1]=referenceSentinels.area;changedReferences.triggerDefs[0][1]=referenceSentinels.trigger;changedReferences.registerSchemas.risk.title=referenceSentinels.register;changedReferences.guideReference[0].label=referenceSentinels.guide;changedReferences.regulatoryPathLabels.prohibition=referenceSentinels.path;
api.setReportReferencesForTest(changedReferences);
const referenceCompactA=api.buildCompactReport(data),referenceEvidenceA=api.buildEvidenceReport(data),referenceDataB=api.buildReportData(),referenceCompactB=api.buildCompactReport(referenceDataB),referenceEvidenceB=api.buildEvidenceReport(referenceDataB),referenceValues=Object.values(referenceSentinels);
test('Snapshot A bleibt nach Änderungen globaler Referenzdaten in beiden Berichten bytegleich',()=>referenceCompactA===compactBeforeMutation&&referenceEvidenceA===evidenceBeforeMutation);
test('Kein Referenz-Sentinel erscheint in einem Bericht aus Snapshot A',()=>referenceValues.every(value=>!referenceCompactA.includes(value)&&!referenceEvidenceA.includes(value)));
test('Signatur und rekursive Sperre von Snapshot A bleiben nach Referenzänderungen erhalten',()=>data.resultSignature===embeddedSignature(referenceCompactA)&&data.resultSignature===embeddedSignature(referenceEvidenceA)&&isRecursivelyFrozen(data));
test('Snapshot B übernimmt Quellen, Stichtag, Matrix, Schritte und Beschriftungstabellen',()=>referenceValues.every(value=>JSON.stringify(referenceDataB.reference).includes(value)));
test('Beide Berichtsarten aus Snapshot B verwenden ausschließlich die neuen Referenzen',()=>[referenceSentinels.source,referenceSentinels.formula].every(value=>referenceCompactB.includes(value)&&referenceEvidenceB.includes(value))&&['02.01.2099',referenceSentinels.step,referenceSentinels.area,referenceSentinels.trigger,referenceSentinels.register,referenceSentinels.guide,referenceSentinels.path].every(value=>referenceEvidenceB.includes(value)));
test('Sichtbare Referenzänderungen erzeugen eine neue gemeinsame Signatur',()=>referenceDataB.resultSignature!==data.resultSignature&&embeddedSignature(referenceCompactB)===referenceDataB.resultSignature&&embeddedSignature(referenceEvidenceB)===referenceDataB.resultSignature);
test('Eingebettete Wissensbasis ist bis in Quellen, Stichtage und Matrix eingefroren',()=>Object.isFrozen(referenceDataB.knowledgeBase)&&Object.isFrozen(referenceDataB.knowledgeBase.sources)&&Object.isFrozen(referenceDataB.knowledgeBase.verifiedDates)&&Object.isFrozen(referenceDataB.knowledgeBase.matrix.levels));
test('Direkt aufgerufene interne Renderer ignorieren globale Referenzänderungen für Snapshot A',()=>api.buildCompactReportFromSnapshot(data)===compactBeforeMutation&&api.buildEvidenceReportFromSnapshot(data)===evidenceBeforeMutation);
api.setReportReferencesForTest(originalReferences);
api.setStateForTest(data.snapshotState);
test('Indirekte Registerfeld-Beschriftung bleibt an Snapshot A gebunden und ändert erst Snapshot B samt Signatur',()=>{const previousState=api.getState(),referencesA=api.getReportReferencesForTest(),candidate=referencesA.registerSchemas.risk.fields.find(([key])=>key==='effectivenessReview'),sentinel='SENTINEL-DYNAMISCHE-WIRKSAMKEITSPRUEFUNG';if(!candidate)return false;const stateWithUsedField=structuredClone(data.snapshotState);stateWithUsedField.risks[0].description=candidate[0];api.setRawStateForTest(stateWithUsedField);const snapshotA=api.buildReportData(),signatureA=snapshotA.resultSignature,compactA1=api.buildCompactReport(snapshotA),evidenceA1=api.buildEvidenceReport(snapshotA),referencesB=structuredClone(referencesA),fieldB=referencesB.registerSchemas.risk.fields.find(([key])=>key===candidate[0]);fieldB[1]=sentinel;let result=false;try{api.setReportReferencesForTest(referencesB);const compactA2=api.buildCompactReport(snapshotA),evidenceA2=api.buildEvidenceReport(snapshotA),snapshotB=api.buildReportData(),compactB=api.buildCompactReport(snapshotB),evidenceB=api.buildEvidenceReport(snapshotB);result=compactA1===compactA2&&evidenceA1===evidenceA2&&!compactA2.includes(sentinel)&&!evidenceA2.includes(sentinel)&&snapshotA.resultSignature===signatureA&&snapshotB.reference.registerSchemas.risk.fields.some(([key,label])=>key===candidate[0]&&label===sentinel)&&compactB.includes(sentinel)&&evidenceB.includes(sentinel)&&snapshotB.resultSignature!==signatureA;}finally{api.setReportReferencesForTest(referencesA);api.setRawStateForTest(previousState);}return result;});
test('Sichere Dateinamen unterscheiden Kurz- und Nachweisbericht',()=>api.reportFilename('compact',{internalToolId:'A/B:*? 01'})==='KI-Risikobewertung-Kurzbericht-A-B-01.pdf'&&api.reportFilename('evidence',{internalToolId:'A/B:*? 01'})==='KI-Risikobewertung-Nachweisbericht-A-B-01.pdf');
test('Benutzeroberfläche bietet die vier geforderten Berichtsaktionen',()=>['Kompakten Bewertungsbericht anzeigen','Kompakten Bewertungsbericht als PDF speichern','Vollständigen Nachweisbericht anzeigen','Vollständigen Nachweisbericht als PDF speichern'].every(text=>source.includes(text)));
test('Kompakter Bericht ist die Standardausgabe',()=>source.includes("let activeReportType='compact'")&&/finishAndReport\(\).*activeReportType='compact'/.test(source));
test('Druckschrift und Seitenränder erfüllen die Mindestvorgaben',()=>css.includes('.report-page { box-sizing: border-box')&&css.includes('font-size: 9pt')&&!css.includes('font-size: 8pt'));
test('Berichtsausgaben enthalten keine technischen Erzeugerhinweise',()=>!/<meta[^>]+name=["']generator|data-generator|sourceMappingURL/i.test(`${compact}\n${evidence}`));

const passed=tests.filter(item=>item.pass).length,failed=tests.length-passed;console.log(`\n${passed}/${tests.length} Berichtstests bestanden`);process.exitCode=failed?1:0;
