/*
 * Zweck und Abdeckung: Prüft vollständige fachliche Szenarien über mehrere
 * Prüfschritte hinweg, insbesondere Scope-, Rollen-, Risiko- und Statuskombinationen.
 * Abgrenzung: Fachliche End-to-End-Szenarien ohne reale Browser- oder PDF-Ausgabe.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = new Map();
function element(selector=''){
  if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},tagName:'DIV',addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){}});
  return elements.get(selector);
}
const storage=new Map(),windowObject={location:{search:''},scrollTo(){},print(){}};
const context=vm.createContext({console,structuredClone,URLSearchParams,window:windowObject,confirm:()=>true,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},document:{querySelector:element,querySelectorAll:()=>[]}});
windowObject.window=windowObject;
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','guide-reference.js'),'utf8'),context,{filename:'guide-reference.js'});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),context,{filename:'app.js'});

const results=vm.runInContext(`(() => {
  const out=[];
  const check=(name,actual,expected)=>out.push({name,actual,expected,pass:JSON.stringify(actual)===JSON.stringify(expected)});
  const transparent=(key,actor,roleKey)=>{const s=fillRegulatoryNo(freshState());s.form[roleKey]=true;Object.assign(s.form,{[key]:'yes',[key+'Use']:'Dokumentierte Verwendung',[key+'Actor']:actor,[key+'Duty']:'Tatbestandsspezifische Information oder Kennzeichnung',[key+'Exception']:'no',[key+'Reason']:'Tatbestand ist erfüllt',[key+'Evidence']:'Nachweis',[key+'Result']:'applicable',transparencyConclusion:actor,transparencyBasis:'Art. 50 geprüft',transparencyEvidence:'Nachweis'});return s;};
  const productHighRisk=role=>{const s=fillRegulatoryNo(freshState());Object.keys(s.form).filter(key=>key.startsWith('role_')).forEach(key=>s.form[key]=false);s.form['role_'+role]=true;Object.assign(s.form,{productCovered:'yes',productSafetyComponent:'yes',annexISection:'A',thirdPartyConformity:'yes',conformityNonSafetyOnly:'no',productHighRiskConclusion:'yes',productHighRiskBasis:'Kumulative Voraussetzungen erfüllt.',productHighRiskEvidence:'Produktakte'});return s;};
  const annexHighRisk=()=>{const s=fillRegulatoryNo(freshState());Object.assign(s.form,{annexEmployment:'yes',specificAnnexUse:'Personalvorauswahl',narrowProcedural:'no',completedResultImprovement:'no',patternDetection:'no',preparatoryTask:'no',materialInfluenceControl:'no',profiling:'no',annexBasis:'Anhang III Nr. 4 ist einschlägig.',annexEvidence:'Prozessakte',annexHighRiskConclusion:'yes',publicServiceEntity:'no',annexIII5bc:'no',unionAuthority:'no'});return s;};
  const prohibited=()=>{const s=fillRegulatoryNo(freshState()),key='pManipulation';Object.assign(s.form,{[key]:'confirmed',[key+'Use']:'Einsatz',[key+'ElementsResult']:'met',[key+'Elements']:'Merkmale erfüllt',[key+'Exception']:'none',[key+'Reason']:'Begründung',[key+'Evidence']:'Nachweis',[key+'Affected']:'Betroffene',[key+'LegalOwner']:'Rechtsstelle',[key+'Critical']:'yes',prohibitionConclusion:'confirmed'});return s;};

  const direct=transparent('tInteraction','provider','role_provider');
  check('1 Unmittelbare Interaktion erzeugt eine Anbieterpflicht',withTemporaryState(direct,()=>({code:evaluateTransparency().code,actor:evaluateTransparency().items.find(item=>item.key==='tInteraction').actor})),{code:'provider',actor:'provider'});

  const emotion=transparent('tEmotionBiometric','deployer','role_deployer');
  check('2 Emotionserkennung oder biometrische Kategorisierung erzeugt eine Betreiberpflicht',withTemporaryState(emotion,()=>({code:evaluateTransparency().code,actor:evaluateTransparency().items.find(item=>item.key==='tEmotionBiometric').actor})),{code:'deployer',actor:'deployer'});

  const wrongActor=transparent('tInteraction','deployer','role_provider');wrongActor.form.transparencyConclusion='provider';
  check('3 Falsche manuelle Art.-50-Akteursrolle erzeugt einen Widerspruch',withTemporaryState(wrongActor,()=>evaluateTransparency().contradictions.some(text=>text.includes('gesetzlichen Zuordnung'))),true);

  const wrongResult=transparent('tInteraction','provider','role_provider');wrongResult.form.tInteractionResult='not_applicable';
  check('4 Manuelles Tatbestandsergebnis widerspricht der automatischen Auswertung',withTemporaryState(wrongResult,()=>evaluateTransparency().contradictions.some(text=>text.includes('manuelle Ergebnis'))),true);

  const research=fillRegulatoryNo(freshState());Object.assign(research.form,{researchBeforeMarket:'yes',actualOperationalUse:'no',realWorldTesting:'no',scopeBasis:'Ausschließliche Entwicklung vor Inverkehrbringen.',scopeEvidence:'Forschungsplan'});
  check('5 Ausschließliche Forschung vor Inverkehrbringen führt zur dokumentierten Nichtanwendbarkeit',withTemporaryState(research,()=>evaluateScope().code),'excluded');

  const realWorld=fillRegulatoryNo(freshState());Object.assign(realWorld.form,{researchBeforeMarket:'yes',actualOperationalUse:'no',realWorldTesting:'yes',scopeBasis:'Test unter Realbedingungen.',scopeEvidence:'Testplan'});
  check('6 Test unter realen Bedingungen führt nicht automatisch zum Forschungsausschluss',withTemporaryState(realWorld,()=>evaluateScope().code),'applicable');

  check('7 Einführer erhält DUTY-18 nach Art. 23',withTemporaryState(productHighRisk('importer'),()=>requiredHighRiskDuties().some(item=>item.code==='DUTY-18')),true);
  check('8 Händler erhält DUTY-19 nach Art. 24',withTemporaryState(productHighRisk('distributor'),()=>requiredHighRiskDuties().some(item=>item.code==='DUTY-19')),true);
  check('9 Bevollmächtigter erhält DUTY-17 nach Art. 22',withTemporaryState(productHighRisk('authorisedRepresentative'),()=>requiredHighRiskDuties().some(item=>item.code==='DUTY-17')),true);

  const fria=annexHighRisk();const withoutFria=withTemporaryState(fria,()=>requiredHighRiskDuties().some(item=>item.code==='DUTY-21'));fria.form.publicServiceEntity='yes';const withFria=withTemporaryState(fria,()=>requiredHighRiskDuties().some(item=>item.code==='DUTY-21'));
  check('10 Art. 27 wird nur bei den gesetzlichen Voraussetzungen abgeleitet',{withoutFria,withFria},{withoutFria:false,withFria:true});

  const registration=annexHighRisk();const broad=withTemporaryState(registration,()=>requiredHighRiskDuties().find(item=>item.code==='DUTY-20')?.registrationRequired);registration.form.unionAuthority='yes';const publicBody=withTemporaryState(registration,()=>requiredHighRiskDuties().find(item=>item.code==='DUTY-20')?.registrationRequired);
  check('11 Betreiberregistrierung nach Art. 49 Abs. 3 wird nur mit CTX-14 abgeleitet',{broad,publicBody},{broad:false,publicBody:true});

  const stopped=prohibited();
  check('12 Art. 5 beendet Hochrisiko und Transparenz, aber nicht GPAI und CRA',withTemporaryState(stopped,()=>({high:evaluateHighRiskSummary().code,transparency:evaluateTransparency().code,gpai:evaluateGPAI().code,cra:evaluateCRA().code,status:overallDecision(false,true).code})),{high:'not_continued',transparency:'not_continued',gpai:'none',cra:'no',status:'USE_NOT_CONTINUABLE'});

  const split=fillRegulatoryNo(freshState()),key='pNonConsensualIntimate';Object.assign(split.form,{assessmentDate:'2027-01-01',intendedUseDate:'2027-01-01',[key]:'confirmed',[key+'ProviderProvision']:'yes',[key+'OperatorUse']:'no',[key+'IntendedPurpose']:'yes',[key+'ForeseeableReproducible']:'yes',[key+'Safeguards']:'no',[key+'Circumventions']:'yes',[key+'CorrectiveMeasures']:'no',[key+'Consent']:'no',[key+'Exception']:'none',[key+'Reason']:'Keine Einwilligung',[key+'Evidence']:'Test',[key+'LegalOwner']:'Recht',[key+'Critical']:'yes',prohibitionConclusion:'confirmed'});
  check('13 Intimes Material und Missbrauchsmaterial werden getrennt bewertet',withTemporaryState(split,()=>{const items=evaluateProhibitedPractices().items;return{intimate:items.find(item=>item.key===key).code,csam:items.find(item=>item.key==='pCsam').code};}),{intimate:'confirmed',csam:'not_met'});

  const steward=fillRegulatoryNo(freshState());Object.assign(steward.form,{craDigitalProduct:'yes',craDataConnection:'yes',craCommercial:'yes',craOpenSource:'no',craRole:'steward',craRoleManufacturer:'no',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'yes',craProductType:'software',craProductRelation:'standalone',craProductClass:'other',craConformityProcedure:'Dokumentiert',craVulnerabilityProcess:'Dokumentiert',craReportingProcess:'Dokumentiert',craTransitionDates:'Dokumentiert',craConclusion:'yes',craBasis:'Begründung',craEvidence:'Nachweis'});
  check('14 CRA-Steward und kein Open Source erzeugen einen Widerspruch',withTemporaryState(steward,()=>evaluateCRA().contradictions.some(text=>text.includes('Open-Source-Konstellation'))),true);

  const pureUse=fillRegulatoryNo(freshState());Object.assign(pureUse.form,{craDigitalProduct:'yes',craDataConnection:'yes',craCommercial:'yes',craOpenSource:'no',craManufacturerTakeover:'no',craExclusion:'no',craAiActOverlap:'no',craRole:'none',craRoleManufacturer:'no',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'no',craProductType:'software',craProductRelation:'standalone',craProductClass:'other',craConformityProcedure:'Herstellerunterlagen',craVulnerabilityProcess:'Interne Weiterleitung',craReportingProcess:'Interne Eskalation',craTransitionDates:'Dokumentiert',craConclusion:'product_only',craBasis:'Reine Nutzung',craEvidence:'Vertrag'});
  check('15 Reine Nutzung eines CRA-Produkts erzeugt keine Wirtschaftsakteursrolle',withTemporaryState(pureUse,()=>({code:evaluateCRA().code,own:evaluateCRA().ownObligations,roles:evaluateCRA().roles.length})),{code:'product_only',own:false,roles:0});

  check('16 Bericht enthält keine alten automatischen Freigabebezeichnungen',withTemporaryState(exampleState(),()=>{const report=buildReport(buildReportData());const forbidden=[['RELEASE','ABLE'].join(''),['Freigabe','fähig'].join(''),['Freigabe','empfehlung'].join('')];return forbidden.every(text=>!report.includes(text));}),true);

  const matrix=[];for(let probability=1;probability<=3;probability++)for(let impact=1;impact<=3;impact++){const score=riskScore({probability:String(probability),impact:String(impact)});matrix.push([probability,impact,score,riskLevel(score)]);}
  check('17 Alle neun Felder der 3×3-Matrix liefern die richtigen Ergebnisse',matrix,[[1,1,1,'Niedrig'],[1,2,2,'Niedrig'],[1,3,3,'Mittel'],[2,1,2,'Niedrig'],[2,2,4,'Mittel'],[2,3,6,'Hoch'],[3,1,3,'Mittel'],[3,2,6,'Hoch'],[3,3,9,'Hoch']]);

  check('18 Regulatorische, technische und organisatorische Ergebnisse bleiben getrennt',withTemporaryState(exampleState(),()=>{const report=buildReport(buildReportData());return['Regulatorische Einordnung','Technische Risikobewertung','Organisatorische Bewertung'].every(text=>report.includes(text));}),true);

  const legacy={schemaVersion:5,form:{pIntimate:'yes',researchDevelopment:'yes',decisionCode:['RELEASE','ABLE_WITH_CONDITIONS'].join(''),craRoleSteward:'yes',craOpenSource:'no'},evaluated:Array(8).fill(true),risks:[],org:{},registers:{regulatory:[],risk:[],organizational:[],expert:[],legal:[]},triggers:[]};const migrated=migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(legacy,5),5),5),5);
  check('19 Version-5-Daten werden verlustarm bis Version 13 migriert',{version:migrated.schemaVersion,intimate:migrated.form.pNonConsensualIntimate,csam:migrated.form.pCsam,status:migrated.form.decisionCode,steward:migrated.form.craRoleSteward,legalRegime:migrated.form.legalRegimeFulfilment,review:migrated.migration.reviewRequired,evaluated:[migrated.evaluated[1],migrated.evaluated[3],migrated.evaluated[6],migrated.evaluated[7]]},{version:13,intimate:'review',csam:'review',status:'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES',steward:'review',legalRegime:'review',review:true,evaluated:[false,false,false,false]});

  check('20 Musterfall und Bericht sind widerspruchsfrei',withTemporaryState(exampleState(),()=>{const report=buildReport(buildReportData()),transparency=evaluateTransparency(),cra=evaluateCRA();return{actor:transparency.items.find(item=>item.key==='tInteraction').actor,transparencyContradictions:transparency.contradictions.length,cra:cra.code,craContradictions:cra.contradictions.length,sections:(report.match(/<section class="report-page(?:\\s|")/g)||[]).length>=14,red:steps.filter((_,index)=>stepStatus(index)==='red').length};}),{actor:'provider',transparencyContradictions:0,cra:'product_only',craContradictions:0,sections:true,red:0});

  const filterResult=filterKey=>{const s=annexHighRisk();Object.assign(s.form,{role_provider:true,role_deployer:false,narrowProcedural:'no',completedResultImprovement:'no',patternDetection:'no',preparatoryTask:'no',[filterKey]:'yes',materialInfluenceControl:'no',profiling:'no',annexHighRiskConclusion:'exception'});return withTemporaryState(s,()=>({code:evaluateAnnexHighRisk().code,duty16:requiredHighRiskDuties().some(item=>item.code==='DUTY-16')}));};
  for(const [number,key] of [['21','narrowProcedural'],['22','completedResultImprovement'],['23','patternDetection'],['24','preparatoryTask']])check(number+' Alternative Filterbedingung '+key+' genügt für Art. 6 Abs. 3',filterResult(key),{code:'exception',duty16:true});

  const controlConflict=annexHighRisk();Object.assign(controlConflict.form,{narrowProcedural:'yes',materialInfluenceControl:'yes',profiling:'no',annexHighRiskConclusion:'exception'});
  check('25 HR-18-Widerspruch verhindert Hochrisiko- und Ausnahmeautomatik',withTemporaryState(controlConflict,()=>evaluateAnnexHighRisk().code),'review');

  const providerDuty=productHighRisk('provider');
  const duty12=withTemporaryState(providerDuty,()=>requiredHighRiskDuties().some(item=>item.code==='DUTY-12'));
  const duty16=filterResult('narrowProcedural').duty16;
  const operatorDuty=annexHighRisk();operatorDuty.form.unionAuthority='yes';
  const duty20=withTemporaryState(operatorDuty,()=>requiredHighRiskDuties().find(item=>item.code==='DUTY-20')?.registrationRequired===true);
  check('26 Registrierungen nach Art. 49 Abs. 1, 2 und 3 sind getrennt DUTY-12, DUTY-16 und DUTY-20 zugeordnet',{duty12,duty16,duty20},{duty12:true,duty16:true,duty20:true});

  const before=fillRegulatoryNo(freshState());Object.assign(before.form,{art25OwnBrand:'yes',art25SubstantialModification:'no',art25PurposeChange:'no',art25ProductIntegration:'no',art25Conclusion:'provider',art25Basis:'Eigenmarke'});
  const after=productHighRisk('deployer');Object.assign(after.form,{art25OwnBrand:'yes',art25SubstantialModification:'no',art25PurposeChange:'no',art25ProductIntegration:'no',art25Conclusion:'provider',art25Basis:'Eigenmarke'});
  check('27 Art. 25 wird erst nach festgestellter Hochrisikoeinstufung geprüft',{before:withTemporaryState(before,()=>evaluateArt25().code),after:withTemporaryState(after,()=>evaluateArt25().code)},{before:'not_applicable',after:'applicable'});

  const complete=fillRegulatoryNo(freshState());complete.risks=[{riskId:'R-STABIL',probability:'1',impact:'1',acceptance:'accepted',treatmentNeeded:'no',acceptanceReason:'Niedriges Risiko.',riskOwner:'Fachbereich',acceptanceApproval:'Dokumentierte Akzeptanz.'}];
  const statusSet=[withTemporaryState(complete,()=>overallDecision(false,true).code),withTemporaryState(exampleState(),()=>overallDecision(false,true).code),withTemporaryState(freshState(),()=>overallDecision(false,false).code),withTemporaryState(prohibited(),()=>overallDecision(false,true).code)];
  check('28 Es werden ausschließlich die vier zulässigen Bewertungsstatus ausgegeben',new Set(statusSet).size===4&&statusSet.every(code=>['ASSESSMENT_COMPLETE','ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','ASSESSMENT_NOT_CONCLUDABLE','USE_NOT_CONTINUABLE'].includes(code)),true);

  const legacyV6={schemaVersion:6,form:{art27PublicBody:'yes',art49PublicOperator:'yes',art27AnnexIII5bc:'yes',tEmotion:'yes',tBiometric:'no'},evaluated:Array(8).fill(true),risks:[{riskId:'ALT-1',description:'Erhalten'}],org:{oversight:{status:'partial'}},registers:{regulatory:[],risk:[],organizational:[],expert:[],legal:[]},triggers:[{id:'purpose',required:'yes',steps:'1'}]};
  const migratedV7=migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(legacyV6,6),6),6);
  check('29 Version-6-Daten, Altorganisation und Altauslöser bleiben bei Migration erhalten',{version:migratedV7.schemaVersion,ctx13:migratedV7.form.publicServiceEntity,ctx14:migratedV7.form.unionAuthority,hr20:migratedV7.form.annexIII5bc,risk:migratedV7.risks[0].riskId,org:!!migratedV7.legacyV6.org.oversight,trigger:migratedV7.legacyV6.triggers[0].id,legalRegime:migratedV7.form.legalRegimeFulfilment,review:migratedV7.migration.reviewRequired},{version:13,ctx13:'yes',ctx14:'yes',hr20:'yes',risk:'ALT-1',org:true,trigger:'purpose',legalRegime:'review',review:true});

  const review10Unavailable=fillRegulatoryNo(freshState());review10Unavailable.risks=[{riskId:'R-10',currentRisk:'high',acceptance:'notAccepted',treatmentNeeded:'review',suitableTreatmentAvailability:'unavailable',treatmentAvailabilityReason:'Keine geeignete Behandlung bestimmbar.'}];
  check('30 REVIEW-10 wird nur bei hoher Risikolage und ausdrücklich fehlender Behandlungsmöglichkeit zu Ja',withTemporaryState(review10Unavailable,()=>({review:evaluateReview10().value,status:overallDecision(false,true).code})),{review:'yes',status:'USE_NOT_CONTINUABLE'});

  const review10Available=fillRegulatoryNo(freshState());review10Available.risks=[{riskId:'R-11',currentRisk:'high',acceptance:'notAccepted',treatmentNeeded:'yes',suitableTreatmentAvailability:'available',treatmentAvailabilityReason:'Behandlung geplant.',treatmentStatus:'planned',proposedTreatment:'Kontrolle',owner:'Fachbereich',treatmentDue:'2027-01-01'}];
  check('31 Verfügbare Behandlung bei unbestimmtem Restrisiko erzeugt Prüfbedarf, aber keinen automatischen Nutzungsabbruch',withTemporaryState(review10Available,()=>({review:evaluateReview10().value,blocked:overallDecision(false,true).code==='USE_NOT_CONTINUABLE'})),{review:'review',blocked:false});

  const approvalIndependent=fillRegulatoryNo(freshState());approvalIndependent.risks=[{riskId:'R-STABIL',probability:'1',impact:'1',acceptance:'accepted',treatmentNeeded:'no',acceptanceReason:'Niedriges Risiko.',riskOwner:'Fachbereich',acceptanceApproval:'Dokumentierte Akzeptanz.'}];
  check('32 Gesonderte Entscheidung verändert den regelbasierten Status nicht',withTemporaryState(approvalIndependent,()=>{const before=overallDecision(false,true).code;state.form.approvalStatus='approved';const after=overallDecision(true,true);return{before,after:after.code,warning:approvalConsistency(after).warnings.length,statusReason:after.reasons.some(item=>item.code==='APPROVAL-CONTRADICTION')};}),{before:'ASSESSMENT_COMPLETE',after:'ASSESSMENT_COMPLETE',warning:0,statusReason:false});

  check('33 Negative Abdeckungsprüfung erkennt ausgelassene Kennungen',{duty:validateGuideImplementation({omit:['DUTY-47']}).missing.includes('DUTY-47'),review:validateGuideImplementation({omit:['REVIEW-42']}).missing.includes('REVIEW-42')},{duty:true,review:true});

  const duty45State=alignment=>{const s=fillRegulatoryNo(freshState());roleQuestionKeys.forEach(key=>s.form[key]='no');Object.assign(s.form,{roleDeployerFact:'yes',role_deployer:true,purposeAlignment:alignment});s.evaluated[2]=true;return s;};
  for(const [number,alignment,expected,reasonPart] of [['34','matches','no','entspricht'],['35','partial','yes','teilweise Abweichung'],['36','substantial','yes','wesentliche Abweichung'],['37','review','review','noch nicht abschließend geklärt']]){
    const s=duty45State(alignment);check(number+' DUTY-45 verarbeitet CTX-02 = '+alignment,withTemporaryState(s,()=>{const item=dutyOperationalResults().find(result=>result.id==='DUTY-45');return{value:item.value,reason:item.reason.includes(reasonPart)};}),{value:expected,reason:true});
  }
  const duty45Pb=duty45State('partial');
  check('38 DUTY-45 erzeugt einen PB-Eintrag mit CTX-02- und DUTY-45-Herkunft',withTemporaryState(duty45Pb,()=>{syncDerivedRegisters();const item=state.registers.legal.find(entry=>entry.id==='PB-DUTY-45'&&entry.sourceActive!==false);return{source:item?.sourceQuestionId,linked:item?.linkedResult.includes('CTX-02')&&item?.linkedResult.includes('DUTY-45')};}),{source:'CTX-02 / DUTY-45',linked:true});

  for(const [number,value,expected] of [['39','clarified','no'],['40','unresolved','yes'],['41','review','review']]){
    const s=fillRegulatoryNo(freshState());Object.assign(s.form,{legalRegimeFulfilment:value,legalRegimeFulfilmentEvidence:'EU AI Act, CRA, Datenschutzrecht und sektorales Recht wurden geprüft.'});
    check(number+' DUTY-47 verarbeitet '+value,withTemporaryState(s,()=>dutyOperationalResults().find(result=>result.id==='DUTY-47').value),expected);
  }
  const legacyV8={schemaVersion:8,form:{toolName:'Altbestand'},evaluated:Array(8).fill(true),risks:[],org:{},registers:{regulatory:[],risk:[],organizational:[],expert:[],legal:[]},triggers:[]};
  check('42 Version-8-Altbestand wird ohne positive DUTY-47-Unterstellung migriert',(()=>{const migratedV9=migrateV8ToV9(legacyV8,8);return{version:migratedV9.schemaVersion,tool:migratedV9.form.toolName,legalRegime:migratedV9.form.legalRegimeFulfilment,step7:migratedV9.evaluated[6],review:migratedV9.migration.reviewRequired};})(),{version:13,tool:'Altbestand',legalRegime:'review',step7:false,review:true});

  const inactive=fillRegulatoryNo(freshState());inactive.risks=[{riskId:'R-STABIL',probability:'1',impact:'1',acceptance:'accepted',treatmentNeeded:'no',acceptanceReason:'Niedriges Risiko.',riskOwner:'Fachbereich',acceptanceApproval:'Dokumentierte Akzeptanz.'}];inactive.registers.legal=[{id:'PB-HIST',sourceActive:false,status:'open',blocking:'yes'}];
  check('43 Inaktiver offener Blocker beeinflusst aktuellen Status und Reviews nicht',withTemporaryState(inactive,()=>({status:overallDecision(false,true).code,review09:reviewOperationalResult('REVIEW-09').value,review11:reviewOperationalResult('REVIEW-11').value,review12:reviewOperationalResult('REVIEW-12').value,review40:reviewOperationalResult('REVIEW-40').value,incomplete:incompleteRegisterItems().length,validation:registerValidation().issues.length+registerValidation().missingLinks.length})),{status:'ASSESSMENT_COMPLETE',review09:'no',review11:'no',review12:'no',review40:'Regulatorische Pflichten: 0 | Risikomaßnahmen: 0 | Organisationsmaßnahmen: 0 | Prüfbedarfe gesamt: 0 | fachlich: 0 | juristisch: 0 | vor Nutzung: 0 | entscheidungsblockierend: 0',incomplete:0,validation:0});
  const active=fillRegulatoryNo(freshState());active.registers.legal=[{id:'PB-AKTIV',sourceQuestionId:'DUTY-47',question:'Offene Rechtsfrage',reason:'Klärung erforderlich',linkedResult:'DUTY-47',owner:'Recht',sourceStep:'7',legalBasis:'EU AI Act / CRA',assessmentImpact:'Entscheidungskritisch',priority:'high',due:'2027-01-01',status:'open',result:'Prüfung offen',blocking:'yes'}];
  check('44 Aktiver offener Blocker beeinflusst aktuellen Status weiterhin',withTemporaryState(active,()=>({status:overallDecision(false,true).code,review11:reviewOperationalResult('REVIEW-11').value,review12:reviewOperationalResult('REVIEW-12').value,review40:reviewOperationalResult('REVIEW-40').value})),{status:'ASSESSMENT_NOT_CONCLUDABLE',review11:'yes',review12:'yes',review40:'Regulatorische Pflichten: 0 | Risikomaßnahmen: 0 | Organisationsmaßnahmen: 0 | Prüfbedarfe gesamt: 1 | fachlich: 0 | juristisch: 1 | vor Nutzung: 0 | entscheidungsblockierend: 1'});

  const review30Value=s=>withTemporaryState(s,()=>reviewOperationalResult('REVIEW-30').value);
  const r30InScope=fillRegulatoryNo(freshState());
  const r30Special=fillRegulatoryNo(freshState());r30Special.form.personalUse='yes';r30Special.form.scopeBasis='Sonderregelung dokumentiert.';r30Special.form.scopeEvidence='Nachweis';
  const r30NoScope=fillRegulatoryNo(freshState());['scopeProviderMarketEU','scopeDeployerEU','euOutputEffect','scopeImporterDistributor','scopeProductManufacturer','scopeAuthorisedRepresentative','scopeAffectedEU'].forEach(key=>r30NoScope.form[key]='no');
  const r30NotAi=fillRegulatoryNo(freshState());Object.assign(r30NotAi.form,{inference:'no',deterministicOnly:'yes',beyondHumanRules:'no'});
  const r30Review=fillRegulatoryNo(freshState());r30Review.form.inference='review';
  check('45 REVIEW-30 kategorisiert alle fünf Ergebnisse exakt',[review30Value(r30InScope),review30Value(r30Special),review30Value(r30NoScope),review30Value(r30NotAi),review30Value(r30Review)],['ai_system_in_scope','ai_system_special','scope_not_open','not_ai_system','review']);
  check('46 REVIEW-30 nennt Definition und Anwendungsbereich ohne pauschales Ja',withTemporaryState(r30InScope,()=>{const item=reviewOperationalResult('REVIEW-30'),report=buildReport(buildReportData());return{label:labelFor(item.value),reason:item.reason.includes('KI-System-Definition:')&&item.reason.includes('Anwendungsbereichsprüfung:'),report:report.includes('<td>REVIEW-30</td><td>KI-System im Anwendungsbereich</td>')&&!report.includes('<td>REVIEW-30</td><td>Ja</td>')};}),{label:'KI-System im Anwendungsbereich',reason:true,report:true});
  return out;
})()`,context);

for(const result of results)console.log(`${result.pass?'✓':'✗'} ${result.name}${result.pass?'':` – erwartet ${JSON.stringify(result.expected)}, erhalten ${JSON.stringify(result.actual)}`}`);
const failed=results.filter(result=>!result.pass).length;
console.log(`\n${results.length-failed} Szenariotests bestanden, ${failed} fehlgeschlagen`);
process.exitCode=failed?1:0;
