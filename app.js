/**
 * Architekturüberblick
 *
 * Diese Datei bildet die fachliche Anwendungsschicht des Prototyps. Die
 * Referenzdaten aus `guide-reference.js` werden in einen versionierten
 * Bewertungszustand überführt, durch deterministische Regeln ausgewertet und
 * anschließend entweder als interaktive Prüfschritte oder als Bericht
 * dargestellt. Der Browser-Speicher dient nur der lokalen Persistenz; die
 * Bewertungslogik bleibt vollständig im Quelltext nachvollziehbar.
 * Der globale `state` ist ausschließlich der veränderliche Arbeitsstand der
 * Bedienoberfläche. Eingaben, Navigation, Vollständigkeitsfarben und lokale
 * Speicherung arbeiten auf diesem Zustand. Berichtsfunktionen erhalten dagegen
 * einen eigenen, rekursiv eingefrorenen Berichtsdatenstand und lesen den
 * interaktiven Zustand nach dessen Erfassung nicht mehr.
 *
 * Datenfluss:
 * Leitfadenreferenz -> Eingabefelder -> normalisierter Zustand -> fachliche
 * Einzelauswertungen -> abgeleitete Register -> Gesamtstatus -> unveränderlicher
 * Berichtsdatenstand -> kompakter Bericht oder vollständiger Nachweisbericht.
 * Die fünf Register trennen unterschiedliche Steuerungsobjekte: `regulatory`
 * enthält einschlägige Pflichten, `risk` technische Risikomaßnahmen,
 * `organizational` organisatorische Maßnahmen, `expert` fachlichen Prüfbedarf
 * und `legal` juristischen Prüfbedarf. Regelbasierte Einträge werden anhand
 * stabiler Quellenkennungen synchronisiert; manuelle Ergänzungen bleiben
 * erhalten. Entfallene Ableitungen werden historisiert. Abweichende manuelle
 * und automatische Werte werden als Konflikt dokumentiert und nicht still
 * überschrieben.
 *
 * Ältere lokale Datenstände werden schrittweise auf das aktuelle Schema
 * migriert. Unsichere Altdaten bleiben mit Migrationshinweisen erhalten. Die
 * technische Risikobewertung folgt `R = E × A`; die Risikostufe ist kein
 * regulatorischer oder organisatorischer Gesamtscore. Der Gesamtstatus hat die
 * feste Priorität: festgestelltes Hindernis, nicht abschließbare Bewertung,
 * abgeschlossene Bewertung mit offenen Maßnahmen, abgeschlossene Bewertung.
 *
 * `buildReportData()` fixiert Zustand und abgeleitete Ergebnisse zu einem
 * Zeitpunkt. Eine stabile Vollinhaltssignatur kennzeichnet diesen Datenstand;
 * Kurz- und Nachweisbericht verwenden dasselbe Objekt. `window.__riskAppTest`
 * stellt ausschließlich einen kontrollierten Prüfzugang für automatisierte
 * Regressionstests bereit und ist keine zweite fachliche Schnittstelle.
 *
 * Die Datei ist in folgende fachliche Bereiche gegliedert:
 *  1. Konfiguration und Versionen
 *  2. Prüfschritte und Feldkataloge
 *  3. Leitfadenreferenz und Abdeckung
 *  4. Organisations-, Pflicht- und Registermodelle
 *  5. Zustandsmodell und Migrationen
 *  6. Persistenz, Import und Export
 *  7. Allgemeine Darstellungs- und Feldhilfen
 *  8. Zeitliche Anwendbarkeit
 *  9. Risiko- und Vollständigkeitslogik
 * 10. Eingabeansichten der acht Prüfschritte
 * 11. Regulatorische Einzelauswertungen
 * 12. Pflichten- und Reviewableitung
 * 13. Organisations- und Risikobewertung
 * 14. Registerableitung und Synchronisierung
 * 15. Plausibilisierung und Gesamtstatus
 * 16. Berichtsdatenstand und Berichtsausgabe
 * 17. Beispiel- und Testszenarien
 * 18. Ereignisbindung und Anwendungsstart
 *
 * Die Reihenfolge der Statusentscheidung ist bewusst strikt: erst ein
 * festgestelltes Hindernis, danach eine nicht abschließbare Bewertung, danach
 * offene Maßnahmen und zuletzt die abgeschlossene Bewertung. Eine menschliche
 * oder organisatorische Entscheidung wird getrennt gespeichert und verändert
 * diesen regelbasierten Status nicht.
 */

/* 1. Konfiguration und Versionen */
const STORAGE_KEY = 'ki-risikobewertung-masterarbeit-v16';
const LEGACY_V15_KEY = 'ki-risikobewertung-masterarbeit-v15';
const RECOVERY_BACKUP_KEY = 'ki-risikobewertung-masterarbeit-recovery-backup';
const LEGACY_V14_KEY = 'ki-risikobewertung-masterarbeit-v14';
const LEGACY_V13_KEY = 'ki-risikobewertung-masterarbeit-v13';
const LEGACY_V12_KEY = 'ki-risikobewertung-masterarbeit-v12';
const LEGACY_V11_KEY = 'ki-risikobewertung-masterarbeit-v11';
const LEGACY_V10_KEY = 'ki-risikobewertung-masterarbeit-v10';
const LEGACY_V9_KEY = 'ki-risikobewertung-masterarbeit-v9';
const LEGACY_V8_KEY = 'ki-risikobewertung-masterarbeit-v8';
const LEGACY_V7_KEY = 'ki-risikobewertung-masterarbeit-v7';
const LEGACY_V6_KEY = 'ki-risikobewertung-masterarbeit-v6';
const LEGACY_V5_KEY = 'ki-risikobewertung-masterarbeit-v5';
const LEGACY_V4_KEY = 'ki-risikobewertung-masterarbeit-v4';
const LEGACY_V3_KEY = 'ki-risikobewertung-masterarbeit-v3';
const LEGACY_V2_KEY = 'ki-risikobewertung-masterarbeit-v2';
const LEGACY_V1_KEY = 'ki-risikobewertung-masterarbeit-v1';
const SCHEMA_VERSION = 16;
/** Friert eine Referenzstruktur einschließlich aller Unterobjekte rekursiv ein. */
function deepFreezeReference(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.values(value).forEach(deepFreezeReference);return Object.freeze(value);
}
let GUIDE_REFERENCE=window.GUIDE_REFERENCE||[];
let GUIDE_REFERENCE_IDS=window.GUIDE_REFERENCE_IDS||[];
let GUIDE_REFERENCE_BY_ID=window.GUIDE_REFERENCE_BY_ID||{};
let KNOWLEDGE_BASE=deepFreezeReference({prototypeVersion:'1.11',dataModelVersion:'16',ruleSetVersion:'2.10',methodologyVersion:'2.0 – Risikoanalyse- und Bewertungsansatz nach Kapitel 3',assessmentDateLabel:'Bewertungsstichtag der jeweiligen Bewertung',legalStatus:'30.09.2026',fullSourceReview:'2026-09-06',lastCurrentnessReview:'2026-09-30',sources:['Verordnung (EU) 2024/1689 – konsolidierte Fassung vom 27.07.2026','Verordnung (EU) 2026/1744 – gesonderter Änderungsrechtsakt','Verordnung (EU) 2024/2847 – Cyber Resilience Act','NIST AI RMF 1.0','ISO/IEC 23894:2023','ISO/IEC 42001:2023'],verifiedDates:{aiLiteracy:'2025-02-02',article5General:'2025-02-02',article5New:'2026-12-02',aiActGeneral:'2026-08-02',transparency:'2026-08-02',transparencyExisting:'2026-12-02',gpai:'2025-08-02',gpaiExisting:'2027-08-02',highRiskAnnexIII:'2027-12-02',highRiskAnnexI:'2028-08-02',publicExistingHighRisk:'2030-08-02',craReporting:'2026-09-11',craGeneral:'2027-12-11'},matrix:{formula:'R = E × A',levels:{low:'1–2',medium:'3–4',high:'6–9'}}});
const APPLICATION_TITLE='KI-Risikobewertung nach EU AI Act und Cyber Resilience Act';
let activeReportType='compact';
let activeReportData=null;

/* 2. Prüfschritte und Feldkataloge */
let steps = [
  ['KI-Tool erfassen', 'Bewertungsgegenstand eindeutig beschreiben, abgrenzen und den Informationsstand dokumentieren.'],
  ['KI-System-Definition und Anwendungsbereich prüfen', 'Zuerst die KI-System-Definition nach Art. 3 Nr. 1, danach den Anwendungsbereich nach Art. 2 prüfen.'],
  ['Einsatzkontext und Akteursrolle bestimmen', 'Tatsächlichen Nutzungskontext, Auswirkungen, Rollen und mögliche Rollenwechsel nachvollziehbar bestimmen.'],
  ['Regulatorische Einordnung und ergänzende Prüfung', 'Verbotene Praktiken, Hochrisiko, Transparenz, GPAI und CRA in getrennten Prüfpfaden beurteilen.'],
  ['Technische Eigenschaften und Risiken bewerten', 'Technische Risiken mit der einheitlichen 3×3-Matrix bewerten; weitere Risikozustände bleiben getrennt.'],
  ['Organisatorische Rahmenbedingungen bewerten', 'Governance, Befähigung, Aufsicht, Steuerung und Lebenszyklus anhand von Nachweisen beurteilen.'],
  ['Einschlägige Pflichten, erforderliche Maßnahmen und weiteren Prüfbedarf ableiten', 'Regulatorische Anforderungen, Risiko- und Organisationsmaßnahmen sowie Prüfbedarfe getrennt steuern.'],
  ['Bewertungsergebnisse zusammenführen und dokumentieren', 'Getrennte Ergebnisse zusammenführen, menschliche Entscheidung dokumentieren und Neubewertungen festlegen.']
];

const choiceOptions = [['yes','Ja'],['no','Nein'],['na','Nicht einschlägig'],['review','Weiterer Prüfbedarf']];
const regulatoryChoiceOptions = [['yes','Ja'],['no','Nein'],['review','Weiterer Prüfbedarf']];
const orgCriterionOptions = [['fulfilled','Erfüllt'],['partial','Teilweise erfüllt'],['notFulfilled','Nicht erfüllt'],['na','Nicht einschlägig'],['notAssessable','Nicht beurteilbar']];
const temporalStatusOptions = [['current','Aktuell anwendbar'],['future','Künftig anwendbar'],['not_applicable','Nicht anwendbar'],['not_assessable','Nicht eindeutig beurteilbar / weiterer Prüfbedarf']];
const step1Required = ['internalToolId','toolName','provider','version','assessmentDate','department','owner','purpose','tasks','systemBoundary','inputs','dataSources','outputsDescription','techComponents','interfaces','integration','users','infoSources','shortDescription','infoStatus'];
const step1Optional = ['assessmentUpdate','providerContact','otherEvidence'];

const definitionQuestionKeys=['machineBased','autonomy','adaptivity','systemGoals','inference','aiOutputs','environmentInfluence','beyondHumanRules','usesPatterns','beyondStaticProcessing','deterministicOnly','basicDataProcessing','establishedMath','simpleHeuristics','objectType'];
const scopeQuestionKeys=['scopeProviderMarketEU','scopeDeployerEU','euOutputEffect','scopeImporterDistributor','scopeProductManufacturer','scopeAuthorisedRepresentative','scopeAffectedEU','scopeAnnexIB','scopeOutsideUnionLaw','militarySecurity','scopeNonEUOutputSecurity','scopeThirdCountryCooperation','researchScientificOnly','researchBeforeMarket','personalUse','openSource','openSourceHighRiskArt5Art50','scopeAnnexIAEquivalent'];
const step2Questions=[...definitionQuestionKeys,...scopeQuestionKeys].map(key=>[key]);

const contextDescriptionKeys=['intendedUse','purposeAlignment','process','usersContext','affected','decisionInfluence','spatialTemporal','rightsImpact'];
const contextChoiceKeys=['humanReview','humanCorrection','foreseeableMisuse','sensitiveSituation','publicServiceEntity','unionAuthority'];
const roleQuestionKeys=['roleProviderFact','roleGpaiProviderFact','roleDeployerFact','roleRepresentativeFact','roleImporterFact','roleDistributorFact','roleProductManufacturerFact','ownBrand','substantialModification','purposeChange','productIntegration'];
const step3Questions=[...contextChoiceKeys,...roleQuestionKeys].map(key=>[key]);

const roles = [
  ['provider','Anbieter'],['deployer','Betreiber'],['importer','Einführer'],['distributor','Händler'],
  ['productManufacturer','Produkthersteller'],['authorisedRepresentative','Bevollmächtigter'],['downstreamProvider','Nachgelagerter Anbieter'],['gpaiProvider','GPAI-Anbieter']
];
const roleFlagByQuestion=Object.freeze({roleProviderFact:'provider',roleGpaiProviderFact:'gpaiProvider',roleDeployerFact:'deployer',roleRepresentativeFact:'authorisedRepresentative',roleImporterFact:'importer',roleDistributorFact:'distributor',roleProductManufacturerFact:'productManufacturer'});

const prohibitedQuestions = [
  ['pManipulation','Manipulative, unterschwellige oder täuschende Techniken mit erheblicher Schädigungsgefahr?'],
  ['pVulnerability','Ausnutzung alters-, behinderungs- oder sozialbedingter Schutzbedürftigkeit?'],
  ['pNonConsensualIntimate','Nicht einvernehmliches intimes Material nach Art. 5 Abs. 1 Buchst. ba?'],
  ['pCsam','Material oder Darbietungen des sexuellen Kindesmissbrauchs nach Art. 5 Abs. 1 Buchst. bb?'],
  ['pSocialScoring','Soziale Bewertung mit ungerechtfertigter oder unverhältnismäßiger Benachteiligung?'],
  ['pCrimePrediction','Individuelle Straftatenprognose allein auf Profiling oder Persönlichkeitsmerkmalen?'],
  ['pFaceDatabase','Ungezieltes Auslesen von Bildern zur Erstellung oder Erweiterung von Gesichtsdatenbanken?'],
  ['pEmotion','Emotionserkennung am Arbeitsplatz oder in Bildungseinrichtungen?'],
  ['pBiometricCategory','Biometrische Kategorisierung nach besonders geschützten Merkmalen?'],
  ['pRealtimeBiometric','Biometrische Echtzeit-Fernidentifizierung im öffentlich zugänglichen Raum?']
];

const annexAreas = [
  ['annexBiometrics','Biometrie'],['annexCriticalInfrastructure','Kritische Infrastruktur'],['annexEducation','Bildung und Berufsbildung'],
  ['annexEmployment','Beschäftigung und Personalmanagement'],['annexEssentialServices','Zugang zu wesentlichen Diensten und Leistungen'],
  ['annexLawEnforcement','Strafverfolgung'],['annexMigration','Migration, Asyl und Grenzkontrolle'],['annexJusticeDemocracy','Justiz und demokratische Prozesse']
];

const transparencyQuestions = [
  ['tInteraction'],['tSynthetic'],['tEmotionBiometric'],['tDeepfake'],['tPublicText'],['tGeneralRequirements'],['tHighRiskAffectedInfo']
];

const transparencyActorByKey=Object.freeze({tInteraction:'provider',tSynthetic:'provider',tEmotionBiometric:'deployer',tDeepfake:'deployer',tPublicText:'deployer',tGeneralRequirements:'obligated',tHighRiskAffectedInfo:'deployer'});

const QUESTION_IDS=Object.freeze({
  toolName:'TOOL-01',provider:'TOOL-02',version:'TOOL-03',department:'TOOL-04',purpose:'TOOL-05',tasks:'TOOL-06',techComponents:'TOOL-07',inputs:'TOOL-08',outputsDescription:'TOOL-09',systemBoundary:'TOOL-10',infoSources:'TOOL-11',shortDescription:'TOOL-12',
  machineBased:'DEF-01',autonomy:'DEF-02',adaptivity:'DEF-03',systemGoals:'DEF-04',inference:'DEF-05',aiOutputs:'DEF-06',environmentInfluence:'DEF-07',beyondHumanRules:'DEF-08',usesPatterns:'DEF-09',beyondStaticProcessing:'DEF-10',deterministicOnly:'DEF-11',basicDataProcessing:'DEF-12',establishedMath:'DEF-13',simpleHeuristics:'DEF-14',objectType:'DEF-15',
  scopeProviderMarketEU:'SCOPE-01',scopeDeployerEU:'SCOPE-02',euOutputEffect:'SCOPE-03',scopeImporterDistributor:'SCOPE-04',scopeProductManufacturer:'SCOPE-05',scopeAuthorisedRepresentative:'SCOPE-06',scopeAffectedEU:'SCOPE-07',scopeAnnexIB:'SCOPE-08',scopeOutsideUnionLaw:'SCOPE-09',militarySecurity:'SCOPE-10',scopeNonEUOutputSecurity:'SCOPE-11',scopeThirdCountryCooperation:'SCOPE-12',researchScientificOnly:'SCOPE-13',researchBeforeMarket:'SCOPE-14',personalUse:'SCOPE-15',openSource:'SCOPE-16',openSourceHighRiskArt5Art50:'SCOPE-17',scopeAnnexIAEquivalent:'SCOPE-18',
  intendedUse:'CTX-01',purposeAlignment:'CTX-02',process:'CTX-03',usersContext:'CTX-04',affected:'CTX-05',decisionInfluence:'CTX-06',humanReview:'CTX-07',humanCorrection:'CTX-08',spatialTemporal:'CTX-09',foreseeableMisuse:'CTX-10',sensitiveSituation:'CTX-11',rightsImpact:'CTX-12',publicServiceEntity:'CTX-13',unionAuthority:'CTX-14',
  roleProviderFact:'ROLE-01',roleGpaiProviderFact:'ROLE-02',roleDeployerFact:'ROLE-03',roleRepresentativeFact:'ROLE-04',roleImporterFact:'ROLE-05',roleDistributorFact:'ROLE-06',roleProductManufacturerFact:'ROLE-07',ownBrand:'ROLE-08',substantialModification:'ROLE-09',purposeChange:'ROLE-10',productIntegration:'ROLE-11',art25OwnBrand:'ROLE-12',art25SubstantialModification:'ROLE-13',art25PurposeChange:'ROLE-14',art25ProductIntegration:'ROLE-15',
  pManipulation:'ART5-01',pVulnerability:'ART5-02',pNonConsensualIntimate:'ART5-03',pCsam:'ART5-04',pSocialScoring:'ART5-05',pCrimePrediction:'ART5-06',pFaceDatabase:'ART5-07',pEmotion:'ART5-08',pBiometricCategory:'ART5-09',pRealtimeBiometric:'ART5-10',
  productCovered:'HR-01',productSafetyComponent:'HR-02',annexISection:'HR-03',thirdPartyConformity:'HR-04',conformityNonSafetyOnly:'HR-05',annexBiometrics:'HR-06',annexCriticalInfrastructure:'HR-07',annexEducation:'HR-08',annexEmployment:'HR-09',annexEssentialServices:'HR-10',annexLawEnforcement:'HR-11',annexMigration:'HR-12',annexJusticeDemocracy:'HR-13',narrowProcedural:'HR-14',completedResultImprovement:'HR-15',patternDetection:'HR-16',preparatoryTask:'HR-17',materialInfluenceControl:'HR-18',profiling:'HR-19',annexIII5bc:'HR-20',
  tInteraction:'TR-01',tSynthetic:'TR-02',tEmotionBiometric:'TR-03',tDeepfake:'TR-04',tPublicText:'TR-05',tGeneralRequirements:'TR-06',tHighRiskAffectedInfo:'TR-07',
  gModel:'GPAI-01',gIndicativeFlops:'GPAI-02',gResearchOnly:'GPAI-03',gObjectType:'GPAI-04',gSelfProvision:'GPAI-05',gModification:'GPAI-06',gNonEuProvider:'GPAI-07',gOpenSource:'GPAI-08',gSystemicRisk:'GPAI-09',gCommissionDesignation:'GPAI-10',gAnnexXIII:'GPAI-11',
  craDigitalProduct:'CRA-01',craRemoteProcessing:'CRA-02',craDataConnection:'CRA-03',craCommercial:'CRA-04',craPrototype:'CRA-05',craOpenSource:'CRA-06',craExclusion:'CRA-07',craRole:'CRA-08',craSubstantialChange:'CRA-09',craManufacturerTakeover:'CRA-10',craProductClass:'CRA-11',craAiActOverlap:'CRA-12',
  timeAssessmentBasis:'TIME-01',timeDutyStatuses:'TIME-02',timeTransition:'TIME-03',timeLawChanged:'TIME-04',
  riskSystemBoundary:'RISK-01',riskDataSources:'RISK-02',riskModelsComponents:'RISK-03',riskInterfacesEnvironment:'RISK-04',riskHumanOversight:'RISK-05',riskExistingControls:'RISK-06',
  riskDomain10:'RISK-10',riskDomain11:'RISK-11',riskDomain12:'RISK-12',riskDomain13:'RISK-13',riskDomain14:'RISK-14',riskDomain15:'RISK-15',riskDomain16:'RISK-16',riskDomain17:'RISK-17',riskDomain18:'RISK-18',riskDomain19:'RISK-19',riskDomain20:'RISK-20',riskDomain21:'RISK-21',riskDomain22:'RISK-22',riskDomain23:'RISK-23',
  riskHealthRights:'RISK-24',riskForeseeableUse:'RISK-25',riskDesignMitigation:'RISK-26',riskTestProcedures:'RISK-27',riskCombinedOccurrence:'RISK-28',riskCascade:'RISK-29',riskProtectedGroups:'RISK-30',riskRegulatoryFeedback:'RISK-31'
});

/* 3. Leitfadenreferenz und Abdeckung */
function guideLabel(id,context=null){if(!context)return GUIDE_REFERENCE_BY_ID[id]?.label||id;const references=evaluationReferences(context);return references.guideLabels?.[id]||id;}
function guideHint(id,context=null){if(!context)return(GUIDE_REFERENCE_BY_ID[id]?.details||[]).filter(Boolean).join(' · ');const references=evaluationReferences(context),item=(references.guideReference||[]).find(entry=>entry.id===id);return(item?.details||[]).filter(Boolean).join(' · ');}
function guideQuestions(keys,context=null){const questionIds=context?evaluationReferences(context).questionIds:QUESTION_IDS;return keys.map(key=>[key,guideLabel(questionIds[key],context),guideHint(questionIds[key],context)]);}

function validateGuideImplementation({omit=[]}={}){
  const referenceIds=GUIDE_REFERENCE.map(item=>item.id),referenceSet=new Set(referenceIds),duplicates=referenceIds.filter((id,index)=>referenceIds.indexOf(id)!==index);
  const directIds=Object.values(QUESTION_IDS),orgIds=Object.values(orgCriteria||{}).flat().map(item=>item[3]),dutyIds=highRiskDutyCatalog?.map(item=>item[0])||[],triggerIds=triggerDefs?.map(item=>item[0])||[];
  const operationalDutyIds=Object.keys(DUTY_IMPLEMENTATION_RULES),operationalReviewIds=Object.keys(REVIEW_IMPLEMENTATION_RULES),reservedIds=['RISK-07','RISK-08','RISK-09'];
  const omitted=new Set(omit),implemented=[...directIds,...orgIds,...operationalDutyIds,...operationalReviewIds,...reservedIds].filter(id=>!omitted.has(id)),unknown=[...new Set(implemented.filter(id=>!referenceSet.has(id)))],missing=referenceIds.filter(id=>!implemented.includes(id));
  const implementationDuplicates=directIds.filter((id,index)=>directIds.indexOf(id)!==index);
  const expectedStep=id=>id.startsWith('TOOL-')?1:id.startsWith('DEF-')||id.startsWith('SCOPE-')?2:id.startsWith('CTX-')||(/^ROLE-(0[1-9]|1[01])$/.test(id))?3:['ART5-','HR-','TR-','GPAI-','CRA-','TIME-'].some(prefix=>id.startsWith(prefix))||/^ROLE-1[2-5]$/.test(id)?4:id.startsWith('RISK-')?5:id.startsWith('ORG-')?6:id.startsWith('DUTY-')?7:id.startsWith('REVIEW-')?8:0;
  const wrongStep=Object.entries(QUESTION_IDS).flatMap(([field,id])=>{const item=GUIDE_REFERENCE_BY_ID[id],expected=expectedStep(id);return !item||item.step!==expected?[{field,id,expected,actual:item?.step}]:[];});
  const textMismatches=[];Object.values(orgCriteria||{}).flat().forEach(([,label,,id])=>{if(label!==guideLabel(id))textMismatches.push(id);});highRiskDutyCatalog?.forEach(([id,label])=>{if(label!==guideLabel(id))textMismatches.push(id);});triggerDefs?.forEach(([id,label])=>{if(label!==guideLabel(id))textMismatches.push(id);});
  const nonExecutable=[...operationalDutyIds.filter(id=>typeof DUTY_IMPLEMENTATION_RULES[id]?.evaluate!=='function'||!DUTY_IMPLEMENTATION_RULES[id]?.path),...operationalReviewIds.filter(id=>typeof REVIEW_IMPLEMENTATION_RULES[id]?.evaluate!=='function'||!REVIEW_IMPLEMENTATION_RULES[id]?.path)];
  return{valid:!duplicates.length&&!unknown.length&&!missing.length&&!implementationDuplicates.length&&!wrongStep.length&&!textMismatches.length&&!nonExecutable.length,referenceCount:referenceIds.length,implementedCount:new Set(implemented).size,duplicates:[...new Set(duplicates)],implementationDuplicates:[...new Set(implementationDuplicates)],unknown,missing,wrongStep,textMismatches:[...new Set(textMismatches)],nonExecutable};
}

const gpaiQuestions = [
  ['gModel'],['gIndicativeFlops'],['gResearchOnly'],['gObjectType'],['gSelfProvision'],['gModification'],['gNonEuProvider'],['gOpenSource'],['gSystemicRisk'],['gCommissionDesignation'],['gAnnexXIII']
];

const craQuestions = [
  ['craDigitalProduct'],['craRemoteProcessing'],['craDataConnection'],['craCommercial'],['craPrototype'],['craOpenSource'],['craExclusion'],['craRole'],['craSubstantialChange'],['craManufacturerTakeover'],['craProductClass'],['craAiActOverlap']
];
const craRoleFields=Object.freeze([
  ['craRoleManufacturer','manufacturer','Hersteller'],['craRoleRepresentative','representative','Bevollmächtigter'],['craRoleImporter','importer','Einführer'],['craRoleDistributor','distributor','Händler'],['craRoleSteward','steward','Open-Source-Software-Steward']
]);
const CRA_ROLE_SOURCE_FIELDS=Object.freeze(craRoleFields.map(([field])=>field));

/**
 * Leitet die zusammengefasste CRA-Rolle ausschließlich aus den fünf sichtbaren
 * Einzelrollen ab. Der Rückgabewert verwendet stabile interne Codes; sichtbare
 * Bezeichnungen werden nur als zusätzliche Darstellung gespeichert.
 */
function deriveCraRoleSummary(form={}){
  const answers=craRoleFields.map(([field,code,label])=>({field,code,label,value:form[field]}));
  const answered=answers.filter(item=>isFilled(item.value)),selected=answers.filter(item=>item.value==='yes');
  const invalidOrOpen=answered.some(item=>typeof item.value!=='string'||!['yes','no','review'].includes(item.value))||answered.some(item=>item.value==='review')||(answered.length>0&&answered.length<answers.length);
  const code=answered.length===0?'':invalidOrOpen?'review':selected.length>1?'multiple':selected.length===1?selected[0].code:'none';
  const displayValue=code==='review'?'Weiterer Prüfbedarf':code==='none'?'Keine der genannten Rollen':selected.map(item=>item.label).join(', ');
  return{code,displayValue,sourceFields:[...CRA_ROLE_SOURCE_FIELDS],selectedCodes:selected.map(item=>item.code)};
}

/** Schreibt die kanonische CRA-Rollenzusammenfassung in Formular und Leitfadenantwort. */
function applyCraRoleDerivation(target){
  if(!target?.form||!target?.guideAnswers)return target;
  const hasRoleSurface=CRA_ROLE_SOURCE_FIELDS.some(field=>Object.prototype.hasOwnProperty.call(target.form,field))||Object.prototype.hasOwnProperty.call(target.form,'craRole')||Object.prototype.hasOwnProperty.call(target.guideAnswers,'CRA-08');
  if(!hasRoleSurface)return target;
  const derived=deriveCraRoleSummary(target.form),prior=target.guideAnswers['CRA-08'];
  target.form.craRole=derived.code;
  target.guideAnswers['CRA-08']={...(prior&&typeof prior==='object'&&!Array.isArray(prior)?prior:{}),value:derived.code,displayValue:derived.displayValue,sourceField:'craRole',sourceFields:derived.sourceFields};
  return target;
}
const riskContextKeys=['riskSystemBoundary','riskDataSources','riskModelsComponents','riskInterfacesEnvironment','riskHumanOversight','riskExistingControls'];
const riskDomainKeys=Array.from({length:14},(_,index)=>`riskDomain${index+10}`);
const riskEvaluationKeys=['riskHealthRights','riskForeseeableUse','riskDesignMitigation','riskTestProcedures','riskCombinedOccurrence','riskCascade','riskProtectedGroups','riskRegulatoryFeedback'];

let orgAreas = [
  ['governance','Governance, Rollen und Verantwortlichkeiten'],
  ['policies','Richtlinien, Prozesse und regulatorische Einbettung'],
  ['resources','Ressourcen, Kompetenz und menschliche Aufsicht'],
  ['communication','Kommunikation, Drittanbieter und Vorfälle'],
  ['monitoring','Monitoring, Änderungen und Lebenszyklus']
];
const orgCriterionRanges={governance:[1,8],policies:[9,19],resources:[20,25],communication:[26,32],monitoring:[33,36]};
let orgCriteria=Object.fromEntries(orgAreas.map(([area])=>[area,Array.from({length:orgCriterionRanges[area][1]-orgCriterionRanges[area][0]+1},(_,offset)=>{
  const number=orgCriterionRanges[area][0]+offset,id=`ORG-${String(number).padStart(2,'0')}`;
  return[`org${String(number).padStart(2,'0')}`,guideLabel(id),false,id];
})]));
const REGULATORY_ORG_RULES=Object.freeze({
  'ORG-22':Object.freeze({dutyCode:'DUTY-01',basis:'Art. 4 EU AI Act',reason:'Maßnahmen zur Unterstützung der KI-Kompetenz sind für den einschlägigen Anbieter- oder Betreiberpfad regulatorisch erforderlich.'}),
  'ORG-23':Object.freeze({dutyCode:'DUTY-01',basis:'Art. 4 EU AI Act',reason:'Rollenbezogene KI-Kompetenz und menschliche Aufsicht konkretisieren die einschlägige KI-Kompetenzpflicht.'})
});

/* 4. Organisations-, Pflicht- und Registermodelle */
const highRiskDutyCatalog=GUIDE_REFERENCE.filter(item=>item.id.startsWith('DUTY-')).map(item=>{
  const parts=item.details||[];return[item.id,item.label,parts[0]||'',parts[1]||'',parts[2]||''];
});

let triggerDefs=GUIDE_REFERENCE.filter(item=>/^REVIEW-(2[2-8])$/.test(item.id)).map(item=>[item.id,item.label,(item.details||[])[0]||'',(item.details||[])[1]||'']);

const DUTY_IMPLEMENTATION_PATHS=Object.freeze({
  'DUTY-01':'requiredHighRiskDuties + regulatory register','DUTY-02':'requiredHighRiskDuties + regulatory register','DUTY-03':'requiredHighRiskDuties + regulatory register','DUTY-04':'requiredHighRiskDuties + regulatory register','DUTY-05':'requiredHighRiskDuties + regulatory register','DUTY-06':'requiredHighRiskDuties + regulatory register','DUTY-07':'requiredHighRiskDuties + regulatory register','DUTY-08':'requiredHighRiskDuties + regulatory register','DUTY-09':'requiredHighRiskDuties + regulatory register','DUTY-10':'requiredHighRiskDuties + regulatory register','DUTY-11':'requiredHighRiskDuties + regulatory register','DUTY-12':'requiredHighRiskDuties + regulatory register','DUTY-13':'requiredHighRiskDuties + regulatory register','DUTY-14':'requiredHighRiskDuties + regulatory register','DUTY-15':'requiredHighRiskDuties + regulatory register','DUTY-16':'Art.-6-Abs.-3-Ausnahme + Anbieter/Bevollmächtigter','DUTY-17':'Bevollmächtigtenrolle + regulatory register','DUTY-18':'Einführerrolle + regulatory register','DUTY-19':'Händlerrolle + regulatory register','DUTY-20':'Betreiberrolle + regulatory register','DUTY-21':'Art.-27-Kontext + regulatory register','DUTY-22':'Transparenzpfad TR-01','DUTY-23':'Transparenzpfad TR-02','DUTY-24':'Transparenzpfad TR-03','DUTY-25':'Transparenzpfad TR-04/TR-05','DUTY-26':'Transparenzpflichten gesamt','DUTY-27':'GPAI-Rollenpfad','DUTY-28':'GPAI-Rollenpfad','DUTY-29':'GPAI-Drittlandspfad','DUTY-30':'GPAI-systemisches Risiko','DUTY-31':'GPAI-systemisches Risiko','DUTY-32':'CRA-Herstellerpfad','DUTY-33':'CRA-Herstellerpfad','DUTY-34':'CRA-Herstellerpfad','DUTY-35':'CRA-Herstellerpfad','DUTY-36':'CRA-Wirtschaftsakteurspfad',
  'DUTY-37':'evaluateDutyOperationalResult: Risikotoleranz','DUTY-38':'evaluateDutyOperationalResult: Informationslage','DUTY-39':'evaluateDutyOperationalResult: offene Pflichten und Schutzgruppen','DUTY-40':'evaluateDutyOperationalResult: Risikoakzeptanz','DUTY-41':'evaluateDutyOperationalResult: entscheidende Informationen/Widersprüche','DUTY-42':'evaluateDutyOperationalResult: regulatorischer Prüfbedarf','DUTY-43':'evaluateDutyOperationalResult: Rechtsausnahme/Grenzfall','DUTY-44':'evaluateDutyOperationalResult: Risikobewertbarkeit','DUTY-45':'evaluateDutyOperationalResult: Rolle und Nutzung','DUTY-46':'evaluateDutyOperationalResult: neue technische Eigenschaft','DUTY-47':'evaluateDutyOperationalResult: Rechtsregime/gesetzliche Pflicht'
});
const REVIEW_IMPLEMENTATION_PATHS=Object.freeze({
  'REVIEW-01':'reviewOperationalResult: Toolprofil','REVIEW-02':'reviewOperationalResult: Definition/Anwendungsbereich','REVIEW-03':'reviewOperationalResult: Kontext/Rollen','REVIEW-04':'reviewOperationalResult: regulatorisches Profil','REVIEW-05':'reviewOperationalResult: Risikoprofil','REVIEW-06':'reviewOperationalResult: Organisationsprofil','REVIEW-07':'reviewOperationalResult: Registerprofil','REVIEW-08':'reviewOperationalResult: verbotene Praxis','REVIEW-09':'reviewOperationalResult: nicht erfüllbare Pflicht','REVIEW-10':'reviewOperationalResult: Risikotoleranz und Behandlungsmöglichkeit','REVIEW-11':'reviewOperationalResult: blockierender Prüfbedarf','REVIEW-12':'reviewOperationalResult: offene Pflichten/Maßnahmen/Lücken','REVIEW-13':'reviewOperationalResult: Identifikation','REVIEW-14':'reviewOperationalResult: Versionen/Rechtsstand','REVIEW-15':'reviewOperationalResult: Schrittresultate','REVIEW-16':'reviewOperationalResult: Register','REVIEW-17':'reviewOperationalResult: Nachvollziehbarkeit','REVIEW-18':'reviewOperationalResult: Nachweise','REVIEW-19':'reviewOperationalResult: Rechtsdokumentation','REVIEW-20':'reviewOperationalResult: Status/Verantwortlichkeiten','REVIEW-21':'reviewOperationalResult: Aufbewahrung/Versionierung','REVIEW-22':'reviewOperationalResult: Neubewertungsauslöser','REVIEW-23':'reviewOperationalResult: Neubewertungsauslöser','REVIEW-24':'reviewOperationalResult: Neubewertungsauslöser','REVIEW-25':'reviewOperationalResult: Neubewertungsauslöser','REVIEW-26':'reviewOperationalResult: Neubewertungsauslöser','REVIEW-27':'reviewOperationalResult: Neubewertungsauslöser','REVIEW-28':'reviewOperationalResult: Neubewertungsauslöser','REVIEW-29':'reviewOperationalResult: Bewertungsgegenstand','REVIEW-30':'reviewOperationalResult: Definition/Scope-Zusammenfassung','REVIEW-31':'reviewOperationalResult: Rollen-Zusammenfassung','REVIEW-32':'reviewOperationalResult: Art.-5-Zusammenfassung','REVIEW-33':'reviewOperationalResult: Hochrisiko-Zusammenfassung','REVIEW-34':'reviewOperationalResult: Transparenz-Zusammenfassung','REVIEW-35':'reviewOperationalResult: GPAI-Zusammenfassung','REVIEW-36':'reviewOperationalResult: CRA-Zusammenfassung','REVIEW-37':'reviewOperationalResult: zeitliche Anwendbarkeit','REVIEW-38':'reviewOperationalResult: technische Risiken','REVIEW-39':'reviewOperationalResult: Organisation','REVIEW-40':'reviewOperationalResult: offene Punkte','REVIEW-41':'reviewOperationalResult: Gesamtstatus','REVIEW-42':'reviewOperationalResult: Reviewplanung'
});
const DUTY_IMPLEMENTATION_RULES=Object.freeze(Object.fromEntries(Object.entries(DUTY_IMPLEMENTATION_PATHS).map(([id,path])=>[id,Object.freeze({path,evaluate:(context=null)=>evaluateDutyOperationalResult(id,context)})])));
const REVIEW_IMPLEMENTATION_RULES=Object.freeze(Object.fromEntries(Object.entries(REVIEW_IMPLEMENTATION_PATHS).map(([id,path])=>[id,Object.freeze({path,evaluate:(decision=null,context=null)=>reviewOperationalResult(id,decision,context)})])));

let registerSchemas = {
  regulatory: { title:'Regulatorische Anforderungen', fields:[
    ['id','Anforderungs-ID','text'],['sourceQuestionId','Herkunft / auslösende Prüffrage','text'],['dutyCode','Leitfaden-Pflicht','text'],['basis','Rechtsgrundlage','text'],['requirement','Konkrete Anforderung','textarea'],['linkedResult','Verknüpftes Ergebnis','textarea'],
    ['obligatedRole','Verpflichtete Rolle','text'],
    ['applicability','Zeitlicher Anwendungsstatus','select',[['current','Aktuell anwendbar'],['future','Künftig anwendbar'],['not_applicable','Nicht anwendbar'],['not_assessable','Nicht eindeutig beurteilbar / weiterer Prüfbedarf']]],['applicableDate','Anwendbar ab (soweit belegt)','date'],['applicabilityReason','Begründung des Zeitstatus','textarea'],
    ['fulfillability','Erfüllbarkeit','select',[['fulfillable','Grundsätzlich erfüllbar (Umsetzungsstatus getrennt)'],['unfulfillable','Nachweislich nicht erfüllbar'],['not_assessable','Nicht beurteilbar / weiterer Prüfbedarf']]],['fulfillabilityReason','Begründung der Erfüllbarkeit','textarea'],
    ['beforeRelease','Vor Einsatz beziehungsweise vor verantwortlicher Genehmigung erforderlich','select',[['yes','Ja'],['no','Nein']]],
    ['decisionCritical','Entscheidungskritisch','select',[['yes','Ja'],['no','Nein']]],['blocking','Verhindert den Abschluss','select',[['yes','Ja'],['no','Nein']]],
    ['owner','Verantwortlich','text'],['due','Frist','date'],
    ['status','Umsetzungsstatus','select',[['fulfilled','Erfüllt'],['partial','Teilweise erfüllt'],['open','Nicht erfüllt'],['notAssessable','Nicht beurteilbar']]],
    ['evidence','Nachweis / Fundstelle','textarea'],['priority','Priorität','select',[['low','Niedrig'],['medium','Mittel'],['high','Hoch']]]
  ]},
  risk: { title:'Risikobehandlungsmaßnahmen', fields:[
    ['id','Maßnahmen-ID','text'],['sourceQuestionId','Herkunft / auslösende Prüffrage','text'],['riskId','Risiko-ID','text'],['basis','Bewertungsgrundlage','text'],['measure','Maßnahme','textarea'],['target','Behandlungsziel','textarea'],['linkedResult','Verknüpftes Ergebnis','textarea'],
    ['strategy','Behandlungsstrategie','select',[['avoid','Vermeiden'],['reduce','Reduzieren'],['transfer','Übertragen'],['accept','Akzeptieren']]],
    ['priority','Priorität','select',[['low','Niedrig'],['medium','Mittel'],['high','Hoch']]],
    ['beforeRelease','Vor Einsatz beziehungsweise vor verantwortlicher Genehmigung erforderlich','select',[['yes','Ja'],['no','Nein']]],['blocking','Verhindert den Abschluss','select',[['yes','Ja'],['no','Nein']]],
    ['owner','Verantwortlich','text'],['due','Frist','date'],
    ['status','Status','select',[['planned','Geplant'],['inProgress','In Umsetzung'],['implemented','Umgesetzt'],['verified','Wirksamkeit verifiziert']]],
    ['effectivenessCriterion','Wirksamkeitskriterium','textarea'],['effectivenessReview','Wirksamkeitsprüfung','date'],['reviewer','Prüfstelle','text'],
    ['evidence','Wirksamkeitsnachweis','textarea'],['residual','Verifiziertes Restrisiko','select',[['low','Niedrig'],['medium','Mittel'],['high','Hoch'],['unknown','Nicht bestimmbar']]]
  ]},
  organizational: { title:'Organisatorische Maßnahmen', fields:[
    ['id','Maßnahmen-ID','text'],['sourceQuestionId','Herkunft / auslösende Prüffrage','text'],['area','Bereich','text'],['measure','Maßnahme','textarea'],['impact','Zu schließende Lücke / Auswirkung','textarea'],['linkedResult','Verknüpftes Ergebnis','textarea'],
    ['basis','Grundlage','text'],['priority','Priorität','select',[['low','Niedrig'],['medium','Mittel'],['high','Hoch']]],
    ['beforeRelease','Vor Einsatz beziehungsweise vor verantwortlicher Genehmigung erforderlich','select',[['yes','Ja'],['no','Nein'],['review','Nicht beurteilbar / weiterer Prüfbedarf']]],['decisionCritical','Entscheidungskritisch','select',[['yes','Ja'],['no','Nein'],['review','Nicht beurteilbar / weiterer Prüfbedarf']]],['blocking','Verhindert den Abschluss','select',[['yes','Ja'],['no','Nein'],['review','Nicht beurteilbar / weiterer Prüfbedarf']]],
    ['owner','Verantwortlich','text'],['due','Frist','date'],
    ['status','Status','select',[['planned','Geplant'],['inProgress','In Umsetzung'],['implemented','Umgesetzt'],['verified','Wirksamkeit verifiziert']]],
    ['evidence','Nachweis','textarea']
  ]},
  expert: { title:'Fachlicher Prüfbedarf', fields:[
    ['id','Prüf-ID','text'],['sourceQuestionId','Herkunft / auslösende Prüffrage','text'],['question','Prüffrage','textarea'],['reason','Grund / benötigte Expertise','textarea'],['linkedResult','Verknüpftes Ergebnis','textarea'],['owner','Zuständige Stelle','text'],
    ['sourceStep','Betroffener Prüfschritt','text'],['expertise','Benötigte Expertise','text'],['assessmentImpact','Auswirkung auf die Bewertung','textarea'],
    ['priority','Priorität','select',[['low','Niedrig'],['medium','Mittel'],['high','Hoch']]],
    ['due','Frist','date'],['status','Status','select',[['open','Offen'],['inReview','In Prüfung'],['resolved','Geklärt']]],
    ['result','Ergebnis / Nachweis','textarea'],['ruleBlocking','Regelbasierter Vorschlag zur Blockierungswirkung','select',[['yes','Blockierend'],['no','Nicht blockierend'],['review','Nicht beurteilbar']]],['ruleBlockingReason','Regelbasierte Begründung der Blockierungswirkung','textarea'],['blocking','Fachliche Festlegung der Blockierungswirkung','select',[['yes','Blockierend'],['no','Nicht blockierend'],['review','Nicht beurteilbar']]],['blockingReason','Begründung der fachlichen Festlegung','textarea']
  ]},
  legal: { title:'Juristischer Prüfbedarf', fields:[
    ['id','Prüf-ID','text'],['sourceQuestionId','Herkunft / auslösende Prüffrage','text'],['question','Rechtsfrage','textarea'],['reason','Grund / Rechtsgrundlage','textarea'],['linkedResult','Verknüpftes Ergebnis','textarea'],['owner','Zuständige Stelle','text'],
    ['sourceStep','Betroffener Prüfschritt','text'],['legalBasis','Betroffene Rechtsgrundlage','text'],['assessmentImpact','Auswirkung auf die Bewertung','textarea'],
    ['craDecisionArea','Betroffene CRA-Teilentscheidung','select',[['not_applicable','Kein CRA-Bezug'],['product_applicability','Produktanwendbarkeit'],['organizational_role','Organisationsrolle'],['individual_duty','Einzelne Pflicht'],['temporal_applicability','Zeitliche Anwendbarkeit'],['operational_condition','Organisatorische Bedingung für Pilot- oder Regelbetrieb'],['review','Zuordnung noch zu bestätigen']]],
    ['priority','Priorität','select',[['low','Niedrig'],['medium','Mittel'],['high','Hoch']]],
    ['due','Frist','date'],['status','Status','select',[['open','Offen'],['inReview','In Prüfung'],['resolved','Geklärt']]],
    ['result','Ergebnis / Nachweis','textarea'],['ruleBlocking','Regelbasierter Vorschlag zur Blockierungswirkung','select',[['yes','Blockierend'],['no','Nicht blockierend'],['review','Nicht beurteilbar']]],['ruleBlockingReason','Regelbasierte Begründung der Blockierungswirkung','textarea'],['blocking','Fachliche Festlegung der Blockierungswirkung','select',[['yes','Blockierend'],['no','Nicht blockierend'],['review','Nicht beurteilbar']]],['blockingReason','Begründung der fachlichen Festlegung','textarea']
  ]}
};

let regulatoryPathLabels={prohibition:'Verbotene KI-Praktiken nach Art. 5',productHighRisk:'Hochrisiko nach Art. 6 Abs. 1 und Anhang I',annexHighRisk:'Hochrisiko nach Art. 6 Abs. 2 und Anhang III',art25:'Anbieterrolle nach Art. 25',transparency:'Transparenzpflichten nach Art. 50',gpai:'Modelle mit allgemeinem Verwendungszweck',cra:'Cyber Resilience Act'};

/* 5. Zustandsmodell und Migrationen */

/**
 * Erzeugt einen vollständigen, leeren Bewertungszustand des aktuellen Schemas.
 * @returns {object} Unabhängiger Ausgangszustand mit acht Prüfschritten und fünf Registern.
 */
function freshState() {
  return {
    schemaVersion:SCHEMA_VERSION, step:0, form:{}, guideAnswers:{}, evaluated:Array(8).fill(false), risks:[],
    org:Object.fromEntries(orgAreas.map(([id]) => [id,{criteria:Object.fromEntries((orgCriteria[id]||[]).map(([key])=>[key,{answer:'',reason:''}]))}])),
    registers:{regulatory:[],risk:[],organizational:[],expert:[],legal:[]},
    triggers:triggerDefs.map(([id]) => ({id,required:'',reason:'',steps:'',owner:'',due:''})), reportVisible:false,
    migration:{fromVersion:SCHEMA_VERSION,at:'',issues:[]}
  };
}

/**
 * Normalisiert gespeicherte Daten defensiv auf die aktuelle Objektstruktur.
 * Unbekannte Inhalte bleiben erhalten, bekannte Teilstrukturen erhalten sichere Standardwerte.
 * @param {object} saved Zu normalisierender Bewertungsstand.
 * @returns {object} Zustand im aktuellen Schemaformat.
 */
function normalizeState(saved){
  const base=freshState();
  const normalized={...base,...saved,schemaVersion:SCHEMA_VERSION,form:{...(saved?.form||{})},guideAnswers:Object.fromEntries(Object.entries(saved?.guideAnswers||{}).map(([id,value])=>[id,typeof value==='object'&&value!==null&&!Array.isArray(value)?{...value}:{value}])),evaluated:Array.from({length:8},(_,i)=>Boolean(saved?.evaluated?.[i])),
    risks:Array.isArray(saved?.risks)?saved.risks.map(item=>{const risk={suitableTreatmentAvailability:'',treatmentAvailabilityReason:'',...item},score=riskScore(risk);if(score!==null)risk.currentRisk=riskCode(score);return risk;}):[],
    org:Object.fromEntries(orgAreas.map(([id])=>{const prior=saved?.org?.[id]||{},criteria=Object.fromEntries((orgCriteria[id]||[]).map(([key])=>[key,{answer:'',reason:'',...(prior.criteria?.[key]||{})}]));return[id,{...prior,criteria}];})),
    registers:Object.fromEntries(Object.keys(base.registers).map(key=>[key,Array.isArray(saved?.registers?.[key])?saved.registers[key].map(item=>({...item})):[]])),
    triggers:triggerDefs.map(([id])=>({id,required:'',reason:'',steps:'',owner:'',due:'',...(saved?.triggers?.find?.(item=>item.id===id)||{})})),
    migration:{...base.migration,...(saved?.migration||{})}};
  return applyCraRoleDerivation(normalized);
}

/**
 * Migriert Version 2 auf 3: trennt Transparenz-, GPAI- und CRA-Sammelfelder und
 * überführt frühere Organisationsgesamtwerte in prüfbare Einzelkriterien.
 * Nicht eindeutig teilbare Angaben werden als Prüfbedarf markiert; Originalwerte
 * bleiben in Formular, Organisationsdaten und Migrationshinweisen nachvollziehbar.
 */
function migrateV2ToV3(saved,sourceVersion=2){
  const migrated=normalizeState(saved||{}),f=migrated.form,issues=[];
  if(isFilled(f.tEmotionBiometric)){f.tEmotion='review';f.tBiometric='review';issues.push('Die frühere gemeinsame Angabe zu Emotionserkennung und biometrischer Kategorisierung muss tatbestandsspezifisch geprüft werden.');}
  if(isFilled(f.tDeepfakePublic)){f.tDeepfake='review';f.tPublicText='review';issues.push('Die frühere gemeinsame Angabe zu Deepfakes und Texten von öffentlichem Interesse muss getrennt geprüft werden.');}
  if(f.tException==='yes'){
    transparencyQuestions.filter(([key])=>['yes','review'].includes(f[key])).forEach(([key])=>{f[`${key}Exception`]='review';});
    issues.push('Die frühere globale Transparenzausnahme wurde nicht automatisch übernommen; die Ausnahme ist je Tatbestand neu zu belegen.');
  }
  if(f.gProviderRole==='yes'&&!isFilled(f.gpaiOrganizationRole)){f.gpaiOrganizationRole='unclear';issues.push('Die frühere pauschale GPAI-Rollenangabe muss als konkrete Rolle bestätigt werden.');}
  if(f.craComponents==='yes'&&!isFilled(f.craProductType)){f.craProductType='unclear';issues.push('Die konkrete Art des Produkts mit digitalen Elementen muss bestätigt werden.');}
  if(f.craRole==='yes'&&!['yes'].some(value=>[f.craRoleManufacturer,f.craRoleImporter,f.craRoleDistributor,f.craRoleRepresentative,f.craRoleSteward].includes(value))){issues.push('Die frühere CRA-Rollenbestätigung enthält keine konkrete Akteursrolle.');}
  if(f.craClass==='yes'&&!isFilled(f.craProductClass)){f.craProductClass='unclear';issues.push('Die frühere CRA-Kategoriebestätigung enthält keine konkrete Produktklasse.');}
  if(f.craVulnerability==='yes'&&!isFilled(f.craVulnerabilityProcess)){f.craVulnerabilityProcess='Aus Altversion übernommen; Detailprüfung erforderlich.';issues.push('Schwachstellenbehandlung, Meldepflichten und Übergangszeitpunkte müssen getrennt bestätigt werden.');}
  orgAreas.forEach(([id,label])=>{const area=migrated.org[id];if(area.status&&(orgCriteria[id]||[]).every(([key])=>!isFilled(area.criteria[key]?.answer))){(orgCriteria[id]||[]).forEach(([key])=>{area.criteria[key]={answer:area.status==='na'?'na':'review',reason:area.status==='na'?(area.naReason||''):''};});issues.push(`${label}: Die frühere Gesamtbewertung wurde erhalten; die Einzelkriterien sind erneut zu bestätigen.`);}});
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at:new Date().toISOString(),issues:[...new Set([...(saved?.migration?.issues||[]),...issues])],reviewRequired:Boolean(saved?.migration?.reviewRequired)};
  return migrated;
}
/**
 * Migriert Version 3 auf 4: führt 4×4-Risikowerte verlustarm in die 3×3-Matrix,
 * vereinheitlicht Prioritäten, Registerstatus und Organisationswerte. Nur nicht
 * zuordenbare Organisationswerte setzen reviewRequired; Risikodatensätze behalten
 * ihren Altursprung und eine Migrationsnotiz.
 */
function migrateV3ToV4(saved,sourceVersion=3){
  const migrated=normalizeState(saved||{}),issues=[];let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  migrated.risks.forEach((risk,index)=>{let changed=false;['probability','impact'].forEach(key=>{if(String(risk[key])==='4'){risk[key]='3';changed=true;}});['currentRisk','expectedResidual','verifiedResidual'].forEach(key=>{if(risk[key]==='critical'){risk[key]='high';changed=true;}});if(risk.priority==='critical'){risk.priority='high';changed=true;}if(changed){risk.migratedFromMatrixV3=true;risk.migrationNote='Wert 4 wurde auf 3 und die frühere Risikokategorie Kritisch auf Hoch überführt.';issues.push(`${risk.riskId||`Risiko ${index+1}`}: 4×4-Bewertung in die 3×3-Matrix migriert.`);}});
  Object.values(migrated.registers).flat().forEach(item=>{if(item.priority==='critical')item.priority='high';if(item.residual==='critical')item.residual='high';if(item.applicability==='unclear')item.applicability='not_assessable';if(item.status==='unclear')item.status='notAssessable';});
  orgAreas.forEach(([id,label])=>{
    const area=migrated.org[id]||{};
    const statusMap={yes:'fulfilled',no:'notFulfilled',review:'notAssessable',unclear:'notAssessable',relevant:'fulfilled',notRelevant:'na'};
    if(statusMap[area.status]){area.status=statusMap[area.status];issues.push(`${label}: früherer Gesamtstatus wurde in die neue fünfstufige Organisationsbewertung überführt.`);}
    Object.values(area.criteria||{}).forEach(criterion=>{
      if(statusMap[criterion.answer])criterion.answer=statusMap[criterion.answer];
      else if(isFilled(criterion.answer)&&!orgCriterionOptions.some(([value])=>value===criterion.answer)){criterion.answer='notAssessable';reviewRequired=true;issues.push(`${label}: ein nicht eindeutig zuordenbarer Kriterienwert wurde als „Nicht beurteilbar“ markiert.`);}
    });
  });
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={fromVersion:sourceVersion,at:new Date().toISOString(),issues:[...new Set([...(saved?.migration?.issues||[]),...issues])],reviewRequired};return migrated;
}
/**
 * Migriert Version 4 auf 5: ergänzt die zeitlichen Pflichtfelder der aktiven
 * Registereinträge. Vorhandene Werte bleiben unverändert; fehlende Begründungen
 * werden konservativ ergänzt und im Migrationshinweis kenntlich gemacht.
 */
function migrateV4ToV5(saved,sourceVersion=4){
  const migrated=normalizeState(saved||{}),assessmentDate=migrated.form.assessmentDate||'';
  migrated.registers.regulatory.forEach(item=>{if(!isFilled(item.assessmentDate))item.assessmentDate=assessmentDate;if(!isFilled(item.applicabilityReason))item.applicabilityReason='Aus Altversion übernommen; zeitliche Anwendbarkeit ist erneut zu bestätigen.';});
  migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at:new Date().toISOString(),issues:[...new Set([...(saved?.migration?.issues||[]),'Version-4-Daten wurden um Pflichtfelder zur zeitlichen Anwendbarkeit ergänzt; bestehende Registerwerte bleiben erhalten.'])],reviewRequired:Boolean(saved?.migration?.reviewRequired)};
  return migrated;
}

/** Überführt frühere Freigabebezeichnungen in die vier neutralen Bewertungsstatus. */
function neutralStatusFromLegacy(value){
  if(!isFilled(value))return value;
  const text=String(value);
  if(text.includes('NON_AI_ACT'))return'ASSESSMENT_COMPLETE';
  if(text.startsWith('NOT_'))return'ASSESSMENT_NOT_CONCLUDABLE';
  if(text.includes('CONCLUSIVE'))return'ASSESSMENT_NOT_CONCLUDABLE';
  if(text.includes('WITH_CONDITIONS'))return'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES';
  if(text.startsWith('RELEASE'))return'ASSESSMENT_COMPLETE';
  return value;
}

/**
 * Migriert Version 5 auf 6: trennt neue Art.-5- und Forschungsfragen, neutralisiert
 * frühere Freigabecodes und prüft die CRA-Steward-Konsistenz. Bei mehrdeutigen
 * Altangaben werden die betroffenen Schritte 2, 4 und 8 zurückgesetzt; die Inhalte
 * bleiben als Prüfhinweise erhalten.
 */
function migrateV5ToV6(saved,sourceVersion=5){
  const migrated=normalizeState(saved||{}),f=migrated.form,issues=[...(saved?.migration?.issues||[])];let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  if(isFilled(f.pIntimate)){
    f.pNonConsensualIntimate='review';f.pCsam='review';
    f.pNonConsensualIntimateReason='Die frühere gemeinsame Art.-5-Angabe muss getrennt geprüft werden.';
    f.pCsamReason='Die frühere gemeinsame Art.-5-Angabe muss getrennt geprüft werden.';
    delete f.pIntimate;reviewRequired=true;
    issues.push('Die frühere gemeinsame Angabe zu intimen Inhalten und Missbrauchsmaterial wurde nicht übertragen; beide neuen Tatbestände sind getrennt zu prüfen.');
  }
  if(isFilled(f.researchDevelopment)){
    ['researchScientificOnly','researchBeforeMarket','realWorldTesting','actualOperationalUse'].forEach(key=>{if(!isFilled(f[key]))f[key]='review';});
    delete f.researchDevelopment;reviewRequired=true;
    issues.push('Die frühere gemeinsame Forschungsangabe wurde nicht pauschal übernommen; Art. 2 Abs. 6 und 8 sind getrennt zu prüfen.');
  }
  ['overallDecisionCode','decisionCode','statusCode'].forEach(key=>{if(isFilled(f[key]))f[key]=neutralStatusFromLegacy(f[key]);});
  if(f.craRoleSteward==='yes'&&f.craOpenSource!=='yes'){
    f.craRoleSteward='review';reviewRequired=true;
    issues.push('Die frühere CRA-Steward-Angabe widerspricht der fehlenden Open-Source-Konstellation und wurde als Prüfbedarf markiert.');
  }
  migrated.evaluated=Array.from({length:8},(_,index)=>reviewRequired&&[1,3,7].includes(index)?false:Boolean(saved?.evaluated?.[index]));
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={fromVersion:sourceVersion,at:new Date().toISOString(),issues:[...new Set(issues)],reviewRequired};return migrated;
}

/**
 * Migriert Version 6 auf 7: ordnet Leitfadenkennungen, Rollen-, Art.-25- und
 * Kontextfelder neu zu. Nicht zuordenbare Organisations- und Triggerdaten werden
 * vollständig unter legacyV6 gesichert; Mehrdeutigkeiten erzwingen eine erneute Prüfung.
 */
function migrateV6ToV7(saved,sourceVersion=6){
  const migrated=normalizeState(saved||{}),f=migrated.form,answers=migrated.guideAnswers,issues=[...(saved?.migration?.issues||[])];let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  migrated.legacyV6={org:structuredClone(saved?.org||{}),triggers:structuredClone(saved?.triggers||[])};
  if(Object.keys(saved?.org||{}).some(id=>!orgAreas.some(([current])=>current===id))){reviewRequired=true;issues.push('Die frühere Organisationsstruktur wurde vollständig unter legacyV6.org erhalten; die 36 Leitfadenkriterien ORG-01 bis ORG-36 sind erneut zu bewerten.');}
  if((saved?.triggers||[]).some(item=>!triggerDefs.some(([id])=>id===item.id))){reviewRequired=true;issues.push('Frühere Neubewertungsauslöser wurden vollständig unter legacyV6.triggers erhalten; die Leitfadenauslöser REVIEW-22 bis REVIEW-28 sind neu festzulegen.');}
  const remember=(id,value,sourceField,reason='')=>{if(!id||!isFilled(value)||isFilled(answers[id]?.value))return;answers[id]={value,sourceField,...(reason?{migrationNote:reason}:{})};};
  Object.entries(QUESTION_IDS).forEach(([field,id])=>remember(id,f[field],field));
  if(isFilled(f.tEmotion)||isFilled(f.tBiometric)){
    const values=[f.tEmotion,f.tBiometric].filter(isFilled),same=values.length&&values.every(value=>value===values[0]);
    const value=same?values[0]:'review';remember('TR-03',value,'tEmotion/tBiometric',same?'':'Frühere getrennte Angaben waren nicht eindeutig zusammenführbar.');
    if(!same){reviewRequired=true;issues.push('TR-03: Die früheren getrennten Angaben zu Emotionserkennung und biometrischer Kategorisierung müssen gemeinsam nach dem Leitfaden geprüft werden.');}
    if(!isFilled(f.tEmotionBiometric))f.tEmotionBiometric=value;
  }
  const publicValues=[f.art27PublicBody,f.art27PublicService].filter(isFilled);
  if(publicValues.length){const value=publicValues.includes('yes')?'yes':publicValues.includes('review')?'review':publicValues.every(item=>item==='no')?'no':'review';f.publicServiceEntity??=value;remember('CTX-13',value,'art27PublicBody/art27PublicService',publicValues.length>1?'Zusammengeführte Altangaben.':'');}
  if(isFilled(f.art49PublicOperator)){f.unionAuthority??=f.art49PublicOperator;remember('CTX-14',f.unionAuthority,'art49PublicOperator');}
  if(isFilled(f.art27AnnexIII5bc)){f.annexIII5bc??=f.art27AnnexIII5bc;remember('HR-20',f.annexIII5bc,'art27AnnexIII5bc');}
  [['art25OwnBrand','ownBrand'],['art25SubstantialModification','substantialModification'],['art25PurposeChange','purposeChange'],['art25ProductIntegration','productIntegration']].forEach(([target,source])=>{if(isFilled(f[source])&&!isFilled(f[target]))f[target]=f[source];remember(QUESTION_IDS[target],f[target],source);});
  if(isFilled(f.significantRisk)&&!isFilled(f.materialInfluenceControl)){f.materialInfluenceControl='review';remember('HR-18','review','significantRisk','Der frühere Wortlaut entspricht nicht eindeutig der Kontrollfrage HR-18.');reviewRequired=true;issues.push('HR-18: Die frühere Frage zum erheblichen Risiko wurde nicht als Antwort auf die Kontrollfrage zur materiellen Beeinflussung übernommen.');}
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={fromVersion:sourceVersion,at:new Date().toISOString(),issues:[...new Set(issues)],reviewRequired};return migrated;
}

/**
 * Migriert Version 7 auf 8: ergänzt je Risiko die gesonderte Aussage, ob eine
 * geeignete Behandlung verfügbar ist. Konkrete Altmaßnahmen werden abgeleitet;
 * bei offenen hohen Risiken wird reviewRequired gesetzt, ohne Risikodaten zu verwerfen.
 */
function migrateV7ToV8(saved,sourceVersion=7){
  const migrated=normalizeState(saved||{}),issues=[...(saved?.migration?.issues||[])];let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  migrated.risks.forEach((risk,index)=>{
    if(isFilled(risk.suitableTreatmentAvailability))return;
    const hasTreatment=risk.treatmentNeeded==='yes'&&[risk.proposedTreatment,risk.treatmentStrategy,risk.owner,risk.treatmentDue].some(isFilled);
    if(hasTreatment){risk.suitableTreatmentAvailability='available';risk.treatmentAvailabilityReason='Aus dem vorhandenen, konkretisierten Behandlungsplan der Altversion abgeleitet.';}
    else if(effectiveCurrentRisk(risk)==='high'&&risk.acceptance!=='accepted'){
      risk.suitableTreatmentAvailability='review';risk.treatmentAvailabilityReason='Altbestand: Die Verfügbarkeit einer geeigneten Behandlung war bislang nicht gesondert erfasst.';reviewRequired=true;
      issues.push(`${risk.riskId||`Risiko ${index+1}`}: Behandlungsmöglichkeit für REVIEW-10 ist neu zu bestätigen.`);
    }
  });
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={fromVersion:sourceVersion,at:new Date().toISOString(),issues:[...new Set(issues)],reviewRequired};return migrated;
}

/**
 * Migriert Version 8 auf 9: erhält die frühere DUTY-47-Aussage als Altinformation,
 * setzt die neue strukturierte Rechtsregimeprüfung vorsorglich auf Prüfbedarf und
 * öffnet ausschließlich Prüfschritt 7 erneut.
 */
function migrateV8ToV9(saved,sourceVersion=8){
  const migrated=normalizeState(saved||{}),f=migrated.form,issues=[...(saved?.migration?.issues||[])];let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  if(isFilled(f.legalRegimeFulfilment))migrated.legacyDuty47Assessment={value:f.legalRegimeFulfilment,evidence:f.legalRegimeFulfilmentEvidence||''};
  f.legalRegimeFulfilment='review';
  reviewRequired=true;
  issues.push('DUTY-47: Die strukturierte Klärung der Pflichterfüllung und des Zusammenwirkens mehrerer Rechtsregime ist für den Version-8-Altbestand konservativ als weiterer Prüfbedarf vorgemerkt; frühere Angaben bleiben als Altinformation erhalten.');
  migrated.evaluated=Array.from({length:8},(_,index)=>index===6?false:Boolean(saved?.evaluated?.[index]));
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={fromVersion:sourceVersion,at:new Date().toISOString(),issues:[...new Set(issues)],reviewRequired};return migrated;
}

/**
 * Migriert Version 9 auf 10: ergänzt Erfüllbarkeit und zweistufige
 * Blockierungsangaben der Prüfbedarfsregister sowie REVIEW-21-Dokumentationsfelder.
 * Unklare Einträge setzen reviewRequired; Prüfschritt 8 wird nur bei fehlenden
 * Aufbewahrungs- oder Triggerbegründungen zurückgesetzt.
 */
function migrateV9ToV10(saved,sourceVersion=9){
  const migrated=normalizeState(saved||{}),issues=[...(saved?.migration?.issues||[])];let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  migrated.registers.regulatory.forEach(item=>{
    if(!isFilled(item.fulfillability)){
      item.fulfillability=['fulfilled','verified'].includes(item.status)?'fulfillable':'not_assessable';
      item.fulfillabilityReason=item.fulfillability==='fulfillable'?'Aus dem dokumentierten Erfüllungsstatus des Altbestands abgeleitet.':'Altbestand: Die Erfüllbarkeit ist fachlich erneut zu bestätigen.';
      if(item.fulfillability==='not_assessable')reviewRequired=true;
    }else if(!isFilled(item.fulfillabilityReason))item.fulfillabilityReason='Altbestand: Begründung der Erfüllbarkeit ist zu ergänzen.';
  });
  ['expert','legal'].forEach(type=>migrated.registers[type].forEach(item=>{
    const prior=['yes','no','review'].includes(item.blocking)?item.blocking:'review';
    item.ruleBlocking??=prior;item.ruleBlockingReason??='Aus der bisherigen Blockierungsangabe des Altbestands übernommen.';
    item.blocking=prior;item.blockingReason??='Bisherige fachliche Festlegung aus dem Altbestand; bei Änderung erneut begründen.';
    if(prior==='review')reviewRequired=true;
  }));
  const missingDocumentation=['accessRights','statutoryRetentionStatus','statutoryRetentionBasis','internalRetentionPeriod','preservePreviousAssessments'].filter(key=>!isFilled(migrated.form[key]));
  if(missingDocumentation.length){reviewRequired=true;migrated.evaluated[7]=false;issues.push('REVIEW-21: Zugriffsrechte, gesetzliche und interne Aufbewahrung sowie die Erhaltung früherer Bewertungsstände sind für den Altbestand zu ergänzen.');}
  if(migrated.triggers.some(trigger=>trigger.required==='no'&&!isFilled(trigger.reason))){reviewRequired=true;migrated.evaluated[7]=false;issues.push('REVIEW-42: Bewusst nicht angewendete Neubewertungsauslöser benötigen im Altbestand eine Begründung.');}
  const at=new Date().toISOString(),notes=[...new Set(issues)];
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at,issues:notes,reviewRequired,auditTrail:[...(saved?.migration?.auditTrail||[]),{from:9,to:10,at,notes}]};
  return migrated;
}

/**
 * Migriert Version 10 auf 11: differenziert CRA-Mehrfachrollen, deaktiviert nicht
 * verifizierte Restrisiko-Altwerte und markiert frühere pauschale Hochrisikozeiten.
 * Altwerte werden unter legacyV10, inactiveVerifiedResidual und
 * legacyTemporalAssessment aufbewahrt; betroffene Schritte 4, 5 und 7 werden geöffnet.
 */
function migrateV10ToV11(saved,sourceVersion=10){
  const raw=structuredClone(saved||{}),migrated=normalizeState(saved||{}),f=migrated.form;
  const issues=[...(saved?.migration?.issues||[])];let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  const roleFields=['craRoleManufacturer','craRoleRepresentative','craRoleImporter','craRoleDistributor','craRoleSteward'];
  if(f.craRole==='multiple'&&!roleFields.some(key=>f[key]==='yes')){
    migrated.legacyV10={...(migrated.legacyV10||{}),craRole:'multiple',craRoleSnapshot:structuredClone(raw.form||{})};
    f.craRole='review';roleFields.forEach(key=>{if(!isFilled(f[key]))f[key]='review';});
    reviewRequired=true;migrated.evaluated[3]=false;
    issues.push('CRA-08: Die frühere pauschale Mehrfachrolle wurde erhalten, aber keiner Einzelrolle zugeordnet. Hersteller, Bevollmächtigter, Einführer, Händler und Steward sind erneut zu bestätigen.');
  }else{
    const legacyRoleMap={manufacturer:'craRoleManufacturer',representative:'craRoleRepresentative',importer:'craRoleImporter',distributor:'craRoleDistributor',steward:'craRoleSteward'};
    if(legacyRoleMap[f.craRole]&&!isFilled(f[legacyRoleMap[f.craRole]]))f[legacyRoleMap[f.craRole]]='yes';
    if(f.craRole==='none')roleFields.forEach(key=>{if(!isFilled(f[key]))f[key]='no';});
  }
  if(f.craDigitalProduct==='yes'&&f.craDataConnection==='yes'&&f.craCommercial==='yes'&&f.craProductClass==='none'){
    f.craProductClass='other';issues.push('CRA-11: Die frühere Kategorie „Keine“ wurde bei einem anwendbaren Produkt konservativ in „sonstiges Produkt“ überführt.');
  }
  migrated.risks.forEach((risk,index)=>{
    if(isFilled(risk.verifiedResidual)&&risk.treatmentStatus!=='verified'){
      risk.inactiveVerifiedResidual={value:risk.verifiedResidual,formerStatus:risk.treatmentStatus||'',migratedAt:new Date().toISOString()};
      reviewRequired=true;migrated.evaluated[4]=false;
      issues.push(`${risk.riskId||`Risiko ${index+1}`}: Ein verifiziertes Restrisiko ohne Status „Wirksamkeit verifiziert“ wurde als inaktiver Altwert gekennzeichnet und wird nicht ausgewertet.`);
    }
  });
  migrated.registers.regulatory.forEach(item=>{
    if(item.dutyCode&&/^DUTY-(0[2-9]|1[0-9]|2[01])$/.test(item.dutyCode)){
      item.legacyTemporalAssessment={applicability:item.applicability||'',applicableDate:item.applicableDate||'',applicabilityReason:item.applicabilityReason||''};
      reviewRequired=true;migrated.evaluated[3]=false;migrated.evaluated[6]=false;
    }
  });
  if(migrated.registers.regulatory.some(item=>item.legacyTemporalAssessment))issues.push('Zeitliche Anwendbarkeit: Frühere pauschale Hochrisiko-Zeitwerte bleiben als Altinformation erhalten; die differenzierten Pfadfristen werden neu abgeleitet.');
  const at=new Date().toISOString(),notes=[...new Set(issues)];
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at,issues:notes,reviewRequired,auditTrail:[...(saved?.migration?.auditTrail||[]),{from:10,to:11,at,notes}]};
  return migrated;
}

/**
 * Migriert Version 11 auf 12: wandelt einen freien manuellen Blocker in einen
 * regelkonformen Prüfbedarf um, differenziert zeitliche Teilpflichten und erkennt
 * doppelte Risiko-IDs. Sämtliche Altwerte bleiben erhalten; nur betroffene Schritte
 * 4, 5, 7 und 8 werden abhängig vom Befund zurückgesetzt.
 */
function migrateV11ToV12(saved,sourceVersion=11){
  const migrated=normalizeState(saved||{}),f=migrated.form,issues=[...(saved?.migration?.issues||[])];
  let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  const affected=[];
  if(f.manualBlockerActive==='yes'){
    migrated.legacyV11={...(migrated.legacyV11||{}),manualBlockerActive:f.manualBlockerActive,manualBlockerReason:f.manualBlockerReason||''};
    if(!migrated.registers.legal.some(item=>item.id==='PB-MANUELLER-PRUEFBEDARF'))migrated.registers.legal.push({id:'PB-MANUELLER-PRUEFBEDARF',sourceQuestionId:'REVIEW-11',question:'Ist der zusätzlich dokumentierte Sachverhalt entscheidungsblockierend?',reason:f.manualBlockerReason||'Aus Version 11 übernommener manueller Hinweis; fachliche oder juristische Einordnung erforderlich.',linkedResult:'Gesondert dokumentierter Prüfbedarf',owner:'',sourceStep:'8',legalBasis:'Fallbezogene fachliche oder juristische Prüfung',assessmentImpact:'Die Blockierungswirkung ist anhand REVIEW-11 zu bestätigen.',priority:'high',due:'',status:'open',result:'',ruleBlocking:'review',ruleBlockingReason:'Ein freier Hinweis darf keinen Hindernisstatus erzeugen. Die Blockierungswirkung ist gesondert zu bestätigen.',blocking:'review',blockingReason:'Aus Altbestand übernommen; erneute Bestätigung erforderlich.',derived:false,sourceActive:true});
    f.manualBlockerActive='no';f.manualBlockerReason='';reviewRequired=true;affected.push(6,7);
    issues.push('Der frühere freie manuelle Blocker wurde verlustfrei als gesonderter Prüfbedarf übernommen. Er erzeugt keinen Hindernisstatus und muss nach REVIEW-11 erneut eingeordnet werden.');
  }
  if(migrated.registers.regulatory.some(item=>/^DUTY-(12|15|20|3[2-6])$/.test(item.dutyCode||''))){reviewRequired=true;affected.push(3,6,7);issues.push('Zeitliche Teilpflichten von DUTY-12, DUTY-15, DUTY-20 und CRA wurden für die neue pflichtbezogene Zeitlogik zur erneuten Prüfung markiert; sämtliche Altwerte bleiben erhalten.');}
  if(migrated.risks.some((risk,index)=>migrated.risks.some((other,otherIndex)=>otherIndex!==index&&isFilled(risk.riskId)&&risk.riskId===other.riskId))){reviewRequired=true;affected.push(4,6);issues.push('Doppelte Risiko-IDs aus Version 11 wurden nicht zusammengeführt. Alle Datensätze bleiben erhalten und sind vor der weiteren Maßnahmenzuordnung eindeutig zu benennen.');}
  affected.forEach(index=>migrated.evaluated[index]=false);
  const at=new Date().toISOString(),notes=[...new Set(issues)];
  migrated.schemaVersion=SCHEMA_VERSION;migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at,issues:notes,reviewRequired,auditTrail:[...(saved?.migration?.auditTrail||[]),{from:11,to:12,at,notes}]};
  return migrated;
}

/**
 * Migriert Version 12 auf 13: ergänzt interne Tool-Kennung, Behördenbestimmung
 * sowie Verantwortlichkeit und Frist der SCOPE-08/SCOPE-18-Klärung. Fehlende neue
 * Felder setzen reviewRequired und öffnen nur die fachlich betroffenen Schritte;
 * Bewertungs-ID und bisherige Datumsangaben bleiben unverändert.
 */
function migrateV12ToV13(saved,sourceVersion=12){
  const migrated=normalizeState(saved||{}),f=migrated.form,issues=[...(saved?.migration?.issues||[])];
  let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  const affected=[];
  if(!Object.prototype.hasOwnProperty.call(saved?.form||{},'internalToolId')){
    f.internalToolId='';reviewRequired=true;affected.push(0,7);
    issues.push('REVIEW-13: Die eigenständige interne Tool-Kennung ist für den übernommenen Bewertungsstand nachzutragen. Die Bewertungs-ID bleibt unverändert erhalten.');
  }
  if(!Object.prototype.hasOwnProperty.call(saved?.form||{},'publicAuthorityIntendedUse')){
    f.publicAuthorityIntendedUse='';reviewRequired=true;affected.push(3,7);
    issues.push('Zeitliche Anwendbarkeit: Die Bestimmung eines Hochrisiko-KI-Systems zur Verwendung durch eine Behörde oder öffentliche Stelle ist für den Übergangsfall nach Art. 111 Abs. 2 nachzutragen. Bisherige Datumsangaben bleiben unverändert erhalten.');
  }
  ['scopeLimitationOwner','scopeLimitationDue'].forEach(key=>{if(!Object.prototype.hasOwnProperty.call(saved?.form||{},key))f[key]='';});
  if(['yes','review'].includes(f.scopeAnnexIB)||['yes','review'].includes(f.scopeAnnexIAEquivalent)){
    reviewRequired=true;affected.push(1,6,7);
    issues.push('SCOPE-08/SCOPE-18: Zuständigkeit und Frist zur Klärung des begrenzten Pflichtenumfangs sind im Altbestand zu ergänzen.');
  }
  affected.forEach(index=>migrated.evaluated[index]=false);
  const at=new Date().toISOString(),notes=[...new Set(issues)];
  migrated.schemaVersion=SCHEMA_VERSION;
  migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at,issues:notes,reviewRequired,auditTrail:[...(saved?.migration?.auditTrail||[]),{from:12,to:13,at,notes}]};
  return migrated;
}

/**
 * Migriert Version 13 auf 14: dokumentiert die tatsächlich verwendete
 * Leitfadenfassung und verlangt bei einer vom Bewertungsstichtag abweichenden
 * Aktualisierung eine eigene Erläuterung. Vorhandene Datums- und Versionswerte
 * werden weder ersetzt noch auf den Migrationszeitpunkt gesetzt.
 */
function migrateV13ToV14(saved,sourceVersion=13){
  const migrated=normalizeState(saved||{}),f=migrated.form,issues=[...(saved?.migration?.issues||[])];
  let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  const affected=[];
  if(!Object.prototype.hasOwnProperty.call(saved?.form||{},'guideVersion')){
    f.guideVersion='';reviewRequired=true;affected.push(7);
    issues.push('Versionsdokumentation: Die tatsächlich verwendete Leitfadenfassung ist nachzutragen; eine finale Fassung wird nicht unterstellt.');
  }
  if(!Object.prototype.hasOwnProperty.call(saved?.form||{},'assessmentUpdateReason'))f.assessmentUpdateReason='';
  if(isFilled(f.assessmentDate)&&isFilled(f.assessmentUpdate)&&f.assessmentDate!==f.assessmentUpdate&&!isFilled(f.assessmentUpdateReason)){
    reviewRequired=true;affected.push(0,7);
    issues.push('Zeitdokumentation: Die Bewertungsaktualisierung weicht vom Bewertungsstichtag ab und benötigt eine eigene Erläuterung.');
  }
  affected.forEach(index=>migrated.evaluated[index]=false);
  const at=new Date().toISOString(),notes=[...new Set(issues)];
  migrated.schemaVersion=SCHEMA_VERSION;
  migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at,issues:notes,reviewRequired,auditTrail:[...(saved?.migration?.auditTrail||[]),{from:13,to:14,at,notes}]};
  return migrated;
}

const CRA_DECISION_AREAS=Object.freeze(['not_applicable','product_applicability','organizational_role','individual_duty','temporal_applicability','operational_condition','review']);

/** Ordnet stabile CRA-Quellkennungen einer fachlichen Teilentscheidung zu. */
function craDecisionAreaFromSourceId(sourceQuestionId){
  const ids=String(sourceQuestionId||'').toUpperCase().match(/(?:CRA|DUTY|TIME)-\d{2}/g)||[];
  const areas=new Set(ids.map(id=>{
    if(/^CRA-0[1-7]$/.test(id))return'product_applicability';
    if(/^CRA-(0[89]|10)$/.test(id))return'organizational_role';
    if(/^CRA-(11|12)$/.test(id)||/^DUTY-3[2-6]$/.test(id))return'individual_duty';
    if(/^TIME-/.test(id))return'temporal_applicability';
    return'';
  }).filter(Boolean));
  return areas.size===1?[...areas][0]:areas.size>1?'review':'';
}

/**
 * Bestimmt den CRA-Bezug vorrangig aus strukturierter Zuordnung und Quell-ID.
 * Freitext kennzeichnet nur einen ungeklärten Altbezug und entscheidet niemals
 * selbst über Produktanwendbarkeit, Rolle, Pflicht oder Zeitstatus.
 */
function classifyCraRegisterItem(item){
  const explicit=CRA_DECISION_AREAS.includes(item?.craDecisionArea)?item.craDecisionArea:'',inferred=craDecisionAreaFromSourceId(item?.sourceQuestionId);
  if(explicit&&inferred&&explicit!==inferred)return{area:'review',source:'conflict',reason:`Die gespeicherte CRA-Zuordnung „${explicit}“ widerspricht der Quellkennung ${item.sourceQuestionId}.`};
  if(explicit)return{area:explicit,source:'explicit',reason:''};
  if(inferred)return{area:inferred,source:'source_id',reason:''};
  const craHint=/\bCRA\b|Cyber Resilience|Produkt mit digitalen Elementen/i.test([item?.id,item?.question,item?.reason,item?.legalBasis,item?.linkedResult].filter(Boolean).join(' '));
  return craHint?{area:'review',source:'legacy_hint',reason:'Ein CRA-Bezug ist erkennbar, die betroffene Teilentscheidung ist jedoch nicht strukturiert zugeordnet.'}:{area:'not_applicable',source:'none',reason:''};
}

/**
 * Migriert Version 14 auf 15: ergänzt eine strukturierte CRA-Abhängigkeit für
 * juristische Prüfpunkte. Eindeutige Quellkennungen werden zugeordnet; reine
 * Freitextbezüge bleiben ausdrücklich als zu bestätigender Altbestand offen.
 */
function migrateV14ToV15(saved,sourceVersion=14){
  const migrated=normalizeState(saved||{}),issues=[...(saved?.migration?.issues||[])];
  let reviewRequired=Boolean(saved?.migration?.reviewRequired),ambiguous=false;
  const legacyInvalidFormValues={};
  Object.entries(migrated.form||{}).forEach(([field,value])=>{
    const allowed=FORM_ALLOWED_VALUES[field];
    if(!allowed||!isFilled(value)||allowed.includes(String(value)))return;
    legacyInvalidFormValues[field]=structuredClone(value);
    let replacement='';
    if(field==='decisionInfluence'&&value==='Unterstützung einer menschlichen Tätigkeit')replacement='support';
    else if(allowed.includes('review'))replacement='review';
    migrated.form[field]=replacement;
    const guideId=QUESTION_IDS[field],guideAnswer=guideId&&migrated.guideAnswers?.[guideId];
    if(guideAnswer&&typeof guideAnswer==='object'&&!Array.isArray(guideAnswer)){
      guideAnswer.legacyValue=structuredClone(value);guideAnswer.value=replacement;guideAnswer.sourceField=field;
    }
    reviewRequired=true;
    issues.push(`${guideId||field}: Der Antwortwert „${String(value)}“ aus Datenmodell 14 gehört nicht zum aktuellen Feldkatalog. Der Originalwert wurde unter legacyV14InvalidFormValues erhalten und ${replacement==='review'?'als weiterer Prüfbedarf':'konservativ als offen'} migriert.`);
  });
  if(Object.keys(legacyInvalidFormValues).length)migrated.legacyV14InvalidFormValues={...(migrated.legacyV14InvalidFormValues||{}),...legacyInvalidFormValues};
  migrated.registers.legal.forEach(item=>{
    if(CRA_DECISION_AREAS.includes(item.craDecisionArea))return;
    const classification=classifyCraRegisterItem(item);
    item.craDecisionArea=classification.area;
    item.craDecisionAreaMigrationSource=classification.source;
    if(classification.area==='review'){
      ambiguous=true;reviewRequired=true;
      issues.push(`${item.id||'Juristischer Prüfpunkt'}: Der erkennbare CRA-Bezug konnte keiner Teilentscheidung eindeutig zugeordnet werden. Produktanwendbarkeit, Rolle, Einzelpflicht, Zeitstatus oder Betriebsbedingung sind fachlich zu bestätigen.`);
    }
  });
  if(ambiguous)[3,6,7].forEach(index=>migrated.evaluated[index]=false);
  const at=new Date().toISOString(),notes=[...new Set(issues)];
  migrated.schemaVersion=SCHEMA_VERSION;
  migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at,issues:notes,reviewRequired,auditTrail:[...(saved?.migration?.auditTrail||[]),{from:14,to:15,at,notes}]};
  return migrated;
}

/**
 * Migriert Version 15 auf 16: repariert die in Version 15 inkonsistent
 * gespeicherte CRA-Rollenzusammenfassung und überführt organisatorische
 * Prüfbedarfswerte in den nun gemeinsamen Registerkatalog. Zweifelhafte
 * Originalwerte werden vollständig erhalten und nicht als sichere Auswahl
 * ausgegeben.
 */
function migrateV15ToV16(saved,sourceVersion=15){
  const staged=structuredClone(saved||{}),issues=[...(saved?.migration?.issues||[])],repairs={};
  let reviewRequired=Boolean(saved?.migration?.reviewRequired);
  staged.form=staged.form&&typeof staged.form==='object'&&!Array.isArray(staged.form)?staged.form:{};
  staged.guideAnswers=staged.guideAnswers&&typeof staged.guideAnswers==='object'&&!Array.isArray(staged.guideAnswers)?staged.guideAnswers:{};

  const invalidForm={};
  Object.entries(staged.form).forEach(([field,value])=>{
    const allowed=FORM_ALLOWED_VALUES[field];
    if(!allowed||!isFilled(value)||(typeof value==='string'&&allowed.includes(value)))return;
    invalidForm[field]=structuredClone(value);
    staged.form[field]=allowed.includes('review')?'review':'';
    reviewRequired=true;
    issues.push(`${QUESTION_IDS[field]||field}: Ein nicht skalarer oder unbekannter Auswahlwert aus Datenmodell 15 wurde im Original gesichert und als Prüfbedarf beziehungsweise offen übernommen.`);
  });
  if(Object.keys(invalidForm).length)repairs.invalidFormValues=invalidForm;

  const roleValues=Object.fromEntries(craRoleFields.map(([field])=>[field,staged.form[field]]));
  const hasRoleDetails=CRA_ROLE_SOURCE_FIELDS.some(field=>isFilled(staged.form[field]));
  const legacySummary=staged.form.craRole;
  const legacyAnswer=staged.guideAnswers['CRA-08'];
  const legacyDisplay=legacyAnswer&&typeof legacyAnswer==='object'&&!Array.isArray(legacyAnswer)?legacyAnswer.displayValue||legacyAnswer.value:'';
  if(!hasRoleDetails&&isFilled(legacySummary)){
    const selectedByCode=craRoleFields.filter(([,code])=>legacySummary===code).map(([field])=>field);
    const selectedByLabel=craRoleFields.filter(([, ,label])=>String(legacyDisplay).split(',').map(part=>part.trim()).includes(label)).map(([field])=>field);
    const selected=[...new Set([...selectedByCode,...selectedByLabel])];
    if(legacySummary==='none')CRA_ROLE_SOURCE_FIELDS.forEach(field=>{staged.form[field]='no';});
    else if(selected.length&&legacySummary!=='review')CRA_ROLE_SOURCE_FIELDS.forEach(field=>{staged.form[field]=selected.includes(field)?'yes':'no';});
    else{
      CRA_ROLE_SOURCE_FIELDS.forEach(field=>{staged.form[field]='review';});
      reviewRequired=true;staged.evaluated=Array.from({length:8},(_,index)=>index===3?false:Boolean(staged.evaluated?.[index]));
      issues.push('CRA-08: Die zusammengefasste Altangabe ließ sich nicht eindeutig auf Einzelrollen verteilen; alle Rollen wurden als weiterer Prüfbedarf markiert.');
    }
  }
  const derivedPreview=deriveCraRoleSummary(staged.form);
  const legacySource=legacyAnswer&&typeof legacyAnswer==='object'&&!Array.isArray(legacyAnswer)?legacyAnswer.sourceField:'';
  if(isFilled(legacySummary)||isFilled(legacyDisplay)||isFilled(legacySource)){
    repairs.craRole={formSummary:structuredClone(legacySummary),guideAnswer:structuredClone(legacyAnswer),individualFields:structuredClone(roleValues)};
    if(legacySummary!==derivedPreview.code||legacySource!=='craRole'||(legacyAnswer&&typeof legacyAnswer==='object'&&legacyAnswer.value!==derivedPreview.code))issues.push('CRA-08: Inkonsistente Zusammenfassung, Anzeige und Quellenangabe aus Datenmodell 15 wurden durch die fünf Einzelrollen deterministisch neu abgeleitet; die Originaldarstellung bleibt im Migrationsnachweis erhalten.');
  }

  Object.entries(staged.registers&&typeof staged.registers==='object'&&!Array.isArray(staged.registers)?staged.registers:{}).forEach(([type,list])=>{
    if(!Array.isArray(list))return;
    list.forEach((item,index)=>{
      if(type==='organizational'){
        ['beforeRelease','decisionCritical','blocking'].forEach(field=>{
          if(item?.[field]!=='notAssessable')return;
          repairs.organizationalRegisters??={};repairs.organizationalRegisters[`${index}:${item.id||'ohne-id'}:${field}`]='notAssessable';item[field]='review';reviewRequired=true;
          issues.push(`${item.id||`Organisationsmaßnahme ${index+1}`}: Der frühere Wert „notAssessable“ für ${field} wurde verlustfrei als „review“ überführt.`);
        });
      }
    });
  });

  const migrated=normalizeState(staged);applyCraRoleDerivation(migrated);
  if(Object.keys(repairs).length)migrated.legacyV15TechnicalRepairs={...(migrated.legacyV15TechnicalRepairs||{}),...repairs};
  const at=new Date().toISOString(),notes=[...new Set(issues)];
  migrated.schemaVersion=SCHEMA_VERSION;
  migrated.migration={...(saved?.migration||{}),fromVersion:sourceVersion,at,issues:notes,reviewRequired,auditTrail:[...(saved?.migration?.auditTrail||[]),{from:15,to:16,at,notes}]};
  return migrated;
}

/**
 * Überführt Version 1 zunächst in die Version-3-Struktur. Ursprüngliche Risiken,
 * Organisations- und Triggerdaten werden zusätzlich vollständig unter legacyV1
 * gesichert; wegen der strukturellen Änderung werden alle Prüfschritte neu geöffnet.
 */
function migrateV1ToV3(legacy){
  const staged=normalizeState(legacy||{}),old=legacy?.form||{};
  const map={toolName:'toolName',provider:'provider',version:'version',purpose:'purpose',owner:'owner',department:'department',inputs:'inputs',outputsDescription:'outputsDescription',integration:'integration',sources:'infoSources',euUse:'territorialScope',autonomy:'autonomy',adaptivity:'adaptivity',personalData:'personalData'};
  Object.entries(map).forEach(([oldKey,newKey])=>{if(isFilled(old[oldKey]))staged.form[newKey]=old[oldKey];});
  if(Array.isArray(legacy?.risks))staged.risks=legacy.risks.map((r,i)=>({
    ...structuredClone(r),riskId:r.riskId||r.id?String(r.riskId||r.id):`MIG-${i+1}`,description:r.description||r.name||'',category:r.category||'',probability:isFilled(r.probability)?String(r.probability):'',impact:isFilled(r.impact)?String(r.impact):'',proposedTreatment:r.proposedTreatment||r.measure||'',owner:r.owner||'',legacyOriginal:structuredClone(r)
  }));
  staged.legacyV1={...(staged.legacyV1||{}),originalRisks:structuredClone(legacy?.risks||[]),originalOrg:structuredClone(legacy?.org||{}),originalTriggers:structuredClone(legacy?.triggers||[])};
  const migrated=migrateV2ToV3(staged,1);migrated.migration.reviewRequired=true;migrated.evaluated=Array(8).fill(false);migrated.migration.issues.unshift('Version-1-Daten einschließlich aller ursprünglichen Risikofelder wurden vollständig erhalten; die strukturierte Bewertung ist erneut zu prüfen.');return migrated;
}

/**
 * Führt alle erforderlichen Einzelschritte bis zum aktuellen Schema aus und
 * protokolliert jeden Übergang mit Zeit, Ausgangsversion und neuen Hinweisen.
 * Vor einer frühen Normalisierung werden unbekannte Organisations- und Triggerdaten
 * gesondert erhalten; reviewRequired und Schritt-Reset stammen aus den Teilmigrationen.
 */
function migrateToCurrent(saved,version){
  const sourceVersion=version;let migrated=structuredClone(saved||{});
  const preNormalizationLegacy={};
  if(version<=5){
    const unknownOrg=Object.fromEntries(Object.entries(saved?.org||{}).filter(([id])=>!orgAreas.some(([current])=>current===id)));
    const unknownTriggers=(saved?.triggers||[]).filter(item=>!triggerDefs.some(([id])=>id===item.id));
    if(Object.keys(unknownOrg).length||unknownTriggers.length)preNormalizationLegacy.legacyPreV6={org:structuredClone(unknownOrg),triggers:structuredClone(unknownTriggers)};
  }
  const auditTrail=[...(saved?.migration?.auditTrail||[])];
  const advance=(from,to,migrate)=>{
    const before=new Set(migrated?.migration?.issues||[]),at=new Date().toISOString();
    migrated=migrate(migrated,sourceVersion);
    const notes=(migrated?.migration?.issues||[]).filter(note=>!before.has(note));
    auditTrail.push({from,to,at,notes});
    migrated.migration={...(migrated.migration||{}),auditTrail:[...auditTrail],reviewRequired:Boolean(migrated?.migration?.reviewRequired)};
    version=to;
  };
  if(version===1)advance(1,3,value=>migrateV1ToV3(value));
  if(version===2)advance(2,3,migrateV2ToV3);
  if(version===3)advance(3,4,migrateV3ToV4);
  if(version===4)advance(4,5,migrateV4ToV5);
  if(version===5)advance(5,6,migrateV5ToV6);
  if(version===6)advance(6,7,migrateV6ToV7);
  if(version===7)advance(7,8,migrateV7ToV8);
  if(version===8)advance(8,9,migrateV8ToV9);
  if(version===9)advance(9,10,migrateV9ToV10);
  if(version===10)advance(10,11,migrateV10ToV11);
  if(version===11)advance(11,12,migrateV11ToV12);
  if(version===12)advance(12,13,migrateV12ToV13);
  if(version===13)advance(13,14,migrateV13ToV14);
  if(version===14)advance(14,15,migrateV14ToV15);
  if(version===15)advance(15,16,migrateV15ToV16);
  migrated=normalizeState(migrated);
  if(preNormalizationLegacy.legacyPreV6){migrated.legacyPreV6=preNormalizationLegacy.legacyPreV6;migrated.migration.reviewRequired=true;migrated.evaluated[5]=false;migrated.evaluated[7]=false;migrated.migration.issues=[...new Set([...(migrated.migration.issues||[]),'Nicht eindeutig zuordenbare Organisationsbereiche und Neubewertungsauslöser aus Version 5 oder älter wurden vor der Normalisierung vollständig gesichert.'])];}
  migrated.migration={...(migrated.migration||{}),fromVersion:sourceVersion,auditTrail:[...auditTrail],reviewRequired:Boolean(migrated?.migration?.reviewRequired)};
  return migrated;
}

const FORM_ALLOWED_VALUES=(()=>{
  const rules={},assign=(keys,values)=>keys.forEach(key=>{rules[key]=values;});
  const yesNoReview=['yes','no','review'],yesNoNaReview=['yes','no','na','review'];
  assign([...definitionQuestionKeys.filter(key=>key!=='objectType'),...scopeQuestionKeys,...roleQuestionKeys,...annexAreas.map(([key])=>key),...transparencyQuestions.map(([key])=>key),...gpaiQuestions.map(([key])=>key).filter(key=>key!=='gObjectType'),...['craDigitalProduct','craRemoteProcessing','craDataConnection','craCommercial','craPrototype','craOpenSource','craExclusion','craSubstantialChange','craManufacturerTakeover','craAiActOverlap','timeAssessmentBasis','timeDutyStatuses','timeTransition','timeLawChanged','publicAuthorityIntendedUse','substantialChangeStatus'],...riskDomainKeys,...riskEvaluationKeys],yesNoReview);
  assign(['realWorldTesting','actualOperationalUse','foreseeableMisuse','sensitiveSituation','publicServiceEntity','unionAuthority','art25OwnBrand','art25SubstantialModification','art25PurposeChange','art25ProductIntegration','craRoleManufacturer','craRoleRepresentative','craRoleImporter','craRoleDistributor','craRoleSteward','craPrototypeLimitedTesting','craPrototypeMarked','manualBlockerActive','preservePreviousAssessments','newTechnicalFeature'],yesNoReview);
  assign(prohibitedQuestions.map(([key])=>key),['yes','no','na','review','not_met','possible','confirmed','exception_review','not_applicable']);
  prohibitedQuestions.forEach(([key])=>{
    assign([`${key}ProviderProvision`,`${key}OperatorUse`,`${key}IntendedPurpose`,`${key}ForeseeableReproducible`,`${key}Safeguards`,`${key}Circumventions`,`${key}CorrectiveMeasures`,`${key}Consent`,`${key}LegalJustification`],yesNoNaReview);
    rules[`${key}ElementsResult`]=['not_met','possible','met','review'];rules[`${key}Exception`]=['none','possible','confirmed','review'];rules[`${key}Critical`]=['yes','no'];
  });
  transparencyQuestions.forEach(([key])=>{rules[`${key}Exception`]=yesNoReview;rules[`${key}Result`]=['applicable','exception','not_applicable','review'];rules[`${key}Actor`]=['provider','deployer','obligated'];});
  Object.assign(rules,{
    infoStatus:['complete','partial','missing'],objectType:['system','model','system_with_model','review'],purposeAlignment:['matches','partial','substantial','review'],decisionInfluence:['information','support','recommendation','material','automated','review'],humanReview:['yes','partial','no','review'],humanCorrection:['yes','limited','no','review'],
    prohibitionConclusion:['none','exception','confirmed','review'],productHighRiskConclusion:['no','yes','review'],annexHighRiskConclusion:['no','yes','exception','review'],annexISection:['A','B','review'],art25Conclusion:['provider','not_applicable','review'],transparencyConclusion:['none','provider','deployer','multiple','exception','review'],
    gObjectType:['model','system','integrating','review'],gpaiOrganizationRole:['none','provider','downstream','integrator','unclear'],gpaiConclusion:['none','research_exception','relevant_no_provider','model','integration','systemic','review'],
    craRole:['none',...craRoleFields.map(([,code])=>code),'multiple','review'],craProductClass:['other','class1','class2','critical','none','review'],craProductType:['software','hardware','remote','mixed','unclear'],craProductRelation:['standalone','component','unclear'],craConclusion:['no','product_only','yes','special','review'],
    legalRegimeFulfilment:['clarified','unresolved','review'],planStatus:['complete','partial','blocked'],statutoryRetentionStatus:['determined','review'],approvalStatus:['pending','rejected','conditional','approved']
  });
  ['highRisk','art25','transparency','gpai'].forEach(prefix=>{rules[`${prefix}TemporalStatus`]=temporalStatusOptions.map(([value])=>value);});
  return Object.freeze(rules);
})();

function allowedValueIssue(label,value,allowed){
  if(!isFilled(value))return'';
  if(typeof value!=='string')return`${label} muss einen einzelnen textuellen Antwortcode enthalten.`;
  return allowed.includes(value)?'':`${label} enthält den unbekannten Antwortcode „${value}“.`;
}
function scalarTextIssue(label,value){return isFilled(value)&&typeof value!=='string'?`${label} muss als Text gespeichert sein.`:'';}
function isIsoDateValue(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const[year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

/** Prüft kataloggebundene Formular-, Risiko-, Organisations- und Registerwerte. */
function semanticValueValidation(saved,{strictAnswers=true}={}){
  const issues=[];
  if((strictAnswers||saved?.step!==undefined)&&(!Number.isInteger(saved?.step)||saved.step<0||saved.step>7))issues.push('Der Navigationsschritt muss eine ganze Zahl zwischen 0 und 7 sein.');
  if(saved?.reportVisible!==undefined&&typeof saved.reportVisible!=='boolean')issues.push('Die Berichtsansicht muss als Wahrheitswert gespeichert sein.');
  if(!strictAnswers)return issues;
  Object.entries(FORM_ALLOWED_VALUES).forEach(([key,allowed])=>{const issue=allowedValueIssue(`Formularfeld ${key}`,saved.form?.[key],allowed);if(issue)issues.push(issue);});
  Object.entries(saved.form||{}).forEach(([key,value])=>{
    if(key.startsWith('role_')){if(typeof value!=='boolean')issues.push(`Rollenfeld ${key} muss ein Wahrheitswert sein.`);return;}
    const textIssue=scalarTextIssue(`Formularfeld ${key}`,value);if(textIssue)issues.push(textIssue);
    if(isFilled(value)&&(/(?:Date|Due|Deadline)$/.test(key)||['assessmentDate','assessmentUpdate','intendedUseDate','firstMarketDate','firstOperationDate','transitionDate'].includes(key))&&!isIsoDateValue(value))issues.push(`Datumsfeld ${key} muss das Format JJJJ-MM-TT besitzen.`);
  });
  (Array.isArray(saved.risks)?saved.risks:[]).forEach((risk,index)=>{
    const label=`Risiko ${index+1}`,rules={probability:['1','2','3'],impact:['1','2','3'],controlEffectiveness:['effective','partial','ineffective','unknown'],currentRisk:['low','medium','high','unknown'],uncertainty:['low','medium','high','unknown'],acceptance:['accepted','conditional','notAccepted','open'],treatmentNeeded:['yes','no','review'],decisionCriticality:['yes','no','review'],expertReview:['yes','no','review'],legalReview:['yes','no','review'],suitableTreatmentAvailability:['available','unavailable','review'],treatmentStrategy:['avoid','reduce','transfer','accept'],priority:['low','medium','high'],expectedResidual:['low','medium','high','unknown','pending'],verifiedResidual:['low','medium','high','unknown','pending'],treatmentStatus:['planned','inProgress','implemented','verified']};
    Object.entries(rules).forEach(([key,allowed])=>{const issue=allowedValueIssue(`${label}, ${key}`,risk[key],allowed);if(issue)issues.push(issue);});
    Object.entries(risk).forEach(([key,value])=>{if(['legacyOriginal','inactiveVerifiedResidual'].includes(key)||(key==='migratedFromMatrixV3'&&typeof value==='boolean'))return;const issue=scalarTextIssue(`${label}, ${key}`,value);if(issue)issues.push(issue);});
    ['treatmentDue','effectivenessDate','reviewDue'].forEach(key=>{if(isFilled(risk[key])&&!isIsoDateValue(risk[key]))issues.push(`${label}, ${key} muss das Format JJJJ-MM-TT besitzen.`);});
  });
  Object.entries(saved.org&&typeof saved.org==='object'&&!Array.isArray(saved.org)?saved.org:{}).forEach(([area,item])=>{
    if(!item||typeof item!=='object'||Array.isArray(item)){issues.push(`Organisationsbereich ${area} besitzt einen falschen Grundtyp.`);return;}
    let issue=allowedValueIssue(`Organisationsbereich ${area}, status`,item?.status,orgCriterionOptions.map(([value])=>value));if(issue)issues.push(issue);
    issue=allowedValueIssue(`Organisationsbereich ${area}, transfer`,item?.transfer,['yes','no']);if(issue)issues.push(issue);
    issue=allowedValueIssue(`Organisationsbereich ${area}, decisionCritical`,item?.decisionCritical,['yes','no','notAssessable']);if(issue)issues.push(issue);
    Object.entries(item).forEach(([key,value])=>{if(key==='criteria')return;const textIssue=scalarTextIssue(`Organisationsbereich ${area}, ${key}`,value);if(textIssue)issues.push(textIssue);});
    if(!item.criteria||typeof item.criteria!=='object'||Array.isArray(item.criteria))issues.push(`Organisationsbereich ${area}: Kriterien besitzen einen falschen Typ.`);
    else Object.entries(item.criteria).forEach(([key,criterion])=>{if(!criterion||typeof criterion!=='object'||Array.isArray(criterion)){issues.push(`Organisationskriterium ${key} besitzt einen falschen Grundtyp.`);return;}const criterionIssue=allowedValueIssue(`Organisationskriterium ${key}`,criterion.answer,orgCriterionOptions.map(([value])=>value));if(criterionIssue)issues.push(criterionIssue);const reasonIssue=scalarTextIssue(`Organisationskriterium ${key}, Begründung`,criterion.reason);if(reasonIssue)issues.push(reasonIssue);});
  });
  Object.entries(registerSchemas).forEach(([type,schema])=>(Array.isArray(saved.registers?.[type])?saved.registers[type]:[]).forEach((item,index)=>{
    schema.fields.filter(([, ,fieldType])=>fieldType==='select').forEach(([key,label,,values])=>{const issue=allowedValueIssue(`${schema.title} ${index+1}, ${label}`,item[key],values.map(([value])=>value));if(issue)issues.push(issue);});
    schema.fields.filter(([, ,fieldType])=>fieldType!=='select').forEach(([key,label,fieldType])=>{const textIssue=scalarTextIssue(`${schema.title} ${index+1}, ${label}`,item[key]);if(textIssue)issues.push(textIssue);if(fieldType==='date'&&isFilled(item[key])&&!isIsoDateValue(item[key]))issues.push(`${schema.title} ${index+1}, ${label} muss das Format JJJJ-MM-TT besitzen.`);});
  }));
  (Array.isArray(saved.triggers)?saved.triggers:[]).forEach((trigger,index)=>{const issue=allowedValueIssue(`Neubewertungsauslöser ${index+1}`,trigger.required,['yes','no']);if(issue)issues.push(issue);['id','reason','steps','owner','due'].forEach(key=>{const textIssue=scalarTextIssue(`Neubewertungsauslöser ${index+1}, ${key}`,trigger[key]);if(textIssue)issues.push(textIssue);});if(isFilled(trigger.due)&&!isIsoDateValue(trigger.due))issues.push(`Neubewertungsauslöser ${index+1}, Frist muss das Format JJJJ-MM-TT besitzen.`);});
  if(saved.guideAnswers!==undefined&&(!saved.guideAnswers||typeof saved.guideAnswers!=='object'||Array.isArray(saved.guideAnswers)))issues.push('Leitfadenantworten besitzen einen falschen Typ.');
  else{
    const fieldByGuideId=Object.fromEntries(Object.entries(QUESTION_IDS).map(([field,id])=>[id,field]));
    Object.entries(saved.guideAnswers||{}).forEach(([id,entry])=>{
      if(!entry||typeof entry!=='object'||Array.isArray(entry)){issues.push(`${id}: Die Leitfadenantwort muss ein Objekt mit einem skalaren Wert sein.`);return;}
      const answer=entry,field=fieldByGuideId[id];
      ['value','displayValue','sourceField','reason'].forEach(key=>{const textIssue=scalarTextIssue(`${id}, ${key}`,answer[key]);if(textIssue)issues.push(textIssue);});
      if(answer.sourceFields!==undefined&&(!Array.isArray(answer.sourceFields)||answer.sourceFields.some(value=>typeof value!=='string')))issues.push(`${id}: Die Quellenliste muss ausschließlich Textwerte enthalten.`);
      if(!field)return;
      if(answer.sourceField&&answer.sourceField!==field)issues.push(`${id}: Die gespeicherte Quelle ${answer.sourceField} stimmt nicht mit dem maßgeblichen Formularfeld ${field} überein.`);
      const allowed=FORM_ALLOWED_VALUES[field],invalid=allowed&&allowedValueIssue(`${id}`,answer.value,allowed);if(invalid)issues.push(invalid);
      if(isFilled(saved.form?.[field])&&isFilled(answer.value)&&saved.form[field]!==answer.value)issues.push(`${id}: Formularfeld ${field} und Leitfadenantwort widersprechen sich.`);
    });
  }
  return issues;
}

/**
 * Prüft die tragenden Datentypen eines Speicherstands vor Normalisierung oder Migration.
 * @returns {{valid:boolean,issues:string[]}} Semantisches Prüfergebnis ohne Datenänderung.
 */
function storedStateValidation(saved,expectedVersion,{strictAnswers=expectedVersion===SCHEMA_VERSION}={}){
  const issues=[];
  if(!saved||typeof saved!=='object'||Array.isArray(saved))issues.push('Wurzelobjekt fehlt.');
  if(Number(saved?.schemaVersion)!==expectedVersion)issues.push('Datenmodellversion stimmt nicht mit dem Speicherplatz überein.');
  if(!saved?.form||typeof saved.form!=='object'||Array.isArray(saved.form))issues.push('Formulardaten fehlen oder besitzen einen falschen Typ.');
  if(!Array.isArray(saved?.evaluated)||saved.evaluated.length!==8||saved.evaluated.some(value=>typeof value!=='boolean'))issues.push('Bearbeitungsstatus muss aus acht Wahrheitswerten bestehen.');
  if(!Array.isArray(saved?.risks))issues.push('Risikodaten sind kein Array.');
  else if(saved.risks.some(item=>!item||typeof item!=='object'||Array.isArray(item)))issues.push('Mindestens ein Risikodatensatz besitzt einen falschen Grundtyp.');
  if(!saved?.org||typeof saved.org!=='object'||Array.isArray(saved.org))issues.push('Organisationsdaten fehlen oder besitzen einen falschen Typ.');
  const registerKeys=['regulatory','risk','organizational','expert','legal'];
  if(!saved?.registers||typeof saved.registers!=='object'||Array.isArray(saved.registers)||registerKeys.some(key=>!Array.isArray(saved.registers[key])))issues.push('Die fünf Register sind nicht vollständig als Listen vorhanden.');
  else if(registerKeys.some(key=>saved.registers[key].some(item=>!item||typeof item!=='object'||Array.isArray(item))))issues.push('Mindestens ein Registereintrag besitzt einen falschen Grundtyp.');
  if(!Array.isArray(saved?.triggers))issues.push('Neubewertungsauslöser sind kein Array.');
  else if(saved.triggers.some(item=>!item||typeof item!=='object'||Array.isArray(item)))issues.push('Mindestens ein Neubewertungsauslöser besitzt einen falschen Grundtyp.');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved))issues.push(...semanticValueValidation(saved,{strictAnswers}));
  return{valid:issues.length===0,issues};
}

/* 6. Persistenz, Import und Export */

/** Bewahrt einen nicht lesbaren Rohstand getrennt auf, bevor ein gültiger Altstand übernommen wird. */
function preserveRecoveryRaw(key,raw,reason){
  try{
    let backup={format:'ki-risikobewertung-recovery',capturedAt:new Date().toISOString(),items:[]};
    const previous=localStorage.getItem(RECOVERY_BACKUP_KEY);if(previous){try{const parsed=JSON.parse(previous);if(parsed&&Array.isArray(parsed.items))backup=parsed;}catch{}}
    if(!backup.items.some(item=>item.key===key&&item.raw===raw))backup.items.push({key,reason,capturedAt:new Date().toISOString(),raw});
    localStorage.setItem(RECOVERY_BACKUP_KEY,JSON.stringify(backup));return true;
  }catch{return false;}
}

/**
 * Lädt den jüngsten gültigen lokalen Stand, migriert ältere Versionen und hält
 * übersprungene beschädigte Speicherstände als Wiederherstellungshinweis fest.
 * @returns {object} Normalisierter Bewertungszustand oder ein neuer Ausgangszustand.
 */
function loadState(){
  const slots=[[STORAGE_KEY,16],[LEGACY_V15_KEY,15],[LEGACY_V14_KEY,14],[LEGACY_V13_KEY,13],[LEGACY_V12_KEY,12],[LEGACY_V11_KEY,11],[LEGACY_V10_KEY,10],[LEGACY_V9_KEY,9],[LEGACY_V8_KEY,8],[LEGACY_V7_KEY,7],[LEGACY_V6_KEY,6],[LEGACY_V5_KEY,5],[LEGACY_V4_KEY,4],[LEGACY_V3_KEY,3],[LEGACY_V2_KEY,2],[LEGACY_V1_KEY,1]];
  const recovery=[];
  for(const [key,version] of slots){
    const raw=localStorage.getItem(key);if(raw===null)continue;
    let saved;try{saved=JSON.parse(raw);}catch(error){const reason=`${key}: syntaktisch beschädigt und übersprungen.`;preserveRecoveryRaw(key,raw,reason);recovery.push(reason);continue;}
    const semantic=storedStateValidation(saved,version);if(!semantic.valid){const reason=`${key}: semantisch ungültiger Bewertungsstand (${semantic.issues.join(' ')}).`;preserveRecoveryRaw(key,raw,reason);recovery.push(reason);continue;}
    try{
      const migrated=version===SCHEMA_VERSION?normalizeState(saved):migrateToCurrent(saved,version);
      const currentValidation=storedStateValidation(migrated,SCHEMA_VERSION,{strictAnswers:true});
      if(!currentValidation.valid)throw new Error(currentValidation.issues.join(' '));
      if(recovery.length){const at=new Date().toISOString();migrated.migration={...(migrated.migration||{}),reviewRequired:true,at,issues:[...new Set([...(migrated.migration?.issues||[]),`Speicher-Recovery: ${recovery.join(' ')}`])],auditTrail:[...(migrated.migration?.auditTrail||[]),{from:version,to:SCHEMA_VERSION,at,notes:recovery,recovery:true}]};migrated.evaluated=Array(8).fill(false);}
      if(version!==SCHEMA_VERSION||recovery.length)localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));
      return migrated;
    }catch(error){const reason=`${key}: Migration oder Validierung fehlgeschlagen (${error.message}).`;preserveRecoveryRaw(key,raw,reason);recovery.push(reason);}
  }
  if(recovery.length){const fresh=freshState();fresh.storageRecovery={blocked:true,issues:recovery,backupKey:RECOVERY_BACKUP_KEY};fresh.migration={...fresh.migration,reviewRequired:true,issues:[`Speicher-Recovery erforderlich: ${recovery.join(' ')}`]};return fresh;}
  return freshState();
}

let lastPersistenceError='';

/** Erzeugt und validiert den exakten Zustand, der gespeichert oder exportiert werden darf. */
function preparePersistableState(sourceState){
  if(sourceState?.storageRecovery?.blocked)throw new Error('Ein nicht lesbarer Altstand ist gesichert. Bitte zuerst die Rohsicherung herunterladen, eine gültige Datei importieren oder bewusst neu beginnen.');
  const candidate=normalizeState(structuredClone(sourceState));applyCraRoleDerivation(candidate);synchronizeDerivedRegistersInto(candidate,liveEvaluationReferences());
  const validation=storedStateValidation(candidate,SCHEMA_VERSION,{strictAnswers:true});
  if(!validation.valid)throw new Error(`Der aktuelle Stand wurde nicht gespeichert: ${validation.issues.join(' ')}`);
  return candidate;
}

/**
 * Synchronisiert interaktive Registerableitungen und speichert den vollständigen Live-Zustand lokal.
 * @param {string} [message='Stand gespeichert.'] Rückmeldung für die Speicheranzeige.
 * @returns {boolean} Wahr, wenn der validierte Zustand vollständig gespeichert wurde.
 * @description Datenquelle ist ausschließlich der aktuelle Live-Zustand. Die Funktion verändert Register, lokalen Speicher und Anzeige; sie wird nicht für die nebenwirkungsfreie Berichtserfassung verwendet.
 */
function saveState(message='Stand gespeichert.') {
  const label=document.querySelector('#saveState');
  try{const candidate=preparePersistableState(state),serialized=JSON.stringify(candidate);localStorage.setItem(STORAGE_KEY,serialized);state=candidate;lastPersistenceError='';if(label)label.textContent=message;return true;}
  catch(error){lastPersistenceError=error.message||'Der aktuelle Stand konnte nicht gespeichert werden.';if(label)label.textContent=lastPersistenceError;return false;}
}

/**
 * Erstellt eine unabhängige, versionierte Exportkopie des aktuellen Bewertungsstands.
 * @returns {{format:string,schemaVersion:number,exportedAt:string,versions:object,derivedResults:object,assessment:object}} Exporthülle mit synchronisierter Bewertungskopie, Versionsstand und abgeleiteten Ergebnissen.
 * @description Datenquelle ist derselbe fixierte Stand wie für beide Berichtsarten. Eingaben, manuelle Angaben und historische Register verbleiben unter `assessment`; regelbasierte Ergebnisse werden getrennt ausgewiesen.
 */
function assessmentExportObject(){
  state=preparePersistableState(state);
  const reportData=buildReportData();
  return{
    format:'ki-risikobewertung',schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),
    versions:structuredClone(reportData.versions),
    derivedResults:structuredClone({resultSignature:reportData.resultSignature,decision:reportData.decision,regulatory:reportData.regulatory,reviews:reportData.reviews,duties:reportData.duties,riskLevels:reportData.riskLevels,organizationalOverall:reportData.organizationalOverall}),
    assessment:structuredClone(reportData.snapshotState)
  };
}
/**
 * Serialisiert den versionierten Bewertungsexport als lesbares JSON.
 * @returns {string} Vollständiger JSON-Export.
 * @description Ruft die zustandsverändernde Exportsynchronisierung auf; die Ausgabe dient Datensicherung und Austausch, nicht der PDF-Berichtserzeugung.
 */
function assessmentExportJson(){return JSON.stringify(assessmentExportObject(),null,2);}

/** Erstellt einen vollständig geprüften Importkandidaten ohne Änderung des Live-Zustands. */
function prepareAssessmentImport(text){
  const parsed=JSON.parse(text),candidate=parsed?.assessment||parsed,version=Number(candidate?.schemaVersion||parsed?.schemaVersion);
  if(!Number.isInteger(version)||version<1||version>SCHEMA_VERSION)throw new Error('Die Datenmodellversion der Importdatei wird nicht unterstützt.');
  const rawValidation=storedStateValidation(candidate,version,{strictAnswers:version===SCHEMA_VERSION});
  if(!rawValidation.valid)throw new Error(`Die Importdatei ist unvollständig oder beschädigt: ${rawValidation.issues.join(' ')}`);
  const prepared=version===SCHEMA_VERSION?normalizeState(candidate):migrateToCurrent(candidate,version);
  prepared.reportVisible=false;
  const currentValidation=storedStateValidation(prepared,SCHEMA_VERSION,{strictAnswers:true});
  if(!currentValidation.valid)throw new Error(`Die Importdatei konnte nicht sicher in das aktuelle Datenmodell überführt werden: ${currentValidation.issues.join(' ')}`);
  if(parsed?.derivedResults&&typeof parsed.derivedResults==='object'){
    const recalculated=buildReportData(prepared),importedDecision=parsed.derivedResults.decision?.code||'',recalculatedDecision=recalculated.decision.code,importedSignature=parsed.derivedResults.resultSignature||'';
    const differs=Boolean((importedDecision&&importedDecision!==recalculatedDecision)||(importedSignature&&importedSignature!==recalculated.resultSignature));
    const note=differs?'Importierte Berechnungsergebnisse wurden nicht übernommen; der Eingabestand wurde mit dem aktuellen Regelwerk neu berechnet und weist einen abweichenden Ergebnisstand auf.':'Importierte Berechnungsergebnisse wurden nicht als Tatsachen übernommen; die Neuberechnung mit dem aktuellen Regelwerk ergab denselben dokumentierten Ergebnisstand.';
    prepared.migration={...(prepared.migration||{}),issues:[...new Set([...(prepared.migration?.issues||[]),note])],importedDerivedComparison:{sourceExportedAt:parsed.exportedAt||'',sourceVersions:structuredClone(parsed.versions||{}),sourceResultSignature:importedSignature,sourceDecisionCode:importedDecision,recalculatedWith:structuredClone(KNOWLEDGE_BASE),recalculatedResultSignature:recalculated.resultSignature,recalculatedDecisionCode:recalculatedDecision,differs,comparisonBasis:'Neuberechnung des geprüften Importkandidaten vor dessen Übernahme'}};
  }
  return prepared;
}

/**
 * Validiert und importiert einen Bewertungsstand transaktional. Erst nach
 * erfolgreicher Migration, Katalogprüfung und Neuberechnung wird der gültige
 * Live-Zustand ersetzt; ein vorhandener Berichtssnapshot wird geschlossen.
 */
function importAssessmentJson(text){
  const prepared=prepareAssessmentImport(text),previousState=state,previousReportType=activeReportType,previousReportData=activeReportData,previousTitle=document.title,previousStorage=localStorage.getItem(STORAGE_KEY);
  try{
    state=prepared;activeReportType='compact';activeReportData=null;document.title=APPLICATION_TITLE;
    if(!saveState('Bewertung importiert. Bericht bei Bedarf neu erzeugen.'))throw new Error(lastPersistenceError);renderNavigation();renderStep();
    return structuredClone(state);
  }catch(error){
    state=previousState;activeReportType=previousReportType;activeReportData=previousReportData;document.title=previousTitle;
    if(previousStorage===null)localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY,previousStorage);
    try{renderNavigation();renderStep();}catch{}
    throw error;
  }
}
/**
 * Stellt den aktuellen Bewertungsstand als benannte JSON-Datei zum Herunterladen bereit.
 * @returns {void}
 * @description Verwendet den synchronisierten JSON-Export und löst einen lokalen Browser-Download aus; fachliche Inhalte werden nicht neu bewertet.
 */
function downloadAssessment(){const blob=new Blob([assessmentExportJson()],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`ki-risikobewertung-${state.form.internalToolId||state.form.assessmentId||'bewertung'}.json`;anchor.click();URL.revokeObjectURL(url);}

/** Stellt die getrennt bewahrten, nicht interpretierten Rohdaten zur manuellen Sicherung bereit. */
function downloadRecoveryBackup(){
  const raw=localStorage.getItem(RECOVERY_BACKUP_KEY);if(!raw){const label=document.querySelector('#saveState');if(label)label.textContent='Es liegt kein gesicherter Rohstand vor.';return;}
  const blob=new Blob([raw],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='ki-risikobewertung-rohstand-wiederherstellung.json';anchor.click();URL.revokeObjectURL(url);
}

/** Ersetzt einen Fall und verwirft dabei stets den Snapshot, Titel und Sichtbarkeitsstatus des vorherigen Falls. */
function replaceActiveAssessment(next,message){
  state=normalizeState(next);state.reportVisible=false;activeReportType='compact';activeReportData=null;document.title=APPLICATION_TITLE;
  if(!saveState(message))throw new Error(lastPersistenceError);renderNavigation();renderStep();return structuredClone(state);
}

/**
 * Entfernt alle unterstützten lokalen Speicherstände und startet eine neue Bewertung.
 * @returns {void}
 * @description Verändert den Live-Zustand, den lokalen Speicher, den Dokumenttitel und die sichtbare Oberfläche; vorhandene Exportdateien bleiben unberührt.
 */
function resetAssessment(){[STORAGE_KEY,LEGACY_V15_KEY,LEGACY_V14_KEY,LEGACY_V13_KEY,LEGACY_V12_KEY,LEGACY_V11_KEY,LEGACY_V10_KEY,LEGACY_V9_KEY,LEGACY_V8_KEY,LEGACY_V7_KEY,LEGACY_V6_KEY,LEGACY_V5_KEY,LEGACY_V4_KEY,LEGACY_V3_KEY,LEGACY_V2_KEY,LEGACY_V1_KEY,RECOVERY_BACKUP_KEY].forEach(key=>localStorage.removeItem(key));return replaceActiveAssessment(freshState(),'Neue Bewertung gestartet.');}

/* 7. Allgemeine Darstellungs- und Feldhilfen */

function isFilled(value){return value!==null&&value!==undefined&&(typeof value!=='string'||value.trim().length>0);}
let state = loadState();
const escapeHtml = value => String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const labelFor = value => ({
  yes:'Ja',no:'Nein',na:'Nicht einschlägig',review:'Weiterer Prüfbedarf',complete:'Vollständig',partial:'Teilweise',missing:'Nicht verfügbar',unknown:'Nicht bestimmbar',
  fulfilled:'Erfüllt',notFulfilled:'Nicht erfüllt',notAssessable:'Nicht beurteilbar',current:'Aktuell anwendbar',future:'Künftig anwendbar',not_applicable:'Nicht anwendbar',not_assessable:'Nicht eindeutig beurteilbar / weiterer Prüfbedarf',open:'Offen',
  not_met:'Tatbestand nicht festgestellt',met:'Tatbestand festgestellt',possible:'Potenziell einschlägig / weiterer Prüfbedarf',confirmed:'Tatbestand festgestellt',future_confirmed:'Tatbestand festgestellt – künftig anwendbar',future_prohibition:'Künftige Verbotswirkung',temporally_not_applicable:'Am Bewertungsstichtag nicht anwendbar',exception_confirmed:'Ausnahme oder Rechtfertigung nachgewiesen',exception_review:'Ausnahmeprüfung erforderlich',
  planned:'Geplant',inProgress:'In Umsetzung',implemented:'Umgesetzt',verified:'Wirksamkeit verifiziert',resolved:'Geklärt',inReview:'In Prüfung',
  low:'Niedrig',medium:'Mittel',high:'Hoch',accepted:'Akzeptiert',conditional:'Bedingt',notAccepted:'Nicht akzeptiert',
  pending:'Ausstehend',approved:'Genehmigt',rejected:'Nicht genehmigt','':'Nicht beantwortet'
  ,available:'Geeignete Behandlung verfügbar',unavailable:'Keine geeignete Behandlung bestimmbar',applicable:'Pflicht anwendbar',exception:'Ausnahme dokumentiert',product_only:'Auf das Produkt anwendbar; keine eigene Wirtschaftsakteursrolle',
  clarified:'Ja – eindeutig geklärt',unresolved:'Nein – ungeklärte oder widersprüchliche Pflichterfüllung',
  fulfillable:'Grundsätzlich erfüllbar (Umsetzungsstatus getrennt)',unfulfillable:'Nachweislich nicht erfüllbar',blocking:'Blockierend',non_blocking:'Nicht blockierend',
  sufficient:'Ausreichend',partly_sufficient:'Teilweise ausreichend',insufficient:'Unzureichend',not_conclusive:'Nicht abschließend beurteilbar',
  determined:'Frist und Rechtsgrundlage bestimmt',research_exception:'Forschung, Entwicklung oder Prototyping vor Inverkehrbringen',other:'Sonstiges Produkt',none:'Keine einschlägige Rolle oder Pflicht',class1:'Klasse I',class2:'Klasse II',critical:'Kritisches Produkt',
  provider:'Anbieterpflicht',deployer:'Betreiberpflicht',multiple:'Mehrere Pflichten oder Rollen',not_continued:'Prüfung aufgrund einer festgestellten verbotenen Praxis nicht fortgeführt',not_required:'Nach dem vorangehenden Prüfergebnis nicht erforderlich',
  model:'GPAI-Modell mit Anbieterrolle',relevant_no_provider:'GPAI-Modell betroffen, jedoch keine eigene Anbieterrolle',integration:'GPAI-Integration oder nachgelagerte Rolle ohne Modell-Anbieterpflichten',systemic:'GPAI-Modell mit systemischem Risiko',special:'Ausschluss oder Sonderfall dokumentiert',
  manufacturer:'Hersteller',representative:'Bevollmächtigter',importer:'Einführer',distributor:'Händler',steward:'Open-Source-Software-Steward',downstream:'Nachgelagerter Anbieter',integrator:'Integrator',unclear:'Nicht eindeutig beurteilbar',
  blocker:'Festgestelltes Hindernis',uncertainty:'Offene Bewertung',mandatory:'Zwingende offene Maßnahme',condition:'Mögliche Auflage',contradiction:'Widerspruch',warning:'Hinweis',information:'Information',
  ASSESSMENT_COMPLETE:'Bewertung abgeschlossen',ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES:'Bewertung abgeschlossen mit offenen Maßnahmen',ASSESSMENT_NOT_CONCLUDABLE:'Bewertung nicht abschließbar',USE_NOT_CONTINUABLE:'Vorgesehene Verwendung aufgrund eines festgestellten Hindernisses nicht fortführbar',
  product_only:'Auf das Produkt anwendbar; keine eigene Wirtschaftsakteursrolle',
  ai_system_in_scope:'KI-System im Anwendungsbereich',ai_system_special:'KI-System mit Sonderregelung',scope_not_open:'Anwendungsbereich nicht eröffnet',not_ai_system:'Kein KI-System'
}[value]||value||'Nicht beantwortet');
const QUESTION_VALUE_LABELS=Object.freeze({
  'DEF-15':Object.freeze({system:'KI-System',model:'KI-Modell beziehungsweise Komponente',system_with_model:'KI-System unter Verwendung eines KI-Modells',review:'Weiterer Prüfbedarf'}),
  'CTX-02':Object.freeze({matches:'Entspricht der Zweckbestimmung',partial:'Teilweise abweichend',substantial:'Wesentlich abweichend',review:'Weiterer Prüfbedarf'}),
  'CTX-06':Object.freeze({information:'Reine Informationsbereitstellung',support:'Unterstützung einer menschlichen Tätigkeit',recommendation:'Empfehlung für eine Entscheidung',material:'Wesentliche Entscheidungsgrundlage',automated:'Weitgehend automatisierte Entscheidung',review:'Weiterer Prüfbedarf'}),
  'CTX-08':Object.freeze({yes:'Ja – Korrektur, Zurückweisung oder Übersteuerung möglich',limited:'Nur eingeschränkt möglich',no:'Nein',review:'Weiterer Prüfbedarf'}),
  'HR-03':Object.freeze({A:'Anhang I Abschnitt A',B:'Anhang I Abschnitt B',review:'Weiterer Prüfbedarf'}),
  'GPAI-04':Object.freeze({model:'GPAI-Modell',system:'GPAI-System',integrating:'Integrierendes System',review:'Weiterer Prüfbedarf'}),
  'CRA-11':Object.freeze({other:'Sonstiges Produkt mit digitalen Elementen',class1:'Wichtiges Produkt mit digitalen Elementen der Klasse I',class2:'Wichtiges Produkt mit digitalen Elementen der Klasse II',critical:'Kritisches Produkt mit digitalen Elementen',none:'Keine Produktklasse einschlägig',review:'Weiterer Prüfbedarf'})
});
function questionValueLabel(id,value,context=null){
  if(!isFilled(value))return'Offen und erforderlich';
  return evaluationReferences(context).questionValueLabels[id]?.[value]||labelFor(value);
}
const FIELD_DISPLAY_LABELS=Object.freeze({
  sourceQuestionId:'Herkunft oder auslösende Prüffrage',linkedResult:'Verknüpftes Bewertungsergebnis',internalToolId:'Interne Tool-Kennung',assessmentUpdateReason:'Grund und Umfang der späteren Aktualisierung',guideVersion:'Verwendete Leitfadenfassung',publicAuthorityIntendedUse:'Bestimmung zur Verwendung durch eine Behörde oder öffentliche Stelle',scopeLimitationOwner:'Verantwortliche Stelle für die Klärung des begrenzten Pflichtenumfangs',scopeLimitationDue:'Frist zur Klärung des begrenzten Pflichtenumfangs',documentLocation:'Ablageort',accessRights:'Zugriffsrechte',statutoryRetentionStatus:'Status der gesetzlichen Aufbewahrungsfrist',statutoryRetentionBasis:'Gesetzliche Aufbewahrungsfrist und Rechtsgrundlage',internalRetentionPeriod:'Interne Aufbewahrungsfrist',preservePreviousAssessments:'Erhaltung früherer Bewertungsstände',evidenceInventory:'Verzeichnis entscheidungsrelevanter Nachweise',evidenceInventoryVersion:'Version des Nachweisverzeichnisses',evidenceInventoryDate:'Stand des Nachweisverzeichnisses',evidenceInventoryLocation:'Fundstelle des Nachweisverzeichnisses',legalSources:'Verwendete Rechtsquellen und Fundstellen',actualOperationalUse:'Tatsächlicher betrieblicher Einsatz',productCovered:'Produkt nach Anhang I',productSafetyComponent:'Sicherheitsbauteil eines Produkts nach Anhang I',thirdPartyConformity:'Konformitätsbewertung durch unabhängige Stelle',conformityNonSafetyOnly:'Konformitätsbewertung ohne Sicherheitsbezug',manualBlockerActive:'Zusätzlicher entscheidungsbezogener Prüfbedarf',manualBlockerReason:'Begründung des zusätzlichen Prüfbedarfs',timeBasis:'Begründung der zeitlichen Einordnung',timeEvidence:'Nachweise zu Stichtagen und Übergangsregeln',craTransitionDates:'CRA-Übergangs- und Anwendungszeitpunkte',craFirstMarketDate:'Datum des erstmaligen Inverkehrbringens',craPost2027SubstantialChange:'Wesentliche Änderung ab 11. Dezember 2027',craPost2027ChangeDate:'Datum der wesentlichen Änderung',craTransitionEvidence:'Nachweis zur CRA-Übergangsregel',art25SupplierRelationship:'Lieferketten- oder Vertragsbeziehung zu Zulieferern',art25SupplierEvidence:'Nachweis der Zuliefererbeziehung',intendedUseDate:'Vorgesehener Nutzungsbeginn',assessmentId:'Bewertungs-ID',assessmentVersion:'Bewertungsversion',changeHistory:'Änderungshistorie',documentationOwner:'Dokumentationsverantwortung',reviewer:'Prüfende Stelle',approver:'Entscheidende Stelle',overallReasoning:'Zusammenfassende Begründung',nextReviewDate:'Nächster Reviewtermin',reviewFrequency:'Regelmäßige Reviewfrequenz',reviewEvidence:'Nachweise des Reviews',approvalStatus:'Gesonderte Entscheidung',approvalDate:'Entscheidungsdatum',planCoordinator:'Koordination des Maßnahmenplans',planStatus:'Status des Maßnahmenplans',newTechnicalFeature:'Neue technische Eigenschaft',newTechnicalFeatureReason:'Begründung der technischen Änderung',legalRegimeFulfilment:'Pflichterfüllung und Zusammenwirken der Rechtsregime',legalRegimeFulfilmentEvidence:'Begründung und Nachweis zu den Rechtsregimen',treatmentStrategy:'Behandlungsstrategie',proposedTreatment:'Konkrete Risikobehandlung',treatmentDue:'Termin der Risikobehandlung',expectedResidual:'Erwartetes Restrisiko',treatmentStatus:'Status der Risikobehandlung',effectivenessCriterion:'Wirksamkeitskriterium',effectivenessEvidence:'Wirksamkeitsnachweis',effectivenessDate:'Datum der Wirksamkeitsprüfung',effectivenessReviewer:'Prüfende Stelle der Wirksamkeit',verifiedResidual:'Verifiziertes Restrisiko',acceptanceReason:'Begründung der Risikoakzeptanz',riskOwner:'Risikoverantwortung',acceptanceApproval:'Dokumentierte menschliche Entscheidung',reviewReason:'Grund des Prüfbedarfs',reviewOwner:'Zuständige Stelle des Prüfbedarfs',reviewDue:'Frist des Prüfbedarfs',criticalAcceptanceReason:'Besondere Begründung der Akzeptanz',suitableTreatmentAvailability:'Bestimmbarkeit einer geeigneten Behandlung',treatmentAvailabilityReason:'Begründung zur Behandlungsmöglichkeit',decisionCriticality:'Entscheidungskritikalität',blockingReason:'Begründung der Blockierungswirkung',ruleBlockingReason:'Regelbasierte Begründung der Blockierungswirkung',fulfillabilityReason:'Begründung der Erfüllbarkeit',applicabilityReason:'Begründung des Zeitstatus',applicableDate:'Anwendbar ab',obligatedRole:'Verpflichtete Rolle'
});

/**
 * Bündelt die aktuellen fachlichen Referenztabellen für interaktive Auswertungen.
 * @returns {object} Nicht kopierte Referenzsicht des laufenden Prototyps.
 * @description Liest ausschließlich die global gepflegten Referenztabellen und verändert sie nicht. Berichtssnapshots verwenden stattdessen eine tiefe, eingefrorene Kopie.
 */
function liveEvaluationReferences(){return{knowledgeBase:KNOWLEDGE_BASE,guideReference:GUIDE_REFERENCE,guideReferenceIds:GUIDE_REFERENCE_IDS,steps,orgAreas,orgCriteria,triggerDefs,registerSchemas,regulatoryPathLabels,guideLabels:Object.fromEntries(GUIDE_REFERENCE.map(item=>[item.id,item.label])),questionIds:QUESTION_IDS,prohibitedQuestions,questionValueLabels:QUESTION_VALUE_LABELS,fieldDisplayLabels:FIELD_DISPLAY_LABELS,roles,highRiskDutyCatalog,scopeQuestionKeys,definitionQuestionKeys,contextDescriptionKeys,contextChoiceKeys,roleQuestionKeys,step1Required,step1Optional,step2Questions,step3Questions,riskContextKeys,riskDomainKeys,riskEvaluationKeys,gpaiQuestions,annexAreas,transparencyQuestions,transparencyActorByKey,craRoleFields,regulatoryOrgRules:REGULATORY_ORG_RULES,dutyImplementationPaths:DUTY_IMPLEMENTATION_PATHS,reviewImplementationPaths:REVIEW_IMPLEMENTATION_PATHS,dutyImplementationIds:Object.keys(DUTY_IMPLEMENTATION_RULES),reviewImplementationIds:Object.keys(REVIEW_IMPLEMENTATION_RULES),fieldByGuideId:FIELD_BY_GUIDE_ID};}

/**
 * Erzeugt einen expliziten Evaluationskontext aus Zustand und Referenzen.
 * @param {object} contextState Zu bewertender Zustand.
 * @param {object} [references=liveEvaluationReferences()] Fachliche Referenzen für genau diese Bewertung.
 * @returns {{state:object,references:object}} Kontext für alle transitiven Fachauswertungen.
 * @description Die Funktion ist nebenwirkungsfrei und kopiert den Zustand nicht. Der Aufrufer bestimmt, ob Live-Daten oder eine private Berichtskopie verwendet werden.
 */
function createEvaluationContext(contextState,references=liveEvaluationReferences()){if(!contextState||!references)throw new Error('Für die Auswertung fehlen Zustand oder Referenzen.');return{state:contextState,references};}

/**
 * Liefert den Zustand eines expliziten Evaluationskontexts.
 * @param {{state:object,references:object}|null} context Optionaler Fachkontext.
 * @returns {object} Kontextzustand oder, nur für interaktive Aufrufe ohne Kontext, der Live-Zustand.
 * @description Die Funktion ist nebenwirkungsfrei. Berichtsauswertungen übergeben immer einen privaten Kontext und verwenden dadurch niemals den Fallback.
 */
function evaluationState(context){return context?.state||state;}
/**
 * Liefert die Referenzen eines expliziten Evaluationskontexts.
 * @param {{state:object,references:object}|null} context Optionaler Fachkontext.
 * @returns {object} Kontextreferenzen oder, nur für interaktive Aufrufe ohne Kontext, die Live-Referenzen.
 * @description Die Funktion ist nebenwirkungsfrei. Berichtsauswertungen übergeben immer die mit dem Snapshot erfassten Referenzen.
 */
function evaluationReferences(context){return context?.references||liveEvaluationReferences();}
function displayFieldName(key,context=null){
  const references=evaluationReferences(context);
  const value=String(key??'').trim();if(!value)return'Nicht bezeichnete Angabe';
  const direct=references.fieldDisplayLabels[value];if(direct)return direct;
  const guideId=references.questionIds[value];if(guideId)return`${guideId} – ${guideLabel(guideId,context)}`;
  const registerLabel=Object.values(references.registerSchemas||{}).flatMap(schema=>schema.fields||[]).find(([field])=>field===value)?.[1];if(registerLabel)return registerLabel;
  return value.replace(/([a-zäöüß])([A-ZÄÖÜ])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/^./,char=>char.toUpperCase());
}
function sanitizeVisibleText(value,context=null){
  const references=evaluationReferences(context);
  let text=String(value??'');
  const technical={requiredHighRiskDuties:'Regulatorische Pflichtenableitung',evaluateDutyOperationalResult:'Bewertungslogik der Pflichten',reviewOperationalResult:'Bewertungslogik der Review-Ergebnisse',sourceQuestionId:references.fieldDisplayLabels.sourceQuestionId,linkedResult:references.fieldDisplayLabels.linkedResult,system_with_model:'KI-System unter Verwendung eines KI-Modells',matches:'Entspricht der Zweckbestimmung',substantial:'Wesentlich abweichend',automated:'Weitgehend automatisierte Entscheidung',limited:'Nur eingeschränkt möglich',integrating:'Integrierendes System'};
  Object.entries({...references.fieldDisplayLabels,...technical}).sort((a,b)=>b[0].length-a[0].length).forEach(([key,label])=>{text=text.replace(new RegExp(`\\b${key}\\b`,'g'),label);});
  ['ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','ASSESSMENT_NOT_CONCLUDABLE','USE_NOT_CONTINUABLE','ASSESSMENT_COMPLETE','temporally_not_applicable','future_prohibition','future_confirmed','exception_confirmed','exception_review','not_continued','not_applicable','not_assessable','product_only','notFulfilled','inReview','not_met','possible','confirmed','provider','deployer','multiple','none'].forEach(code=>{text=text.replace(new RegExp(`\\b${code}\\b`,'g'),labelFor(code));});
  return text.replace(/\b[a-z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+\b/g,token=>displayFieldName(token,context));
}
function operationalPathLabel(id){
  const number=Number(String(id).slice(-2));
  if(String(id).startsWith('DUTY-'))return number<=36?'Regulatorische Pflichtenableitung und Anforderungsregister':number===37?'Bewertungslogik der Risikotoleranz':number===38?'Prüfung der Informationslage':number===39?'Prüfung offener Pflichten und Schutzgruppen':number===40?'Prüfung der Risikoakzeptanz':number===41?'Prüfung entscheidungsrelevanter Informationen und Widersprüche':number===42?'Regulatorischer Prüfbedarf':number===43?'Rechtsausnahme oder Grenzfall':number===44?'Prüfung der Risikobewertbarkeit':number===45?'Zusammenführung von Rolle und Nutzung':number===46?'Bewertung neuer technischer Eigenschaften':'Prüfung der Pflichterfüllung und des Zusammenwirkens der Rechtsregime';
  return number<=12?'Zusammenführung der entscheidungsrelevanten Review-Ergebnisse':number<=21?'Dokumentations- und Nachvollziehbarkeitsprüfung':number<=28?'Prüfung der Neubewertungsauslöser':'Zusammenführung des Bewertungsprofils';
}
const orgStatusLabel = value => ({fulfilled:'Erfüllt',partial:'Teilweise erfüllt',notFulfilled:'Nicht erfüllt',na:'Nicht einschlägig',notAssessable:'Nicht beurteilbar'}[value]||labelFor(value));
const fmtDate = value => {
  if(!value)return'Nicht festgelegt';
  const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value);
  return Number.isNaN(parsed.getTime())?String(value):new Intl.DateTimeFormat('de-DE').format(parsed);
};
/* 8. Zeitliche Anwendbarkeit */

/** Bestimmt den Zeitstatus aus belegtem Geltungs- und Bewertungsdatum. */
function applicabilityAt(effectiveDate,assessmentDate){if(!effectiveDate||!assessmentDate)return'not_assessable';return assessmentDate>=effectiveDate?'current':'future';}

function questionIdFor(key,context=null){
  return evaluationReferences(context).questionIds[key]||'';
}
function questionIdMarkup(key){const id=questionIdFor(key);return id?`<small class="question-id">${escapeHtml(id)}</small>`:'';}
function migrationNotice(){
  const migration=state.migration||{},issues=migration.issues||[];if(!issues.length)return'';
  return `<div class="validation-alert migration-notice"><strong>Datenmigration aus Version ${escapeHtml(migration.fromVersion)}</strong><p>${migration.reviewRequired?'Mindestens ein Wert konnte nicht eindeutig zugeordnet werden. Erneute Prüfung erforderlich.':'Die übernommenen Werte wurden nachvollziehbar auf das aktuelle Datenmodell übertragen.'}</p><ul>${issues.map(issue=>`<li>${escapeHtml(issue)}</li>`).join('')}</ul></div>`;
}

function hField(label,key,options={}) {
  const guideId=options.guideId||questionIdFor(key),stored=guideId?state.guideAnswers?.[guideId]?.value:undefined;
  if(guideId&&GUIDE_REFERENCE_BY_ID[guideId])label=guideLabel(guideId);const effectiveHint=options.hint||(guideId?guideHint(guideId):'');
  const value=state.form[key]??stored??''; const required=options.required?' <span class="required-mark" aria-hidden="true">*</span>':''; const hint=effectiveHint?`<small>${escapeHtml(effectiveHint)}</small>`:''; const cls=options.full?'full':'';const id=guideId?`<small class="question-id">${escapeHtml(guideId)}</small>`:'';const guideAttr=guideId?` data-guide-id="${escapeHtml(guideId)}"`:'';
  if(options.type==='textarea') return `<label class="${cls}">${id}<span>${escapeHtml(label)}${required}</span>${hint}<textarea data-field="${key}"${guideAttr} placeholder="${escapeHtml(options.placeholder||'')}">${escapeHtml(value)}</textarea></label>`;
  if(options.type==='select') return `<label class="${cls}">${id}<span>${escapeHtml(label)}${required}</span>${hint}<select data-field="${key}"${guideAttr}><option value="">Bitte auswählen</option>${(options.values||[]).map(([v,t])=>`<option value="${escapeHtml(v)}" ${value===v?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></label>`;
  return `<label class="${cls}">${id}<span>${escapeHtml(label)}${required}</span>${hint}<input data-field="${key}"${guideAttr} type="${options.type||'text'}" value="${escapeHtml(value)}" placeholder="${escapeHtml(options.placeholder||'')}"></label>`;
}

function conditionalFollowUp(key) {
  const value=state.form[key];
  if(value==='na') return `<div class="conditional-fields"><p>„Nicht einschlägig“ muss begründet werden.</p>${hField('Begründung',`${key}Reason`,{required:true,type:'textarea',full:true})}</div>`;
  if(value==='review') return `<div class="conditional-fields"><p>Der weitere Prüfbedarf wird als eigener offener Punkt geführt.</p><div class="field-grid">${hField('Grund / offene Frage',`${key}Reason`,{required:true,type:'textarea',full:true})}${hField('Verantwortliche Stelle',`${key}ReviewOwner`,{required:true})}</div></div>`;
  return '';
}

function hQuestion(key,label,hint='',options=choiceOptions) {
  const guideId=questionIdFor(key),value=state.form[key]??state.guideAnswers?.[guideId]?.value??'';
  return `<div class="question" data-question="${key}" ${guideId?`data-guide-id="${escapeHtml(guideId)}"`:''}><div class="question-copy">${questionIdMarkup(key)}<strong>${escapeHtml(label)} <span class="required-mark">*</span></strong>${hint?`<small>${escapeHtml(hint)}</small>`:''}</div><div class="choice-group" role="radiogroup" aria-label="${escapeHtml(label)}">${options.map(([v,t])=>`<button type="button" data-answer="${v}" class="${value===v?'selected':''}" aria-pressed="${value===v}">${escapeHtml(t)}</button>`).join('')}</div></div>${conditionalFollowUp(key)}`;
}

function fieldGrid(content){return `<div class="field-grid">${content}</div>`;}
function intro(text){return `<p class="intro">${text}</p>`;}
function requiredNote(){return '<p class="required-note"><span>*</span> Pflichtfeld. „Bitte auswählen“ gilt nicht als Antwort.</p>';}
function sectionTitle(title,subtitle=''){return `<div class="section-heading"><h2>${escapeHtml(title)}</h2>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:''}</div>`;}
function resultLine(label,value,tone=''){return `<div class="result-line ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;}
function details(title,body,open=false,result=''){return `<details class="assessment-path" ${open?'open':''}><summary><span>${escapeHtml(title)}</span>${result?`<strong>${escapeHtml(result)}</strong>`:''}</summary><div class="path-body">${body}</div></details>`;}

function dynamicReasonsFor(keys,context=null){const state=evaluationState(context),required=[];keys.forEach(key=>{if(state.form[key]==='na')required.push(`${key}Reason`);if(state.form[key]==='review')required.push(`${key}Reason`,`${key}ReviewOwner`);});return required;}
function roleLabels(context=null){const state=evaluationState(context),roles=evaluationReferences(context).roles;return roles.filter(([id])=>state.form[`role_${id}`]).map(([,label])=>label);}
function temporalFields(prefix,title){
  const status=state.form[`${prefix}TemporalStatus`]||'';
  return sectionTitle(title,'Der Zeitstatus wird bezogen auf den Bewertungsstichtag dokumentiert. Ohne belastbare Grundlage wird Prüfbedarf ausgewiesen.')+fieldGrid(
    hField('Zeitlicher Anwendungsstatus',`${prefix}TemporalStatus`,{required:true,type:'select',values:temporalStatusOptions})+
    (['current','future'].includes(status)?hField('Maßgebliches Anwendungsdatum (soweit belegt)',`${prefix}ApplicableDate`,{type:'date'}):'')+
    hField('Begründung des Zeitstatus',`${prefix}TemporalReason`,{required:true,type:'textarea',full:true})
  );
}
function temporalRequirements(prefix,context=null){const state=evaluationState(context),required=[`${prefix}TemporalStatus`,`${prefix}TemporalReason`];if(state.form[`${prefix}TemporalStatus`]==='future')required.push(`${prefix}ApplicableDate`);return required;}

/** Liest eine begründete manuelle Zeitfestlegung eines Regelungspfads. */
function temporalMeta(prefix,context=null){const state=evaluationState(context);return{applicability:state.form[`${prefix}TemporalStatus`]||'not_assessable',applicableDate:state.form[`${prefix}ApplicableDate`]||'',applicabilityReason:state.form[`${prefix}TemporalReason`]||'Zeitliche Anwendbarkeit wurde nicht eindeutig belegt.'};}

/** Leitet den Zeitstatus eines fest belegten Stichtags am Bewertungsdatum ab. */
function fixedTemporalMeta(date,description,context=null){const state=evaluationState(context),status=applicabilityAt(date,state.form.assessmentDate);return{applicability:status,applicableDate:date,applicabilityReason:status==='current'?`${description} Der belegte Anwendungsstichtag liegt am oder vor dem Bewertungsstichtag.`:status==='future'?`${description} Der belegte Anwendungsstichtag liegt nach dem Bewertungsstichtag.`:`${description} Ohne Bewertungsstichtag ist der Zeitstatus nicht eindeutig beurteilbar.`};}
/**
 * Vergleicht eine berechnete Frist mit der dokumentierten Einzelfallfestlegung.
 * Ein Widerspruch wird nicht überschrieben, sondern als nicht beurteilbarer Zeitstatus ausgewiesen.
 */
function reconcileTemporalMeta(calculated,prefix,subject,context=null){
  const state=evaluationState(context);
  const manualStatus=state.form[`${prefix}TemporalStatus`],manualDate=state.form[`${prefix}ApplicableDate`]||'',manualReason=state.form[`${prefix}TemporalReason`]||'';
  const evidence=[state.form.timeBasis,state.form.timeEvidence].filter(isFilled).join(' ');
  if(!isFilled(manualStatus)||!isFilled(manualReason))return{...calculated,applicability:'not_assessable',applicabilityReason:`${calculated.applicabilityReason} ${subject}: Der dokumentierte manuelle Zeitstatus und seine Begründung fehlen; weiterer Prüfbedarf.`.trim(),calculatedApplicability:calculated.applicability,manualApplicability:manualStatus||''};
  if(manualStatus==='not_assessable')return{...calculated,applicability:'not_assessable',applicabilityReason:`${calculated.applicabilityReason} ${subject}: Der manuelle Zeitstatus lautet „nicht eindeutig beurteilbar“. ${manualReason} ${evidence}`.trim(),calculatedApplicability:calculated.applicability,manualApplicability:manualStatus};
  if(manualStatus==='not_applicable'){
    const supported=state.form.timeTransition==='yes'&&isFilled(state.form.timeBasis)&&isFilled(state.form.timeEvidence);
    return supported?{...calculated,applicability:'not_applicable',applicableDate:manualDate||calculated.applicableDate,applicabilityReason:`${subject}: Eine dokumentierte Übergangsregel führt zur Nichtanwendbarkeit im konkreten Fall. ${manualReason} ${evidence}`.trim(),calculatedApplicability:calculated.applicability,manualApplicability:manualStatus}:{...calculated,applicability:'not_assessable',applicabilityReason:`${calculated.applicabilityReason} ${subject}: Die manuell eingetragene Nichtanwendbarkeit ist nicht durch eine belegte Übergangsregel getragen. ${manualReason}`.trim(),calculatedApplicability:calculated.applicability,manualApplicability:manualStatus};
  }
  if(calculated.applicability==='not_assessable')return{...calculated,applicability:'not_assessable',applicabilityReason:`${calculated.applicabilityReason} ${subject}: Der manuelle Status „${labelFor(manualStatus)}“ kann die fehlende rechtliche oder tatsächliche Grundlage nicht ersetzen. ${manualReason}`.trim(),calculatedApplicability:calculated.applicability,manualApplicability:manualStatus};
  const dateConflict=isFilled(manualDate)&&isFilled(calculated.applicableDate)&&manualDate!==calculated.applicableDate;
  if(manualStatus!==calculated.applicability||dateConflict)return{...calculated,applicability:'not_assessable',applicabilityReason:`${subject}: Berechneter Zeitstatus „${labelFor(calculated.applicability)}“ ab ${fmtDate(calculated.applicableDate)} widerspricht dem manuell dokumentierten Status „${labelFor(manualStatus)}“${manualDate?` ab ${fmtDate(manualDate)}`:''}. ${manualReason} Weiterer Prüfbedarf.`,calculatedApplicability:calculated.applicability,manualApplicability:manualStatus};
  return{...calculated,applicableDate:manualDate||calculated.applicableDate,applicabilityReason:`${calculated.applicabilityReason} Manuelle Bestätigung: ${manualReason} ${evidence}`.trim(),calculatedApplicability:calculated.applicability,manualApplicability:manualStatus};
}
/** Fasst mehrere Teilpflichten zusammen; der strengste offene Zeitstatus dominiert. */
function combineTemporalPaths(paths,description=''){
  const valid=paths.filter(Boolean);if(!valid.length)return{applicability:'not_assessable',applicableDate:'',applicabilityReason:'Kein einschlägiger Zeitpfad konnte sicher bestimmt werden.',temporalPaths:[]};
  if(valid.some(path=>path.applicability==='not_assessable'))return{applicability:'not_assessable',applicableDate:'',applicabilityReason:[description,...valid.map(path=>path.applicabilityReason)].filter(Boolean).join(' '),temporalPaths:valid,transitionCase:valid.length===1?valid[0].transitionCase:'multiple_paths',firstRelevantDate:valid.length===1?valid[0].firstRelevantDate:''};
  const dates=valid.map(path=>path.applicableDate).filter(Boolean).sort(),status=valid.some(path=>path.applicability==='current')?'current':'future';
  return{applicability:status,applicableDate:dates[0]||'',applicabilityReason:[description,...valid.map(path=>path.applicabilityReason)].filter(Boolean).join(' '),temporalPaths:valid,transitionCase:valid.length===1?valid[0].transitionCase:'multiple_paths',firstRelevantDate:valid.length===1?valid[0].firstRelevantDate:''};
}
/** Berücksichtigt Übergangsangaben, ohne den belegten gesetzlichen Stichtag zu ersetzen. */
function transitionAwareTemporal(meta,subject,context=null){
  const state=evaluationState(context);
  const transition=state.form.timeTransition,lawChange=state.form.timeLawChanged;
  if(transition==='review'||['yes','review'].includes(lawChange))return{...meta,applicability:'not_assessable',applicabilityReason:`${subject}: Eine dokumentierte Übergangs- oder Änderungsfrage ist fallbezogen zu klären. Der allgemeine Stichtag bleibt ${meta.applicableDate?fmtDate(meta.applicableDate):'dokumentiert'}, wird aber nicht als abschließende Einzelfallentscheidung verwendet.${subject==='Hochrisiko-KI-System'?' Der 2. August 2030 ist ausschließlich ein besonderer Übergangsfall für bestimmte bestehende Systeme öffentlicher Stellen und kein allgemeiner Geltungsbeginn.':''} ${state.form.timeBasis||''} ${state.form.timeEvidence||''}`.trim()};
  return meta;
}
/**
 * Prüft den eng begrenzten Übergangsfall für bestehende Hochrisiko-Systeme
 * öffentlicher Stellen. Der 2. August 2030 ist ausdrücklich kein allgemeiner Geltungsbeginn.
 */
function publicAuthorityHighRiskTransition(genericDate,path,context=null){
  const state=evaluationState(context);
  const f=state.form,firstUse=f.firstOperationDate||f.firstMarketDate||'';
  const publicDeployer=Boolean(f.role_deployer)&&(f.publicServiceEntity==='yes'||f.unionAuthority==='yes');
  if(!publicDeployer)return{applicable:false,review:false,firstUse,reason:`${path}: Die Organisation ist nicht als Betreiber mit dokumentiertem Behörden- oder Stellenbezug eingeordnet; die Sonderfrist bis 2. August 2030 wird nicht aktiviert.`};
  if(!isFilled(f.publicAuthorityIntendedUse)||f.publicAuthorityIntendedUse==='review')return{applicable:false,review:true,firstUse,reason:`${path}: Ob das Hochrisiko-KI-System zur Verwendung durch eine Behörde oder öffentliche Stelle bestimmt ist, ist nicht abschließend dokumentiert. Die Sonderfrist bis 2. August 2030 darf deshalb weder angenommen noch ausgeschlossen werden.`};
  if(f.publicAuthorityIntendedUse!=='yes')return{applicable:false,review:false,firstUse,reason:`${path}: Das System ist nicht zur Verwendung durch eine Behörde oder öffentliche Stelle bestimmt; die Sonderfrist bis 2. August 2030 ist nicht einschlägig.`};
  if(!isFilled(firstUse)||!isFilled(f.timeEvidence))return{applicable:false,review:true,firstUse,reason:`${path}: Die Behördenbestimmung ist bejaht, aber Altbestand oder Nachweis zum erstmaligen Einsatz beziehungsweise Inverkehrbringen ist nicht hinreichend belegt. Die Sonderfrist bis 2. August 2030 ist nicht abschließend beurteilbar.`};
  if(firstUse>=genericDate)return{applicable:false,review:false,firstUse,reason:`${path}: Das belegte Erstverwendungsdatum liegt nicht vor dem allgemeinen Stichtag; die Altbestands-Sonderfrist bis 2. August 2030 wird nicht aktiviert.`};
  return{applicable:true,review:false,firstUse,reason:`${path}: Betreiberrolle, Behörden- oder Stellenbezug, ausdrückliche Bestimmung zur Verwendung durch eine Behörde oder öffentliche Stelle sowie Altbestand vor dem allgemeinen Stichtag sind dokumentiert und nachgewiesen.`};
}
/** Ordnet Hochrisikopflichten den getrennten Fristen für Anhang I und Anhang III zu. */
function highRiskTemporalMeta(context=null){
  const references=evaluationReferences(context),KNOWLEDGE_BASE=references.knowledgeBase,e=allRegulatoryEvaluations(context),paths=[];
  const pathMeta=(genericDate,genericDescription,path)=>{
    const transition=publicAuthorityHighRiskTransition(genericDate,path,context);
    if(transition.review)return{applicability:'not_assessable',applicableDate:'',applicabilityReason:transition.reason,path,transitionCase:'public_authority_transition_review',firstRelevantDate:transition.firstUse};
    return{...(transition.applicable?fixedTemporalMeta(KNOWLEDGE_BASE.verifiedDates.publicExistingHighRisk,`Besonderer Übergangsfall nach Art. 111 Abs. 2 für ein bestehendes Hochrisiko-KI-System, das zur Verwendung durch eine Behörde oder öffentliche Stelle bestimmt ist: Erfüllung bis 2. August 2030. ${transition.reason}`,context):fixedTemporalMeta(genericDate,`${genericDescription} ${transition.reason}`,context)),path,transitionCase:transition.applicable?'existing_public_high_risk':'general_high_risk',firstRelevantDate:transition.firstUse};
  };
  if(e.annexHighRisk.code==='yes')paths.push(pathMeta(KNOWLEDGE_BASE.verifiedDates.highRiskAnnexIII,'Kapitel III Abschnitte 1 bis 3 für Systeme nach Art. 6 Abs. 2 in Verbindung mit Anhang III gelten nach dem Leitfaden ab 2. Dezember 2027.','Anhang III'));
  if(e.productHighRisk.code==='yes')paths.push(pathMeta(KNOWLEDGE_BASE.verifiedDates.highRiskAnnexI,'Kapitel III Abschnitte 1 bis 3 für Systeme nach Art. 6 Abs. 1 in Verbindung mit Anhang I gelten nach dem Leitfaden ab 2. August 2028.','Anhang I'));
  return reconcileTemporalMeta(transitionAwareTemporal(combineTemporalPaths(paths,paths.length>1?'Beide eigenständigen Hochrisiko-Zeitpfade sind dokumentiert.':''),'Hochrisiko-KI-System',context),'highRisk','Hochrisiko-KI-System',context);
}
function section5TemporalMeta(description,context=null){const KNOWLEDGE_BASE=evaluationReferences(context).knowledgeBase;return transitionAwareTemporal(fixedTemporalMeta(KNOWLEDGE_BASE.verifiedDates.aiActGeneral,`${description} Kapitel III Abschnitt 5 beziehungsweise Art. 40 bis 49 wird nicht dem verschobenen Zeitpfad der Abschnitte 1 bis 3 zugeordnet.`,context),'Kapitel III Abschnitt 5',context);}
/** Bewertet Art.-50-Pflichten einschließlich der besonderen Regel für bestimmte Altsysteme. */
function transparencyTemporalMeta(context=null){
  const state=evaluationState(context),KNOWLEDGE_BASE=evaluationReferences(context).knowledgeBase,firstMarket=state.form.firstMarketDate||state.form.firstOperationDate||'',art50Abs2=(allRegulatoryEvaluations(context).transparency.items||[]).some(item=>item.key==='tSynthetic'&&item.code==='applicable'),existingArt50Abs2=art50Abs2&&isFilled(firstMarket)&&firstMarket<KNOWLEDGE_BASE.verifiedDates.transparency;
  const base=existingArt50Abs2?fixedTemporalMeta(KNOWLEDGE_BASE.verifiedDates.transparencyExisting,'Besonderer Übergangspfad für ein vor dem allgemeinen Anwendungsbeginn in Verkehr gebrachtes System nach Art. 50 Abs. 2: Anwendung ab 2. Dezember 2026.',context):fixedTemporalMeta(KNOWLEDGE_BASE.verifiedDates.transparency,'Art. 50 gilt grundsätzlich ab 2. August 2026.',context);
  if(existingArt50Abs2)Object.assign(base,{transitionCase:'existing_article50_2',firstRelevantDate:firstMarket});
  return reconcileTemporalMeta(transitionAwareTemporal(base,'Transparenzpflicht',context),'transparency','Transparenzpflicht',context);
}
/** Bewertet den eigenständigen GPAI-Zeitpfad einschließlich bestehender Modelle. */
function gpaiTemporalMeta(context=null){
  const state=evaluationState(context),KNOWLEDGE_BASE=evaluationReferences(context).knowledgeBase,firstMarket=state.form.firstMarketDate||'',existing=isFilled(firstMarket)&&firstMarket<KNOWLEDGE_BASE.verifiedDates.gpai;
  const base=existing?fixedTemporalMeta(KNOWLEDGE_BASE.verifiedDates.gpaiExisting,'Besonderer Übergangspfad für ein vor dem 2. August 2025 in Verkehr gebrachtes GPAI-Modell: Pflichterfüllung bis 2. August 2027.',context):fixedTemporalMeta(KNOWLEDGE_BASE.verifiedDates.gpai,'GPAI-Pflichten gelten für neu in Verkehr gebrachte Modelle grundsätzlich ab 2. August 2025.',context);
  if(existing)Object.assign(base,{transitionCase:'existing_gpai_model',firstRelevantDate:firstMarket});
  return reconcileTemporalMeta(transitionAwareTemporal(base,'GPAI-Modell',context),'gpai','GPAI-Modell',context);
}
/** Bewertet CRA-Teilpflichten getrennt nach Meldung, allgemeiner Geltung und Übergang. */
function craTemporalMeta(dutyNumber,context=null){
  const state=evaluationState(context),KNOWLEDGE_BASE=evaluationReferences(context).knowledgeBase;
  const reporting=dutyNumber===35,date=reporting?KNOWLEDGE_BASE.verifiedDates.craReporting:KNOWLEDGE_BASE.verifiedDates.craGeneral;
  const meta=fixedTemporalMeta(date,reporting?'Meldepflichten des Cyber Resilience Act gelten ab 11. September 2026.':'Die allgemeinen Pflichten des Cyber Resilience Act gelten ab 11. Dezember 2027.',context);
  if(reporting)return{...meta,applicabilityReason:`${meta.applicabilityReason} Die Meldepflicht gilt nach der Zeittabelle auch für vor dem 11. Dezember 2027 in Verkehr gebrachte Produkte. ${state.form.craReportingProcess||''}`.trim()};
  const firstMarket=state.form.craFirstMarketDate,change=state.form.craSubstantialChange,changeDate=state.form.craSubstantialChangeDate,evidence=state.form.craTransitionEvidence||state.form.craTransitionDates||'';
  if(!isFilled(firstMarket))return{...meta,applicability:'not_assessable',applicabilityReason:`${meta.applicabilityReason} Das Datum des erstmaligen Inverkehrbringens fehlt; die Altproduktregel kann nicht beurteilt werden.`};
  if(firstMarket<KNOWLEDGE_BASE.verifiedDates.craGeneral){
    if(change==='no')return{applicability:'not_applicable',applicableDate:date,applicabilityReason:`Altprodukt: vor dem 11. Dezember 2027 in Verkehr gebracht und keine spätere wesentliche Änderung dokumentiert. Die übrigen CRA-Anforderungen werden aufgrund Art. 69 Abs. 2 für diesen Bewertungsgegenstand nicht als aktuell behandelt. ${evidence}`.trim(),transitionCase:'legacy_product'};
    if(change==='review'||!isFilled(change))return{applicability:'not_assessable',applicableDate:date,applicabilityReason:`Altprodukt: Ob ab dem 11. Dezember 2027 eine wesentliche Änderung vorgenommen wurde, ist nicht eindeutig beurteilbar. ${evidence}`.trim(),transitionCase:'legacy_product'};
    if(change==='yes'&&!isFilled(changeDate))return{applicability:'not_assessable',applicableDate:date,applicabilityReason:'Eine wesentliche Änderung ist dokumentiert, ihr Datum fehlt jedoch; weiterer Prüfbedarf.',transitionCase:'legacy_product'};
    if(change==='yes'&&changeDate<KNOWLEDGE_BASE.verifiedDates.craGeneral)return{applicability:'not_applicable',applicableDate:date,applicabilityReason:`Die dokumentierte Änderung erfolgte vor dem 11. Dezember 2027 und eröffnet die Altproduktregel für die übrigen Anforderungen nicht. ${evidence}`.trim(),transitionCase:'legacy_product'};
    if(change==='yes'){const changed=fixedTemporalMeta(changeDate,'Für das Altprodukt werden die übrigen CRA-Anforderungen aufgrund einer ab dem 11. Dezember 2027 vorgenommenen wesentlichen Änderung berücksichtigt.',context);return{...changed,transitionCase:'legacy_product',applicabilityReason:`${changed.applicabilityReason} ${evidence}`.trim()};}
  }
  return{...meta,applicabilityReason:`${meta.applicabilityReason} Das Produkt wurde am oder nach dem allgemeinen CRA-Anwendungsbeginn erstmals in Verkehr gebracht. ${evidence}`.trim()};
}
/** Ordnet einer konkreten Pflicht den fachlich passenden Zeitpfad zu. */
function dutyTemporalMeta(duty,context=null){
  const KNOWLEDGE_BASE=evaluationReferences(context).knowledgeBase;
  const number=Number(duty.code.slice(-2));
  if(duty.applicabilityDecision==='review'||duty.scopeDecision==='review')return{applicability:'not_assessable',applicableDate:'',applicabilityReason:duty.scopeDecisionReason||'Eine sachliche Voraussetzung dieser Pflicht ist ungeklärt; der Zeitstatus kann deshalb nicht abschließend bestimmt werden.'};
  if(number===1)return fixedTemporalMeta(KNOWLEDGE_BASE.verifiedDates.aiLiteracy,'Art. 4 folgt dem eigenständigen Zeitpfad der KI-Kompetenzpflicht und nicht dem Hochrisiko-Zeitstatus.',context);
  if(number===15){const underlying=highRiskTemporalMeta(context);return duty.art25RoleTakeover?reconcileTemporalMeta(underlying,'art25','Art. 25 – Rollenübernahme',context):({...underlying,applicabilityReason:`Art. 25 Abs. 4 folgt dem konkreten Hochrisiko-Zeitpfad und nicht Kapitel III Abschnitt 5. ${underlying.applicabilityReason}`});}
  if(number===16)return section5TemporalMeta('Art. 6 Abs. 4 und Art. 49 Abs. 2: eigener erreichbarer Zeitpfad für die dokumentierte Ausnahme nach Art. 6 Abs. 3.',context);
  if([12,17,18,19].includes(number))return highRiskTemporalMeta(context);
  if(number===20)return highRiskTemporalMeta(context);
  if(number===21)return highRiskTemporalMeta(context);
  if(number>=2&&number<=14)return highRiskTemporalMeta(context);
  if(number>=22&&number<=26)return transparencyTemporalMeta(context);
  if(number>=27&&number<=31)return gpaiTemporalMeta(context);
  if(number>=32&&number<=36)return craTemporalMeta(number,context);
  return{applicability:'not_assessable',applicableDate:'',applicabilityReason:'Für diese Pflicht konnte kein eindeutiger Zeitpfad bestimmt werden.'};
}

/* 9. Risiko- und Vollständigkeitslogik */

/** Berechnet ausschließlich den aktuellen 3×3-Risikowert R = E × A. */
function riskScore(risk){const p=Number(risk.probability),i=Number(risk.impact);return p&&i?p*i:null;}
/** Ordnet einen 3×3-Wert den Stufen Niedrig, Mittel, Hoch oder Nicht bestimmbar zu. */
function riskLevel(score){return score==null?'Nicht bestimmbar':score>=6?'Hoch':score>=3?'Mittel':'Niedrig';}
function riskCode(score){return score==null?'unknown':score>=6?'high':score>=3?'medium':'low';}
/** Verwendet den berechneten Istwert und fällt nur ohne Matrixangaben auf den dokumentierten Wert zurück. */
function effectiveCurrentRisk(risk){const score=riskScore(risk);return score==null?(risk.currentRisk||'unknown'):riskCode(score);}
function riskTone(level){return level==='Hoch'?'high':level==='Mittel'?'medium':level==='Niedrig'?'low':'unknown';}
function countLabel(count,singular,plural){return`${count} ${count===1?singular:plural}`;}

function step1Requirements(context=null){const state=evaluationState(context),references=evaluationReferences(context),required=[...references.step1Required];if(['partial','missing'].includes(state.form.infoStatus))required.push('missingInfo','missingImpact','infoRequestOwner','infoDeadline');if(isFilled(state.form.assessmentDate)&&isFilled(state.form.assessmentUpdate)&&state.form.assessmentDate!==state.form.assessmentUpdate)required.push('assessmentUpdateReason');return{required,optional:references.step1Optional};}
function step2Requirements(context=null){const state=evaluationState(context),keys=evaluationReferences(context).step2Questions.map(([key])=>key),extras=['realWorldTesting','actualOperationalUse'],limitationTracking=[state.form.scopeAnnexIB,state.form.scopeAnnexIAEquivalent].includes('yes')?['scopeLimitationOwner','scopeLimitationDue']:[];return{required:[...keys,...extras,'scopeBasis','scopeEvidence','definitionBasis','definitionEvidenceSource',...limitationTracking,...dynamicReasonsFor([...keys,...extras],context)],optional:['scopeNotes','definitionNotes','transitionDate']};}
function step3Requirements(context=null){
  const references=evaluationReferences(context),aiPath=aiActPathStatus(context),keys=[...references.contextDescriptionKeys,...references.contextChoiceKeys],roleKeys=aiPath.required?references.roleQuestionKeys:[];
  return{required:[...keys,...roleKeys,...(aiPath.required?['roleBasis','roleEvidence','roleReviewDate']:[]),...dynamicReasonsFor(contextChoiceKeys,context),...dynamicReasonsFor(roleKeys,context)],optional:['roleNotes'],customRequired:()=>!aiPath.required||roleLabels(context).length>0};
}

const orgRequiredFields=['status','finding','rationale','evidence','evidenceLocation','gap','impact','measure','owner','transfer','decisionCritical'];
const orgOptionalFields=['deadline','notes'];
function step6Stats(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),orgAreas=references.orgAreas,orgCriteria=references.orgCriteria;
  const missing=[];let optionalMissing=0,filled=0;
  const contradictions=[];let criteriaTotal=0;
  orgAreas.forEach(([id,label])=>{const item=state.org[id]||{},evaluation=evaluateOrgArea(id,context);orgRequiredFields.forEach(key=>{if(isFilled(item[key]))filled++;else missing.push(`${label}: ${displayFieldName(key,context)}`);});(orgCriteria[id]||[]).forEach(([key,criterionLabel,,guideId])=>{const regulatory=regulatoryOrgCriterionContext(guideId,context);criteriaTotal++;if(regulatory.defined&&!regulatory.relevant){filled++;return;}const criterion=item.criteria?.[key]||{};if(isFilled(criterion.answer))filled++;else missing.push(`${label}: ${criterionLabel}`);if(['partial','notFulfilled','na','notAssessable'].includes(criterion.answer)&&!isFilled(criterion.reason))missing.push(`${label}: Begründung zu „${criterionLabel}“`);});missing.push(...evaluation.missing.map(text=>`${label}: ${sanitizeVisibleText(text,context)}`));contradictions.push(...evaluation.contradictions.map(text=>`${label}: ${sanitizeVisibleText(text,context)}`));orgOptionalFields.forEach(key=>{if(isFilled(item[key]))filled++;else optionalMissing++;});});
  const total=orgAreas.length*(orgRequiredFields.length+orgOptionalFields.length)+criteriaTotal;
  return{requiredMissing:missing.length>0,optionalMissing,filled,total,missing:[...new Set(missing)],contradictions};
}

function isActiveRegisterItem(item){return item?.sourceActive!==false;}
function activeRegisterItems(type,context=null){return(evaluationState(context).registers[type]||[]).filter(isActiveRegisterItem);}
function allActiveRegisterItems(context=null){return Object.values(evaluationState(context).registers).flat().filter(isActiveRegisterItem);}
function inactiveRegisterItems(context=null){return Object.values(evaluationState(context).registers).flat().filter(item=>!isActiveRegisterItem(item));}
function statusRelevantRegisterItems(type,context=null){return activeRegisterItems(type,context).filter(item=>type!=='regulatory'||item.applicability!=='not_applicable');}
function allStatusRelevantRegisterItems(context=null){return Object.keys(evaluationState(context).registers).flatMap(type=>statusRelevantRegisterItems(type,context));}
function registerItemOpen(item){return !['fulfilled','verified','resolved','not_applicable'].includes(item.status)&&item.applicability!=='not_applicable';}

function incompleteRegisterItems(context=null){
  const registerSchemas=evaluationReferences(context).registerSchemas;
  const missing=[];
  Object.entries(registerSchemas).forEach(([type,schema])=>activeRegisterItems(type,context).forEach((item,index)=>schema.fields.forEach(([key,label])=>{
    if(type==='regulatory'&&key==='applicableDate')return;
    if(type==='regulatory'&&item.applicability==='not_applicable'&&['fulfillability','fulfillabilityReason','beforeRelease','decisionCritical','blocking','owner','due','status','evidence','priority'].includes(key))return;
    if(!isFilled(item[key]))missing.push(`${schema.title} ${index+1}: ${label}`);
  })));return missing;
}
function step7Stats(context=null){
  const state=evaluationState(context),count=allActiveRegisterItems(context).length,missing=incompleteRegisterItems(context);
  if(!count&&!isFilled(state.form.noRegisterReason))missing.push('Keine Einträge vorhanden: Begründung erforderlich.');
  ['planCoordinator','planStatus','newTechnicalFeature','newTechnicalFeatureReason','legalRegimeFulfilment'].forEach(key=>{if(!isFilled(state.form[key]))missing.push(displayFieldName(key,context));});
  if(isFilled(state.form.legalRegimeFulfilment)&&!isFilled(state.form.legalRegimeFulfilmentEvidence))missing.push('Begründung und Nachweis zur Pflichterfüllung und zum Zusammenwirken der Rechtsregime');
  const optional=['implementationNotes','planEvidence','crossReferences'];
  return{requiredMissing:missing.length>0,optionalMissing:optional.filter(key=>!isFilled(state.form[key])).length,filled:count,total:Math.max(1,count)+optional.length,missing};
}
function highestRiskLabel(levels){const order=['Niedrig','Mittel','Hoch','Nicht bestimmbar'];const normalized=levels.map(v=>({low:'Niedrig',medium:'Mittel',high:'Hoch',unknown:'Nicht bestimmbar'}[v]||v));if(normalized.includes('Nicht bestimmbar'))return'Nicht bestimmbar';return normalized.sort((a,b)=>order.indexOf(a)-order.indexOf(b)).at(-1)||'Nicht bestimmbar';}
/** Verdichtet die fünf Organisationsbereiche qualitativ, ohne numerischen Gesamtscore. */
function organizationalOverall(context=null){const orgAreas=evaluationReferences(context).orgAreas,results=orgAreas.map(([id])=>evaluateOrgArea(id,context)),statuses=results.map(result=>result.proposed);if(statuses.includes('notAssessable'))return'Organisatorisch nicht abschließend bewertbar';if(statuses.includes('notFulfilled'))return'Organisatorische Voraussetzungen unzureichend';if(statuses.includes('partial')||results.some(result=>result.missing.length||result.contradictions.length))return'Organisatorische Voraussetzungen teilweise ausreichend';return'Organisatorische Voraussetzungen ausreichend';}

/** Liefert das fachliche Ergebnis eines Prüfschritts getrennt vom Ausfüllstatus. */
function stepSubstantiveResult(index,decision=null,context=null){
  const state=evaluationState(context),regs=regulatoryResults(context);
  if(index===0)return({complete:'Toolprofil vollständig',partial:'Toolprofil teilweise – Informationsbedarf offen',missing:'Informationslage unzureichend'}[state.form.infoStatus]||'Noch nicht fachlich bestimmt');
  if(index===1)return`${aiSystemResult(context)} · ${scopeResult(context)}`;
  if(index===2){const path=aiActPathStatus(context),contextRoles=roleLabels(context);if(!path.required)return'Einsatzkontext dokumentiert; AI-Act-Akteursrollen nicht erforderlich';return contextRoles.length?`Rolle(n): ${contextRoles.join(', ')}${['ownBrand','substantialModification','purposeChange'].some(key=>state.form[key]==='yes')?' · Art.-25-Sachverhalt erfasst':''}`:'Einsatz- und Rollenprofil noch nicht bestimmt';}
  if(index===3)return`${regs.prohibition} · ${regs.productHighRisk} · ${regs.annexHighRisk}`;
  if(index===4){if(!state.risks.length)return'Kein Risikoprofil vorhanden';const levels=state.risks.map(r=>effectiveCurrentRisk(r));return`${countLabel(state.risks.length,'Risiko','Risiken')} · höchstes aktuelles Niveau: ${highestRiskLabel(levels)}`;}
  if(index===5)return organizationalOverall(context);
  if(index===6)return`${allActiveRegisterItems(context).length} aktive Registereinträge · ${inactiveRegisterItems(context).length} historisch · ${incompleteRegisterItems(context).length?'aktive Einträge unvollständig':'aktueller Plan konsolidiert'}`;
  return(decision||overallDecision(true,false,{context})).label;
}

/* 10. Eingabeansichten der acht Prüfschritte */

function renderStep1(){
  const f=state.form;
  const infoFollow=['partial','missing'].includes(f.infoStatus)?sectionTitle('Offener Informationsbedarf','Fehlende Angaben werden mit Auswirkung, Zuständigkeit und Frist weitergeführt.')+fieldGrid(
    hField('Fehlende oder zu klärende Informationen','missingInfo',{required:true,type:'textarea',full:true})+
    hField('Bedeutung für spätere Prüfschritte','missingImpact',{required:true,type:'textarea',full:true})+
    hField('Verantwortliche Nachforderungsstelle','infoRequestOwner',{required:true})+
    hField('Klärungsfrist','infoDeadline',{required:true,type:'date'})
  ):'';
  return `<div class="panel">${migrationNotice()}${intro('Erstellen Sie das verbindliche Ausgangsprofil des Bewertungsgegenstands. Systemgrenze, Daten, technische Komponenten, Prozessbezug und Nachweise werden getrennt erfasst.')} ${requiredNote()}
    ${sectionTitle('Identifikation und Verantwortlichkeit')}${fieldGrid(
      hField('Interne Tool-Kennung','internalToolId',{required:true})+hField('Eindeutige Bezeichnung','toolName',{required:true})+hField('Hersteller oder Anbieter','provider',{required:true})+
      hField('Version oder Produktstand','version',{required:true})+hField('Bewertungsdatum','assessmentDate',{required:true,type:'date'})+
      hField('Letzte inhaltliche Aktualisierung','assessmentUpdate',{type:'date'})+(isFilled(f.assessmentDate)&&isFilled(f.assessmentUpdate)&&f.assessmentDate!==f.assessmentUpdate?hField('Grund und Umfang der späteren Aktualisierung','assessmentUpdateReason',{required:true,type:'textarea',full:true}):'')+hField('Anbieterkontakt','providerContact')+
      hField('Zuständige Organisationseinheit','department',{required:true})+hField('Verantwortliche Person oder Funktion','owner',{required:true})
    )}
    ${sectionTitle('Zweck, Funktion und Systemgrenze')}${fieldGrid(
      hField('Vorgesehener Verwendungszweck','purpose',{required:true,type:'textarea',full:true})+
      hField('Unterstützte Aufgaben und Funktionen','tasks',{required:true,type:'textarea',full:true})+
      hField('Systemgrenze und betrachtete Komponenten','systemBoundary',{required:true,type:'textarea',full:true})+
      hField('Kurzbeschreibung des Bewertungsgegenstands','shortDescription',{required:true,type:'textarea',full:true})
    )}
    ${sectionTitle('Daten, Ausgaben und Technik')}${fieldGrid(
      hField('Eingaben und Datenarten','inputs',{required:true,type:'textarea',full:true})+
      hField('Datenquellen','dataSources',{required:true,type:'textarea',full:true})+
      hField('Erzeugte Ausgaben und Ergebnisse','outputsDescription',{required:true,type:'textarea',full:true})+
      hField('Technische Komponenten, Modelle und KI-Methoden','techComponents',{required:true,type:'textarea',full:true})+
      hField('Schnittstellen und Systemumgebung','interfaces',{required:true,type:'textarea',full:true})
    )}
    ${sectionTitle('Einsatz und Nachweise')}${fieldGrid(
      hField('Einbindung in Prozess und Entscheidung','integration',{required:true,type:'textarea',full:true})+
      hField('Nutzergruppen','users',{required:true,type:'textarea'})+
      hField('Informationsquellen und Nachweise','infoSources',{required:true,type:'textarea'})+
      hField('Weitere Nachweise','otherEvidence',{type:'textarea',full:true})+
      hField('Ergebnis der Vollständigkeitsprüfung','infoStatus',{required:true,type:'select',full:true,values:[['complete','Vollständig'],['partial','Teilweise'],['missing','Nicht verfügbar']]})
    )}${infoFollow}
    ${resultLine('Fachliches Ergebnis',stepSubstantiveResult(0),f.infoStatus==='complete'?'positive':f.infoStatus?'warning':'')}
  </div>`;
}

function renderStep3(){
  const described=(key,type='textarea',values)=>hField(guideLabel(QUESTION_IDS[key]),key,{required:true,type,full:type==='textarea',values,hint:guideHint(QUESTION_IDS[key])}),aiPath=aiActPathStatus();
  return `<div class="panel">${intro('Der Einsatzkontext wird mit CTX-Kennungen erfasst. Erst danach wird die Akteursrolle mit ROLE-Kennungen funktionsbezogen bestimmt; Mehrfachrollen bleiben möglich.')} ${requiredNote()}
    ${sectionTitle('Konkreter Einsatzkontext')}${fieldGrid(
      described('intendedUse')+
      described('purposeAlignment','select',[['matches','Entspricht'],['partial','Teilweise abweichend'],['substantial','Wesentlich abweichend'],['review','Weiterer Prüfbedarf']])+
      described('process')+described('usersContext')+described('affected')+
      described('decisionInfluence','select',[['information','Reine Informationsbereitstellung'],['support','Unterstützung einer menschlichen Tätigkeit'],['recommendation','Empfehlung für eine Entscheidung'],['material','Wesentliche Entscheidungsgrundlage'],['automated','Weitgehend automatisierte Entscheidung'],['review','Weiterer Prüfbedarf']])+
      described('spatialTemporal')+described('rightsImpact')
    )}
    ${sectionTitle('Kontextbezogene Prüffragen')}
    ${hQuestion('humanReview',guideLabel('CTX-07'),guideHint('CTX-07'),[['yes','Ja'],['partial','Teilweise'],['no','Nein'],['review','Weiterer Prüfbedarf']])}
    ${hQuestion('humanCorrection',guideLabel('CTX-08'),guideHint('CTX-08'),[['yes','Ja'],['limited','Eingeschränkt'],['no','Nein'],['review','Weiterer Prüfbedarf']])}
    ${hQuestion('foreseeableMisuse',guideLabel('CTX-10'),guideHint('CTX-10'),regulatoryChoiceOptions)}
    ${hQuestion('sensitiveSituation',guideLabel('CTX-11'),guideHint('CTX-11'),regulatoryChoiceOptions)}
    ${hQuestion('publicServiceEntity',guideLabel('CTX-13'),guideHint('CTX-13'),regulatoryChoiceOptions)}
    ${hQuestion('unionAuthority',guideLabel('CTX-14'),guideHint('CTX-14'),regulatoryChoiceOptions)}
    ${aiPath.required?sectionTitle('Funktionsbezogene Bestimmung der Akteursrolle','Die Rollen werden aus den Antworten abgeleitet; eine Organisation kann mehrere Rollen gleichzeitig einnehmen.')+questionsFrom(roleQuestionKeys.map(key=>[key]))+
    resultLine('Abgeleitete Rolle(n)',roleLabels().join(', ')||'Noch nicht bestimmt',roleLabels().length?'positive':'danger')+
    sectionTitle('Begründung und Nachweise')+fieldGrid(
      hField('Begründung der Rollenbestimmung','roleBasis',{required:true,type:'textarea',full:true})+
      hField('Verträge, Herstellerangaben und weitere Nachweise','roleEvidence',{required:true,type:'textarea',full:true})+
      hField('Termin für Rollenüberprüfung','roleReviewDate',{required:true,type:'date'})+
      hField('Weitere Hinweise','roleNotes',{type:'textarea'})
    ):`<div class="evaluation-box valid"><div><span>ROLE-01 bis ROLE-11</span><strong>Nicht erforderlich</strong><small>${escapeHtml(aiPath.reason)} Historisch vorhandene Rollenangaben bleiben gespeichert, sind für die aktuelle Bewertung aber inaktiv.</small></div></div>`}
    ${resultLine('Einsatz- und Rollenprofil',aiPath.required?stepSubstantiveResult(2):'Einsatzkontext dokumentiert; AI-Act-Akteursrollen nicht erforderlich',aiPath.required?(roleLabels().length?'positive':'warning'):'positive')}
  </div>`;
}

function conclusionSelect(label,key,values){return hField(label,key,{required:true,type:'select',full:true,values});}
function questionsFrom(items){return items.map(([k,l,h=''])=>{const id=QUESTION_IDS[k];return hQuestion(k,id?guideLabel(id):l,id?guideHint(id):h,id?regulatoryChoiceOptions:choiceOptions);}).join('');}

const riskSelects = {
  probability:[['1','1 – Gering'],['2','2 – Mittel'],['3','3 – Hoch']],
  impact:[['1','1 – Gering'],['2','2 – Mittel'],['3','3 – Hoch']],
  controlEffectiveness:[['effective','Wirksam'],['partial','Teilweise wirksam'],['ineffective','Nicht wirksam'],['unknown','Nicht bestimmbar']],
  currentRisk:[['low','Niedrig'],['medium','Mittel'],['high','Hoch'],['unknown','Nicht bestimmbar']],
  uncertainty:[['low','Gering'],['medium','Mittel'],['high','Hoch'],['unknown','Nicht bestimmbar']],
  acceptance:[['accepted','Akzeptiert'],['conditional','Bedingt akzeptiert'],['notAccepted','Nicht akzeptiert'],['open','Offen']],
  yesNo:[['yes','Ja'],['no','Nein'],['review','Weiterer Prüfbedarf']],
  priority:[['low','Niedrig'],['medium','Mittel'],['high','Hoch']],
  residual:[['low','Niedrig'],['medium','Mittel'],['high','Hoch'],['unknown','Nicht bestimmbar'],['pending','Noch nicht ermittelt']],
  treatmentStatus:[['planned','Geplant'],['inProgress','In Umsetzung'],['implemented','Umgesetzt – noch nicht verifiziert'],['verified','Wirksamkeit verifiziert']]
};

function riskField(index,label,key,options={}){
  const value=state.risks[index]?.[key]??'';const required=options.required===false?'':' <span class="required-mark">*</span>';const full=options.full?'full':'';const id=questionIdMarkup(key);
  if(options.type==='select')return`<label class="${full}">${id}<span>${escapeHtml(label)}${required}</span><select data-risk-field="${key}" data-risk-index="${index}"><option value="">Bitte auswählen</option>${options.values.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></label>`;
  if(options.type==='textarea')return`<label class="${full}">${id}<span>${escapeHtml(label)}${required}</span><textarea data-risk-field="${key}" data-risk-index="${index}">${escapeHtml(value)}</textarea></label>`;
  return`<label class="${full}">${id}<span>${escapeHtml(label)}${required}</span><input type="${options.type||'text'}" data-risk-field="${key}" data-risk-index="${index}" value="${escapeHtml(value)}"></label>`;
}

/** Rendert die Risikomatrix ausschließlich aus ausdrücklich übergebenen Daten. */
function renderReportMatrix(risks,matrixReference){
  if(!matrixReference?.formula||!matrixReference?.levels)throw new Error('Für die Berichtsmatrix fehlen die fixierten Referenzwerte.');
  const cells=[];
  for(let impact=3;impact>=1;impact--){
    cells.push(`<div class="matrix-label"><strong>${impact}</strong><span>${['','Gering','Mittel','Hoch'][impact]}</span></div>`);
    for(let probability=1;probability<=3;probability++){
      const score=impact*probability,level=riskLevel(score);const dots=risks.map((r,index)=>({...r,index})).filter(r=>Number(r.impact)===impact&&Number(r.probability)===probability).map(r=>`<span class="risk-dot" title="${escapeHtml(r.description)}">${escapeHtml(r.riskId||`R${r.index+1}`)}</span>`).join('');
      cells.push(`<div class="matrix-cell ${riskTone(level)}" data-impact="${impact}" data-probability="${probability}" data-score="${score}"><b>${score}</b><div class="risk-dots">${dots}</div></div>`);
    }
  }
  return `<div class="matrix-card" data-matrix="risk-3x3"><div class="matrix-head"><div><h2>Einheitliche 3×3-Risikomatrix</h2><p>${escapeHtml(matrixReference.formula)}. Niedrig: ${escapeHtml(matrixReference.levels.low)} · Mittel: ${escapeHtml(matrixReference.levels.medium)} · Hoch: ${escapeHtml(matrixReference.levels.high)}. Die aktuelle Bewertung ist das Ergebnis; weitere Risikozustände dienen optional der Maßnahmenverfolgung.</p></div><div class="matrix-legend"><span class="low">Niedrig ${escapeHtml(matrixReference.levels.low)}</span><span class="medium">Mittel ${escapeHtml(matrixReference.levels.medium)}</span><span class="high">Hoch ${escapeHtml(matrixReference.levels.high)}</span></div></div><div class="matrix" data-grid-columns="4"><div class="matrix-label" data-axis="impact"><strong>Auswirkung</strong></div>${[1,2,3].map(p=>`<div class="matrix-label" data-probability-header="${p}"><strong>${p}</strong><span>${['','Gering','Mittel','Hoch'][p]}</span></div>`).join('')}${cells.join('')}<div class="matrix-axis" data-axis="probability">Eintrittswahrscheinlichkeit →</div></div></div>`;
}
/** Rendert die interaktive Matrix aus dem aktuellen Arbeitsstand. */
function renderMatrix(){return renderReportMatrix(state.risks,KNOWLEDGE_BASE.matrix);}

const orgStatusOptions=[['fulfilled','Erfüllt'],['partial','Teilweise erfüllt'],['notFulfilled','Nicht erfüllt'],['na','Nicht einschlägig'],['notAssessable','Nicht beurteilbar']];
function orgField(areaId,label,key,options={}){
  const value=state.org[areaId]?.[key]??'';const required=options.required===false?'':' <span class="required-mark">*</span>';const full=options.full?'full':'';
  if(options.type==='select')return`<label class="${full}"><span>${escapeHtml(label)}${required}</span><select data-org-area="${areaId}" data-org-field="${key}"><option value="">Bitte auswählen</option>${options.values.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></label>`;
  if(options.type==='textarea')return`<label class="${full}"><span>${escapeHtml(label)}${required}</span><textarea data-org-area="${areaId}" data-org-field="${key}">${escapeHtml(value)}</textarea></label>`;
  return`<label class="${full}"><span>${escapeHtml(label)}${required}</span><input type="${options.type||'text'}" data-org-area="${areaId}" data-org-field="${key}" value="${escapeHtml(value)}"></label>`;
}

function regulatoryOrgCriterionContext(guideId,context=null){
  const rule=evaluationReferences(context).regulatoryOrgRules[guideId];
  if(!rule)return{defined:false,relevant:false,rule:null};
  return{defined:true,relevant:requiredHighRiskDuties(context).some(duty=>duty.code===rule.dutyCode),rule};
}

/**
 * Bewertet einen Organisationsbereich aus Einzelkriterien, Nachweisen und
 * Widersprüchen. ORG-22 und ORG-23 werden nur bei einschlägiger Art.-4-Pflicht
 * statuswirksam; die übrigen Kriterien behalten ihre eigenständige Bedeutung.
 */
function evaluateOrgArea(areaId,context=null){
  const state=evaluationState(context),definitions=evaluationReferences(context).orgCriteria[areaId]||[],item=state.org[areaId]||{},missing=[],contradictions=[],criticalIssues=[];
  let partial=0,notFulfilled=0,notAssessable=0,criticalNotFulfilled=0,criticalNotAssessable=0;
  definitions.forEach(([key,label,critical,guideId])=>{
    const regulatory=regulatoryOrgCriterionContext(guideId,context);
    if(regulatory.defined&&!regulatory.relevant)return;
    const answer=item.criteria?.[key]?.answer,reason=item.criteria?.[key]?.reason;
    const decisionRelevant=critical||regulatory.relevant||item.decisionCritical==='yes'||item.status==='notFulfilled';
    if(!isFilled(answer)){missing.push(label);if(decisionRelevant){criticalIssues.push(`${label}: nicht beantwortet`);criticalNotAssessable++;}return;}
    if(answer==='notAssessable'){notAssessable++;if(decisionRelevant){criticalIssues.push(`${label}: nicht beurteilbar`);criticalNotAssessable++;}return;}
    if(answer==='na'&&!isFilled(reason)){missing.push(`${label}: Begründung für „nicht einschlägig“`);if(critical)criticalIssues.push(`${label}: Ausnahme nicht begründet`);}
    if(answer==='partial'){partial++;if(decisionRelevant)criticalIssues.push(`${label}: nur teilweise erfüllt`);}
    if(answer==='notFulfilled'){notFulfilled++;if(decisionRelevant){criticalIssues.push(`${label}: nicht erfüllt`);criticalNotFulfilled++;}}
  });
  let proposed='fulfilled';
  if(criticalNotAssessable)proposed='notAssessable';
  else if(criticalNotFulfilled)proposed='notFulfilled';
  else if(partial||notFulfilled||notAssessable||missing.length)proposed='partial';
  if(item.status==='na'){
    if(!isFilled(item.naReason))missing.push('Begründung für Gesamtstatus „nicht einschlägig“');
    if(definitions.some(([key])=>item.criteria?.[key]?.answer!=='na'))contradictions.push('Gesamtstatus „nicht einschlägig“ passt nicht zu den Einzelkriterien.');
  }
  if(item.status&&item.status!==proposed)contradictions.push(`Der manuelle Bereichsstatus „${orgStatusLabel(item.status)}“ widerspricht dem aus den Einzelkriterien abgeleiteten Status „${orgStatusLabel(proposed)}“. Maßgeblich bleibt der abgeleitete Status.`);
  return{proposed,missing,contradictions,criticalIssues,critical:criticalIssues.length>0,partial,notFulfilled,notAssessable,criticalNotFulfilled,criticalNotAssessable};
}

function orgCriterionField(areaId,[key,label,critical,guideId]){
  const criterion=state.org[areaId]?.criteria?.[key]||{},answer=criterion.answer||'';
  const regulatory=regulatoryOrgCriterionContext(guideId),decisionCritical=critical||regulatory.relevant;
  if(regulatory.defined&&!regulatory.relevant)return`<div class="org-criterion regulatory-not-applicable" data-guide-id="${escapeHtml(guideId)}"><div><small class="question-id">${escapeHtml(guideId)}</small><span>${escapeHtml(label)}</span><p><strong>Nicht einschlägig:</strong> ${escapeHtml(regulatory.rule.dutyCode)} ist im aktuellen Rollen- und Anwendungspfad nicht relevant. Das Kriterium wirkt neutral auf das Organisationsergebnis.</p></div></div>`;
  const regulatoryNote=regulatory.relevant?`<p class="path-intro"><strong>Regulatorisch entscheidungsrelevant:</strong> ${escapeHtml(regulatory.rule.dutyCode)} · ${escapeHtml(regulatory.rule.basis)} · ${escapeHtml(regulatory.rule.reason)}</p>`:'';
  return `<div class="org-criterion ${decisionCritical?'critical-criterion':''}" data-guide-id="${escapeHtml(guideId)}">${regulatoryNote}<label><small class="question-id">${escapeHtml(guideId)}</small><span>${escapeHtml(label)} ${decisionCritical?'<b class="required-mark">entscheidungskritisch</b>':''}</span><select data-org-area="${areaId}" data-org-criterion="${key}" data-org-criterion-field="answer"><option value="">Bitte auswählen</option>${orgCriterionOptions.map(([value,text])=>`<option value="${value}" ${answer===value?'selected':''}>${escapeHtml(text)}</option>`).join('')}</select></label>${['partial','notFulfilled','na','notAssessable'].includes(answer)?`<label><span>Begründung, Auswirkung und gegebenenfalls Maßnahme <span class="required-mark">*</span></span><textarea data-org-area="${areaId}" data-org-criterion="${key}" data-org-criterion-field="reason">${escapeHtml(criterion.reason||'')}</textarea></label>`:''}</div>`;
}

function renderOrgArea([id,label],index){
  const item=state.org[id]||{},evaluation=evaluateOrgArea(id);const statusLabel=`Vorschlag: ${orgStatusLabel(evaluation.proposed)}`;
  return details(`${index+1} · ${label}`,`<div class="org-criteria"><p class="path-intro">Einzelkriterien bilden den automatischen Statusvorschlag. Kritische Kriterien wirken auf die Gesamtentscheidung.</p>${(orgCriteria[id]||[]).map(def=>orgCriterionField(id,def)).join('')}</div>`+fieldGrid(
    `<div class="calculated-field full"><span>Automatischer Statusvorschlag</span><strong>${escapeHtml(orgStatusLabel(evaluation.proposed))}</strong></div>`+
    orgField(id,'Manueller Erfüllungsstatus','status',{type:'select',values:orgStatusOptions,full:true})+
    (item.status&&item.status!==evaluation.proposed?orgField(id,'Begründung der manuellen Abweichung','statusDeviationReason',{type:'textarea',full:true}):'')+
    (item.status==='na'?orgField(id,'Begründung für „nicht einschlägig“','naReason',{type:'textarea',full:true}):'')+
    orgField(id,'Feststellung','finding',{type:'textarea',full:true})+orgField(id,'Begründung der Bewertung','rationale',{type:'textarea',full:true})+
    orgField(id,'Nachweis','evidence',{type:'textarea'})+orgField(id,'Fundstelle / Ablageort','evidenceLocation',{type:'textarea'})+
    orgField(id,'Lücke oder offener Punkt','gap',{type:'textarea'})+orgField(id,'Auswirkung der Lücke','impact',{type:'textarea'})+
    orgField(id,'Erforderliche Maßnahme','measure',{type:'textarea',full:true})+orgField(id,'Verantwortung','owner')+
    orgField(id,'In Schritt 7 übertragen','transfer',{type:'select',values:[['yes','Ja'],['no','Nein']]})+
    orgField(id,'Entscheidungskritisch','decisionCritical',{type:'select',values:[['yes','Ja'],['no','Nein'],['notAssessable','Nicht beurteilbar']]})+
    orgField(id,'Umsetzungsfrist','deadline',{type:'date',required:false})+orgField(id,'Weitere Hinweise','notes',{type:'textarea',required:false})
  )+(evaluation.missing.length||evaluation.contradictions.length?`<div class="validation-alert"><strong>Offene Organisationsprüfung</strong><ul>${[...evaluation.missing,...evaluation.contradictions].map(text=>`<li>${escapeHtml(text)}</li>`).join('')}</ul></div>`:''),index===0,statusLabel);
}

function renderStep6(){
  return `<div class="panel">${intro('Jeder Organisationsbereich wird nach demselben Schema bewertet. „Nicht einschlägig“ ist nur mit Begründung zulässig; Lücken können gezielt in den Maßnahmenplan übernommen werden.')} ${requiredNote()}
    <div class="path-stack">${orgAreas.map(renderOrgArea).join('')}</div>
    ${resultLine('Organisatorisches Gesamtprofil',organizationalOverall(),organizationalOverall().includes('ausreichend')&&!organizationalOverall().includes('teilweise')?'positive':organizationalOverall().includes('unzureichend')?'danger':'warning')}
  </div>`;
}

function registerField(type,index,label,key,kind,values){
  const value=state.registers[type][index]?.[key]??'';
  const required=type==='regulatory'&&key==='applicableDate'?'':' <span class="required-mark">*</span>';
  if(kind==='select')return`<label><span>${escapeHtml(label)}${required}</span><select data-register="${type}" data-register-index="${index}" data-register-field="${key}"><option value="">Bitte auswählen</option>${values.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></label>`;
  if(kind==='textarea')return`<label class="full"><span>${escapeHtml(label)}${required}</span><textarea data-register="${type}" data-register-index="${index}" data-register-field="${key}">${escapeHtml(value)}</textarea></label>`;
  return`<label><span>${escapeHtml(label)}${required}</span><input type="${kind==='date'?'date':'text'}" data-register="${type}" data-register-index="${index}" data-register-field="${key}" value="${escapeHtml(value)}"></label>`;
}

function renderStep7(){
  const count=allActiveRegisterItems().length,historicalCount=inactiveRegisterItems().length,dutyResults=dutyOperationalResults();
  return `<div class="panel">${intro('Anforderungen, Risiko- und Organisationsmaßnahmen sowie fachliche und juristische Prüfbedarfe werden in fünf getrennten, editierbaren Registern geführt.')} ${requiredNote()}
    <div class="transfer-box"><div><strong>Abgeleitete Befunde synchronisieren</strong><p>Aktualisiert quellenbezogene Einträge, bewahrt manuelle Ergänzungen und kennzeichnet inaktive Quellen oder Konflikte. Duplikate werden vermieden.</p></div><button type="button" class="secondary-button" id="deriveRegistersButton">Befunde synchronisieren</button></div>
    ${sectionTitle('Strukturierte Prüfung der Pflichterfüllung und mehrerer Rechtsregime','DUTY-47 berücksichtigt neben EU AI Act und Cyber Resilience Act gegebenenfalls Datenschutzrecht, sektorales Recht sowie weitere dokumentierte Rechtsregime.')}${fieldGrid(
      hField('Ist eindeutig geklärt, ob die vorgesehenen Maßnahmen die einschlägigen gesetzlichen Pflichten erfüllen und wie mehrere anwendbare Rechtsregime zusammenwirken?','legalRegimeFulfilment',{required:true,type:'select',full:true,values:[['clarified','Ja – eindeutig geklärt'],['unresolved','Nein – ungeklärte oder widersprüchliche Pflichterfüllung'],['review','Weiterer Prüfbedarf']]})+
      (isFilled(state.form.legalRegimeFulfilment)?hField('Begründung und Nachweise zu Pflichterfüllung und Zusammenwirken der Rechtsregime','legalRegimeFulfilmentEvidence',{required:true,type:'textarea',full:true,hint:'Dokumentieren Sie die geprüften Pflichten, Rechtsregime, Widersprüche, Zuständigkeiten und belastbaren Nachweise.'}):'')
    )}
    ${sectionTitle('Strukturierte Prüfung neuer technischer Eigenschaften','DUTY-46 wird als eigener, nachweisbarer Prüfpfad erfasst.')}${fieldGrid(hField('Neue, bislang nicht erfasste technische Eigenschaft festgestellt?','newTechnicalFeature',{required:true,type:'select',values:[['no','Nein'],['yes','Ja – fachliche Prüfung erforderlich'],['review','Noch zu klären']]})+hField('Begründung und technische Fundstelle','newTechnicalFeatureReason',{required:true,type:'textarea',full:true}))}
    ${details('Operationalisierte Pflichten und Prüfbedarfe',reportTable(['ID','Ergebnis','Begründung','Eingaben / Quellen','Ausführbarer Pfad'],dutyResults.map(item=>[item.id,labelFor(item.value),item.reason,item.sources.join(' · '),item.path])),false,`${dutyResults.filter(item=>item.value==='yes').length} positiv · ${dutyResults.filter(item=>item.value==='review').length} Prüfbedarf`)}
    <div class="path-stack">${Object.keys(registerSchemas).map(renderRegister).join('')}</div>
    ${historicalCount?`<p class="path-intro"><strong>${historicalCount} historische beziehungsweise nicht mehr aktive Einträge</strong> bleiben zur Nachvollziehbarkeit erhalten und beeinflussen den aktuellen Status nicht.</p>`:''}
    ${!count?fieldGrid(hField('Begründung, falls keine aktiven Einträge erforderlich sind','noRegisterReason',{required:true,type:'textarea',full:true})):''}
    ${sectionTitle('Konsolidierter Maßnahmenplan')}${fieldGrid(
      hField('Koordination und Gesamtverantwortung','planCoordinator',{required:true})+
      hField('Gesamtstatus des Plans','planStatus',{required:true,type:'select',values:[['complete','Vollständig'],['partial','Teilweise'],['blocked','Blockiert']]})+
      hField('Umsetzungshinweise','implementationNotes',{type:'textarea',full:true})+hField('Nachweise zum Plan','planEvidence',{type:'textarea'})+
      hField('Querverweise zwischen Registern','crossReferences',{type:'textarea'})
    )}
    ${resultLine('Anforderungs-, Maßnahmen- und Prüfbedarfsplan',stepSubstantiveResult(6),incompleteRegisterItems().length?'warning':count?'positive':'warning')}
  </div>`;
}

function triggerField(trigger,index,label,key,kind='text'){
  const value=trigger[key]??'';
  if(kind==='select')return`<label><span>${escapeHtml(label)} <span class="required-mark">*</span></span><select data-trigger-index="${index}" data-trigger-field="${key}"><option value="">Bitte auswählen</option><option value="yes" ${value==='yes'?'selected':''}>Ja – Neubewertung erforderlich</option><option value="no" ${value==='no'?'selected':''}>Nein – nicht als Trigger festgelegt</option></select></label>`;
  return`<label><span>${escapeHtml(label)} <span class="required-mark">*</span></span><input type="${kind}" data-trigger-index="${index}" data-trigger-field="${key}" value="${escapeHtml(value)}"></label>`;
}

function renderTriggers(){
  return `<div class="trigger-list">${triggerDefs.map(([id,title,details,steps],index)=>{const trigger=state.triggers[index];return`<details class="trigger-card" data-guide-id="${escapeHtml(id)}"><summary><span><small class="question-id">${escapeHtml(id)}</small>${escapeHtml(title)}</span><strong>${trigger.required==='yes'?'Neubewertung':trigger.required==='no'?'Bewusst nicht angewendet':'Offen'}</strong></summary><p class="path-intro">${escapeHtml(details)}</p><div class="field-grid">${triggerField(trigger,index,'Als verbindlichen Auslöser festlegen','required','select')}${trigger.required==='yes'?triggerField(trigger,index,'Betroffene Prüfschritte', 'steps')+triggerField(trigger,index,'Verantwortliche Stelle','owner')+triggerField(trigger,index,'Reaktionsfrist','due','date'):trigger.required==='no'?triggerField(trigger,index,'Begründung der bewussten Nichtanwendung','reason'):''}</div>${steps?`<small>Leitfadenbezug zu Prüfschritten: ${escapeHtml(steps)}</small>`:''}</details>`;}).join('')}</div>`;
}

function renderEvaluationBox(title,result){
  const issues=[...result.contradictions.map(sanitizeVisibleText),...result.missing.map(item=>`Fehlend: ${displayFieldName(item)}`),...result.reviewNeeds.map(item=>`Prüfbedarf: ${sanitizeVisibleText(item)}`)];
  return `<div class="evaluation-box ${result.contradictions.length?'invalid':result.code==='review'||result.code==='information'?'warning':'valid'}"><div><span>${escapeHtml(title)}</span><strong>${escapeHtml(result.label)}</strong><small>${escapeHtml(result.basis)}</small></div>${result.manual?`<p><b>Manuell:</b> ${escapeHtml(result.manualLabel)}</p>`:''}${result.triggers.length?`<p><b>Auslöser:</b> ${escapeHtml(result.triggers.join(' · '))}</p>`:''}${issues.length?`<ul>${issues.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:''}</div>`;
}

function prohibitedQuestionBlock([key,label]){
  const answer=state.form[key]||'';
  label=guideLabel(QUESTION_IDS[key])||label;
  const options=[['not_applicable','Nicht einschlägig'],['not_met','Nicht erfüllt'],['possible','Potenziell einschlägig'],['confirmed','Erfüllt'],['exception_review','Ausnahme prüfen']];
  const question=`<div class="question" data-question="${key}" data-guide-id="${escapeHtml(QUESTION_IDS[key])}"><div class="question-copy">${questionIdMarkup(key)}<strong>${escapeHtml(label)} <span class="required-mark">*</span></strong><small>${escapeHtml(guideHint(QUESTION_IDS[key])||'Die Beurteilung gilt nur für die konkret dokumentierte Verwendung.')}</small></div><div class="choice-group" role="radiogroup" aria-label="${escapeHtml(label)}">${options.map(([v,t])=>`<button type="button" data-answer="${v}" class="${answer===v?'selected':''}" aria-pressed="${answer===v}">${escapeHtml(t)}</button>`).join('')}</div></div>`;
  if(['not_applicable','not_met'].includes(answer)||!answer)return question;
  if(isSensitiveArt5(key))return question+`<div class="conditional-fields prohibition-followup"><p>Anbieter- und Betreiberpfad werden nach Art. 5 Abs. 1 Buchst. ba beziehungsweise bb und Abs. 1a getrennt geprüft.</p>${fieldGrid(
    hField('Anbieter: System wird in Verkehr gebracht oder in Betrieb genommen',`${key}ProviderProvision`,{required:true,type:'select',values:choiceOptions})+
    hField('Betreiber: System wird konkret zur Erzeugung oder Manipulation verwendet',`${key}OperatorUse`,{required:true,type:'select',values:choiceOptions})+
    hField('Erzeugung oder Manipulation ist vorgesehener Zweck',`${key}IntendedPurpose`,{required:true,type:'select',values:choiceOptions})+
    hField('Ergebnis ist vorhersehbar und reproduzierbar',`${key}ForeseeableReproducible`,{required:true,type:'select',values:choiceOptions})+
    hField('Zumutbare technische Sicherheits- und Schutzmaßnahmen verhindern die Erzeugung zuverlässig',`${key}Safeguards`,{required:true,type:'select',values:choiceOptions})+
    hField('Umgehungen wurden beobachtet oder gemeldet',`${key}Circumventions`,{required:true,type:'select',values:choiceOptions})+
    hField('Wirksame Korrekturmaßnahmen wurden ergriffen',`${key}CorrectiveMeasures`,{required:true,type:'select',values:choiceOptions})+
    (key==='pNonConsensualIntimate'?hField('Ausdrückliche, freiwillige, spezifische, aufgeklärte und eindeutige Einwilligung liegt vor',`${key}Consent`,{required:true,type:'select',values:choiceOptions}):hField('Gesetzliche Rechtfertigung nach anwendbarem nationalem Recht ist belegt',`${key}LegalJustification`,{required:true,type:'select',values:choiceOptions}))+
    hField('Gesetzliche Ausnahme oder Rechtfertigung',`${key}Exception`,{required:true,type:'select',values:[['none','Keine'],['possible','Möglicherweise einschlägig'],['confirmed','Nachgewiesen'],['review','Juristisch zu prüfen']]})+
    hField('Begründung und vorgesehene Verwendung',`${key}Reason`,{required:true,type:'textarea',full:true})+
    hField('Nachweise und technische Belege',`${key}Evidence`,{required:true,type:'textarea',full:true})+
    hField('Zuständige juristische Prüfstelle',`${key}LegalOwner`,{required:true})+
    hField('Entscheidungskritikalität',`${key}Critical`,{required:true,type:'select',values:[['yes','Entscheidungskritisch'],['no','Nicht entscheidungskritisch']]})
  )}</div>`;
  return question+`<div class="conditional-fields prohibition-followup"><p>Der Tatbestand muss verwendungsbezogen geklärt werden.</p>${fieldGrid(
    hField('Konkrete Verwendung',`${key}Use`,{required:true,type:'textarea',full:true})+
    hField('Ergebnis der Tatbestandsprüfung',`${key}ElementsResult`,{required:true,type:'select',values:[['not_met','Merkmale nicht erfüllt'],['possible','Merkmale möglicherweise erfüllt'],['met','Merkmale erfüllt'],['review','Juristisch zu prüfen']]})+
    hField('Geprüfte Tatbestandsvoraussetzungen',`${key}Elements`,{required:true,type:'textarea',full:true})+
    hField('Mögliche Ausnahme',`${key}Exception`,{required:true,type:'select',values:[['none','Keine Ausnahme einschlägig'],['possible','Ausnahme möglicherweise einschlägig'],['confirmed','Ausnahme nachgewiesen'],['review','Juristisch zu prüfen']]})+
    (state.form[`${key}Exception`]==='confirmed'?hField('Rechtsgrundlage der Ausnahme',`${key}ExceptionBasis`,{required:true,type:'textarea',full:true})+hField('Voraussetzungen der Ausnahme',`${key}ExceptionRequirements`,{required:true,type:'textarea'})+hField('Reichweite der Ausnahme',`${key}ExceptionScope`,{required:true,type:'textarea'}):'')+
    hField('Begründung',`${key}Reason`,{required:true,type:'textarea',full:true})+
    hField('Nachweis',`${key}Evidence`,{required:true,type:'textarea'})+
    hField('Betroffene Personen',`${key}Affected`,{required:true,type:'textarea'})+
    hField('Zuständige juristische Prüfstelle',`${key}LegalOwner`,{required:true})+
    hField('Entscheidungskritikalität',`${key}Critical`,{required:true,type:'select',values:[['yes','Entscheidungskritisch'],['no','Nicht entscheidungskritisch']]})
  )}</div>`;
}

function transparencyQuestionBlock([key,label]){
  label=label||guideLabel(QUESTION_IDS[key]);
  const base=hQuestion(key,label,'Die Prüfung und eine mögliche Ausnahme gelten ausschließlich für diesen Tatbestand.');
  if(state.form[key]!=='yes')return base;
  const exception=state.form[`${key}Exception`],legalActor=transparencyActorByKey[key],actorLabel=legalActor==='provider'?'Anbieter':legalActor==='deployer'?'Betreiber':'Jeweils Verpflichteter';
  if(!isFilled(state.form[`${key}Actor`]))state.form[`${key}Actor`]=legalActor;
  return base+`<div class="conditional-fields"><p>Konkrete Pflicht und Ausnahme tatbestandsspezifisch dokumentieren.</p>${fieldGrid(
    hField('Konkrete Verwendung',`${key}Use`,{required:true,type:'textarea',full:true})+
    `<div class="calculated-field"><span>Gesetzlich verpflichteter Akteur</span><strong>${actorLabel}</strong><small>Art. 50 – verbindliche Zuordnung</small><select class="visually-hidden" data-field="${key}Actor" aria-label="Gesetzlich verpflichteter Akteur"><option value="${legalActor}" selected>${actorLabel}</option></select></div>`+
    hField('Konkrete Transparenzpflicht',`${key}Duty`,{required:true,type:'textarea',full:true})+
    hField('Mögliche Ausnahme',`${key}Exception`,{required:true,type:'select',values:[['no','Nein'],['yes','Ja'],['review','Weiterer Prüfbedarf']]})+
    (exception==='yes'?hField('Rechtsgrundlage der Ausnahme',`${key}ExceptionBasis`,{required:true,type:'textarea',full:true})+hField('Voraussetzungen der Ausnahme',`${key}ExceptionRequirements`,{required:true,type:'textarea'})+hField('Reichweite der Ausnahme',`${key}ExceptionScope`,{required:true,type:'textarea'}):'')+
    hField('Begründung',`${key}Reason`,{required:true,type:'textarea',full:true})+hField('Nachweis',`${key}Evidence`,{required:true,type:'textarea'})+
    hField('Ergebnis dieses Tatbestands',`${key}Result`,{required:true,type:'select',values:[['applicable','Pflicht anwendbar'],['exception','Ausnahme dokumentiert'],['not_applicable','Nicht anwendbar'],['review','Weiterer Prüfbedarf']]})
  )}</div>`;
}

function renderStep2(){
  const scope=evaluateScope(),definition=evaluateAISystemDefinition();
  return `<div class="panel">${intro('Zuerst wird die KI-System-Definition nach Art. 3 Nr. 1 geprüft. Danach folgt getrennt der Anwendungsbereich nach Art. 2.')} ${requiredNote()}
    ${details('A · KI-System-Definition nach Art. 3 Nr. 1',questionsFrom(definitionQuestionKeys.slice(0,14).map(key=>[key]))+fieldGrid(
      hField(guideLabel('DEF-15'),'objectType',{required:true,type:'select',full:true,values:[['system','KI-System'],['model','KI-Modell bzw. Komponente'],['system_with_model','KI-System mit KI-Modell'],['review','Weiterer Prüfbedarf']],hint:guideHint('DEF-15')})+
      hField('Begründung der Definitionseinordnung','definitionBasis',{required:true,type:'textarea',full:true})+hField('Technische Nachweise und Informationsquellen','definitionEvidenceSource',{required:true,type:'textarea',full:true})+hField('Weitere Hinweise zur Abgrenzung','definitionNotes',{type:'textarea',full:true})
    )+renderEvaluationBox('Regelbasiert abgeleitete Auswertung',definition),true,definition.label)}
    ${details('B · Anwendungsbereich nach Art. 2',questionsFrom(scopeQuestionKeys.map(key=>[key]))+sectionTitle('Ergänzende Tatsachen zu SCOPE-14','Diese prototypspezifischen Tatsachen konkretisieren den Ausschluss vor Inverkehrbringen oder Inbetriebnahme und tragen keine Leitfaden-ID.')+questionsFrom([
      ['realWorldTesting','Erfolgt ein Test unter realen Bedingungen?','Ein Test unter realen Bedingungen ist vom Ausschluss nach Art. 2 Abs. 8 ausgenommen.'],['actualOperationalUse','Findet bereits ein tatsächlicher betrieblicher Einsatz statt?','Ein betrieblicher Einsatz ist nicht ausschließlich Forschung, Test oder Entwicklung vor Inverkehrbringen beziehungsweise Inbetriebnahme.']
    ])+fieldGrid(
      hField('Begründung des Anwendungsstatus','scopeBasis',{required:true,type:'textarea',full:true})+hField('Nachweise und Fundstellen','scopeEvidence',{required:true,type:'textarea',full:true})+
      ([state.form.scopeAnnexIB,state.form.scopeAnnexIAEquivalent].includes('yes')?hField('Verantwortliche Stelle für die Klärung des begrenzten Pflichtenumfangs','scopeLimitationOwner',{required:true})+hField('Frist zur Klärung des begrenzten Pflichtenumfangs','scopeLimitationDue',{required:true,type:'date'}):'')+
      hField('Übergangs- oder Stichtag','transitionDate',{type:'date'})+hField('Weitere Hinweise','scopeNotes',{type:'textarea'})
    )+renderEvaluationBox('Regelbasiert abgeleitete Auswertung',scope),false,scope.label)}
  </div>`;
}

function renderCraAssessment(evaluation){
  const gate=craApplicabilityGate(),opening=questionsFrom(['craDigitalProduct','craRemoteProcessing','craDataConnection','craCommercial','craPrototype','craOpenSource','craExclusion'].map(key=>[key]));
  const conclusion=fieldGrid(conclusionSelect('Manuelle Schlussfolgerung','craConclusion',[['no','Auf das Produkt nicht anwendbar'],['product_only','Auf das Produkt anwendbar; keine eigene Wirtschaftsakteursrolle'],['yes','Auf das Produkt anwendbar; eigene Pflichten festgestellt'],['special','Ausschluss / Spezialregelung'],['review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf']])+hField('Begründung, Rolle und Produktkategorie','craBasis',{required:true,type:'textarea',full:true})+hField('Konformität, Schwachstellen- und Vorfallnachweise','craEvidence',{required:true,type:'textarea',full:true}));
  if(gate.status==='no')return opening+`<div class="evaluation-box valid"><div><span>CRA-08 bis CRA-12</span><strong>Nicht erforderlich</strong><small>${escapeHtml(gate.reason)} Historische Angaben bleiben gespeichert, werden aber nicht als aktuelles Ergebnis verwendet.</small></div></div>`+conclusion+renderEvaluationBox('Plausibilisierte Auswertung',evaluation);
  return opening+questionsFrom(['craSubstantialChange','craManufacturerTakeover','craAiActOverlap'].map(key=>[key]))+sectionTitle(guideLabel('CRA-08'),'Alle tatsächlich einschlägigen Rollen einzeln auswählen; mehrere Rollen können gleichzeitig bestehen. Bestätigte und noch ungeklärte Rollen werden parallel ausgewiesen.')+fieldGrid(
    craRoleFields.map(([field,,label])=>hField(label,field,{required:true,type:'select',values:[['no','Nein'],['yes','Ja'],['review','Weiterer Prüfbedarf']]})).join('')+
    hField(guideLabel('CRA-11'),'craProductClass',{required:true,type:'select',full:true,values:[['other','Sonstiges Produkt'],['class1','Klasse I'],['class2','Klasse II'],['critical','Kritisches Produkt'],['none','Keine – nur wenn die Produktklassifizierung nicht einschlägig ist'],['review','Weiterer Prüfbedarf']],hint:guideHint('CRA-11')})+
    (state.form.craPrototype==='yes'?hField('Prototyp ist ausschließlich für zeitlich und sachlich begrenzte Tests bereitgestellt','craPrototypeLimitedTesting',{required:true,type:'select',values:regulatoryChoiceOptions})+hField('Prototyp- oder Teststatus ist gegenüber Empfängern eindeutig gekennzeichnet','craPrototypeMarked',{required:true,type:'select',values:regulatoryChoiceOptions}):'')+
    hField('Produktart','craProductType',{required:true,type:'select',values:[['software','Software'],['hardware','Hardware'],['remote','Fernverarbeitungslösung'],['mixed','Kombiniertes Produkt'],['unclear','Nicht eindeutig beurteilbar']]})+
    hField('Produktbezug','craProductRelation',{required:true,type:'select',values:[['standalone','Eigenständiges Produkt'],['component','Bestandteil'],['unclear','Nicht eindeutig beurteilbar']]})+
    hField('Konformitätsbewertungsverfahren','craConformityProcedure',{required:true,type:'textarea',full:true})+hField('Schwachstellenbehandlung','craVulnerabilityProcess',{required:true,type:'textarea'})+hField('Meldepflichten','craReportingProcess',{required:true,type:'textarea'})+hField('Datum des erstmaligen Inverkehrbringens','craFirstMarketDate',{required:true,type:'date'})+(state.form.craSubstantialChange==='yes'?hField('Datum der wesentlichen Änderung nach CRA-09','craSubstantialChangeDate',{required:true,type:'date'}):'')+hField('Übergangs- und Anwendungszeitpunkte','craTransitionDates',{required:true,type:'textarea',full:true})+hField('Nachweis zur CRA-Übergangsregel','craTransitionEvidence',{required:true,type:'textarea',full:true})+
    (state.form.craExclusion==='yes'?hField('Rechtsgrundlage des Ausschlusses','craExclusionBasis',{required:true,type:'textarea',full:true})+hField('Voraussetzungen des Ausschlusses','craExclusionRequirements',{required:true,type:'textarea'})+hField('Nachweis des Ausschlusses','craExclusionEvidence',{required:true,type:'textarea'}):'')+
    hField('Überschneidung mit dem AI Act','craAiActOverlapNotes',{type:'textarea',full:true})
  )+conclusion+renderEvaluationBox(`Plausibilisierte Auswertung · bestätigte Rolle(n): ${(evaluation.roles||[]).join(', ')||'keine'} · ungeklärte Rolle(n): ${(evaluation.possibleRoles||[]).join(', ')||'keine'} · Kategorie: ${evaluation.category||'offen'}`,evaluation);
}

function renderStep4(){
  const e=allRegulatoryEvaluations(),path=aiActPathStatus(),gpaiPath=gpaiPathStatus(),high=evaluateHighRiskSummary(),annexHit=annexAreas.some(([key])=>state.form[key]==='yes');
  const continueAI=path.required&&e.prohibition.code!=='confirmed',stoppedReason=e.prohibition.code==='confirmed'?'Nicht fortgeführt aufgrund festgestellter verbotener KI-Praxis. GPAI, CRA sowie technische und organisatorische Prüfungen bleiben möglich.':path.reason;
  const annexFollow=annexHit?`${sectionTitle('Filterprüfung nach Art. 6 Abs. 3','Die vier Bedingungen HR-14 bis HR-17 sind alternativ. HR-18 ist nur eine Kontrollfrage; HR-19 schließt den Filter bei Profiling aus.')}${fieldGrid(hField('Konkreter Anhang-III-Verwendungsfall','specificAnnexUse',{required:true,type:'textarea',full:true}))}${questionsFrom(['narrowProcedural','completedResultImprovement','patternDetection','preparatoryTask','materialInfluenceControl','profiling'].map(key=>[key]))}${state.form.annexEssentialServices==='yes'?hQuestion('annexIII5bc',guideLabel('HR-20'),guideHint('HR-20'),regulatoryChoiceOptions):''}`:'';
  const notRequired=reason=>`<div class="evaluation-box valid"><div><span>Pfadstatus</span><strong>Nicht erforderlich</strong><small>${escapeHtml(reason)}</small></div></div>`;
  const art27Block=continueAI&&e.annexHighRisk.code==='yes'&&state.form.role_deployer?sectionTitle('Ableitungsgrundlagen für Art. 27 und Art. 49','Die Tatsachen werden nicht doppelt abgefragt, sondern aus CTX-13, CTX-14, HR-07 und HR-20 übernommen.')+`<div class="report-facts">${reportFact('CTX-13',labelFor(state.form.publicServiceEntity))}${reportFact('CTX-14',labelFor(state.form.unionAuthority))}${reportFact('Anhang III Nr. 2',labelFor(state.form.annexCriticalInfrastructure))}${reportFact('HR-20',labelFor(state.form.annexIII5bc))}</div>`:'';
  return `<div class="panel">${intro('Jeder regulatorische Pfad besitzt eine automatische Auswertung. Manuelle Schlussfolgerungen werden nur akzeptiert, wenn sie mit den Tatsachenangaben vereinbar sind.')} ${requiredNote()}${path.provisional?'<div class="validation-alert"><strong>Vorläufige Einordnung</strong><p>Schritt 2 ist noch unklar. Alle AI-Act-Ergebnisse bleiben vorläufig und erlauben keine abschließende Empfehlung.</p></div>':''}
    ${details('A · Verbotene KI-Praktiken nach Art. 5',path.required?prohibitedQuestions.map(prohibitedQuestionBlock).join('')+fieldGrid(
      conclusionSelect('Manuelle Schlussfolgerung','prohibitionConclusion',[['none','Kein Verbotstatbestand festgestellt'],['exception','Tatbestand mit Ausnahme dokumentiert'],['confirmed','Verbotstatbestand festgestellt'],['review','Nicht abschließend beurteilbar']])+hField('Gesamtbegründung','prohibitionBasis',{required:true,type:'textarea',full:true})+hField('Nachweise und Fundstellen','prohibitionEvidence',{required:true,type:'textarea',full:true})
    )+renderEvaluationBox('Plausibilisierte Auswertung',e.prohibition):notRequired(path.reason),true,e.prohibition.label)}
    ${details('B · Hochrisiko nach Art. 6 Abs. 1 / Anhang I',continueAI?questionsFrom([['productCovered'],['productSafetyComponent']])+fieldGrid(
      hField(guideLabel('HR-03'),'annexISection',{required:true,type:'select',full:true,values:[['A','Anhang I Abschnitt A'],['B','Anhang I Abschnitt B'],['review','Weiterer Prüfbedarf']],hint:guideHint('HR-03')})
    )+questionsFrom([['thirdPartyConformity'],['conformityNonSafetyOnly']])+fieldGrid(
      conclusionSelect('Manuelle Schlussfolgerung','productHighRiskConclusion',[['no','Nicht einschlägig'],['yes','Hochrisiko-KI-System'],['review','Weiterer Prüfbedarf']])+hField('Begründung der Prüfung','productHighRiskBasis',{required:true,type:'textarea',full:true})+hField('Produktrechtliche Nachweise','productHighRiskEvidence',{required:true,type:'textarea',full:true})
    )+renderEvaluationBox('Plausibilisierte Auswertung',e.productHighRisk):notRequired(stoppedReason),false,e.productHighRisk.label)}
    ${details('C · Hochrisiko nach Art. 6 Abs. 2 / Anhang III',continueAI?questionsFrom(annexAreas)+annexFollow+fieldGrid(
      conclusionSelect('Manuelle Schlussfolgerung','annexHighRiskConclusion',[['no','Nicht einschlägig'],['yes','Hochrisiko-KI-System'],['exception','Ausnahme nach Art. 6 Abs. 3 dokumentiert'],['review','Weiterer Prüfbedarf']])+hField('Begründung','annexBasis',{required:true,type:'textarea',full:true})+hField('Nachweise, Dokumentation und Registrierung','annexEvidence',{required:true,type:'textarea',full:true})
    )+renderEvaluationBox('Plausibilisierte Auswertung',e.annexHighRisk)+art27Block+(high.code==='high_risk'?temporalFields('highRisk','Zeitliche Anwendbarkeit der Hochrisikopflichten'):''):notRequired(stoppedReason),false,e.annexHighRisk.label)}
    ${details('D · Anbieterpflichten nach Art. 25',continueAI&&high.code==='high_risk'?questionsFrom(['art25OwnBrand','art25SubstantialModification','art25PurposeChange','art25ProductIntegration'].map(key=>[key]))+fieldGrid(hField('Abschließende Art.-25-Einordnung','art25Conclusion',{required:true,type:'select',values:[['provider','Anbieterpflichten einschlägig'],['not_applicable','Nicht einschlägig'],['review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf']]})+hField('Begründung und Nachweis','art25Basis',{required:true,type:'textarea',full:true})+hField('Lieferketten- oder Vertragsbeziehung zu Zulieferern nach Art. 25 Abs. 4','art25SupplierRelationship',{required:true,type:'textarea',full:true})+hField('Nachweis der schriftlichen Vereinbarung oder begründeten Nichtrelevanz','art25SupplierEvidence',{required:true,type:'textarea',full:true}))+renderEvaluationBox('Regelbasiert abgeleitete Auswertung',e.art25)+(e.art25.code==='applicable'?temporalFields('art25','Zeitliche Anwendbarkeit der Art.-25-Pflichten'):''):notRequired(continueAI?'Art. 25 wird erst nach einer festgestellten Hochrisikoeinstufung geprüft.':stoppedReason),false,e.art25.label)}
    ${details('E · Transparenzpflichten nach Art. 50',continueAI?transparencyQuestions.map(transparencyQuestionBlock).join('')+fieldGrid(
      conclusionSelect('Manuelle Schlussfolgerung','transparencyConclusion',[['none','Keine Pflicht festgestellt'],['provider','Anbieterpflicht'],['deployer','Betreiberpflicht'],['multiple','Mehrere Pflichten'],['exception','Ausnahme dokumentiert'],['review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf']])+hField('Begründung','transparencyBasis',{required:true,type:'textarea',full:true})+hField('Nachweise und geplante Kennzeichnung','transparencyEvidence',{required:true,type:'textarea',full:true})
    )+renderEvaluationBox('Plausibilisierte Auswertung',e.transparency)+(['provider','deployer','multiple'].includes(e.transparency.code)?temporalFields('transparency','Zeitliche Anwendbarkeit der Transparenzpflichten'):''):notRequired(stoppedReason),false,e.transparency.label)}
    ${details('F · GPAI-Modell und systemisches Risiko',gpaiPath.required?`<p class="path-intro">${escapeHtml(gpaiPath.reason)}</p>`+questionsFrom(gpaiQuestions.filter(([key])=>key!=='gObjectType'))+fieldGrid(
      hField(guideLabel('GPAI-04'),'gObjectType',{required:true,type:'select',full:true,values:[['model','Modell'],['system','GPAI-System'],['integrating','Integrierendes System'],['review','Weiterer Prüfbedarf']],hint:guideHint('GPAI-04')})+
      hField('Rolle der Organisation','gpaiOrganizationRole',{required:true,type:'select',values:[['none','Keine GPAI-Rolle'],['provider','GPAI-Anbieter'],['downstream','Nachgelagerter Anbieter'],['integrator','Integrator'],['unclear','Nicht eindeutig beurteilbar']]})+
      conclusionSelect('Manuelle Schlussfolgerung','gpaiConclusion',[['none','Keine GPAI-Relevanz'],['research_exception','Ausschließliche Forschung, Entwicklung oder Prototyping vor Inverkehrbringen'],['relevant_no_provider','GPAI-Modell betroffen, jedoch keine eigene Anbieterrolle'],['model','GPAI-Modell mit Anbieterrolle'],['integration','GPAI-Integration / nachgelagerte Rolle ohne Modell-Anbieterpflichten'],['systemic','Systemisches Risiko'],['review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf']])+hField('Begründung und Rollenabgrenzung','gpaiBasis',{required:true,type:'textarea',full:true})+hField('Technische Dokumentation und Nachweise','gpaiEvidence',{required:true,type:'textarea',full:true})
    )+renderEvaluationBox(`Plausibilisierte Auswertung · Rolle: ${e.gpai.role||'offen'}`,e.gpai)+(['model','integration','systemic'].includes(e.gpai.code)?temporalFields('gpai','Zeitliche Anwendbarkeit der GPAI-Pflichten'):''):notRequired(gpaiPath.reason),false,e.gpai.label)}
    ${details('G · Cyber Resilience Act',renderCraAssessment(e.cra),false,e.cra.label)}
    ${details('H · Zeitliche Anwendbarkeit',questionsFrom(['timeAssessmentBasis','timeDutyStatuses','timeTransition','timeLawChanged'].map(key=>[key]))+fieldGrid(hField('Ist das Hochrisiko-KI-System zur Verwendung durch eine Behörde oder öffentliche Stelle bestimmt?','publicAuthorityIntendedUse',{required:true,type:'select',values:[['yes','Ja'],['no','Nein'],['review','Weiterer Prüfbedarf']]})+hField('Vorgesehener Nutzungsbeginn','intendedUseDate',{required:true,type:'date'})+hField('Erstmaliges Inverkehrbringen','firstMarketDate',{required:true,type:'date'})+hField('Erstmalige Inbetriebnahme','firstOperationDate',{required:true,type:'date'})+hField('Wesentliche Änderung seit dem erstmaligen Bereitstellen','substantialChangeStatus',{required:true,type:'select',values:[['no','Nein'],['yes','Ja'],['review','Weiterer Prüfbedarf']]})+(state.form.substantialChangeStatus==='yes'?hField('Datum der wesentlichen Änderung','substantialChangeDate',{required:true,type:'date'}):'')+hField('Begründung der zeitlichen Einordnung','timeBasis',{required:true,type:'textarea',full:true})+hField('Belegte Stichtage und Übergangsregeln','timeEvidence',{required:true,type:'textarea',full:true})),false,'TIME-01 bis TIME-04')}
    ${sectionTitle('Pfadübergreifende Dokumentation')}${fieldGrid(hField('Weitere regulatorische Hinweise','regulatoryNotes',{type:'textarea',full:true})+hField('Rechtsquellen und Fundstellen','legalSources',{type:'textarea'})+hField('Übergangsfragen','transitionNotes',{type:'textarea'}))}
  </div>`;
}

function renderRiskCard(risk,index){
  const score=riskScore(risk),current=riskLevel(score),currentCode=effectiveCurrentRisk(risk),issues=riskContradictions(risk,index),treatment=risk.treatmentNeeded;
  const treatmentFields=treatment==='yes'?sectionTitle('Behandlung und erwartetes Restrisiko')+fieldGrid(
    riskField(index,'Behandlungsstrategie','treatmentStrategy',{type:'select',values:[['avoid','Vermeiden'],['reduce','Reduzieren'],['transfer','Übertragen'],['accept','Akzeptieren']]})+
    riskField(index,'Konkrete Maßnahme','proposedTreatment',{type:'textarea',full:true})+riskField(index,'Priorität','priority',{type:'select',values:riskSelects.priority})+
    riskField(index,'Maßnahmenverantwortung','owner')+riskField(index,'Termin','treatmentDue',{type:'date'})+
    riskField(index,'Erwartetes Restrisiko','expectedResidual',{type:'select',values:riskSelects.residual})+riskField(index,'Behandlungsstatus','treatmentStatus',{type:'select',values:riskSelects.treatmentStatus})+
    riskField(index,'Wirksamkeitskriterium','effectivenessCriterion',{type:'textarea',full:true})+
    (['implemented','verified'].includes(risk.treatmentStatus)?riskField(index,'Wirksamkeitsnachweis','effectivenessEvidence',{type:'textarea',full:true})+riskField(index,'Datum der Wirksamkeitsprüfung','effectivenessDate',{type:'date'})+riskField(index,'Prüfende Stelle','effectivenessReviewer'):'')+
    (risk.treatmentStatus==='verified'?riskField(index,'Verifiziertes Restrisiko','verifiedResidual',{type:'select',values:riskSelects.residual}):'')+
    (risk.treatmentStatus==='verified'&&risk.verifiedResidual&&({low:1,medium:2,high:3}[risk.verifiedResidual]>{low:1,medium:2,high:3}[currentCode])?riskField(index,'Erläuterung des höheren Restrisikos','residualIncreaseReason',{type:'textarea',full:true}):'')
  ):treatment==='no'?sectionTitle('Risikoakzeptanz ohne weitere Behandlung')+fieldGrid(
    riskField(index,'Akzeptanzbegründung','acceptanceReason',{type:'textarea',full:true})+riskField(index,'Risk Owner','riskOwner')+riskField(index,'Verantwortliche Bestätigung','acceptanceApproval',{type:'textarea'})
  ):treatment==='review'?sectionTitle('Weiterer Prüfbedarf')+fieldGrid(
    riskField(index,'Grund','reviewReason',{type:'textarea',full:true})+riskField(index,'Zuständige Stelle','reviewOwner')+riskField(index,'Frist','reviewDue',{type:'date'})
  ):'';
  return `<details class="risk-card" ${index===0?'open':''} data-risk-index="${index}"><summary><span>${escapeHtml(risk.riskId||`Risiko ${index+1}`)}</span><strong>${escapeHtml(risk.description||'Noch nicht beschrieben')}</strong><em class="risk-pill ${riskTone(current)}">Aktuell: ${escapeHtml(current)}</em></summary><div class="risk-card-body">
    <div class="risk-actions"><button type="button" class="text-button danger-text" data-remove-risk="${index}">Risiko entfernen</button></div>${issues.length?`<div class="validation-alert"><strong>Widersprüche</strong><ul>${issues.map(issue=>`<li>${escapeHtml(issue)}</li>`).join('')}</ul></div>`:''}
    ${sectionTitle('Identifikation und Risikoszenario')}${fieldGrid(riskField(index,'Risiko-ID','riskId')+riskField(index,'Quelle / Auslöser','source')+riskField(index,'Risikobeschreibung','description',{type:'textarea',full:true})+riskField(index,'Ereignis oder Fehlerszenario','event',{type:'textarea',full:true})+riskField(index,'Mögliche Folge oder Schaden','consequence',{type:'textarea',full:true})+riskField(index,'Betroffene Bereiche beziehungsweise Personen','affectedAreas',{type:'textarea',full:true})+riskField(index,'Risikokategorie','category'))}
    ${sectionTitle('Auswirkungsprofil – ergänzend')}${fieldGrid(riskField(index,'Organisation','orgEffect',{required:false,type:'textarea'})+riskField(index,'Personen und Rechte','personEffect',{required:false,type:'textarea'})+riskField(index,'Gesellschaft','societalEffect',{required:false,type:'textarea'})+riskField(index,'Umwelt','environmentalEffect',{required:false,type:'textarea'}))}
    ${sectionTitle('Kontrollen und aktuelle Bewertung')}${fieldGrid(riskField(index,'Bestehende Kontrollen','existingControls',{type:'textarea',full:true})+riskField(index,'Kontrollnachweis oder begründetes Fehlen','controlEvidence',{type:'textarea',full:true})+riskField(index,'Eintrittswahrscheinlichkeit','probability',{type:'select',values:riskSelects.probability})+riskField(index,'Auswirkung','impact',{type:'select',values:riskSelects.impact})+`<div class="calculated-field"><span>Aktuelles Risiko R = E × A</span><strong>${score??'–'} · ${escapeHtml(current)}</strong><small>Dieses Ergebnis bildet den aktuellen technischen Risikostand.</small></div>`+riskField(index,'Kontrollwirksamkeit','controlEffectiveness',{type:'select',values:riskSelects.controlEffectiveness})+riskField(index,'Bewertungsunsicherheit','uncertainty',{type:'select',values:riskSelects.uncertainty})+riskField(index,'Akzeptanzstatus','acceptance',{type:'select',values:riskSelects.acceptance})+(currentCode==='high'&&risk.acceptance==='accepted'?riskField(index,'Besondere Begründung für die Akzeptanz eines hohen Risikos','criticalAcceptanceReason',{type:'textarea',full:true})+(treatment!=='no'?riskField(index,'Risk Owner der Akzeptanz','riskOwner')+riskField(index,'Dokumentierte menschliche Entscheidung','acceptanceApproval',{type:'textarea',full:true}):''):'')+riskField(index,'Behandlung erforderlich','treatmentNeeded',{type:'select',values:riskSelects.yesNo})+riskField(index,'Entscheidungskritikalität','decisionCriticality',{type:'select',values:riskSelects.yesNo})+(riskOutsideTolerance(risk)?riskField(index,'Ist eine geeignete Risikobehandlung bestimmbar?','suitableTreatmentAvailability',{type:'select',values:[['available','Ja – verfügbar, möglich oder geplant'],['unavailable','Nein – ausdrücklich nicht bestimmbar'],['review','Noch zu klären']]})+riskField(index,'Begründung zur Behandlungsmöglichkeit','treatmentAvailabilityReason',{type:'textarea',full:true}):''))}
    ${treatmentFields}
    ${sectionTitle('Prüfung und Verknüpfungen')}${fieldGrid(riskField(index,'Fachliche Prüfung erforderlich','expertReview',{required:false,type:'select',values:riskSelects.yesNo})+riskField(index,'Juristische Prüfung erforderlich','legalReview',{required:false,type:'select',values:riskSelects.yesNo})+riskField(index,'Verknüpfte Anforderung','linkedRequirement',{required:false})+riskField(index,'Monitoringindikator','monitoringIndicator',{required:false})+riskField(index,'Weitere Hinweise','comments',{required:false,type:'textarea',full:true}))}
  </div></details>`;
}

function renderStep5(){const issues=allRiskContradictions();return `<div class="panel">${intro('Technische Eigenschaften, Risikofelder und Szenarien werden getrennt dokumentiert. Die fachliche Bewertung verwendet ausschließlich die 3×3-Matrix aus Kapitel 3.')} ${requiredNote()}
  ${details('A · Technische Eigenschaften',fieldGrid(riskContextKeys.map(key=>hField(guideLabel(QUESTION_IDS[key]),key,{required:true,type:'textarea',full:true,hint:guideHint(QUESTION_IDS[key])})).join(''))+`<div class="reserved-ids"><strong>Reservierte Kennungen:</strong> RISK-07, RISK-08 und RISK-09 werden entsprechend dem Leitfaden nicht vergeben.</div>`,true,'RISK-01 bis RISK-06')}
  ${details('B · Risikofelder',questionsFrom(riskDomainKeys.map(key=>[key])),false,'RISK-10 bis RISK-23')}
  ${details('C · Übergreifende Risikoprüfung',questionsFrom(riskEvaluationKeys.map(key=>[key])),false,'RISK-24 bis RISK-31')}
  ${renderMatrix()}${issues.length?`<div class="validation-alert"><strong>${countLabel(issues.length,'Widerspruch','Widersprüche')} im Risikoregister</strong><ul>${issues.map(issue=>`<li>${escapeHtml(issue)}</li>`).join('')}</ul></div>`:''}${sectionTitle('Risikoregister',state.risks.length?`${countLabel(state.risks.length,'Risiko','Risiken')} erfasst.`:'Noch kein Risiko erfasst – der Prüfschritt bleibt nach dem Verlassen rot.')}<div class="risk-list">${state.risks.length?state.risks.map(renderRiskCard).join(''):'<div class="empty-state"><strong>Keine Risiken im Register</strong><p>Erfassen Sie reale Risiken des konkreten Einsatzes.</p></div>'}</div><button type="button" class="add-button" id="addRiskButton">+ Risiko hinzufügen</button>${resultLine('Risikoprofil',stepSubstantiveResult(4),issues.length?'danger':state.risks.length?'warning':'danger')}</div>`;}

function renderRegister(type){
  const schema=registerSchemas[type],items=state.registers[type],indexed=items.map((item,index)=>({item,index})),active=indexed.filter(({item})=>isActiveRegisterItem(item)),historical=indexed.filter(({item})=>!isActiveRegisterItem(item));
  const cards=list=>list.map(({item,index})=>`<div class="register-card ${item.sourceActive===false?'source-inactive':''} ${item.syncConflict||item.syncConflictEvidence?'has-conflict':''}"><div class="register-card-head"><div><strong>${escapeHtml(item.id||`${schema.title} ${index+1}`)}</strong>${item.organizationalGapId?`<small>Leitfaden-Zuordnung: ${escapeHtml(item.organizationalGapId)} ↔ ${escapeHtml(item.sourceQuestionId||item.sourceId||'Organisationskriterium')}</small>`:''}${item.derived?`<small>Quelle: Prüfschritt ${escapeHtml(item.sourceStep)} · ${escapeHtml(item.sourceId)} · ${item.sourceActive===false?'historisch / Quelle nicht mehr aktiv':'synchronisiert und aktuell aktiv'}</small>`:item.syncSourceId?`<small>Manueller Eintrag; Quellhinweis ${escapeHtml(item.syncSourceStep)} / ${escapeHtml(item.syncSourceId)} bleibt getrennt.</small>`:''}${item.duplicateResolutionNote?`<small>${escapeHtml(item.duplicateResolutionNote)}</small>`:''}</div><button type="button" class="text-button danger-text" data-remove-register="${type}" data-register-index="${index}">Entfernen</button></div>${(item.syncConflict||item.syncConflictEvidence)&&isActiveRegisterItem(item)?`<div class="validation-alert"><strong>Synchronisierungskonflikt</strong><p>${escapeHtml(item.syncConflictEvidence||`Manuell geänderte Felder wurden nicht überschrieben: ${item.syncConflict}`)}</p></div><div class="field-grid conflict-resolution">${registerField(type,index,'Konfliktstatus','conflictResolutionStatus','select',[['open','Offen'],['resolved','Geklärt und bestätigt']])}${registerField(type,index,'Dokumentierte Auflösung und bestätigter Wert','conflictResolutionReason','textarea')}</div>`:''}<div class="field-grid">${schema.fields.map(([key,label,kind,values])=>registerField(type,index,label,key,kind,values)).join('')}</div></div>`).join('');
  const body=`<p class="path-intro">${items.length?`${active.length} aktiv · ${historical.length} historisch. Abgeleitete Einträge werden quellenbezogen synchronisiert.`:'Noch keine Einträge.'}</p><h3>Aktueller Umsetzungsstand</h3><div class="register-list">${active.length?cards(active):'<div class="empty-state"><strong>Keine aktiven Einträge</strong><p>Historische Einträge beeinflussen die aktuelle Bewertung nicht.</p></div>'}</div>${historical.length?`<div class="register-history"><h3>Historische beziehungsweise nicht mehr aktive Einträge</h3><p class="path-intro">Diese Einträge bleiben zur Nachvollziehbarkeit gespeichert, werden aber nicht für Status, Vollständigkeit oder Abschlussblocker ausgewertet.</p><div class="register-list">${cards(historical)}</div></div>`:''}<button type="button" class="add-button" data-add-register="${type}">+ Eintrag hinzufügen</button>`;
  return details(schema.title,body,false,`${active.length} aktiv · ${historical.length} historisch`);
}

function renderPlausibility(index){
  const v=getStepValidation(index),count=v.missing.length+v.contradictions.length+v.reviewNeeds.length+v.warnings.length;
  const group=(title,items,empty)=>`<div><span>${escapeHtml(title)}</span>${items.length?`<ul>${items.slice(0,8).map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>${items.length>8?`<small>+ ${items.length-8} weitere</small>`:''}`:`<strong>${escapeHtml(empty)}</strong>`}</div>`;
  return `<details class="plausibility-overview" ${count?'open':''}><summary>Plausibilitätsübersicht · ${count?`${count} Hinweise, offene oder widersprüchliche Punkte`:'keine kritischen Auffälligkeiten'}</summary><div class="plausibility-grid">${group('Fehlende Pflichtangaben',v.missing,'Keine')}${group('Offene optionale Angaben',v.optionalMissing?[`${v.optionalMissing} optionale Angabe(n) offen`]:[],'Keine')}${group('Inhaltliche Widersprüche',v.contradictions,'Keine')}${group('Weiterer Prüfbedarf',v.reviewNeeds,'Keiner')}${group('Nicht statusverändernde Hinweise',v.warnings,'Keine')}<div class="derived-result"><span>Regelbasiert abgeleitetes Ergebnis</span><strong>${escapeHtml(v.result)}</strong></div></div></details>`;
}

function renderGlobalValidationOverview(){
  const decision=overallDecision(false,true),validations=steps.map((_,index)=>getStepValidation(index,{decision}));
  const total=validations.reduce((sum,item)=>sum+item.missing.length+item.contradictions.length+item.reviewNeeds.length+item.warnings.length,0);
  const rows=validations.map((item,index)=>`<li><span>${index+1} · ${escapeHtml(steps[index][0])}</span><strong>${item.missing.length} fehlend · ${item.contradictions.length} widersprüchlich · ${item.reviewNeeds.length} Prüfbedarf · ${item.warnings.length} Hinweise</strong></li>`).join('');
  const structured=validations.flatMap(item=>item.items).filter(item=>item.status!=='resolved');
  return `<details class="plausibility-overview global-validation" ${total?'open':''}><summary>Gesamtübersicht aller Prüfschritte · ${total?`${total} offene oder widersprüchliche Punkte`:'keine kritischen Auffälligkeiten'}</summary><ol class="validation-step-list">${rows}</ol>${structured.length?reportTable(['Quelle','Typ','kritisch','Offener Punkt','Zuständig','Frist','Status'],structured.map(item=>[item.source,item.type,item.critical?'Ja':'Nein',item.text,item.owner,item.due?fmtDate(item.due):'',labelFor(item.status)])):''}</details>`;
}

function approvalSelect(decision){
  const value=state.form.approvalStatus||'',check=approvalConsistency(decision),options=[['pending','Ausstehend'],['rejected','Nicht genehmigt'],['conditional','Mit Auflagen genehmigt'],['approved','Genehmigt']];
  return `<label class="full"><span>Entscheidungsstatus <span class="required-mark">*</span></span><select data-field="approvalStatus" class="${check.warnings.length?'warning-control':''}"><option value="">Bitte auswählen</option>${options.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select>${check.warnings.length?`<small class="field-warning">${escapeHtml(check.warnings.join(' '))}</small>`:''}</label>`;
}

function renderDecisionGroups(decision){
  const box=(title,items,cls)=>`<div class="decision-group ${cls}"><strong>${escapeHtml(title)} (${items.length})</strong>${items.length?`<ul>${items.map(item=>`<li><b>${escapeHtml(item.source)}:</b> ${escapeHtml(item.text)}</li>`).join('')}</ul>`:'<p>Keine.</p>'}</div>`;
  return `<div class="decision-groups">${box('Aktive Blocker',decision.blockers,'danger')}${box('Offene Bewertungen und Widersprüche',decision.uncertainties,'warning')}${box('Zwingende offene Maßnahmen',decision.mandatory,'mandatory')}${box('Mögliche Auflagen',decision.conditions,'info')}</div>`;
}

function renderReviewReference(decision=null){
  const results=reviewOperationalResults(decision);
  const rows=results.map(item=>[item.id,item.label,labelFor(item.value),item.reason,item.sources.join(' · '),item.path]);
  return details('Operationalisierte Zusammenführung und Dokumentation',reportTable(['ID','Prüf- oder Dokumentationspunkt','Ergebnis','Begründung','Eingaben / Quellen','Ausführbarer Pfad'],rows),false,`${results.filter(item=>item.value==='review').length} Prüfbedarf · ${results.length} Ergebnisse`);
}

function renderStep8(){
  const decision=overallDecision(),check=approvalConsistency(decision);
  return `<div class="panel documentation-panel">${intro('Der regelbasierte Bewertungsstatus wird aus strukturierten Angaben abgeleitet. Freitexte ergänzen die Begründung, können Blocker oder Widersprüche aber nicht aufheben.')} ${requiredNote()}
    ${sectionTitle('Bewertungsakte und Verantwortlichkeiten')}${fieldGrid(hField('Bewertungs-ID','assessmentId',{required:true})+hField('Bewertungsversion','assessmentVersion',{required:true})+hField('Verwendete Leitfadenfassung','guideVersion',{required:true})+hField('Änderungshistorie sowie frühere Bewertung oder ausdrücklicher Hinweis „keine frühere Bewertung“','changeHistory',{required:true,type:'textarea',full:true})+hField('Dokumentationsverantwortung','documentationOwner',{required:true})+hField('Durchführung der Bewertung / regulatorische Prüfung','reviewer',{required:true})+hField('Überprüfung beziehungsweise Genehmigung','approver',{required:true})+hField('Ablageort','documentLocation',{required:true})+hField('Zugriffsrechte','accessRights',{required:true,type:'textarea'})+hField('Status der gesetzlichen Aufbewahrungsfrist','statutoryRetentionStatus',{required:true,type:'select',values:[['determined','Frist und Rechtsgrundlage bestimmt'],['review','Noch nicht bestimmt / weiterer Prüfbedarf']]})+hField('Gesetzliche Aufbewahrungsfrist und Rechtsgrundlage','statutoryRetentionBasis',{required:true,type:'textarea',full:true})+hField('Interne Aufbewahrungsfrist','internalRetentionPeriod',{required:true})+hField('Frühere Bewertungsstände bleiben erhalten','preservePreviousAssessments',{required:true,type:'select',values:[['yes','Ja'],['no','Nein'],['review','Weiterer Prüfbedarf']]})+hField('Verteiler','distribution'))}
    ${sectionTitle('Entscheidungsrelevante Nachweise und Rechtsquellen','Für jede Kategorie ist ein Nachweis mit Fundstelle oder ausdrücklich „nicht einschlägig“ zu dokumentieren: technische Dokumentation, Art.-9-Risikomanagement, Qualitätsmanagement, Protokollierung, Konformitätserklärung, Registrierung, Post-Market-Monitoring, Vorfälle, Grundrechte- und Datenschutz-Folgenabschätzung, GPAI- sowie CRA-Dokumentation.')}${fieldGrid(hField('Verzeichnis der verwendeten Nachweise','evidenceInventory',{required:true,type:'textarea',full:true})+hField('Version des Nachweisverzeichnisses','evidenceInventoryVersion',{required:true})+hField('Stand des Nachweisverzeichnisses','evidenceInventoryDate',{required:true,type:'date'})+hField('Fundstelle des Nachweisverzeichnisses','evidenceInventoryLocation',{required:true})+hField('Verwendete Rechtsquellen mit Fundstellen','legalSources',{required:true,type:'textarea',full:true}))}
    ${sectionTitle('Gesamtstatus und Entscheidungsgründe')}<div class="decision-card ${decision.tone}" data-decision-code="${decision.code}"><span>Regelbasiert abgeleiteter Bewertungsstatus</span><h2>${escapeHtml(decision.label)}</h2></div><div class="validation-alert"><strong>Wichtiger Hinweis</strong><p>Der Bewertungsstatus dient der Entscheidungsunterstützung und ist keine fachliche, juristische oder organisatorische Genehmigung. Die menschliche Entscheidung wird getrennt dokumentiert.</p></div>${renderDecisionGroups(decision)}${renderGlobalValidationOverview()}
    ${sectionTitle('Zusätzlicher entscheidungsbezogener Prüfbedarf','Ein frei dokumentierter Hinweis wird nicht selbst zu einem Hindernis. Bei „Ja“ entsteht ein gesonderter Prüfbedarf, dessen Blockierungswirkung im Register nach REVIEW-11 bestätigt werden muss.')}${fieldGrid(hField('Zusätzlichen Prüfbedarf erfassen?','manualBlockerActive',{required:true,type:'select',values:[['no','Nein'],['yes','Ja']]})+(state.form.manualBlockerActive==='yes'?hField('Sachverhalt und Klärungsbedarf','manualBlockerReason',{required:true,type:'textarea',full:true}):''))}
    ${sectionTitle('Zusammenfassung und ergänzende Erläuterungen')}${fieldGrid(hField('Zusammenfassende Begründung','overallReasoning',{required:true,type:'textarea',full:true})+hField('Ergänzende Hinweise zu Auflagen','conditions',{type:'textarea'})+hField('Ergänzende Hinweise zu Blockern','blockers',{type:'textarea'})+hField('Ergänzende Hinweise zu Anforderungen','openRequirements',{type:'textarea'})+hField('Ergänzende Hinweise zu Maßnahmen','openMeasures',{type:'textarea'})+hField('Ergänzende Hinweise zu Prüfbedarfen','openReviews',{type:'textarea',full:true}))}
    ${renderReviewReference(decision)}
    ${sectionTitle('Reviewplanung')}${fieldGrid(hField('Nächster Reviewtermin','nextReviewDate',{required:true,type:'date'})+hField('Regelmäßige Reviewfrequenz','reviewFrequency',{required:true})+hField('Nachweise und Dokumentation des Reviews','reviewEvidence',{required:true,type:'textarea',full:true}))}
    ${sectionTitle('Konkrete Neubewertungsauslöser')}${renderTriggers()}
    ${sectionTitle('Gesonderte menschliche beziehungsweise organisatorische Entscheidung','Die verantwortliche Stelle entscheidet getrennt vom regelbasierten Bewertungsstatus. Eine Abweichung wird als Hinweis dokumentiert und verändert den Status nicht.')}${fieldGrid(approvalSelect(decision)+hField('Entscheidungsdatum','approvalDate',{required:true,type:'date'})+hField('Weitere Hinweise','additionalNotes',{type:'textarea',full:true}))}${check.warnings.length?`<div class="validation-alert warning-only"><strong>Nicht statusverändernder Hinweis</strong><ul>${check.warnings.map(error=>`<li>${escapeHtml(error)}</li>`).join('')}</ul></div>`:''}
    ${renderPlausibility(7)}<button type="button" class="primary-button finish-button" id="buildReportButton">Prüfschritt abschließen und kompakten Bericht erstellen</button>
    ${sectionTitle('Berichtsausgabe','Der kompakte Bewertungsbericht ist die Standardfassung. Der vollständige Nachweisbericht enthält sämtliche Detail- und Auditnachweise.')}<div class="report-output-actions"><button type="button" class="primary-button" id="showCompactReportButton">Kompakten Bewertungsbericht anzeigen</button><button type="button" class="secondary-button" id="printCompactReportButton">Kompakten Bewertungsbericht als PDF speichern</button><button type="button" class="primary-button" id="showEvidenceReportButton">Vollständigen Nachweisbericht anzeigen</button><button type="button" class="secondary-button" id="printEvidenceReportButton">Vollständigen Nachweisbericht als PDF speichern</button></div>
  </div>${state.reportVisible&&activeReportData?renderSelectedReport(activeReportData):''}`;
}

function renderNavigation(){
  const nav=document.querySelector('#stepNavigation');
  nav.innerHTML=steps.map((step,index)=>{const status=stepStatus(index);const icon=status==='green'?'✓':index+1;return`<button type="button" class="nav-step status-${status} ${state.step===index?'active':''}" data-step="${index}" aria-current="${state.step===index?'step':'false'}"><span>${icon}</span><span>${escapeHtml(step[0])}</span></button>`;}).join('');
  nav.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>navigateTo(Number(button.dataset.step))));
  const percent=completionPercent();document.querySelector('#progressValue').textContent=`${percent} %`;document.querySelector('#progressBar').style.width=`${percent}%`;
  const evaluatedCount=state.evaluated.filter(Boolean).length;document.querySelector('#evaluatedCount').textContent=`${evaluatedCount} von 8 Prüfschritten bewertet`;
  refreshPersistenceNotice();
}

/** Zeigt einen nicht überschreibbaren Recovery-Zustand und dessen Sicherungsaktion sichtbar an. */
function refreshPersistenceNotice(){
  const recoveryButton=document.querySelector('#recoveryExportButton'),hasBackup=Boolean(localStorage.getItem(RECOVERY_BACKUP_KEY));if(recoveryButton)recoveryButton.hidden=!hasBackup;
  if(state.storageRecovery?.blocked){const label=document.querySelector('#saveState');if(label)label.textContent='Nicht lesbarer Altstand erkannt: Rohstand sichern, gültige Datei importieren oder bewusst neu beginnen.';}
}

function renderStatusSummary(){
  const status=stepStatus(state.step);const stats=stepStats(state.step);const statusText={neutral:'Noch nicht bewertet',red:'Pflichtangaben fehlen',yellow:'Pflichtangaben vollständig; mehrere optionale Angaben fehlen',green:'Ausreichend ausgefüllt'}[status];
  document.querySelector('#stepResultSummary').innerHTML=`<div><span>Bearbeitungsstand</span><strong class="completion-${status}">${escapeHtml(statusText)}</strong>${status==='red'?`<small>${(stats.missing?.length||0)+(stats.contradictions?.length||0)} Pflicht- oder Plausibilitätspunkt(e) offen</small>`:''}</div><div><span>Fachliches Ergebnis</span><strong>${escapeHtml(stepSubstantiveResult(state.step))}</strong><small>Unabhängig von der Statusfarbe und der menschlichen Entscheidung</small></div>${renderPlausibility(state.step)}`;
}

function renderStep(){
  const renderers=[renderStep1,renderStep2,renderStep3,renderStep4,renderStep5,renderStep6,renderStep7,renderStep8];
  document.querySelector('#stepNumber').textContent=`Prüfschritt ${state.step+1} von 8`;
  document.querySelector('#stepTitle').textContent=steps[state.step][0];document.querySelector('#stepGoal').textContent=steps[state.step][1];
  const caseName=document.querySelector('#caseName');caseName.textContent=state.form.toolName||'';caseName.hidden=!state.form.toolName;
  document.querySelector('#stepContent').innerHTML=renderers[state.step]();
  document.querySelector('#previousButton').disabled=state.step===0;
  document.querySelector('#nextButton').textContent=state.step===7?'Prüfschritt abschließen & Bericht':'Weiter →';
  renderStatusSummary();bindStepEvents();refreshPersistenceNotice();
}

function refreshChrome(){renderNavigation();renderStatusSummary();const caseName=document.querySelector('#caseName');caseName.textContent=state.form.toolName||'';caseName.hidden=!state.form.toolName;}
function navigateTo(next){if(next===state.step)return;state.evaluated[state.step]=true;state.step=Math.max(0,Math.min(7,next));state.reportVisible=false;activeReportData=null;document.title=APPLICATION_TITLE;saveState();renderNavigation();renderStep();window.scrollTo({top:0,behavior:'smooth'});}

function updateFormElement(element,rerender=false){const key=element.dataset.field;state.form[key]=element.value;if(craRoleFields.some(([field])=>field===key))applyCraRoleDerivation(state);else if(element.dataset.guideId)state.guideAnswers[element.dataset.guideId]={value:element.value,sourceField:key};saveState();if(rerender)renderStep();refreshChrome();}
function updateRiskElement(element,rerender=false){const risk=state.risks[Number(element.dataset.riskIndex)];if(!risk)return;const field=element.dataset.riskField,previous=risk[field];risk[field]=element.value;if(['probability','impact'].includes(field))risk.currentRisk=effectiveCurrentRisk(risk);if(field==='treatmentStatus'&&previous==='verified'&&element.value!=='verified'&&isFilled(risk.verifiedResidual)){risk.inactiveVerifiedResidual={value:risk.verifiedResidual,formerStatus:previous,deactivatedAt:new Date().toISOString()};}saveState();if(rerender)renderStep();refreshChrome();}
function updateOrgElement(element,rerender=false){state.org[element.dataset.orgArea][element.dataset.orgField]=element.value;saveState();if(rerender)renderStep();refreshChrome();}
function updateOrgCriterionElement(element,rerender=false){const area=state.org[element.dataset.orgArea];area.criteria??={};area.criteria[element.dataset.orgCriterion]??={answer:'',reason:''};area.criteria[element.dataset.orgCriterion][element.dataset.orgCriterionField]=element.value;const guideId=element.closest?.('[data-guide-id]')?.dataset.guideId;if(guideId)state.guideAnswers[guideId]={value:area.criteria[element.dataset.orgCriterion].answer||'',reason:area.criteria[element.dataset.orgCriterion].reason||'',sourceField:`org.${element.dataset.orgArea}.${element.dataset.orgCriterion}`};saveState();if(rerender)renderStep();refreshChrome();}
function updateRegisterElement(element,rerender=false){state.registers[element.dataset.register][Number(element.dataset.registerIndex)][element.dataset.registerField]=element.value;saveState();if(rerender)renderStep();refreshChrome();}

/** Bestimmt, ob die Berichtsausgabe Entwurf, bedingt abgeschlossen oder final ist. */

/* 11. Regulatorische Einzelauswertungen */

/* Fachliche Auswertung und Plausibilisierung bleiben unabhängig von den Navigationsfarben. */
function evaluationResult(code,label,{triggers=[],missing=[],contradictions=[],reviewNeeds=[],critical=false,basis='',manual='',manualLabel='',...details}={}){
  return{code,label,triggers,missing,contradictions,reviewNeeds,critical,basis,manual,manualLabel,...details};
}

/**
 * Steuert, ob der EU-AI-Act-Pfad nach Definition und Anwendungsbereich fortzuführen ist.
 * @returns {{required:boolean,provisional:boolean,reason:string,scope:object,definition:object}} Pfadstatus mit fachlicher Begründung.
 * @description Datenquelle sind die strukturierten Antworten des Live-Zustands. Die Auswertung ist nebenwirkungsfrei und ersetzt weder GPAI- noch CRA-Prüfung.
 */
function aiActPathStatus(context=null){
  const scope=evaluateScope(context),definition=evaluateAISystemDefinition(context);
  if(['not_applicable','excluded'].includes(scope.code))return{required:false,provisional:false,reason:`AI-Act-Prüfung nicht erforderlich: ${scope.label}.`,scope,definition};
  if(definition.code==='not_ai')return{required:false,provisional:false,reason:`AI-Act-spezifische Klassifikation nicht einschlägig: ${definition.label}. Weitere Prüfungen bleiben unberührt.`,scope,definition};
  const provisional=scope.code==='review'||['review','information'].includes(definition.code);
  return{required:true,provisional,reason:provisional?'AI-Act-Prüfpfade sind bis zur Klärung aus Schritt 2 nur vorläufig.':scope.limitations?.length?`AI-Act-Prüfpfade sind erforderlich. Dokumentierte Sonderregeln werden rollen- und pflichtenbezogen berücksichtigt; ungeklärte Pflichtenumfänge bleiben ausdrücklich nicht abschließend beurteilbar: ${scope.limitations.join(' ')}`:'AI-Act-Prüfpfade sind erforderlich.',scope,definition};
}
/** Hält den GPAI-Modellpfad eigenständig vom KI-System-Pfad offen oder neutral. */
function gpaiPathStatus(context=null){
  const state=evaluationState(context),gpaiQuestions=evaluationReferences(context).gpaiQuestions,definition=evaluateAISystemDefinition(context),f=state.form,indications=f.objectType==='model'||gpaiQuestions.some(([key])=>['yes','review','model','system'].includes(f[key]))||['provider','downstream','integrator','unclear'].includes(f.gpaiOrganizationRole);
  if(definition.code==='not_ai'&&!indications)return{required:false,provisional:false,reason:'Kein KI-System und kein Hinweis auf ein GPAI-Modell oder eine GPAI-Integration.',definition};
  return{required:true,provisional:['review','information'].includes(definition.code),reason:definition.code==='not_ai'?'Der KI-System-Pfad endet; die eigenständige GPAI-Prüfung wird fortgeführt.':'Die GPAI-Prüfung wird eigenständig durchgeführt.',definition};
}

/**
 * Bewertet den Anwendungsbereich nach Art. 2. SCOPE-08 und SCOPE-18 begrenzen
 * den Pflichtenumfang, SCOPE-15 bildet die persönliche nichtberufliche Nutzung ab,
 * und SCOPE-16/SCOPE-17 trennen Open Source von fortgeltenden Hochrisiko-, Art.-5-
 * und Art.-50-Pflichten. Mehrdeutige Sonderregeln werden nicht als Ausschluss behandelt.
 * @returns {object} Regelbasiertes Ergebnis mit Auslösern, Lücken, Widersprüchen und Sonderregeln.
 * @description Datenquelle sind SCOPE-Antworten und Begründungsnachweise im Live-Zustand. Die Funktion ist nebenwirkungsfrei und nimmt keine juristische Einzelfallentscheidung vor.
 */
function evaluateScope(context=null){
  const state=evaluationState(context),scopeQuestionKeys=evaluationReferences(context).scopeQuestionKeys,f=state.form,missing=[],contradictions=[],triggers=[],reviewNeeds=[];
  const required=[...scopeQuestionKeys,'realWorldTesting','actualOperationalUse'];
  required.forEach(key=>{if(!isFilled(f[key]))missing.push(key);if(f[key]==='review')reviewNeeds.push(key);});
  const opening=['scopeProviderMarketEU','scopeDeployerEU','euOutputEffect','scopeImporterDistributor','scopeProductManufacturer','scopeAuthorisedRepresentative','scopeAffectedEU'];
  const opened=opening.some(key=>f[key]==='yes');
  const exclusions=['scopeOutsideUnionLaw','militarySecurity','scopeNonEUOutputSecurity','scopeThirdCountryCooperation'].filter(key=>f[key]==='yes');
  const scientificExclusion=f.researchScientificOnly==='yes'&&f.actualOperationalUse==='no';
  const preMarketExclusion=f.researchBeforeMarket==='yes'&&f.realWorldTesting==='no'&&f.actualOperationalUse==='no';
  const special=['scopeAnnexIB','personalUse','scopeAnnexIAEquivalent'].filter(key=>f[key]==='yes');
  const openSourceSystemExclusion=f.openSource==='yes'&&f.openSourceHighRiskArt5Art50==='no';
  if(openSourceSystemExclusion)special.push('openSource');
  const limitations=[];
  if(f.scopeAnnexIB==='yes')limitations.push('SCOPE-08 begrenzt die Anwendbarkeit auf den in Art. 2 Abs. 2 festgelegten Umfang.');
  if(f.personalUse==='yes')limitations.push('SCOPE-15 schließt ausschließlich Pflichten aus der Betreiberrolle aus; andere Rollen bleiben prüfpflichtig.');
  if(f.openSource==='yes'&&f.openSourceHighRiskArt5Art50==='no')limitations.push('SCOPE-16/17: Die dokumentierte Open-Source-Sonderregel wird nur auf die jeweils erfassten Pflichten angewendet.');
  if(f.scopeAnnexIAEquivalent==='yes')limitations.push('SCOPE-18 kann nur die dort genannten Anforderungen begrenzen; andere Pflichten bleiben unberührt.');
  if(f.euOutputEffect==='yes')triggers.push('SCOPE-03: Die Verwendung von Ausgaben in der Union eröffnet einen eigenständigen Anwendungsbezug.');
  if(f.realWorldTesting==='yes')triggers.push('Test unter realen Bedingungen: kein automatischer Ausschluss nach Art. 2 Abs. 8.');
  if(f.actualOperationalUse==='yes')triggers.push('Tatsächlicher betrieblicher Einsatz: Forschungsausschluss wird nicht pauschal angewendet.');
  if(f.researchBeforeMarket==='yes'&&f.actualOperationalUse==='yes')contradictions.push('Ausschließliche Vorabforschung und tatsächlicher betrieblicher Einsatz sind in dieser Kombination abzugrenzen.');
  if(f.researchScientificOnly==='yes'&&f.actualOperationalUse==='yes')contradictions.push('Ausschließlich wissenschaftliche Forschung und tatsächlicher betrieblicher Einsatz sind in dieser Kombination abzugrenzen.');
  if((exclusions.length||special.length||f.researchScientificOnly==='yes'||f.researchBeforeMarket==='yes')&&(!isFilled(f.scopeBasis)||!isFilled(f.scopeEvidence)))missing.push('Begründung und Nachweis für Ausschluss/Sonderregelung');
  if(missing.length||reviewNeeds.length)return evaluationResult('review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf',{triggers,missing,contradictions,reviewNeeds,critical:true,basis:'EU AI Act Art. 2'});
  if(contradictions.length)return evaluationResult('review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf',{triggers,missing,contradictions,reviewNeeds,critical:true,basis:'EU AI Act Art. 2 Abs. 6 und 8'});
  if(!opened)return evaluationResult('not_applicable','Anwendungsbereich für den betrachteten Sachverhalt nicht eröffnet',{triggers:[...triggers,'Keine der alternativen Voraussetzungen SCOPE-01 bis SCOPE-07 ist erfüllt.'],basis:'EU AI Act Art. 2 Abs. 1'});
  if(exclusions.length)return evaluationResult('excluded','Nicht anwendbar – dokumentierter Ausschluss',{triggers:[...triggers,...exclusions.map(labelFor)],basis:'EU AI Act Art. 2'});
  if(scientificExclusion||preMarketExclusion)return evaluationResult('excluded','Nicht anwendbar – dokumentierter Forschungs- und Entwicklungsausschluss',{triggers:[...triggers,scientificExclusion?'Ausschließliche wissenschaftliche Forschung und Entwicklung nach Art. 2 Abs. 6.':'Ausschließliche Forschung, Tests oder Entwicklung vor Inverkehrbringen beziehungsweise Inbetriebnahme ohne Test unter Realbedingungen nach Art. 2 Abs. 8.'],basis:'EU AI Act Art. 2 Abs. 6 und 8'});
  if(openSourceSystemExclusion)return evaluationResult('excluded','Anwendungsbereich für den KI-System-Pfad aufgrund der Open-Source-Sonderregel nicht eröffnet',{triggers:[...triggers,'SCOPE-16 ist bejaht und SCOPE-17 verneint. Der reguläre KI-System-Pflichtenpfad wird nach Art. 2 Abs. 12 nicht fortgeführt; eigenständige GPAI- und CRA-Pfade bleiben unberührt.'],basis:'EU AI Act Art. 2 Abs. 12',openSourceSystemExclusion:true});
  const limitationsRequiringReview=[...(f.scopeAnnexIB==='yes'?['SCOPE-08: Der konkrete Umfang der nach Art. 2 Abs. 2 verbleibenden Anforderungen ist fallbezogen zu bestimmen.']:[]),...(f.scopeAnnexIAEquivalent==='yes'?['SCOPE-18: Die durch gleichwertiges oder strengeres Harmonisierungsrecht abgedeckten Anforderungen sind noch nicht einzeln nachgewiesen.']:[])];
  return evaluationResult('applicable',limitationsRequiringReview.length?'Anwendungsbereich eröffnet – begrenzter Pflichtenumfang nicht abschließend beurteilbar':special.length?'Anwendungsbereich eröffnet – rollen- oder pflichtbezogene Sonderregel dokumentiert':'Anwendungsbereich eröffnet',{triggers:[...triggers,'Mindestens eine alternative Voraussetzung SCOPE-01 bis SCOPE-07 ist erfüllt.',...limitations],basis:'EU AI Act Art. 2',limitations,specialCases:special,limitationsRequiringReview,limitationReviewRequired:limitationsRequiringReview.length>0,deployerDutiesExcluded:f.personalUse==='yes',annexIBLimitation:f.scopeAnnexIB==='yes',annexIAEquivalentLimitation:f.scopeAnnexIAEquivalent==='yes'});
}
function scopeResult(context=null){return evaluateScope(context).label;}

/**
 * Bewertet die KI-System-Definition anhand der getrennten Merkmale DEF-01 bis DEF-15.
 * @returns {object} Regelbasiertes Definitionsresultat mit Informationsbedarf und Widersprüchen.
 * @description Datenquelle sind die strukturierten DEF-Antworten des Live-Zustands. Die Funktion ist nebenwirkungsfrei und grenzt Modelle oder Komponenten von vollständigen KI-Systemen ab.
 */
function evaluateAISystemDefinition(context=null){
  const state=evaluationState(context),definitionQuestionKeys=evaluationReferences(context).definitionQuestionKeys,f=state.form,missing=[],contradictions=[],triggers=[],reviewNeeds=[];
  const decisive=[...definitionQuestionKeys];
  decisive.forEach(key=>{if(!isFilled(f[key]))missing.push(key);if(f[key]==='review')reviewNeeds.push(key);});
  if(f.inference==='yes'&&f.deterministicOnly==='yes'&&f.beyondHumanRules==='no')contradictions.push('DEF-05, DEF-08 und DEF-11 ergeben einen Widerspruch zur Ableitungsfähigkeit.');
  if(f.objectType==='model'&&/vollständiges?\s+ki-system|ki-system\s+liegt\s+vor/i.test(f.definitionBasis||''))contradictions.push('Die Begründung behandelt ein reines Modell zugleich als vollständiges KI-System.');
  if(f.machineBased==='no'&&/ki-system\s+nach|merkmale.*liegen.*vor/i.test(f.definitionBasis||''))contradictions.push('Die Begründung widerspricht der Verneinung eines maschinengestützten Systems.');
  if(contradictions.length)return evaluationResult('review','Weiterer fachlicher oder juristischer Prüfbedarf',{missing,contradictions,reviewNeeds,critical:true,basis:'EU AI Act Art. 3 Nr. 1'});
  if(missing.length||!isFilled(f.definitionEvidenceSource))return evaluationResult('information','Informationsbedarf',{missing:[...missing,...(!isFilled(f.definitionEvidenceSource)?['Technische Nachweise und Informationsquellen']:[])],reviewNeeds,critical:true,basis:'EU AI Act Art. 3 Nr. 1'});
  if(reviewNeeds.length)return evaluationResult('review','Weiterer fachlicher oder juristischer Prüfbedarf',{missing,reviewNeeds,critical:true,basis:'EU AI Act Art. 3 Nr. 1'});
  if(f.objectType==='model')return evaluationResult('not_ai','Kein vollständiges KI-System – KI-Modell bzw. Komponente',{triggers:['DEF-15 weist den Bewertungsgegenstand als Modell beziehungsweise Komponente aus.'],basis:'EU AI Act Art. 3 Nr. 1 und ErwG 97'});
  if(f.deterministicOnly==='yes'&&f.inference==='no')return evaluationResult('not_ai','Kein KI-System nach dokumentierter deterministischer Abgrenzung',{triggers:['Ausschließlich fest programmierter Ablauf ohne Inferenz.'],basis:'EU AI Act Art. 3 Nr. 1'});
  if(['machineBased','autonomy','systemGoals','inference','aiOutputs','environmentInfluence'].every(key=>f[key]==='yes')&&['beyondHumanRules','usesPatterns','beyondStaticProcessing'].some(key=>f[key]==='yes'))return evaluationResult('ai_system','KI-System nach Art. 3 Nr. 1',{triggers:['Konstitutive Merkmale und operationalisierte Ableitungsfähigkeit sind nachvollziehbar belegt.'],basis:'EU AI Act Art. 3 Nr. 1; ErwG 12 und 97'});
  if(['machineBased','inference','aiOutputs'].some(key=>f[key]==='no'))return evaluationResult('not_ai','Kein KI-System nach dokumentierter Abgrenzung',{triggers:['Mindestens ein konstitutives Definitionsmerkmal wurde nachvollziehbar verneint.'],basis:'EU AI Act Art. 3 Nr. 1'});
  return evaluationResult('review','Weiterer fachlicher oder juristischer Prüfbedarf',{reviewNeeds:['Definitionsmerkmale ergeben kein eindeutiges Gesamtbild.'],critical:true,basis:'EU AI Act Art. 3 Nr. 1'});
}
function aiSystemResult(context=null){return evaluateAISystemDefinition(context).label;}

function conclusionCheck(autoCode,manual,allowed,labels,context){
  const contradictions=[];
  if(manual&&!allowed.includes(manual))contradictions.push(`${context}: Manuelle Schlussfolgerung „${labels[manual]||manual}“ widerspricht dem automatisch ableitbaren Ergebnis.`);
  return contradictions;
}
function isSensitiveArt5(key){return['pNonConsensualIntimate','pCsam'].includes(key);}
function art5TemporalMeta(key,context=null){
  const state=evaluationState(context),KNOWLEDGE_BASE=evaluationReferences(context).knowledgeBase,isNew=isSensitiveArt5(key),date=isNew?KNOWLEDGE_BASE.verifiedDates.article5New:KNOWLEDGE_BASE.verifiedDates.article5General,assessment=state.form.assessmentDate,intended=state.form.intendedUseDate;
  if(!assessment)return{applicability:'not_assessable',applicableDate:date,applicabilityReason:'Der Bewertungsstichtag fehlt; die zeitliche Verbotswirkung ist nicht eindeutig beurteilbar.'};
  if(assessment>=date)return{...fixedTemporalMeta(date,isNew?'Art. 5 Abs. 1 Buchst. ba und bb gelten ab 2. Dezember 2026.':'Die allgemeinen Art.-5-Tatbestände gelten seit 2. Februar 2025.',context),assessmentDate:assessment,intendedUseDate:intended||''};
  if(!isNew)return fixedTemporalMeta(date,'Die allgemeinen Art.-5-Tatbestände gelten seit 2. Februar 2025.',context);
  if(!intended)return{applicability:'not_assessable',applicableDate:date,applicabilityReason:'Der Bewertungsstichtag liegt vor dem 2. Dezember 2026 und der vorgesehene Nutzungszeitpunkt ist nicht dokumentiert; weiterer juristischer Prüfbedarf.'};
  if(intended>=date)return{applicability:'future',applicableDate:date,applicabilityReason:`Der Tatbestand gilt ab 2. Dezember 2026. Die vorgesehene Verwendung beginnt am ${fmtDate(intended)} und wäre dann von der künftigen Verbotswirkung erfasst.`,assessmentDate:assessment,intendedUseDate:intended};
  return{applicability:'not_applicable',applicableDate:date,applicabilityReason:`Die konkret bewertete Verwendung ist für ${fmtDate(intended)} und damit vor dem Anwendungsbeginn am 2. Dezember 2026 dokumentiert. Eine spätere Fortführung ist neu zu bewerten.`,assessmentDate:assessment,intendedUseDate:intended};
}
function prohibitedFollowFields(key){
  if(isSensitiveArt5(key))return[`${key}ProviderProvision`,`${key}OperatorUse`,`${key}IntendedPurpose`,`${key}ForeseeableReproducible`,`${key}Safeguards`,`${key}Circumventions`,`${key}CorrectiveMeasures`,`${key}Exception`,`${key}Reason`,`${key}Evidence`,`${key}LegalOwner`,`${key}Critical`,...(key==='pNonConsensualIntimate'?[`${key}Consent`]:[`${key}LegalJustification`])];
  return[`${key}Use`,`${key}ElementsResult`,`${key}Elements`,`${key}Exception`,`${key}Reason`,`${key}Evidence`,`${key}Affected`,`${key}LegalOwner`,`${key}Critical`];
}
/** Bewertet einen zeitlich gesonderten Art.-5-Tatbestand samt Ausnahmeprüfung. */
function evaluateSensitiveArt5(key,context=null){
  const f=evaluationState(context).form,unknown=['ProviderProvision','OperatorUse','IntendedPurpose','ForeseeableReproducible','Safeguards','Circumventions','CorrectiveMeasures'].some(suffix=>!isFilled(f[`${key}${suffix}`])||f[`${key}${suffix}`]==='review');
  if(unknown)return'review';
  const providerPath=f[`${key}ProviderProvision`]==='yes'&&(f[`${key}IntendedPurpose`]==='yes'||(f[`${key}ForeseeableReproducible`]==='yes'&&(f[`${key}Safeguards`]==='no'||f[`${key}Circumventions`]==='yes')&&f[`${key}CorrectiveMeasures`]!=='yes'));
  const operatorPath=f[`${key}OperatorUse`]==='yes'&&f[`${key}IntendedPurpose`]==='yes';
  if(!providerPath&&!operatorPath)return'not_met';
  if(key==='pNonConsensualIntimate'){
    if(!isFilled(f[`${key}Consent`])||f[`${key}Consent`]==='review')return'review';
    if(f[`${key}Consent`]==='yes')return'not_met';
  }else{
    if(!isFilled(f[`${key}LegalJustification`])||f[`${key}LegalJustification`]==='review')return'review';
    if(f[`${key}LegalJustification`]==='yes')return'exception_confirmed';
  }
  return'confirmed';
}

/**
 * Bewertet alle Art.-5-Tatbestände. Ein bestätigter, aktuell anwendbarer
 * Verbotstatbestand beendet die nachgelagerten Einstufungspfade; bloße Unsicherheit
 * erzeugt stattdessen entscheidungsblockierenden Prüfbedarf.
 */
function evaluateProhibitedPractices(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),prohibitedQuestions=references.prohibitedQuestions,QUESTION_IDS=references.questionIds,path=aiActPathStatus(context);if(!path.required)return evaluationResult('not_required','Nicht erforderlich aufgrund des Ergebnisses aus Schritt 2',{basis:'EU AI Act Art. 5',reason:path.reason,items:[]});
  const f=state.form,missing=[],triggers=[],reviewNeeds=[],contradictions=[],items=[];
  prohibitedQuestions.forEach(([key,providedLabel])=>{
    const label=guideLabel(QUESTION_IDS[key],context)||providedLabel,raw=f[key],answer={yes:'confirmed',no:'not_met',na:'not_applicable',review:'possible'}[raw]||raw;let code='not_met';
    if(!isFilled(answer)){missing.push(label);items.push({key,label,code:'review'});return;}
    if(answer==='possible'||answer==='exception_review'){reviewNeeds.push(label);items.push({key,label,code:'review'});return;}
    if(['not_met','not_applicable'].includes(answer)){items.push({key,label,code});return;}
    triggers.push(label);prohibitedFollowFields(key).forEach(field=>{if(!isFilled(f[field]))missing.push(`${label}: ${field}`);});
    const elements=f[`${key}ElementsResult`],exception=f[`${key}Exception`];
    if(isSensitiveArt5(key)){
      code=evaluateSensitiveArt5(key,context);const substantiveCode=code,temporal=art5TemporalMeta(key,context);
      if(exception==='confirmed'&&code==='confirmed')code='exception_confirmed';
      if(['review','possible'].includes(code))reviewNeeds.push(`${label}: Anbieter-/Betreiberkonstellation, Schutzmaßnahmen, Einwilligung oder gesetzliche Rechtfertigung ist nicht abschließend geklärt.`);
      if(code==='confirmed'&&temporal.applicability==='future')code='future_confirmed';
      else if(code==='confirmed'&&temporal.applicability==='not_applicable')code='temporally_not_applicable';
      else if(code==='confirmed'&&temporal.applicability==='not_assessable'){code='review';reviewNeeds.push(`${label}: Inhaltlicher Tatbestand festgestellt, zeitliche Anwendbarkeit jedoch nicht eindeutig beurteilbar.`);}
      items.push({key,label,code,substantiveCode,exception,temporal});return;
    }
    if(elements==='not_met')code='not_met';
    else if(elements==='possible'||elements==='review'||!elements)code='possible';
    else if(elements==='met'){
      if(exception==='confirmed'){
        [`${key}ExceptionBasis`,`${key}ExceptionRequirements`,`${key}ExceptionScope`,`${key}Reason`,`${key}Evidence`].forEach(field=>{if(!isFilled(f[field]))missing.push(`${label}: ${field}`);});
        code=[`${key}ExceptionBasis`,`${key}ExceptionRequirements`,`${key}ExceptionScope`,`${key}Reason`,`${key}Evidence`].every(field=>isFilled(f[field]))?'exception_confirmed':'review';
      }else if(['possible','review'].includes(exception)||!exception)code='review';
      else code='confirmed';
    }
    if(code==='possible'||code==='review')reviewNeeds.push(`${label}: Tatbestand oder Ausnahme ist nicht abschließend geklärt.`);
    items.push({key,label,code,exception});
  });
  let autoCode=items.some(item=>item.code==='confirmed')?'confirmed':items.some(item=>['possible','review'].includes(item.code))||missing.length?'review':items.some(item=>item.code==='future_confirmed')?'future_prohibition':items.some(item=>item.code==='exception_confirmed')?'exception':'none';
  const labels={none:'Kein aktuell anwendbarer Verbotstatbestand festgestellt',exception:'Tatbestand mit nachgewiesener Ausnahme dokumentiert',confirmed:'Verbotene KI-Praxis bestätigt',future_prohibition:'Verbotstatbestand festgestellt – zum Bewertungsstichtag noch nicht anwendbar',review:'Weiterer fachlicher oder juristischer Prüfbedarf'};
  const substantiveConclusion=items.some(item=>item.code==='confirmed')?'confirmed':items.some(item=>['future_confirmed','temporally_not_applicable'].includes(item.code)||item.substantiveCode==='confirmed')?'confirmed':items.some(item=>item.code==='exception_confirmed')?'exception':autoCode;
  contradictions.push(...conclusionCheck(substantiveConclusion,f.prohibitionConclusion,[substantiveConclusion],labels,'Verbotene Praktiken'));
  const effective=contradictions.length?'review':autoCode;
  return evaluationResult(effective,labels[effective],{triggers,missing,contradictions,reviewNeeds,critical:['confirmed','review'].includes(effective),basis:'EU AI Act Art. 5',manual:f.prohibitionConclusion,manualLabel:labels[f.prohibitionConclusion]||'Nicht ausgewählt',items,provisional:path.provisional});
}

/** Bewertet den Produktpfad nach Art. 6 Abs. 1 und Anhang I. */
function evaluateProductHighRisk(context=null){
  const state=evaluationState(context),path=aiActPathStatus(context);if(!path.required)return evaluationResult('not_required','Nicht erforderlich aufgrund des Ergebnisses aus Schritt 2',{basis:'EU AI Act Art. 6 Abs. 1',reason:path.reason});
  if(evaluateProhibitedPractices(context).code==='confirmed')return evaluationResult('not_continued','Nicht fortgeführt aufgrund festgestellter verbotener KI-Praxis',{basis:'EU AI Act Art. 5 und 6',reason:'Verbotene KI-Praxis festgestellt.'});
  const f=state.form,keys=['productCovered','productSafetyComponent','annexISection','thirdPartyConformity','conformityNonSafetyOnly'],missing=[],reviewNeeds=[];
  keys.forEach(key=>{if(!isFilled(f[key]))missing.push(key);if(f[key]==='review'||f[key]==='na')reviewNeeds.push(key);});
  let autoCode='review';
  if(!missing.length&&!reviewNeeds.length){if((f.productCovered==='yes'||f.productSafetyComponent==='yes')&&f.thirdPartyConformity==='yes'&&f.conformityNonSafetyOnly==='no')autoCode='yes';else if((f.productCovered==='no'&&f.productSafetyComponent==='no')||f.thirdPartyConformity==='no'||f.conformityNonSafetyOnly==='yes')autoCode='no';}
  const labels={yes:'Hochrisiko nach Art. 6 Abs. 1',no:'Art. 6 Abs. 1 nicht einschlägig',review:'Weiterer Prüfbedarf'};
  const contradictions=conclusionCheck(autoCode,f.productHighRiskConclusion,[autoCode],labels,'Art. 6 Abs. 1');
  return evaluationResult(contradictions.length?'review':autoCode,contradictions.length?labels.review:labels[autoCode],{triggers:autoCode==='yes'?['HR-01 oder HR-02 sowie HR-04 sind erfüllt; HR-05 ist verneint.']:[],missing,contradictions,reviewNeeds,critical:autoCode==='review',basis:'EU AI Act Art. 6 Abs. 1 bis 1c und Anhang I',manual:f.productHighRiskConclusion,manualLabel:labels[f.productHighRiskConclusion]||'Nicht ausgewählt'});
}

/**
 * Bewertet Art. 6 Abs. 2 und die eng auszulegende Ausnahme des Art. 6 Abs. 3.
 * Profiling schließt die Ausnahme aus; unvollständige Ausnahmevoraussetzungen
 * werden als weiterer Prüfbedarf und nicht als Nicht-Hochrisiko-Ergebnis behandelt.
 */
function evaluateAnnexHighRisk(context=null){
  const state=evaluationState(context),annexAreas=evaluationReferences(context).annexAreas,path=aiActPathStatus(context);if(!path.required)return evaluationResult('not_required','Nicht erforderlich aufgrund des Ergebnisses aus Schritt 2',{basis:'EU AI Act Art. 6 Abs. 2 und 3',reason:path.reason});
  if(evaluateProhibitedPractices(context).code==='confirmed')return evaluationResult('not_continued','Nicht fortgeführt aufgrund festgestellter verbotener KI-Praxis',{basis:'EU AI Act Art. 5 und 6',reason:'Verbotene KI-Praxis festgestellt.'});
  const f=state.form,areaAnswers=annexAreas.map(([key])=>f[key]),missing=[],reviewNeeds=[],triggers=[];
  annexAreas.forEach(([key,label])=>{if(!isFilled(f[key]))missing.push(label);if(['review','na'].includes(f[key]))reviewNeeds.push(label);if(f[key]==='yes')triggers.push(label);});
  const hit=triggers.length>0;
  const filterKeys=['narrowProcedural','completedResultImprovement','patternDetection','preparatoryTask','materialInfluenceControl','profiling'];
  if(hit){const detailKeys=['specificAnnexUse',...filterKeys,'annexBasis','annexEvidence'];if(f.annexEssentialServices==='yes')detailKeys.push('annexIII5bc');detailKeys.forEach(key=>{if(!isFilled(f[key]))missing.push(key);if(f[key]==='review')reviewNeeds.push(key);});}
  let autoCode='review';
  if(!missing.length&&!reviewNeeds.length&&!hit&&areaAnswers.every(v=>v==='no'))autoCode='no';
  if(hit&&!missing.length&&!reviewNeeds.length){
    const alternativeMet=['narrowProcedural','completedResultImprovement','patternDetection','preparatoryTask'].some(k=>f[k]==='yes');
    if(f.profiling==='yes'||!alternativeMet)autoCode='yes';
    else if(alternativeMet&&f.profiling==='no'&&f.materialInfluenceControl==='no')autoCode='exception';
    else if(alternativeMet&&f.profiling==='no'&&f.materialInfluenceControl==='yes')autoCode='review';
  }
  const labels={yes:'Hochrisiko nach Art. 6 Abs. 2',no:'Art. 6 Abs. 2 nicht einschlägig',exception:'Ausnahme nach Art. 6 Abs. 3 dokumentiert',review:'Weiterer Prüfbedarf – Art.-6-Abs.-3-Prüfung offen'};
  const contradictions=conclusionCheck(autoCode,f.annexHighRiskConclusion,[autoCode],labels,'Anhang III');
  if(f.profiling==='yes'&&f.annexHighRiskConclusion==='exception')contradictions.push('Profiling natürlicher Personen schließt die Ausnahme nach Art. 6 Abs. 3 aus.');
  if(f.materialInfluenceControl==='yes'&&['yes','exception'].includes(f.annexHighRiskConclusion))contradictions.push('HR-18 widerspricht der beanspruchten Filterbedingung; eine automatische Hochrisiko- oder Ausnahmeentscheidung ist nicht zulässig.');
  const effective=contradictions.length?'review':autoCode;
  return evaluationResult(effective,labels[effective],{triggers,missing,contradictions,reviewNeeds:[...reviewNeeds,...(f.materialInfluenceControl==='yes'?['HR-18: weiterer fachlicher oder juristischer Prüfbedarf wegen eindeutigen Widerspruchs.']:[])],critical:effective==='review',basis:'EU AI Act Art. 6 Abs. 2 bis 4 sowie Anhang III',manual:f.annexHighRiskConclusion,manualLabel:labels[f.annexHighRiskConclusion]||'Nicht ausgewählt',filterApplied:effective==='exception'});
}

/** Bewertet Art. 50 tatbestands-, rollen- und ausnahmenspezifisch. */
function evaluateTransparency(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),transparencyQuestions=references.transparencyQuestions,transparencyActorByKey=references.transparencyActorByKey,roles=references.roles,QUESTION_IDS=references.questionIds,path=aiActPathStatus(context);if(!path.required)return evaluationResult('not_required','Nicht erforderlich aufgrund des Ergebnisses aus Schritt 2',{basis:'EU AI Act Art. 50',reason:path.reason,items:[]});
  if(evaluateProhibitedPractices(context).code==='confirmed')return evaluationResult('not_continued','Nicht fortgeführt aufgrund festgestellter verbotener KI-Praxis',{basis:'EU AI Act Art. 5 und 50',reason:'Der KI-systembezogene Pfad wurde beendet.',items:[]});
  const f=state.form,missing=[],reviewNeeds=[],triggers=[],contradictions=[],items=[];const actors=new Set();
  transparencyQuestions.forEach(([key,providedLabel])=>{const label=providedLabel||guideLabel(QUESTION_IDS[key],context);
    const answer=f[key];if(!isFilled(answer)){missing.push(label);items.push({key,label,code:'review'});return;}
    if(['review','na'].includes(answer)){reviewNeeds.push(label);items.push({key,label,code:'review'});return;}
    if(answer==='no'){items.push({key,label,code:'not_applicable'});return;}
    if(key==='tGeneralRequirements'){
      triggers.push(label);items.push({key,label,code:'applicable',actor:'obligated',storedActor:'',duty:'DUTY-26',exception:'',expectedResult:'applicable'});return;
    }
    triggers.push(label);const fields=[`${key}Use`,`${key}Actor`,`${key}Duty`,`${key}Exception`,`${key}Reason`,`${key}Evidence`,`${key}Result`];fields.forEach(field=>{if(!isFilled(f[field]))missing.push(`${label}: ${field}`);});
    const legalActor=transparencyActorByKey[key],actor=f[`${key}Actor`],exception=f[`${key}Exception`];let code='applicable';
    if(actor&&actor!==legalActor)contradictions.push(`${label}: Manuell ausgewählter Akteur widerspricht der gesetzlichen Zuordnung (${legalActor==='provider'?'Anbieter':'Betreiber'}).`);
    if(legalActor==='provider'&&!roles.some(([id])=>['provider','gpaiProvider','downstreamProvider','productManufacturer'].includes(id)&&f[`role_${id}`]))contradictions.push(`${label}: Anbieterpflicht ohne passende Anbieterrolle.`);
    if(legalActor==='deployer'&&!f.role_deployer)contradictions.push(`${label}: Betreiberpflicht ohne festgelegte Betreiberrolle.`);
    if(exception==='yes'){
      const exceptionFields=[`${key}ExceptionBasis`,`${key}ExceptionRequirements`,`${key}ExceptionScope`,`${key}Reason`,`${key}Evidence`];exceptionFields.forEach(field=>{if(!isFilled(f[field]))missing.push(`${label}: ${field}`);});
      code=exceptionFields.every(field=>isFilled(f[field]))?'exception':'review';
    }else if(exception==='review')code='review';
    const expectedResult=code==='applicable'?'applicable':code==='exception'?'exception':'review';
    if(isFilled(f[`${key}Result`])&&f[`${key}Result`]!==expectedResult)contradictions.push(`${label}: Das manuelle Ergebnis dieses Tatbestands widerspricht der regelbasierten Auswertung (${labelFor(expectedResult)}).`);
    if(code==='applicable')actors.add(legalActor);if(code==='review')reviewNeeds.push(`${label}: Ausnahme oder Pflicht ungeklärt.`);
    items.push({key,label,code,actor:legalActor,storedActor:actor,duty:f[`${key}Duty`]||'',exception,expectedResult});
  });
  const primaryApplicable=items.filter(item=>['tInteraction','tSynthetic','tEmotionBiometric','tDeepfake','tPublicText'].includes(item.key)&&item.code==='applicable');
  if(primaryApplicable.length&&f.tGeneralRequirements==='no')contradictions.push('TR-06 ist als nicht einschlägig markiert, obwohl mindestens eine Pflicht nach TR-01 bis TR-05 einschlägig ist und DUTY-26 deshalb gesondert zu prüfen ist. Anwendbarkeit und Erfüllungsstatus bleiben getrennt.');
  if(!primaryApplicable.length&&f.tGeneralRequirements==='yes')contradictions.push('TR-06 ist als einschlägig markiert, obwohl keine zugrunde liegende Pflicht nach TR-01 bis TR-05 festgestellt wurde.');
  const active=items.filter(item=>item.code==='applicable'&&item.key!=='tGeneralRequirements');let autoCode='none';
  if(missing.length||reviewNeeds.length||contradictions.length)autoCode='review';
  else if(items.some(item=>item.code==='exception')&&!active.length)autoCode='exception';
  else if(active.length>1||actors.has('both')||(actors.has('provider')&&actors.has('deployer')))autoCode='multiple';
  else if(active.length)autoCode=active[0].actor==='deployer'?'deployer':active[0].actor==='provider'?'provider':'multiple';
  const labels={none:'Keine Transparenzpflicht festgestellt',provider:'Anbieterpflicht',deployer:'Betreiberpflicht',multiple:'Mehrere Pflichten',exception:'Ausnahme dokumentiert',review:'Nicht eindeutig beurteilbar / weiterer Prüfbedarf'};
  contradictions.push(...conclusionCheck(autoCode,f.transparencyConclusion,[autoCode],labels,'Art. 50'));
  const effective=contradictions.length?'review':autoCode;
  return evaluationResult(effective,labels[effective],{triggers,missing,contradictions,reviewNeeds,critical:false,basis:'EU AI Act Art. 50',manual:f.transparencyConclusion,manualLabel:labels[f.transparencyConclusion]||'Nicht ausgewählt',items,actors:[...actors],provisional:path.provisional});
}

/** Bewertet GPAI-Relevanz, Anbieterrolle, Open-Source-Ausnahme und systemisches Risiko getrennt. */
function evaluateGPAI(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),gpaiQuestions=references.gpaiQuestions,QUESTION_IDS=references.questionIds,path=gpaiPathStatus(context);if(!path.required)return evaluationResult('not_required','Nicht erforderlich aufgrund der dokumentierten Abgrenzung',{basis:'EU AI Act Art. 51 ff.',reason:path.reason,role:'Keine',duties:[]});
  const f=state.form,missing=[],reviewNeeds=[],triggers=[],contradictions=[];gpaiQuestions.forEach(([key,providedLabel])=>{const label=providedLabel||guideLabel(QUESTION_IDS[key],context);if(!isFilled(f[key]))missing.push(label);if(['review','na'].includes(f[key]))reviewNeeds.push(label);if(f[key]==='yes')triggers.push(label);});
  ['gpaiOrganizationRole','gpaiBasis','gpaiEvidence'].forEach(key=>{if(!isFilled(f[key]))missing.push(key);});
  let role='Keine';if(f.gpaiOrganizationRole==='provider')role='GPAI-Anbieter';else if(['downstream','integrator'].includes(f.gpaiOrganizationRole))role='Nachgelagerter Anbieter / Integrator';else if(f.gpaiOrganizationRole==='unclear')reviewNeeds.push('Rolle der Organisation ist ungeklärt.');
  if(f.gObjectType==='integrating'&&f.gModel!=='yes')contradictions.push('Ein integrierendes System setzt eine dokumentierte relevante GPAI-Modellkomponente voraus.');
  if(f.gObjectType==='model'&&f.gModel!=='yes')contradictions.push('Die aktive Objektklassifikation „GPAI-Modell“ widerspricht der Angabe, dass kein GPAI-Modell vorliegt. GPAI-04 ist nur als Modellklassifikation auswertbar, wenn GPAI-01 bejaht ist.');
  if(f.gSystemicRisk==='yes'&&f.gModel!=='yes')contradictions.push('Systemisches GPAI-Risiko wurde bejaht, obwohl kein GPAI-Modell vorliegt.');
  if(f.gCommissionDesignation==='yes'&&f.gModel!=='yes')contradictions.push('Eine Kommissionsbenennung zum systemischen Risiko wurde dokumentiert, obwohl kein GPAI-Modell belegt ist.');
  if(f.gSelfProvision==='yes'&&f.gModel!=='yes')contradictions.push('Eigene Bereitstellung setzt ein GPAI-Modell voraus.');
  if(f.gSelfProvision==='yes'&&f.gpaiOrganizationRole!=='provider')contradictions.push('Die eigene Bereitstellung eines GPAI-Modells begründet eine GPAI-Anbieterrolle; „keine Anbieterrolle“ oder eine reine Integrationsrolle ist damit nicht vereinbar.');
  if(f.gModification==='yes'&&f.gModel!=='yes')contradictions.push('Eine erhebliche Änderung eines GPAI-Modells wurde dokumentiert, obwohl kein GPAI-Modell belegt ist.');
  const researchException=f.gResearchOnly==='yes';
  if(researchException&&f.gSelfProvision==='yes')contradictions.push('Die Forschungsausnahme vor dem Inverkehrbringen widerspricht der gleichzeitig dokumentierten eigenen Marktbereitstellung nach GPAI-05.');
  const providerRole=f.gpaiOrganizationRole==='provider'&&(f.gSelfProvision==='yes'||f.gModification==='yes');
  if(f.gpaiOrganizationRole==='provider'&&!providerRole&&!researchException)contradictions.push('Eine GPAI-Anbieterrolle ist weder durch eigene Bereitstellung noch durch eine erhebliche Modelländerung belegt.');
  if(f.gSystemicRisk==='yes'&&f.gAnnexXIII==='review'&&f.gCommissionDesignation!=='yes')reviewNeeds.push('Kriterien des Anhangs XIII und behördliche Einordnung zum systemischen Risiko sind ungeklärt.');
  if(f.gAnnexXIII==='yes'&&f.gCommissionDesignation!=='yes'&&f.gSystemicRisk!=='yes')reviewNeeds.push('GPAI-11 weist nur auf möglichen weiteren Prüfbedarf hin; ohne gesetzliche Einstufung oder Kommissionsbenennung wird kein systemisches Risiko automatisch festgestellt.');
  let autoCode='none';
  if(contradictions.length||missing.length||reviewNeeds.length)autoCode='review';
  else if(researchException)autoCode='research_exception';
  else if(f.gModel==='yes'&&(f.gSystemicRisk==='yes'||f.gCommissionDesignation==='yes'))autoCode='systemic';
  else if(f.gModel==='yes'&&providerRole)autoCode='model';
  else if(f.gObjectType==='integrating'||['downstream','integrator'].includes(f.gpaiOrganizationRole))autoCode='integration';
  else if(f.gModel==='yes'&&f.gResearchOnly==='no'&&f.gpaiOrganizationRole==='none')autoCode='relevant_no_provider';
  const labels={none:'Keine GPAI-Relevanz',research_exception:'Ausschließliche Forschung, Entwicklung oder Prototyping vor Inverkehrbringen – keine GPAI-Einordnung',relevant_no_provider:'GPAI-Modell betroffen – Organisation ist nicht Anbieter und hat keine eigenen Modell-Anbieterpflichten',model:'GPAI-Modell – Anbieterrolle',integration:'GPAI-Integration / nachgelagerte Rolle ohne Anbieterpflichten für das Modell',systemic:'Systemische GPAI-Relevanz aufgrund dokumentierter gesetzlicher Einstufung oder Kommissionsbenennung',review:'Nicht eindeutig beurteilbar / weiterer Prüfbedarf'};
  contradictions.push(...conclusionCheck(autoCode,f.gpaiConclusion,[autoCode],labels,'GPAI'));const effective=contradictions.length?'review':autoCode;
  const systemic=['systemic'].includes(effective),ownObligations=providerRole&&!researchException&&['model','systemic'].includes(effective);
  const openSourceException=ownObligations&&f.gOpenSource==='yes'&&!systemic;
  const thirdCountryRepresentativeRequired=ownObligations&&f.gNonEuProvider==='yes'&&!(f.gOpenSource==='yes'&&!systemic);
  const duties=ownObligations?(systemic?['GPAI-Anbieterpflichten','Modellbewertung und adversarielle Tests','Systemrisikobewertung und -minderung','Vorfallmeldung und Cybersicherheit']:['Technische Dokumentation und Informationen für nachgelagerte Anbieter, soweit keine Open-Source-Ausnahme greift','Urheberrechtsstrategie und Trainingsinhaltszusammenfassung']):effective==='integration'?['Integrationsdokumentation und Schnittstellenprüfung ohne GPAI-Anbieterpflichten für das Modell']:[];
  return evaluationResult(effective,labels[effective],{triggers,missing,contradictions,reviewNeeds,critical:effective==='review',basis:'EU AI Act Art. 51 ff.',manual:f.gpaiConclusion,manualLabel:labels[f.gpaiConclusion]||'Nicht ausgewählt',role,roleOutcome:f.gpaiOrganizationRole||'unclear',relevance:effective,duties,ownObligations,openSource:f.gOpenSource==='yes',openSourceException,thirdCountryRepresentativeRequired,systemic,provisional:path.provisional});
}

/** Prüft die grundlegende CRA-Produktanwendbarkeit vor der Rollen- und Pflichtenableitung. */
function craApplicabilityGate(context=null){
  const f=evaluationState(context).form,keys=['craDigitalProduct','craRemoteProcessing','craDataConnection','craCommercial','craPrototype','craOpenSource','craExclusion'],missing=keys.filter(key=>!isFilled(f[key])),review=keys.filter(key=>['review','na'].includes(f[key]));
  if(missing.length||review.length)return{status:'review',missing,review,reason:'Die vorgelagerte CRA-Anwendbarkeitsprüfung ist noch nicht vollständig oder eindeutig.'};
  if(f.craDigitalProduct==='no'||f.craDataConnection==='no'||(f.craCommercial==='no'&&f.craOpenSource!=='yes'))return{status:'no',missing:[],review:[],reason:'Die vorgelagerte CRA-Anwendbarkeitsprüfung ergibt eindeutig „nicht anwendbar“; CRA-08 bis CRA-12 sind nicht erforderlich.'};
  return{status:'continue',missing:[],review:[],reason:'Der CRA-Pfad ist anwendbar oder als Sonderfall weiter zu prüfen.'};
}

/** Gruppiert ausschließlich offene, aktive CRA-Prüfpunkte nach ihrer strukturierten Teilentscheidung. */
function openCraDependencyGroups(context=null){
  const groups={product_applicability:[],organizational_role:[],individual_duty:[],temporal_applicability:[],operational_condition:[],review:[]};
  activeRegisterItems('legal',context).filter(item=>item.status!=='resolved').forEach(item=>{
    const classification=classifyCraRegisterItem(item);
    if(classification.area==='not_applicable')return;
    groups[classification.area].push({...item,craDependencySource:classification.source,craDependencyReason:classification.reason});
  });
  return groups;
}

function craDependencyResultFields(groups){
  return{
    openPrerequisiteReviewIds:groups.product_applicability.map(item=>item.id),
    openRoleReviewIds:groups.organizational_role.map(item=>item.id),
    openDutyReviewIds:groups.individual_duty.map(item=>item.id),
    openTemporalReviewIds:groups.temporal_applicability.map(item=>item.id),
    openOperationalReviewIds:groups.operational_condition.map(item=>item.id),
    ambiguousCraDependencyIds:groups.review.map(item=>item.id)
  };
}

/** Bewertet CRA-Anwendbarkeit, Produktklasse, Mehrfachrollen und wesentliche Änderungen eigenständig. */
function evaluateCRA(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),QUESTION_IDS=references.questionIds,craRoleFields=references.craRoleFields,f=state.form,missing=[],reviewNeeds=[],triggers=[],contradictions=[],gate=craApplicabilityGate(context),dependencyGroups=openCraDependencyGroups(context),dependencyFields=craDependencyResultFields(dependencyGroups);
  dependencyGroups.product_applicability.forEach(item=>reviewNeeds.push(`${item.id}: Die offene Frage zur CRA-Produktanwendbarkeit ist Voraussetzung des ausgegebenen CRA-Ergebnisses.`));
  dependencyGroups.review.forEach(item=>reviewNeeds.push(`${item.id}: Der CRA-Prüfpunkt ist noch keiner Teilentscheidung eindeutig zugeordnet; die Zuordnung ist zu bestätigen.`));
  gate.missing.forEach(key=>missing.push(guideLabel(QUESTION_IDS[key],context)));gate.review.forEach(key=>reviewNeeds.push(guideLabel(QUESTION_IDS[key],context)));
  ['craDigitalProduct','craRemoteProcessing','craDataConnection','craCommercial','craPrototype','craOpenSource','craExclusion'].forEach(key=>{if(f[key]==='yes')triggers.push(guideLabel(QUESTION_IDS[key],context));});
  if(gate.status==='no'){
    const labels={no:'CRA auf das Produkt nicht anwendbar',review:'Nicht eindeutig beurteilbar / weiterer Prüfbedarf'},autoCode=dependencyGroups.product_applicability.length||dependencyGroups.review.length?'review':'no';
    contradictions.push(...conclusionCheck(autoCode,f.craConclusion,[autoCode],labels,'CRA'));
    const effective=contradictions.length?'review':autoCode;
    return evaluationResult(effective,labels[effective],{triggers,missing,contradictions,reviewNeeds,critical:effective==='review',basis:'Cyber Resilience Act',manual:f.craConclusion,manualLabel:labels[f.craConclusion]||'Nicht ausgewählt',roles:[],possibleRoles:[],roleCodes:[],category:'Nicht erforderlich',duties:[],productApplicable:false,ownObligations:false,roleOutcome:'not_required',specialCase:'',steward:false,overlap:'',openSource:f.craOpenSource==='yes',pathStatus:effective==='review'?'review':'not_required',pathReason:gate.reason,...dependencyFields});
  }
  dependencyGroups.organizational_role.forEach(item=>reviewNeeds.push(`${item.id}: Die offene CRA-Rollenfrage verhindert eine abschließende Ableitung eigener Organisationspflichten.`));
  ['craSubstantialChange','craManufacturerTakeover','craProductClass','craAiActOverlap'].forEach(key=>{const label=guideLabel(QUESTION_IDS[key],context);if(!isFilled(f[key]))missing.push(label);if(['review','na'].includes(f[key]))reviewNeeds.push(label);if(f[key]==='yes')triggers.push(label);});
  const roleCodes=craRoleFields.filter(([field])=>f[field]==='yes').map(([,code])=>code),craRoles=craRoleFields.filter(([field])=>f[field]==='yes').map(([, ,label])=>label);
  const possibleRoles=craRoleFields.filter(([field])=>!isFilled(f[field])||f[field]==='review').map(([, ,label])=>label),rolesUnclear=possibleRoles.length>0||f.craRole==='review';
  if(rolesUnclear)reviewNeeds.push('Die CRA-Rollen müssen einzeln bestätigt werden.');
  let category=f.craProductClass||'';
  if(f.craDigitalProduct==='yes'&&f.craDataConnection==='yes'&&f.craCommercial==='yes'){
    ['craProductType','craProductRelation','craProductClass','craConformityProcedure','craVulnerabilityProcess','craReportingProcess','craTransitionDates'].forEach(key=>{if(!isFilled(f[key])||f[key]==='unclear')missing.push(key);});
    if(category==='none')contradictions.push('Bei einem anwendbaren Produkt darf die Produktkategorie nicht „Keine“ lauten; zu verwenden ist mindestens „sonstiges Produkt“.');
  }
  if(f.craExclusion==='yes')['craExclusionBasis','craExclusionRequirements','craExclusionEvidence'].forEach(key=>{if(!isFilled(f[key]))missing.push(key);});
  if(f.craPrototype==='yes'){
    ['craPrototypeLimitedTesting','craPrototypeMarked'].forEach(key=>{if(!isFilled(f[key]))missing.push(key);if(f[key]==='review')reviewNeeds.push(`${key}: Voraussetzungen der Prototyp-Sonderregelung sind ungeklärt.`);});
  }
  if(f.craManufacturerTakeover==='yes'&&!roleCodes.includes('manufacturer'))contradictions.push('CRA-10 führt zur Herstellerstellung; die ausgewählten CRA-Rollen müssen den Hersteller enthalten.');
  if(roleCodes.includes('steward')&&f.craOpenSource!=='yes')contradictions.push('Die Steward-Rolle setzt eine passende Open-Source-Konstellation voraus.');
  let autoCode='review',specialCase='';
  if(!missing.length&&!reviewNeeds.length&&!contradictions.length){
    if(f.craDigitalProduct==='no'||f.craDataConnection==='no'||f.craCommercial==='no')autoCode='no';
    if(f.craDigitalProduct==='yes'&&f.craDataConnection==='yes'&&f.craPrototype==='yes'&&f.craPrototypeLimitedTesting==='yes'&&f.craPrototypeMarked==='yes'){autoCode='special';specialCase='Nachweislich begrenzter und entsprechend gekennzeichneter Prototyp-, Test- oder Vorabfall nach CRA-05';}
    else if(f.craDigitalProduct==='yes'&&f.craDataConnection==='yes'&&f.craOpenSource==='yes'&&f.craCommercial==='no'){autoCode='special';specialCase='Nicht im Rahmen einer Geschäftstätigkeit bereitgestellte freie und quelloffene Software nach CRA-06';}
    else if(f.craExclusion==='yes'){autoCode='special';specialCase='Gesetzlicher Ausschluss oder Einschränkung nach CRA-07';}
    else if(f.craDigitalProduct==='yes'&&f.craDataConnection==='yes'&&f.craCommercial==='yes'&&!craRoles.length)autoCode='product_only';
    else if(f.craDigitalProduct==='yes'&&f.craDataConnection==='yes'&&f.craCommercial==='yes'&&craRoles.length)autoCode='yes';
  }
  const labels={no:'CRA auf das Produkt nicht anwendbar',product_only:'CRA auf das Produkt anwendbar; keine eigene Wirtschaftsakteursrolle festgestellt',yes:'CRA auf das Produkt anwendbar; eigene Pflichten der Organisation festgestellt',special:'CRA-Ausschluss oder Spezialregelung dokumentiert',review:'Nicht eindeutig beurteilbar / weiterer Prüfbedarf'};
  contradictions.push(...conclusionCheck(autoCode,f.craConclusion,[autoCode],labels,'CRA'));const effective=contradictions.length?'review':autoCode;
  const steward=roleCodes.includes('steward'),ownObligations=effective==='yes'||(steward&&effective==='special'&&f.craExclusion!=='yes'&&f.craPrototype!=='yes');
  const duties=ownObligations?[...(roleCodes.includes('manufacturer')?['Cybersecurity-Anforderungen über den Lebenszyklus','Konformitätsbewertung und technische Dokumentation','Schwachstellenbehandlung','Meldepflichten','Übergangs- und Anwendungszeitpunkte beachten']:[]),...(steward?['Steward-Pflichten nach Art. 24 CRA','Meldung nach Art. 24 Abs. 3 CRA in Verbindung mit Art. 14 CRA']:[]),...(roleCodes.some(code=>['representative','importer','distributor'].includes(code))?['Rollenspezifische Pflichten nach Art. 18 bis 20 CRA']:[])]:[];
  return evaluationResult(effective,labels[effective],{triggers,missing,contradictions,reviewNeeds,critical:effective==='review',basis:'Cyber Resilience Act',manual:f.craConclusion,manualLabel:labels[f.craConclusion]||'Nicht ausgewählt',roles:craRoles,possibleRoles,roleCodes,category:category||'Nicht bestimmt',duties,productApplicable:['yes','product_only','special'].includes(effective),ownObligations,roleOutcome:rolesUnclear?'review':roleCodes.length>1?'multiple':roleCodes[0]||'none',specialCase,steward,overlap:f.craAiActOverlapNotes||'',openSource:f.craOpenSource==='yes',pathStatus:effective==='review'?'review':'active',pathReason:gate.reason,...dependencyFields});
}

/** Fasst die beiden Hochrisikopfade zusammen, ohne deren Einzelbegründungen zu verlieren. */
function evaluateHighRiskSummary(context=null){const product=evaluateProductHighRisk(context),annex=evaluateAnnexHighRisk(context);if(product.code==='not_continued'&&annex.code==='not_continued')return evaluationResult('not_continued','Nicht fortgeführt aufgrund festgestellter verbotener KI-Praxis',{basis:'EU AI Act Art. 5 und 6',product,annex});if(product.code==='yes'||annex.code==='yes')return evaluationResult('high_risk','Hochrisiko-KI-System',{basis:'EU AI Act Art. 6',product,annex});if(['review'].includes(product.code)||['review'].includes(annex.code))return evaluationResult('review','Hochrisiko-Einstufung nicht abschließend bestimmbar',{basis:'EU AI Act Art. 6',product,annex,critical:true});return evaluationResult('not_high_risk','Kein Hochrisiko-KI-System',{basis:'EU AI Act Art. 6',product,annex});}

/**
 * Bewertet einen Rollenwechsel nach Art. 25 aus den Tatsachen ROLE-12 bis ROLE-15.
 * @returns {object} Ergebnis zur Übernahme von Anbieterpflichten einschließlich Widersprüchen.
 * @description Datenquelle sind Hochrisiko- und Rollenangaben des Live-Zustands. Die Funktion ist nebenwirkungsfrei und prüft nur Art. 25, nicht die übrigen Akteursrollen.
 */
function evaluateArt25(context=null){const state=evaluationState(context),high=evaluateHighRiskSummary(context),f=state.form;if(high.code!=='high_risk')return evaluationResult('not_applicable','Nicht anwendbar – keine festgestellte Hochrisikoeinstufung',{basis:'EU AI Act Art. 25',reason:high.label});const facts=['art25OwnBrand','art25SubstantialModification','art25PurposeChange','art25ProductIntegration'];if(facts.some(key=>!isFilled(f[key])||f[key]==='review'))return evaluationResult('review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf',{basis:'EU AI Act Art. 25',critical:true,missing:facts.filter(key=>!isFilled(f[key]))});const automatic=facts.some(key=>f[key]==='yes')?'applicable':'not_applicable',manual=f.art25Conclusion==='provider'?'applicable':f.art25Conclusion;if(!isFilled(f.art25Conclusion)||!isFilled(f.art25Basis))return evaluationResult('review','Nicht eindeutig beurteilbar / weiterer Prüfbedarf',{basis:'EU AI Act Art. 25',missing:['art25Conclusion','art25Basis'].filter(key=>!isFilled(f[key])),critical:true});const contradictions=manual!==automatic?[`Art. 25: Manuelle Schlussfolgerung widerspricht den Tatsachen aus ROLE-12 bis ROLE-15.`]:[];const code=contradictions.length?'review':automatic;return evaluationResult(code,code==='applicable'?'Anbieterpflichten nach Art. 25 einschlägig':code==='not_applicable'?'Art. 25 nach dokumentierter Prüfung nicht einschlägig':'Nicht eindeutig beurteilbar / weiterer Prüfbedarf',{basis:'EU AI Act Art. 25',critical:code==='review',contradictions});}
function allRegulatoryEvaluations(context=null){return{prohibition:evaluateProhibitedPractices(context),productHighRisk:evaluateProductHighRisk(context),annexHighRisk:evaluateAnnexHighRisk(context),art25:evaluateArt25(context),transparency:evaluateTransparency(context),gpai:evaluateGPAI(context),cra:evaluateCRA(context)};}
function regulatoryResults(context=null){const e=allRegulatoryEvaluations(context);return Object.fromEntries(Object.entries(e).map(([key,value])=>[key,value.label]));}
function effectiveAnnexConclusion(context=null){return evaluateAnnexHighRisk(context).code;}
function regulatoryContradictions(context=null){return Object.values(allRegulatoryEvaluations(context)).flatMap(result=>result.contradictions);}

/* 12. Pflichten- und Reviewableitung */

/**
 * Leitet ausschließlich einschlägige regulatorische Pflichten ab. Art. 27 wird
 * aus Betreiberrolle und öffentlichem beziehungsweise grundrechtsrelevantem Kontext
 * bestimmt. Die Registrierungen nach Art. 49 werden getrennt für Anbieter,
 * Ausnahmefälle nach Art. 6 Abs. 3 und Betreiber öffentlicher Stellen geführt.
 */
function requiredHighRiskDuties(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),roles=references.roles,highRiskDutyCatalog=references.highRiskDutyCatalog,annexAreas=references.annexAreas,QUESTION_IDS=references.questionIds,e=allRegulatoryEvaluations(context),f=state.form,aiPath=aiActPathStatus(context),definitiveAIPath=aiPath.required&&!aiPath.provisional,highRisk=definitiveAIPath&&[e.productHighRisk.code,e.annexHighRisk.code].includes('yes');
  const selected=new Set(roles.filter(([id])=>f[`role_${id}`]).map(([id])=>id));
  if(aiPath.scope?.deployerDutiesExcluded)selected.delete('deployer');
  const originalProvider=selected.has('provider');
  if(e.art25.code==='applicable')selected.add('provider');
  if(selected.has('productManufacturer')&&e.productHighRisk.code==='yes')selected.add('provider');
  const duties=[],seen=new Set();
  const add=(id,role='',origin='')=>{if(seen.has(id))return;const found=highRiskDutyCatalog.find(([code])=>code===id);if(!found)return;seen.add(id);duties.push({code:id,guideId:id,label:found[1],basis:found[2],role:role||found[3],condition:found[4],origin,scopeLimitations:aiPath.scope?.limitations||[]});};
  if(definitiveAIPath&&(selected.has('provider')||selected.has('deployer')))add('DUTY-01',[selected.has('provider')?'Anbieter':'',selected.has('deployer')?'Betreiber':''].filter(Boolean).join(' / '),'ROLE-01 / ROLE-03');
  if(highRisk&&selected.has('provider'))for(let number=2;number<=15;number++){if(number!==12)add(`DUTY-${String(number).padStart(2,'0')}`,'Anbieter',e.productHighRisk.code==='yes'?'HR-01 bis HR-05':'HR-06 bis HR-20');}
  const duty15=duties.find(item=>item.code==='DUTY-15');if(duty15)Object.assign(duty15,{art25RoleTakeover:!originalProvider&&e.art25.code==='applicable',supplierRelationship:f.art25SupplierRelationship||'',supplierEvidence:f.art25SupplierEvidence||'',supplierMapping:'Die Anbieterpflicht aus Art. 25 Abs. 4 wird über die dokumentierte Anbieter-/Zuliefererbeziehung und die schriftliche Vereinbarung nachverfolgt.'});
  const annexNonNr2Selected=annexAreas.some(([key])=>key!=='annexCriticalInfrastructure'&&f[key]==='yes');
  const annexNr2Only=f.annexCriticalInfrastructure==='yes'&&!annexNonNr2Selected;
  const providerRegistrationStatus=e.annexHighRisk.code==='yes'?(annexNonNr2Selected?'yes':annexNr2Only?'no':'review'):e.annexHighRisk.code==='review'&&e.productHighRisk.code==='yes'?'review':'no';
  if(highRisk&&(selected.has('provider')||selected.has('authorisedRepresentative'))){
    add('DUTY-12',[selected.has('provider')?'Anbieter':'',selected.has('authorisedRepresentative')?'Bevollmächtigter':''].filter(Boolean).join(' / '),e.productHighRisk.code==='yes'?'HR-01 bis HR-05':'HR-06 bis HR-20');
    Object.assign(duties.find(item=>item.code==='DUTY-12'),{registrationStatus:providerRegistrationStatus,registrationRequired:providerRegistrationStatus==='yes',subRequirements:[{label:'Allgemeine Anbieterpflichten einschließlich Konformitätsbewertung, Erklärung und CE-Kennzeichnung',status:'applicable',temporalPath:'Hochrisiko – Kapitel III Abschnitte 1 bis 3'},{label:'Registrierung nach Art. 49 Abs. 1',status:providerRegistrationStatus,temporalPath:'Kapitel III Abschnitt 5',condition:'Anhang III, außer Nr. 2'}]});
  }
  if(e.annexHighRisk.code==='exception'&&(selected.has('provider')||selected.has('authorisedRepresentative'))){
    const duty16Roles=[selected.has('provider')?'Anbieter':'',selected.has('authorisedRepresentative')?'Bevollmächtigter':''].filter(Boolean).join(' / ');
    add('DUTY-16',duty16Roles,'HR-14 bis HR-19 · '+[selected.has('provider')?'ROLE-01':'',selected.has('authorisedRepresentative')?'ROLE-04':''].filter(Boolean).join(' / '));
  }
  if(highRisk&&selected.has('authorisedRepresentative'))add('DUTY-17','Bevollmächtigter','ROLE-04');
  if(highRisk&&selected.has('importer'))add('DUTY-18','Einführer','ROLE-05');
  if(highRisk&&selected.has('distributor'))add('DUTY-19','Händler','ROLE-06');
  if(highRisk&&selected.has('deployer')){
    const registrationEligible=e.annexHighRisk.code==='yes'&&annexNonNr2Selected;
    const registrationStatus=registrationEligible?(f.unionAuthority==='yes'?'yes':f.unionAuthority==='no'?'no':'review'):e.annexHighRisk.code==='review'?'review':'no';
    add('DUTY-20','Betreiber',registrationStatus==='yes'?'CTX-14 – Registrierung nach Art. 49 Abs. 3 erforderlich':registrationStatus==='review'?'CTX-14 – Voraussetzung der Registrierung nach Art. 49 Abs. 3 ungeklärt':'ROLE-03 – Betreiberpflichten; keine positive Registrierungsaussage');
    Object.assign(duties.find(item=>item.code==='DUTY-20'),{registrationRequired:registrationStatus==='yes',registrationStatus,subRequirements:[{label:'Allgemeine Betreiberpflichten nach Art. 26',status:'applicable',temporalPath:'Hochrisiko – Kapitel III Abschnitte 1 bis 3'},{label:'Registrierung nach Art. 49 Abs. 3',status:registrationStatus,temporalPath:'Kapitel III Abschnitt 5',condition:`Anhang III außer Nr. 2 und CTX-14: ${labelFor(f.unionAuthority)}`}]});
  }
  if(e.annexHighRisk.code==='yes'&&selected.has('deployer')&&!annexNr2Only){
    const hr20Relevant=f.annexEssentialServices==='yes';
    const art27Yes=f.publicServiceEntity==='yes'||(hr20Relevant&&f.annexIII5bc==='yes');
    const art27Review=!art27Yes&&(f.publicServiceEntity==='review'||!isFilled(f.publicServiceEntity)||(hr20Relevant&&(!isFilled(f.annexIII5bc)||f.annexIII5bc==='review')));
    if(art27Yes||art27Review){add('DUTY-21','Betreiber nach Art. 27 Abs. 1',art27Yes?(f.publicServiceEntity==='yes'?'CTX-13':'HR-20'):`CTX-13${hr20Relevant?' / HR-20':''} – Voraussetzungen ungeklärt`);Object.assign(duties.find(item=>item.code==='DUTY-21'),{applicabilityDecision:art27Yes?'yes':'review',hr20Relevant});}
  }
  const transparencyDutyByKey={tInteraction:'DUTY-22',tSynthetic:'DUTY-23',tEmotionBiometric:'DUTY-24',tDeepfake:'DUTY-25',tPublicText:'DUTY-25'};
  const applicableTransparencyItems=definitiveAIPath?(e.transparency.items||[]).filter(item=>transparencyDutyByKey[item.key]&&item.code==='applicable'&&!(aiPath.scope?.deployerDutiesExcluded&&item.actor==='deployer')):[];
  applicableTransparencyItems.forEach(item=>add(transparencyDutyByKey[item.key],item.actor==='provider'?'Anbieter':'Betreiber',QUESTION_IDS[item.key]));
  if(applicableTransparencyItems.length){const actors=[...new Set(applicableTransparencyItems.map(item=>item.actor==='provider'?'Anbieter':'Betreiber'))];add('DUTY-26',actors.join(' / '),'TR-01 bis TR-05');}
  if(e.gpai.ownObligations){if(!e.gpai.openSourceException)add('DUTY-27','GPAI-Anbieter','GPAI-05 / GPAI-08');add('DUTY-28','GPAI-Anbieter','GPAI-05');if(e.gpai.thirdCountryRepresentativeRequired)add('DUTY-29','GPAI-Anbieter aus Drittland','GPAI-07 / Art. 54 Abs. 6');if(f.gSystemicRisk==='yes')add('DUTY-30','GPAI-Anbieter','GPAI-09');if(e.gpai.code==='systemic')add('DUTY-31','GPAI-Anbieter','GPAI-09 bis GPAI-11');}
  if(e.cra.code==='yes'){
    if(e.cra.roleCodes.includes('manufacturer'))for(let number=32;number<=35;number++)add(`DUTY-${number}`,'Hersteller','CRA-01 bis CRA-12');
    if(e.cra.roleCodes.some(code=>['representative','importer','distributor'].includes(code)))add('DUTY-36',e.cra.roles.filter(label=>label!=='Hersteller'&&label!=='Open-Source-Software-Steward').join(', '),'CRA-08');
  }
  if(e.cra.steward&&e.cra.ownObligations)add('DUTY-35','Open-Source-Software-Steward nach Art. 24 Abs. 3','CRA-06 / CRA-08');
  duties.forEach(duty=>{
    const number=Number(duty.code.slice(-2));
    const annexIBAffected=aiPath.scope?.annexIBLimitation&&number>=2&&number<=21;
    const annexIAAffected=aiPath.scope?.annexIAEquivalentLimitation&&number>=2&&number<=19;
    if(!annexIBAffected&&!annexIAAffected)return;
    duty.scopeDecision='review';
    duty.scopeDecisionReason=[annexIBAffected?'SCOPE-08: Der nach Art. 2 Abs. 2 verbleibende Umfang dieser Hochrisikopflicht ist nicht abschließend bestimmt.':'',annexIAAffected?'SCOPE-18: Es ist nicht nachgewiesen, ob diese Anforderung durch gleichwertiges oder strengeres Harmonisierungsrecht nach Anhang I Abschnitt A abgedeckt wird.':''].filter(Boolean).join(' ');
    duty.scopeLimitationSources=[...(annexIBAffected?['SCOPE-08']:[]),...(annexIAAffected?['SCOPE-18']:[])];
  });
  return duties;
}

function highRiskDutyCoverage(context=null){
  const state=evaluationState(context),required=requiredHighRiskDuties(context),entries=state.registers.regulatory;
  const items=required.map(duty=>{
    const entry=entries.find(item=>item.dutyCode===duty.code&&item.sourceActive!==false);
    const registration=entries.find(item=>item.dutyCode===`${duty.code}-REG`&&item.sourceActive!==false);
    const mainComplete=Boolean(entry&&(entry.applicability==='not_applicable'||(isFilled(entry.owner)&&isFilled(entry.due)&&isFilled(entry.status)&&isFilled(entry.evidence)&&isFilled(entry.beforeRelease)&&isFilled(entry.decisionCritical)&&isFilled(entry.fulfillability)&&isFilled(entry.fulfillabilityReason))));
    const registrationComplete=!registration||registration.applicability==='not_applicable'||(registration.status==='fulfilled'&&isFilled(registration.owner)&&isFilled(registration.due)&&isFilled(registration.evidence)&&registration.fulfillability==='fulfillable');
    return{...duty,entry,registration,complete:mainComplete&&registrationComplete};
  });
  return{required,items,missing:items.filter(item=>!item.entry),incomplete:items.filter(item=>item.entry&&!item.complete),complete:items.length>0&&items.every(item=>item.complete)};
}

/** Prüft die inhaltliche Synchronität der getrennten Art.-49-Registrierungspfade. */
function registrationSynchronizationIssues(context=null){
  const issues=[];
  for(const dutyCode of ['DUTY-12','DUTY-20']){
    const parent=activeRegisterItems('regulatory',context).find(item=>item.dutyCode===dutyCode),registration=activeRegisterItems('regulatory',context).find(item=>item.dutyCode===`${dutyCode}-REG`);
    if(!registration)continue;
    const registrationComplete=registration.applicability==='not_applicable'||(registration.status==='fulfilled'&&registration.fulfillability==='fulfillable'&&['owner','due','evidence'].every(key=>isFilled(registration[key])));
    if(parent&&['fulfilled'].includes(parent.status)&&!registrationComplete)issues.push(`${dutyCode}: Die Hauptpflicht ist als erfüllt markiert, der zugehörige Registrierungseintrag ist jedoch offen oder unvollständig.`);
    if(registration.parentDutyCode!==dutyCode)issues.push(`${dutyCode}: Der Registrierungseintrag ist nicht eindeutig mit seiner fachlichen Hauptpflicht verknüpft.`);
  }
  return issues;
}

function review10RiskState(risk){
  const valid=value=>['low','medium','high'].includes(value)?value:'unknown';
  if(risk.treatmentNeeded!=='yes')return{level:effectiveCurrentRisk(risk),source:'aktuelles Risiko'};
  if(risk.treatmentStatus==='verified')return{level:valid(risk.verifiedResidual),source:'verifiziertes Restrisiko'};
  if(risk.treatmentStatus==='implemented')return{level:'unknown',source:'verifiziertes Restrisiko nach umgesetzter, aber noch nicht verifizierter Behandlung'};
  if(['planned','inProgress'].includes(risk.treatmentStatus))return{level:valid(risk.expectedResidual),source:'erwartetes Restrisiko'};
  if(risk.suitableTreatmentAvailability==='available')return{level:'unknown',source:'erwartetes Restrisiko der verfügbaren Behandlung'};
  return{level:effectiveCurrentRisk(risk),source:'aktuelles Risiko'};
}
function riskOutsideTolerance(risk){const effective=review10RiskState(risk);return effective.level==='high'&&risk.acceptance!=='accepted';}
/**
 * Bewertet REVIEW-10 ausschließlich aus hohen Risiken außerhalb der Toleranz
 * und der nachweisbaren Verfügbarkeit einer geeigneten Behandlung.
 */
function evaluateReview10(context=null){
  const state=evaluationState(context);
  if(!state.risks.length)return{value:'review',reason:'Es ist kein konkretes Risiko erfasst; REVIEW-10 ist nicht beurteilbar.',sources:['RISK-24 bis RISK-31']};
  const results=state.risks.map((risk,index)=>{
    const id=risk.riskId||`Risiko ${index+1}`,effective=review10RiskState(risk);
    if(effective.level==='unknown')return{value:'review',reason:`${id}: Das maßgebliche ${effective.source} ist noch nicht bestimmbar.`,source:id};
    if(effective.level!=='high'||risk.acceptance==='accepted')return{value:'no',reason:`${id}: ${effective.source} liegt innerhalb der dokumentierten Toleranz.`,source:id};
    if(['erwartetes Restrisiko','verifiziertes Restrisiko'].includes(effective.source))return{value:'yes',reason:`${id}: Das ${effective.source} bleibt hoch und liegt außerhalb der dokumentierten Toleranz.`,source:id};
    if(risk.suitableTreatmentAvailability==='unavailable')return{value:'yes',reason:`${id}: hohes aktuelles Risiko außerhalb der Toleranz und ausdrücklich keine geeignete Behandlung bestimmbar.`,source:id};
    return{value:'review',reason:risk.suitableTreatmentAvailability==='available'?`${id}: Eine Behandlung ist verfügbar, das erwartete Restrisiko ist jedoch noch nicht bestimmbar.`:`${id}: Behandlungsmöglichkeit und Restrisiko sind nicht abschließend bestimmt.`,source:id};
  });
  const value=results.some(item=>item.value==='yes')?'yes':results.some(item=>item.value==='review')?'review':'no';
  return{value,reason:results.map(item=>item.reason).join(' '),sources:results.map(item=>item.source)};
}

function operationalResult(id,value,reason,sources=[],extra={},context=null){
  const references=evaluationReferences(context);
  return{id,label:guideLabel(id,context),value,reason:reason||'Keine Begründung verfügbar.',sources:[...new Set((Array.isArray(sources)?sources:[sources]).filter(Boolean))],path:(references.dutyImplementationPaths[id]||references.reviewImplementationPaths[id]||''),...extra};
}
/** Bewertet eine DUTY-Kennung aus ihrem konkreten fachlichen Umsetzungspfad. */
function evaluateDutyOperationalResult(id,context=null){
  const state=evaluationState(context),references=evaluationReferences(context),prohibitedQuestions=references.prohibitedQuestions,transparencyQuestions=references.transparencyQuestions,roleQuestionKeys=references.roleQuestionKeys,number=Number(id.slice(-2)),required=requiredHighRiskDuties(context),duty=required.find(item=>item.code===id),entry=state.registers.regulatory.find(item=>item.dutyCode===id&&item.sourceActive!==false),result=(value,reason,sources=[],extra={})=>operationalResult(id,value,reason,sources,extra,context);
  if(number<=36){
    const sourceGroup=number<=21?'ROLE-01 bis ROLE-15 / HR-01 bis HR-20':number<=26?'TR-01 bis TR-07':number<=31?'GPAI-01 bis GPAI-11':'CRA-01 bis CRA-12';
    if(!duty)return result('no','Aus Rollen-, Regulierungs- und Anwendungspfad derzeit nicht einschlägig.',[sourceGroup]);
    if(!entry)return result('review',`Einschlägig für ${duty.role||'die festgestellte Rolle'}, aber noch ohne Registereintrag.`,[duty.origin||id],{applicable:true,roles:duty.role});
    if(duty.scopeDecision==='review')return result('review',duty.scopeDecisionReason,[...(duty.scopeLimitationSources||[]),duty.origin||id,entry.id],{applicable:true,roles:duty.role,registerId:entry.id});
    if(duty.registrationStatus==='review')return result('review','Die Voraussetzungen der Betreiberregistrierung nach Art. 49 Abs. 3 sind wegen CTX-14 nicht abschließend bestimmt.',[duty.origin||id,entry.id],{applicable:true,roles:duty.role,registerId:entry.id});
    if(duty.applicabilityDecision==='review')return result('review','Die Voraussetzungen der Grundrechte-Folgenabschätzung nach Art. 27 sind wegen CTX-13 oder HR-20 nicht abschließend bestimmt.',[duty.origin||id,entry.id],{applicable:true,roles:duty.role,registerId:entry.id});
    const registration=['DUTY-12','DUTY-20'].includes(id)?activeRegisterItems('regulatory',context).find(item=>item.dutyCode===`${id}-REG`):null,registrationComplete=!registration||registration.applicability==='not_applicable'||(registration.status==='fulfilled'&&registration.fulfillability==='fulfillable'&&['owner','due','evidence'].every(key=>isFilled(registration[key]))),mainComplete=isFilled(entry.owner)&&isFilled(entry.due)&&isFilled(entry.status)&&isFilled(entry.evidence)&&isFilled(entry.fulfillability)&&isFilled(entry.fulfillabilityReason)&&entry.applicability!=='not_assessable',complete=mainComplete&&registrationComplete;
    const supplierText=id==='DUTY-15'?` Anbieter-/Zuliefererzuordnung: ${duty.supplierRelationship||'nicht dokumentiert'}; Nachweis: ${duty.supplierEvidence||'nicht dokumentiert'}.`:'';
    return result(complete?'yes':'review',`${duty.role||'Verpflichtete Rolle'} · ${labelFor(entry.applicability)} · ${complete?'fachliche Pflicht und gegebenenfalls verknüpfter Registrierungseintrag vollständig nachverfolgt':'Haupt- oder Registrierungseintrag unvollständig'}.${supplierText}`,[duty.origin||id,entry.id,...(registration?[registration.id]:[])],{applicable:true,roles:duty.role,registerId:entry.id,registrationId:registration?.id||''});
  }
  if(id==='DUTY-37'){
    if(!state.risks.length)return result('review','Keine konkrete Risikobewertung vorhanden.',['RISK-24 bis RISK-31']);
    const unknown=state.risks.filter(risk=>effectiveCurrentRisk(risk)==='unknown'),outside=state.risks.filter(riskOutsideTolerance);
    return result(unknown.length?'review':outside.length?'no':'yes',unknown.length?`${countLabel(unknown.length,'Risiko','Risiken')} nicht bestimmbar.`:outside.length?`${countLabel(outside.length,'Risiko','Risiken')} außerhalb der Toleranz.`:'Aktuelle beziehungsweise verifizierte Restrisiken liegen innerhalb der dokumentierten Toleranz.',state.risks.map(risk=>risk.riskId));
  }
  if(id==='DUTY-38'){
    const unknown=state.risks.filter(risk=>effectiveCurrentRisk(risk)==='unknown').length,complete=state.form.infoStatus==='complete'&&!unknown;
    const value=complete?'yes':state.form.infoStatus==='missing'||unknown?'no':'review';return result(value,complete?'Informationslage und Risikobewertbarkeit sind ausreichend.':`Informationsstatus: ${labelFor(state.form.infoStatus)}; nicht bestimmbare Risiken: ${unknown}.`,['TOOL-11','TOOL-12','RISK-24 bis RISK-31']);
  }
  if(id==='DUTY-39'){
    const open=activeRegisterItems('regulatory',context).filter(item=>item.applicability==='current'&&!['fulfilled','verified'].includes(item.status)),protectedStatus=state.form.riskProtectedGroups;
    const value=!isFilled(protectedStatus)||protectedStatus==='review'?'review':open.length?'no':'yes';return result(value,open.length?`${open.length} aktuell anwendbare Pflicht(en) noch offen.`:value==='review'?'Schutzgruppenprüfung oder Pflichtstatus nicht abschließend beurteilbar.':'Keine offene zwingende Pflicht festgestellt; Schutzgruppen wurden berücksichtigt.',['RISK-30',...open.map(item=>item.id)]);
  }
  if(id==='DUTY-40'){
    if(!state.risks.length)return result('review','Keine Risikoakzeptanz dokumentiert.',['RISK-24 bis RISK-31']);
    const incomplete=state.risks.filter(risk=>!isFilled(risk.acceptance)||!isFilled(risk.riskOwner||risk.owner)||!isFilled(risk.acceptanceApproval));return result(incomplete.length?'review':'yes',incomplete.length?`${countLabel(incomplete.length,'Risikoakzeptanz','Risikoakzeptanzen')} ohne vollständige Owner- und Entscheidungsdokumentation.`:'Risikoakzeptanzen, Risk Owner und Entscheidungen sind dokumentiert.',state.risks.map(risk=>risk.riskId));
  }
  if(id==='DUTY-41'){
    const issues=[...regulatoryContradictions(context),...allRiskContradictions(context)];if(['partial','missing'].includes(state.form.infoStatus))issues.push('Entscheidende Informationen fehlen.');return result(issues.length?'yes':state.evaluated.slice(0,7).every(Boolean)?'no':'review',issues.length?issues.join(' '):state.evaluated.slice(0,7).every(Boolean)?'Keine entscheidenden Informationslücken oder Widersprüche festgestellt.':'Prüfschritte noch nicht vollständig bewertet.',['TOOL-12','Prüfschritte 1–7']);
  }
  if(id==='DUTY-42'){
    const evals=Object.values(allRegulatoryEvaluations(context)),reviews=evals.filter(result=>result.code==='review'||result.reviewNeeds.length);return result(reviews.length?'yes':state.evaluated[3]?'no':'review',reviews.length?reviews.map(result=>result.label).join(' · '):state.evaluated[3]?'Keine offene regulatorisch entscheidende Tatsachenfrage.':'Regulatorischer Prüfschritt noch nicht bewertet.',['Prüfschritt 4']);
  }
  if(id==='DUTY-43'){
    const f=state.form,edge=[...prohibitedQuestions.map(([key])=>f[`${key}Exception`]),...transparencyQuestions.map(([key])=>f[`${key}Exception`]),evaluateAnnexHighRisk(context).code,evaluateArt25(context).code,evaluateGPAI(context).code,evaluateCRA(context).code].some(value=>['possible','review'].includes(value));return result(edge?'yes':state.evaluated[3]?'no':'review',edge?'Rechtliche Ausnahme oder Grenzfall ist offen beziehungsweise nur teilweise belegt.':state.evaluated[3]?'Kein offener Ausnahmetatbestand oder regulatorischer Grenzfall festgestellt.':'Regulatorischer Prüfschritt noch nicht bewertet.',['ART5','HR-14 bis HR-19','TR-01 bis TR-07','GPAI','CRA']);
  }
  if(id==='DUTY-44'){
    const unclear=state.risks.filter(risk=>!isFilled(risk.probability)||!isFilled(risk.impact)||effectiveCurrentRisk(risk)==='unknown');return result(unclear.length?'yes':state.risks.length?'no':'review',unclear.length?`${countLabel(unclear.length,'Risiko','Risiken')} fachlich nicht belastbar bewertbar.`:state.risks.length?'Eintritt und Auswirkung aller Risiken sind bestimmbar.':'Keine Risiken erfasst.',unclear.map(risk=>risk.riskId));
  }
  if(id==='DUTY-45'){
    const alignment=state.form.purposeAlignment,roleReview=roleQuestionKeys.some(key=>!isFilled(state.form[key])||state.form[key]==='review')||!roleLabels(context).length;
    if(roleReview)return result('review','Die Akteursrolle ist nicht abschließend bestimmbar; eine fachliche oder juristische Rollenprüfung ist erforderlich.',['CTX-02','ROLE-01 bis ROLE-11']);
    if(alignment==='partial')return result('yes','Zwischen der Zweckbestimmung des Anbieters und der tatsächlichen oder geplanten Nutzung besteht eine teilweise Abweichung.',['CTX-02','DUTY-45','ROLE-01 bis ROLE-11']);
    if(alignment==='substantial')return result('yes','Zwischen der Zweckbestimmung des Anbieters und der tatsächlichen oder geplanten Nutzung besteht eine wesentliche Abweichung.',['CTX-02','DUTY-45','ROLE-01 bis ROLE-11']);
    if(alignment==='matches')return result('no','Die dokumentierte Nutzung entspricht der Zweckbestimmung des Anbieters; aus CTX-02 ergibt sich kein zusätzlicher Prüfbedarf.',['CTX-02','DUTY-45','ROLE-01 bis ROLE-11']);
    return result('review','Die Nutzungskongruenz ist noch nicht abschließend geklärt.',['CTX-02','DUTY-45','ROLE-01 bis ROLE-11']);
  }
  if(id==='DUTY-46')return result(state.form.newTechnicalFeature||'review',state.form.newTechnicalFeatureReason||'Neue oder bislang nicht erfasste technische Eigenschaften wurden noch nicht beurteilt.',['DUTY-46','RISK-01 bis RISK-06']);
  if(id==='DUTY-47'){
    const assessment=state.form.legalRegimeFulfilment,evidence=state.form.legalRegimeFulfilmentEvidence,sources=['DUTY-47','legalRegimeFulfilment','legalRegimeFulfilmentEvidence','CRA-12'];
    if(assessment==='clarified'&&isFilled(evidence))return result('no','Die Pflichterfüllung und das Zusammenwirken der einschlägigen Rechtsregime sind anhand der dokumentierten Begründung und Nachweise eindeutig geklärt; aus diesem Kriterium entsteht kein zusätzlicher juristischer Prüfbedarf.',sources);
    if(assessment==='unresolved'&&isFilled(evidence))return result('yes','Die Pflichterfüllung oder das Zusammenwirken von EU AI Act, Cyber Resilience Act, Datenschutzrecht, sektoralem Recht oder weiteren dokumentierten Rechtsregimen ist ungeklärt oder widersprüchlich; juristischer Prüfbedarf besteht.',sources);
    if(assessment==='review'&&isFilled(evidence))return result('review','Die Beurteilungsgrundlage zur Pflichterfüllung und zum Zusammenwirken der einschlägigen Rechtsregime reicht noch nicht für eine abschließende Klärung aus.',sources);
    return result('review',isFilled(assessment)?'Die strukturierte Beurteilung ist ausgewählt, aber das verpflichtende Begründungs- und Nachweisfeld fehlt.':'Die strukturierte Beurteilungsgrundlage zur Pflichterfüllung und zum Zusammenwirken mehrerer Rechtsregime fehlt.',sources);
  }
  return result('review','Keine ausführbare Regel gefunden.',[id]);
}
/** Liefert alle operationalisierten DUTY-Ergebnisse in stabiler Leitfadenreihenfolge. */
function dutyOperationalResults(context=null){return evaluationReferences(context).dutyImplementationIds.map(id=>evaluateDutyOperationalResult(id,context));}

const REQUIRED_VERSION_DOCUMENTATION_FIELDS=Object.freeze(['assessmentVersion','guideVersion','version','assessmentDate']);
/** Liefert die gemeinsame Pflichtgrundlage für REVIEW-14 und den Dokumentationsabschluss. */
function versionDocumentationStatus(context=null){
  const f=evaluationState(context).form,missing=REQUIRED_VERSION_DOCUMENTATION_FIELDS.filter(key=>!isFilled(f[key]));
  return{missing,complete:missing.length===0,reason:missing.length?`Erforderliche Versions- oder Stichtagsangaben fehlen: ${missing.map(key=>displayFieldName(key,context)).join(', ')}.`:`Bewertung ${f.assessmentVersion} · Leitfaden ${f.guideVersion} · Tool ${f.version} · Bewertungsstichtag ${fmtDate(f.assessmentDate)} · Rechtsstand ${evaluationReferences(context).knowledgeBase.legalStatus}.`};
}

/**
 * Bewertet genau eine operationalisierte REVIEW-Kennung und erhält Begründung, Quellen und Entscheidungsauswirkung.
 * @param {string} id REVIEW-01 bis REVIEW-42.
 * @param {object|null} [decision=null] Optional bereits berechneter Gesamtstatus zur Vermeidung rekursiver Neuberechnung.
 * @returns {object} Strukturiertes REVIEW-Ergebnis.
 * @description Datenquelle sind Formular-, Risiko-, Organisations- und Registerangaben des Bewertungsstands. Die Funktion verändert keine Daten und erteilt keine Freigabe.
 */
function reviewOperationalResult(id,decision=null,context=null){
  const state=evaluationState(context),references=evaluationReferences(context),KNOWLEDGE_BASE=references.knowledgeBase,steps=references.steps,contextDescriptionKeys=references.contextDescriptionKeys,contextChoiceKeys=references.contextChoiceKeys,n=Number(id.slice(-2)),f=state.form,regs=allRegulatoryEvaluations(context),sources=[];
  const result=(value,reason,moreSources=[],extra={})=>operationalResult(id,value,reason,[...sources,...moreSources],extra,context);
  if(n===1)return result(f.infoStatus||'review',`Tool: ${f.toolName||'nicht benannt'} · Informationsstatus: ${labelFor(f.infoStatus)}.`,['TOOL-01','TOOL-12']);
  if(n===2){const definition=evaluateAISystemDefinition(context),scope=evaluateScope(context),limited=scope.limitationReviewRequired;return result([definition.code,scope.code].some(code=>['review','information'].includes(code))||limited?'review':'yes',`${definition.label} · ${scope.label}.${limited?' Der durch SCOPE-08 oder SCOPE-18 begrenzte Pflichtenumfang ist noch fallbezogen zu klären.':''}`,['DEF-01 bis DEF-15','SCOPE-01 bis SCOPE-18']);}
  if(n===3){const aiPath=aiActPathStatus(context),roles=roleLabels(context),art25=regs.art25,contextMissing=[...contextDescriptionKeys,...contextChoiceKeys].filter(key=>!isFilled(f[key]));if(!aiPath.required)return result(contextMissing.length?'review':'yes',contextMissing.length?`Der reguläre KI-System-Pfad ist beendet, aber Kontextangaben fehlen: ${contextMissing.map(key=>displayFieldName(key,context)).join(', ')}.`:`Kontext vollständig dokumentiert. Der reguläre KI-System-Pfad ist beendet; AI-Act-Akteursrollen und eine Art.-25-Prüfung sind für diesen Pfad nicht erforderlich. GPAI und Cyber Resilience Act bleiben eigenständig.`,['CTX-01 bis CTX-14','SCOPE-16','SCOPE-17']);const value=roles.length&&!contextMissing.length&&art25.code!=='review'?'yes':'review';return result(value,`Kontext: ${f.process||'offen'} · Rollen: ${roles.join(', ')||'offen'} · Rollenwechsel nach Art. 25: ${art25.label}.`,['CTX-01 bis CTX-14','ROLE-01 bis ROLE-15']);}
  if(n===4){const temporal=activeRegisterItems('regulatory',context).reduce((acc,item)=>{acc[item.applicability]=(acc[item.applicability]||0)+1;return acc;},{}),review=Object.values(regs).some(item=>item.code==='review')||Boolean(temporal.not_assessable);return result(review?'review':'yes',`${Object.values(regs).map(item=>item.label).join(' · ')} · Zeitstatus: aktuell ${temporal.current||0}, künftig ${temporal.future||0}, nicht anwendbar ${temporal.not_applicable||0}, nicht beurteilbar ${temporal.not_assessable||0}.`,['Prüfschritt 4','Regulatorisches Anforderungsregister']);}
  if(n===5){const current=state.risks.map(risk=>effectiveCurrentRisk(risk)),expected=state.risks.filter(risk=>isFilled(risk.expectedResidual)).length,verified=state.risks.filter(risk=>risk.treatmentStatus==='verified'&&isFilled(risk.verifiedResidual)).length,duplicates=duplicateRiskIds(context);return result(current.length&&!current.includes('unknown')&&!duplicates.length?'yes':'review',`${countLabel(state.risks.length,'Risiko','Risiken')} · höchstes aktuelles Einzelrisiko ${highestRiskLabel(current)} · erwartete Restrisiken ${expected} · verifizierte Restrisiken ${verified} · doppelte Risiko-IDs ${duplicates.length} · REVIEW-10: ${labelFor(evaluateReview10(context).value)}.`,state.risks.map(risk=>risk.riskId));}
  if(n===6)return result(organizationalOverall(context).includes('nicht abschließend')?'review':'yes',organizationalOverall(context),['ORG-01 bis ORG-36']);
  if(n===7){const total=allActiveRegisterItems(context).length,missing=incompleteRegisterItems(context).length;return result(!total||missing?'review':'yes',`${total} aktive Registereinträge · ${missing} fehlende Pflichtangaben · ${inactiveRegisterItems(context).length} historische Einträge ohne Einfluss auf die aktuelle Bewertung.`,['REG/RM/OM/PB']);}
  if(n===8){const code=regs.prohibition.code;return result(code==='confirmed'?'yes':['possible','review'].includes(code)?'review':'no',code==='future_prohibition'?`${regs.prohibition.label}; die Verbotswirkung ist am Bewertungsstichtag noch nicht aktuell anwendbar und wird als künftige Anforderung nachverfolgt.`:regs.prohibition.label,['ART5-01 bis ART5-10']);}
  if(n===9){const regulatory=activeRegisterItems('regulatory',context).filter(item=>item.applicability==='current'),impossible=regulatory.filter(item=>item.fulfillability==='unfulfillable'),unclear=regulatory.filter(item=>!isFilled(item.fulfillability)||item.fulfillability==='not_assessable');return result(impossible.length?'yes':unclear.length?'review':'no',impossible.length?`${impossible.length} aktuell anwendbare zwingende Pflicht(en) sind ausdrücklich als nicht erfüllbar dokumentiert.`:unclear.length?`Bei ${unclear.length} aktuell anwendbaren Pflicht(en) ist die Erfüllbarkeit noch nicht geklärt.`:'Keine nachweislich nicht erfüllbare, aktuell anwendbare Pflicht festgestellt; offene, aber als erfüllbar dokumentierte Pflichten bleiben Maßnahmen.',['Regulatorisches Anforderungsregister',...[...impossible,...unclear].map(item=>item.id)]);}
  if(n===10){const review10=evaluateReview10(context);return result(review10.value,review10.reason,review10.sources);}
  if(n===11){
    const open=allStatusRelevantRegisterItems(context).filter(item=>item.status!=='resolved'&&item.status!=='fulfilled'&&item.status!=='verified'),blocking=open.filter(item=>item.blocking==='yes'),unclear=open.filter(item=>!isFilled(item.blocking)||item.blocking==='review'||((item.syncConflict||item.syncConflictEvidence)&&item.conflictResolutionStatus!=='resolved'));
    const incompleteRisk=activeRegisterItems('risk',context).filter(item=>registerItemOpen(item)&&['measure','owner','due','effectivenessCriterion'].some(key=>!isFilled(item[key])));
    const conflicts=[...regulatoryContradictions(context),...allRiskContradictions(context),...registerValidation(context).issues];
    return result(blocking.length?'yes':unclear.length||incompleteRisk.length||conflicts.length?'review':'no',blocking.length?`${blocking.length} fallbezogen und ausdrücklich als entscheidungsblockierend begründete Prüfbedarfe offen.`:unclear.length||incompleteRisk.length||conflicts.length?`${unclear.length} offene Blockierungsbewertungen, ${incompleteRisk.length} unvollständig zugewiesene Risikomaßnahmen und ${conflicts.length} ungelöste Widersprüche oder Identitätskonflikte.`:'Kein entscheidungsblockierender Prüfbedarf, keine unvollständig zugewiesene Risikomaßnahme und kein ungelöster entscheidungsrelevanter Konflikt offen.',['Alle aktiven Register',...[...blocking,...unclear,...incompleteRisk].map(item=>item.id)]);
  }
  if(n===12){const open=allStatusRelevantRegisterItems(context).filter(registerItemOpen),futureArt5=regs.prohibition.code==='future_prohibition';return result(open.length||futureArt5?'yes':'no',`${open.length} offene einschlägige Registereinträge${futureArt5?' · ein künftig wirksamer Art.-5-Tatbestand':''}. Nicht anwendbare Pflichten bleiben dokumentiert, werden aber nicht als offen gezählt.`,[...open.map(item=>item.id),...(futureArt5?['ART5-03 / ART5-04']:[])]);}
  if(n===13){const keys=['assessmentId','internalToolId','toolName','provider','version','purpose','intendedUse','process','department','reviewer','assessmentDate','legalSources','changeHistory'],missing=keys.filter(key=>!isFilled(f[key]));return result(missing.length?'review':'yes',missing.length?`Mindestidentifikation der Abschlussprüfung unvollständig: ${missing.map(key=>displayFieldName(key,context)).join(', ')}.`:`Bewertungs-ID ${f.assessmentId} · eigenständige interne Tool-Kennung ${f.internalToolId} · ${f.toolName} von ${f.provider}, Version ${f.version} · vorgesehener Verwendungszweck: ${f.purpose} · Nutzungskontext: ${f.intendedUse}; ${f.process} · bewertende Stelle: ${f.department}, Durchführung/Prüfung: ${f.reviewer} · Bewertungsstichtag ${fmtDate(f.assessmentDate)} · Rechts- und Regelwerksstand: ${KNOWLEDGE_BASE.legalStatus}; ${f.legalSources} · frühere Bewertung beziehungsweise dokumentierter Erststand: ${f.changeHistory}.`,keys);}
  if(n===14){const versionStatus=versionDocumentationStatus(context);return result(versionStatus.complete?'yes':'review',versionStatus.reason,['TOOL-03','assessmentVersion','guideVersion','assessmentDate']);}
  if(n===15)return result(state.evaluated.every(Boolean)?'yes':'review',steps.map((_,i)=>`${i+1}: ${stepSubstantiveResult(i,decision,context)}`).join(' | '),['Prüfschritte 1–8']);
  if(n===16){const counts=Object.keys(state.registers).map(key=>`${key}: ${activeRegisterItems(key,context).length} aktiv`);return result(allActiveRegisterItems(context).length?'yes':'review',`${counts.join(' · ')} · historisch: ${inactiveRegisterItems(context).length}.`,['Prüfschritt 7']);}
  if(n===17){const unlinked=registerValidation(context).missingLinks;return result(unlinked.length?'review':'yes',unlinked.length?unlinked.join(' '):'Registereinträge sind über Quell-ID und verknüpftes Ergebnis nachvollziehbar.',['sourceQuestionId','linkedResult']);}
  if(n===18){const keys=['evidenceInventory','evidenceInventoryVersion','evidenceInventoryDate','evidenceInventoryLocation'],missing=keys.filter(key=>!isFilled(f[key]));return result(missing.length?'review':'yes',missing.length?`Entscheidungsrelevante Nachweise sind noch nicht vollständig mit Bezeichnung, Version, Datum und Fundstelle dokumentiert: ${missing.map(key=>displayFieldName(key,context)).join(', ')}.`:`Nachweisinventar: ${f.evidenceInventory} · Version ${f.evidenceInventoryVersion} · Stand ${fmtDate(f.evidenceInventoryDate)} · Fundstelle ${f.evidenceInventoryLocation}.`,keys);}
  if(n===19){const categories=[['Technische Dokumentation',/technische dokumentation/i],['Risikomanagement nach Art. 9',/art\.?\s*9|risikomanagement/i],['Qualitätsmanagement',/qualitätsmanagement|qms/i],['Protokollierung',/protokollierung|logs?/i],['Konformitätserklärung',/konformitätserklärung/i],['Registrierung',/registrierung/i],['Post-Market-Monitoring',/post[- ]market|monitoring/i],['Vorfälle',/vorfälle|incident/i],['Grundrechte-Folgenabschätzung',/grundrechte[- ]folgenabschätzung|fria/i],['Datenschutz-Folgenabschätzung',/datenschutz[- ]folgenabschätzung|dpia|dsfa/i],['GPAI-Dokumentation',/gpai[- ]dokumentation/i],['CRA-Risikobewertung und technische CRA-Dokumentation',/cra[- ]risikobewertung|cra[- ]dokumentation/i]],inventory=f.evidenceInventory||'',missingCategories=categories.filter(([,pattern])=>!pattern.test(inventory)).map(([label])=>label),legal=activeRegisterItems('legal',context),incomplete=legal.filter(item=>!isFilled(item.legalBasis)||(!isFilled(item.result)&&item.status==='resolved'));const missingSources=!isFilled(f.legalSources);return result(missingSources||missingCategories.length||incomplete.length?'review':'yes',missingSources?'Verwendete Rechtsquellen und Fundstellen sind nicht dokumentiert.':missingCategories.length?`Nachweiskategorien noch nicht als vorhanden oder nicht einschlägig dokumentiert: ${missingCategories.join(', ')}.`:`Alle einschlägigen Nachweiskategorien sind im Nachweisverzeichnis mit Fundstelle oder als nicht einschlägig dokumentiert. ${legal.length} juristische Prüfbedarfe; ${incomplete.length} ohne vollständige Rechtsgrundlage oder Ergebnis. Verwendete Quellen: ${f.legalSources}.`,['evidenceInventory','evidenceInventoryLocation','legalSources',...legal.map(item=>item.id)]);}
  if(n===20){const riskOwners=state.risks.length&&state.risks.every(risk=>isFilled(risk.riskOwner||risk.owner)),activeLegal=activeRegisterItems('legal',context).filter(item=>item.status!=='resolved'),legalMissingOwners=activeLegal.filter(item=>!isFilled(item.owner)),legalOwners=[...new Set(activeLegal.map(item=>item.owner).filter(isFilled))],responsibilities=[['Durchführung der Bewertung',f.reviewer],['fachliche Verantwortung',f.owner],['Risikoverantwortung',riskOwners?'für alle Risiken dokumentiert':''],['Dokumentation',f.documentationOwner],['Überprüfung beziehungsweise Genehmigung',f.approver]],missing=responsibilities.filter(([,value])=>!isFilled(value)).map(([label])=>label),statusMissing=!isFilled(f.approvalStatus)||!isFilled(f.approvalDate);if(legalMissingOwners.length)missing.push(`explizite Verantwortung für ${legalMissingOwners.map(item=>item.id).join(', ')}`);const legalText=activeLegal.length?`regulatorische/juristische Prüfung: ${legalOwners.join(', ')||'keine verantwortliche Stelle eingetragen'} (${activeLegal.map(item=>item.id).join(', ')})`:'regulatorische/juristische Prüfverantwortung: nicht erforderlich, da kein aktiver Prüfbedarf vorliegt';return result(missing.length||statusMissing?'review':'yes',missing.length||statusMissing?`Verantwortlichkeiten oder Status unvollständig: ${[...missing,...(statusMissing?['Genehmigungsstatus und -datum']:[])].join(', ')}. ${legalText}.`:`Durchführung der Bewertung: ${responsibilities[0][1]} · fachliche Verantwortung: ${responsibilities[1][1]} · Risikoverantwortung: ${responsibilities[2][1]} · ${legalText} · Dokumentation: ${responsibilities[3][1]} · Überprüfung/Genehmigung: ${responsibilities[4][1]} · Status: ${labelFor(f.approvalStatus)} · Datum: ${fmtDate(f.approvalDate)}.`,['reviewer','TOOL-04','riskOwner',...activeLegal.map(item=>item.id),'documentationOwner','approver','approvalStatus','approvalDate']);}
  if(n===21){const keys=['documentLocation','accessRights','statutoryRetentionStatus','statutoryRetentionBasis','internalRetentionPeriod','assessmentVersion','changeHistory','preservePreviousAssessments'],missing=keys.filter(key=>!isFilled(f[key])),unresolved=f.statutoryRetentionStatus==='review'||['no','review'].includes(f.preservePreviousAssessments);return result(missing.length||unresolved?'review':'yes',missing.length?`Dokumentations- und Aufbewahrungsangaben offen: ${missing.join(', ')}.`:unresolved?`Gesetzliche Aufbewahrungsfrist oder Erhaltung früherer Bewertungsstände ist noch nicht abschließend geklärt. Fristen werden nicht pauschal unterstellt.`:`Ablage: ${f.documentLocation} · Zugriff: ${f.accessRights} · gesetzliche Frist/Rechtsgrundlage: ${f.statutoryRetentionBasis} · interne Frist: ${f.internalRetentionPeriod} · Version: ${f.assessmentVersion} · frühere Stände: ${labelFor(f.preservePreviousAssessments)}.`,keys);}
  if(n>=22&&n<=28){const trigger=state.triggers.find(item=>item.id===id),required=trigger?.required;if(required==='yes'){const missing=['steps','owner','due'].filter(key=>!isFilled(trigger[key]));return result(missing.length?'review':'yes',missing.length?`Auslöser bejaht, aber Angaben fehlen: ${missing.join(', ')}.`:`Neubewertung festgelegt · ${trigger.steps} · ${trigger.owner} · ${fmtDate(trigger.due)}.`,[id]);}if(required==='no')return result(isFilled(trigger.reason)?'no':'review',isFilled(trigger.reason)?`Bewusst nicht angewendet: ${trigger.reason}`:'Nicht angewendet, aber die verpflichtende Begründung fehlt.',[id]);return result('review','Auslöser noch nicht ausdrücklich bewertet.',[id]);}
  if(n===29)return result(isFilled(f.toolName)?'yes':'review',`${f.toolName||'Nicht benannt'} · ${f.shortDescription||f.purpose||'Beschreibung offen'}.`,['TOOL-01','TOOL-12']);
  if(n===30){
    const definition=evaluateAISystemDefinition(context),scope=evaluateScope(context);let value='review';
    if(definition.code==='not_ai')value='not_ai_system';
    else if(definition.code==='ai_system'&&['not_applicable','excluded'].includes(scope.code))value='scope_not_open';
    else if(definition.code==='ai_system'&&(scope.code==='special'||scope.specialCases?.length))value='ai_system_special';
    else if(definition.code==='ai_system'&&scope.code==='applicable')value='ai_system_in_scope';
    if(scope.limitationReviewRequired)value='review';
    return result(value,`KI-System-Definition: ${definition.label}. Anwendungsbereichsprüfung: ${scope.label}.`,['DEF-01 bis DEF-15','SCOPE-01 bis SCOPE-18']);
  }
  if(n===31){const aiPath=aiActPathStatus(context),aiRoles=aiPath.required?roleLabels(context):[],high=evaluateHighRiskSummary(context),art25=high.code!=='high_risk'?'nicht relevant – keine Hochrisikoeinstufung':regs.art25.code==='applicable'?'Anbieterrolle nach Art. 25':regs.art25.code==='not_applicable'?'keine Anbieterrolle nach Art. 25':regs.art25.code==='review'?'weiterer Prüfbedarf':'nicht relevant',craRoles=regs.cra.roles||[],craPossible=regs.cra.possibleRoles||[],craText=[craRoles.length?`bestätigt: ${craRoles.join(', ')}`:'keine bestätigte eigene CRA-Rolle',craPossible.length?`ungeklärt: ${craPossible.join(', ')}`:''].filter(Boolean).join('; ');const value=`EU-AI-Act-Rollen: ${aiPath.required?(aiRoles.join(', ')||'weiterer Prüfbedarf'):'nicht erforderlich'} | Art. 25: ${art25} | CRA-Rollen: ${craText}`;return result((!aiPath.required||aiRoles.length)&&regs.art25.code!=='review'&&regs.cra.code!=='review'?value:'Weiterer Prüfbedarf · '+value,'EU-AI-Act-Rollen, Art.-25-Ergebnis sowie bestätigte und ungeklärte CRA-Rollen werden getrennt ausgegeben.',['ROLE-01 bis ROLE-15','CRA-08']);}
  if(n===32){const code=regs.prohibition.code,futureItems=(regs.prohibition.items||[]).filter(item=>['future_confirmed','temporally_not_applicable'].includes(item.code)),futureText=futureItems.map(item=>`${item.label}: Geltungsbeginn ${fmtDate(item.temporal?.applicableDate)}; ${item.temporal?.applicabilityReason||''} Neubewertung vor Eintritt der Anwendbarkeit erforderlich.`).join(' '),value=code==='confirmed'?'Verbotene KI-Praxis festgestellt':['possible','review'].includes(code)?'Weiterer Prüfbedarf':code==='future_prohibition'?'Verbotstatbestand festgestellt – zum Bewertungsstichtag noch nicht anwendbar':code==='exception'?'Kein aktuell anwendbares Verbot – tatbestandsbezogene Ausnahme nachgewiesen':'Kein Verbotstatbestand';return result(value,[regs.prohibition.label,futureText].filter(Boolean).join(' '),['ART5-01 bis ART5-10']);}
  if(n===33){const product=regs.productHighRisk.code,annex=regs.annexHighRisk.code;if(product==='not_continued'&&annex==='not_continued')return result('Prüfung aufgrund einer festgestellten verbotenen Praxis nicht fortgeführt','Nach dem bestätigten Art.-5-Hindernis wird keine Aussage „kein Hochrisiko-KI-System“ getroffen.',['ART5-01 bis ART5-10','HR-01 bis HR-20']);const productText=product==='yes'?'Art. 6 Abs. 1: Hochrisikopfad bestätigt':product==='review'?'Art. 6 Abs. 1: weiterer Prüfbedarf':'Art. 6 Abs. 1: nicht festgestellt';const annexText=annex==='yes'?'Art. 6 Abs. 2: Hochrisikopfad bestätigt':annex==='exception'?'Art. 6 Abs. 2: Ausnahme nach Art. 6 Abs. 3 dokumentiert':annex==='review'?'Art. 6 Abs. 2: weiterer Prüfbedarf':'Art. 6 Abs. 2: nicht festgestellt';return result([product,annex].includes('review')?'Weiterer Prüfbedarf':product==='yes'||annex==='yes'?'Hochrisiko-KI-System':'Kein Hochrisiko-KI-System',`${productText} · ${annexText}.`,['HR-01 bis HR-20']);}
  if(n===34){const aiPath=aiActPathStatus(context);if(!aiPath.required)return result('Prüfung nicht erforderlich',`Der vorgelagerte KI-System- oder Anwendungsbereichspfad eröffnet keine Prüfung nach Art. 50: ${aiPath.reason}.`,['DEF-01 bis DEF-15','SCOPE-01 bis SCOPE-18']);const value=regs.transparency.code==='none'?'Keine Transparenzpflicht':regs.transparency.code==='provider'?'Anbieterpflicht':regs.transparency.code==='deployer'?'Betreiberpflicht':regs.transparency.code==='multiple'?'Mehrere Pflichten':regs.transparency.code==='exception'?'Ausnahme dokumentiert':regs.transparency.code==='not_continued'?'Prüfung aufgrund einer festgestellten verbotenen Praxis nicht fortgeführt':'Weiterer Prüfbedarf';return result(value,regs.transparency.label,['TR-01 bis TR-07']);}
  if(n===35){const relevanceByCode={none:'Keine GPAI-Relevanz festgestellt',not_required:'GPAI-Prüfung nach dokumentierter Abgrenzung nicht erforderlich',research_exception:'Ausschließliche Forschung, Entwicklung oder Prototyping vor Inverkehrbringen',relevant_no_provider:'GPAI-Modell betroffen',integration:'GPAI-Integration betroffen',model:'GPAI-Modell betroffen',systemic:'GPAI-Modell mit systemischem Risiko betroffen',review:'GPAI-Relevanz nicht abschließend beurteilbar'},relevance=relevanceByCode[regs.gpai.code]||'GPAI-Relevanz nicht abschließend beurteilbar',role=regs.gpai.role||'Keine eigene Anbieterrolle',duties=regs.gpai.ownObligations?'Eigene Anbieterpflichten bestehen':'Keine eigenen Anbieterpflichten festgestellt';return result(regs.gpai.code==='review'?'Weiterer Prüfbedarf':`${relevance} | ${role} | ${duties}`,`GPAI-Relevanz: ${relevance}. Organisationsrolle: ${role}. Pflichtenfolge: ${duties}.`,['GPAI-01 bis GPAI-11']);}
  if(n===36){const product=regs.cra.code==='no'?'Nicht anwendbar':regs.cra.code==='special'?'Ausschluss oder Sonderfall':regs.cra.code==='review'?'Weiterer Prüfbedarf':`Anwendbar – ${labelFor(regs.cra.category==='none'?'other':regs.cra.category)}`;const own=regs.cra.code==='review'?'Eigene Organisationspflichten: weiterer Prüfbedarf':regs.cra.ownObligations?`Eigene Pflichten als ${(regs.cra.roles||[]).join(', ')}`:'Keine eigenen Pflichten festgestellt',confirmed=(regs.cra.roles||[]).join(', ')||'keine',possible=(regs.cra.possibleRoles||[]).join(', ')||'keine';return result(`${product} | ${own}`,`Produktanwendbarkeit, Sonderregelung, Produktkategorie und eigene Organisationspflichten sind getrennt bewertet. Bestätigte Rollen: ${confirmed}. Ungeklärte mögliche Rollen: ${possible}. ${regs.cra.specialCase||''}`.trim(),['CRA-01 bis CRA-12']);}
  if(n===37){const regulatory=activeRegisterItems('regulatory',context),keys=['current','future','not_applicable','not_assessable'],temporal=Object.fromEntries(keys.map(key=>[key,regulatory.filter(item=>item.applicability===key)]));const value=keys.map(key=>`${labelFor(key)}: ${temporal[key].length}${temporal[key].length?` (${temporal[key].map(item=>item.id).join(', ')})`:''}`).join(' · ');return result(regulatory.length?value:'Weiterer Prüfbedarf',value||'Keine aktiven Zeitstatuswerte.',regulatory.map(item=>item.id));}
  if(n===38){const current=state.risks.map(risk=>effectiveCurrentRisk(risk)),counts={low:0,medium:0,high:0,unknown:0};current.forEach(level=>{counts[level in counts?level:'unknown']++;});const expected=state.risks.filter(risk=>risk.treatmentNeeded==='yes'&&isFilled(risk.expectedResidual)).map(risk=>`${risk.riskId||'Risiko'}: ${labelFor(risk.expectedResidual)}`),verified=state.risks.filter(risk=>risk.treatmentStatus==='verified'&&isFilled(risk.verifiedResidual)).map(risk=>`${risk.riskId||'Risiko'}: ${labelFor(risk.verifiedResidual)}`);const value=`Niedrig: ${counts.low} | Mittel: ${counts.medium} | Hoch: ${counts.high} | nicht beurteilbar: ${counts.unknown} | höchstes aktuelles Einzelrisiko: ${highestRiskLabel(current)} | erwartete Restrisiken: ${expected.join(', ')||'nicht dokumentiert'} | verifizierte Restrisiken: ${verified.join(', ')||'nicht dokumentiert'} | REVIEW-10: ${labelFor(evaluateReview10(context).value)}`;return result(current.includes('unknown')||!current.length?'Weiterer Prüfbedarf · '+value:value,value,state.risks.map(risk=>risk.riskId));}
  if(n===39){const overall=organizationalOverall(context),value=overall.includes('nicht abschließend')?'not_conclusive':overall.includes('unzureichend')?'insufficient':overall.includes('teilweise')?'partly_sufficient':'sufficient',explicit=activeRegisterItems('organizational',context).filter(item=>item.blocking==='yes');return result(value,`${overall}. Eine organisatorische Lücke wird nur bei ausdrücklich dokumentierter Regel oder begründetem Registereintrag entscheidungsblockierend; solche Einträge: ${explicit.length}.`,['ORG-01 bis ORG-36',...explicit.map(item=>item.id)]);}
  if(n===40){const regulatory=statusRelevantRegisterItems('regulatory',context).filter(registerItemOpen),risk=statusRelevantRegisterItems('risk',context).filter(registerItemOpen),organizational=statusRelevantRegisterItems('organizational',context).filter(registerItemOpen),expert=statusRelevantRegisterItems('expert',context).filter(item=>item.status!=='resolved'),legal=statusRelevantRegisterItems('legal',context).filter(item=>item.status!=='resolved'),pb=[...expert,...legal],all=[...regulatory,...risk,...organizational,...pb],before=all.filter(item=>item.beforeRelease==='yes'),blocking=all.filter(item=>item.blocking==='yes'||item.decisionCritical==='yes');const value=`Regulatorische Pflichten: ${regulatory.length} | Risikomaßnahmen: ${risk.length} | Organisationsmaßnahmen: ${organizational.length} | Prüfbedarfe gesamt: ${pb.length} | fachlich: ${expert.length} | juristisch: ${legal.length} | vor Nutzung: ${before.length} | entscheidungsblockierend: ${blocking.length}`;return result(value,`${value}. Nicht anwendbare Pflichten werden nicht als offen gezählt.`,all.map(item=>item.id));}
  if(n===41){const current=decision||overallDecision(false,true,{synchronize:false,context});return result(current.code,current.label,['Regelbasierte Zusammenführung nach Abschnitt 10.2'],{statusOptions:['USE_NOT_CONTINUABLE','ASSESSMENT_NOT_CONCLUDABLE','ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','ASSESSMENT_COMPLETE']});}
  if(n===42){const unevaluated=state.triggers.filter(trigger=>!['yes','no'].includes(trigger.required)),unreasonedNo=state.triggers.filter(trigger=>trigger.required==='no'&&!isFilled(trigger.reason)),incompleteYes=state.triggers.filter(trigger=>trigger.required==='yes'&&['steps','owner','due'].some(key=>!isFilled(trigger[key]))),scheduleComplete=isFilled(f.nextReviewDate)&&isFilled(f.reviewFrequency);const complete=!unevaluated.length&&!unreasonedNo.length&&!incompleteYes.length&&scheduleComplete,triggerCount=state.triggers.filter(item=>item.required==='yes').length;return result(complete?'yes':'review',complete?`Alle sieben Kategorien REVIEW-22 bis REVIEW-28 sind bewertet. Nächster Review: ${fmtDate(f.nextReviewDate)} · Frequenz: ${f.reviewFrequency} · ${triggerCount} verbindliche Auslöser.`:`Reviewplanung unvollständig: ${unevaluated.length} Kategorien unbewertet, ${unreasonedNo.length} bewusste Nichtanwendungen ohne Begründung, ${incompleteYes.length} bejahte Auslöser unvollständig; Termin/Frequenz ${scheduleComplete?'vorhanden':'offen'}.`,['nextReviewDate','reviewFrequency','REVIEW-22 bis REVIEW-28']);}
  return result('review','Keine ausführbare Review-Regel gefunden.',[id]);
}
/**
 * Liefert alle operationalisierten REVIEW-Ergebnisse zu demselben Gesamtstatus.
 * @param {object|null} [decision=null] Optional vorab berechneter Gesamtstatus.
 * @returns {object[]} REVIEW-01 bis REVIEW-42 in stabiler Leitfadenreihenfolge.
 * @description Verdichtet die Einzelregeln nebenwirkungsfrei; die Rückgabe ist keine eigenständige Genehmigungsentscheidung.
 */
function reviewOperationalResults(decision=null,context=null){return evaluationReferences(context).reviewImplementationIds.map(id=>reviewOperationalResult(id,decision,context));}

function riskRequiredFor(risk){
  const required=['riskId','source','description','event','consequence','affectedAreas','category','existingControls','controlEvidence','probability','impact','controlEffectiveness','uncertainty','acceptance','treatmentNeeded','decisionCriticality'];
  if(riskOutsideTolerance(risk))required.push('suitableTreatmentAvailability','treatmentAvailabilityReason');
  if(risk.treatmentNeeded==='yes')required.push('treatmentStrategy','proposedTreatment','priority','owner','treatmentDue','expectedResidual','treatmentStatus','effectivenessCriterion');
  if(risk.treatmentStatus==='implemented')required.push('effectivenessEvidence','effectivenessDate','effectivenessReviewer');
  if(risk.treatmentStatus==='verified')required.push('effectivenessEvidence','verifiedResidual','effectivenessDate','effectivenessReviewer');
  if(risk.treatmentNeeded==='no')required.push('acceptanceReason','riskOwner','acceptanceApproval');
  if(risk.treatmentNeeded==='review')required.push('reviewReason','reviewOwner','reviewDue','decisionCriticality');
  if(effectiveCurrentRisk(risk)==='high'&&risk.acceptance==='accepted')required.push('criticalAcceptanceReason','riskOwner','acceptanceApproval');
  return[...new Set(required)];
}
/* 13. Organisations- und Risikobewertung */

/** Ermittelt fachliche Widersprüche eines Risikos ohne daraus einen Gesamtscore zu bilden. */
function riskContradictions(risk,index=0,context=null){
  const issues=[],id=risk.riskId||`Risiko ${index+1}`,current=effectiveCurrentRisk(risk),rank={low:1,medium:2,high:3,unknown:9,pending:0};
  if(risk.acceptance==='notAccepted'&&risk.treatmentNeeded==='no')issues.push(`${id}: Nicht akzeptiertes Risiko ohne Behandlungsbedarf.`);
  if(riskOutsideTolerance(risk)&&risk.suitableTreatmentAvailability==='available'&&risk.treatmentNeeded!=='yes')issues.push(`${id}: Geeignete Behandlung ist verfügbar, aber nicht als erforderlich festgelegt.`);
  if(risk.suitableTreatmentAvailability==='unavailable'&&!riskOutsideTolerance(risk))issues.push(`${id}: Fehlende Behandlungsmöglichkeit wurde festgelegt, obwohl kein hohes Risiko außerhalb der Toleranz vorliegt.`);
  if(current==='high'&&risk.acceptance==='accepted'&&(!isFilled(risk.criticalAcceptanceReason)||!isFilled(risk.acceptanceApproval)))issues.push(`${id}: Hohes Risiko ohne besondere Akzeptanzbegründung und dokumentierte menschliche Entscheidung.`);
  if(risk.treatmentStatus==='verified'&&!isFilled(risk.effectivenessEvidence))issues.push(`${id}: Maßnahme als verifiziert markiert, aber Wirksamkeitsnachweis fehlt.`);
  if(risk.treatmentStatus==='verified'&&rank[risk.verifiedResidual]>rank[current]&&!isFilled(risk.residualIncreaseReason))issues.push(`${id}: Verifiziertes Restrisiko ist höher als das aktuelle Risiko; Erläuterung fehlt.`);
  if(isFilled(risk.expectedResidual)&&risk.treatmentNeeded!=='yes')issues.push(`${id}: Erwartetes Restrisiko ohne festgelegte Behandlung.`);
  if(current==='unknown'&&risk.treatmentNeeded!=='review'&&risk.expertReview!=='yes'&&risk.legalReview!=='yes')issues.push(`${id}: Aktuelles Risiko nicht bestimmbar, aber kein weiterer Prüfbedarf festgelegt.`);
  if(risk.decisionCriticality==='yes'&&risk.treatmentNeeded==='review')issues.push(`${id}: Entscheidungskritisches Risiko mit offenem Prüfbedarf.`);
  const linked=activeRegisterItems('risk',context).filter(item=>item.riskId===risk.riskId);
  linked.forEach(item=>{if(item.status&&risk.treatmentStatus&&item.status!==risk.treatmentStatus)issues.push(`${id}: Status im Risikoregister und Maßnahmenregister widersprechen sich.`);});
  return issues;
}
function allRiskContradictions(context=null){return evaluationState(context).risks.flatMap((risk,index)=>riskContradictions(risk,index,context));}
function duplicateRiskIds(context=null){
  const counts=new Map();evaluationState(context).risks.forEach(risk=>{if(isFilled(risk.riskId))counts.set(risk.riskId,(counts.get(risk.riskId)||0)+1);});
  return[...counts.entries()].filter(([,count])=>count>1).map(([id])=>id);
}

/** Prüft Register auf Identität, Pflichtfelder, Statuslogik und Synchronisierung. */
function registerValidation(context=null){
  const state=evaluationState(context),registerSchemas=evaluationReferences(context).registerSchemas;
  const issues=[],missingLinks=[];
  Object.entries(registerSchemas).forEach(([type])=>{const ids=[];activeRegisterItems(type,context).forEach((item,index)=>{if(item.id){if(ids.includes(item.id))issues.push(`Doppelte aktive Register-ID im Register ${type}: ${item.id}.`);ids.push(item.id);}if(item.derived&&(!item.sourceStep||!item.sourceId))missingLinks.push(`${item.id||`${type} ${index+1}`}: Quellverknüpfung fehlt.`);if((item.syncConflict||item.syncConflictEvidence)&&item.conflictResolutionStatus!=='resolved')issues.push(`${item.id}: Synchronisierungskonflikt – ${item.syncConflictEvidence||`betroffene Felder: ${item.syncConflict}`}`);if(item.conflictResolutionStatus==='resolved'&&!isFilled(item.conflictResolutionReason))issues.push(`${item.id}: Konflikt wurde als geklärt markiert, aber die dokumentierte Auflösung fehlt.`);});});
  activeRegisterItems('risk',context).forEach(item=>{if(!item.riskId||!state.risks.some(risk=>risk.riskId===item.riskId))missingLinks.push(`${item.id||'Risikomaßnahme'}: Verknüpfte Risiko-ID fehlt oder ist unbekannt.`);});
  activeRegisterItems('regulatory',context).forEach(item=>{
    if(['fulfilled','verified'].includes(item.status)&&/geplant|Planung/i.test(item.fulfillabilityReason||''))issues.push(`${item.id}: Der Status „${labelFor(item.status)}“ wird mit einer nur geplanten Umsetzung begründet. Erfüllbarkeit, Umsetzung und Nachweisprüfung sind getrennt zu dokumentieren.`);
  });
  activeRegisterItems('legal',context).filter(item=>item.status!=='resolved'&&/CRA|Cyber Resilience|Produkt mit digitalen Elementen/i.test([item.id,item.question,item.reason,item.legalBasis].filter(Boolean).join(' '))).forEach(item=>{
    if(item.blocking==='no'&&/Pilotbetrieb[^.]*nach\s+(?:der\s+)?CRA|nach\s+(?:der\s+)?CRA[^.]*Pilotbetrieb/i.test(state.form.overallReasoning||''))issues.push(`${item.id}: Die strukturierte Angabe „nicht entscheidungsblockierend für den Pilotbetrieb“ widerspricht der zusammenfassenden Bedingung „CRA-Klärung vor dem Pilotbetrieb“. Die Blockierungswirkung ist fachlich oder juristisch zu entscheiden; sie wird nicht automatisch geändert.`);
  });
  duplicateRiskIds(context).forEach(id=>issues.push(`Doppelte Risiko-ID: ${id}. Die Datensätze bleiben getrennt erhalten und müssen eindeutig benannt werden.`));
  issues.push(...registrationSynchronizationIssues(context));
  return{issues,missingLinks};
}

/* 14. Registerableitung und Synchronisierung */

let registerSyncInProgress=false;
function pbBlockingDecision(item,sourceState=state){
  if(item.value==='review')return{value:'review',reason:'Die Blockierungswirkung kann erst nach der noch offenen Sach- oder Rechtsprüfung belastbar bestimmt werden.'};
  if(item.id==='DUTY-45')return sourceState.form.purposeAlignment==='partial'?{value:'no',reason:'Die teilweise Zweckabweichung ist nachzuverfolgen, verhindert für sich allein aber keine belastbare Entscheidung.'}:{value:'yes',reason:'Die wesentliche Zweckabweichung kann Rolle, Risikoprofil und regulatorische Einordnung verändern und muss vor der Entscheidung geklärt werden.'};
  if(item.id==='DUTY-44')return sourceState.risks.some(risk=>effectiveCurrentRisk(risk)==='unknown'&&risk.decisionCriticality==='yes')?{value:'yes',reason:'Mindestens ein entscheidungskritisches Risiko ist nicht belastbar bewertbar.'}:{value:'no',reason:'Der fachliche Prüfbedarf ist offen, betrifft aber kein als entscheidungskritisch dokumentiertes Risiko.'};
  if(item.id==='DUTY-46')return{value:'no',reason:'Die neue technische Eigenschaft wird als offener Prüfpunkt nachverfolgt; eine Entscheidungsblockierung ist nicht allein aus ihrem Vorliegen ableitbar.'};
  if(item.id==='DUTY-47')return{value:'yes',reason:'Die Pflichterfüllung oder das Zusammenwirken einschlägiger Rechtsregime ist ausdrücklich ungeklärt oder widersprüchlich und für die Entscheidung zu klären.'};
  if(['DUTY-41','DUTY-42','DUTY-43'].includes(item.id))return{value:'yes',reason:'Ohne Klärung dieses entscheidenden Informations-, Regulierungs- oder Rechtswiderspruchs ist keine belastbare Einordnung möglich.'};
  return{value:'review',reason:'Die Blockierungswirkung ist fachlich zu bestimmen.'};
}
function shouldDerivePBResult(item,sourceState=state){
  if(item.id==='DUTY-41')return item.value==='yes';
  if(['DUTY-42','DUTY-43'].includes(item.id))return sourceState.evaluated[3]&&['yes','review'].includes(item.value);
  if(item.id==='DUTY-44')return sourceState.risks.length>0&&['yes','review'].includes(item.value);
  if(item.id==='DUTY-45')return ['partial','substantial','review'].includes(sourceState.form.purposeAlignment)&&['yes','review'].includes(item.value);
  if(item.id==='DUTY-46')return isFilled(sourceState.form.newTechnicalFeature)&&['yes','review'].includes(item.value);
  if(item.id==='DUTY-47')return isFilled(sourceState.form.legalRegimeFulfilment)&&['yes','review'].includes(item.value);
  return false;
}
function uniqueHistoricalRegisterId(type,base,sourceState=state){const ids=new Set((sourceState.registers[type]||[]).map(item=>item.id));let n=1,candidate='';do{candidate=`${base}-HIST-${String(n++).padStart(2,'0')}`;}while(ids.has(candidate));return candidate;}
function mergeDuplicateRegisterEntry(type,primary,duplicate,sourceState=state,context=null){
  const ignored=new Set(['id','sourceActive','derived','sourceSnapshot','sourceStep','sourceId','syncSourceSnapshot','syncConflictEvidence','syncConflict']);
  const conflicts=[];Object.entries(duplicate).forEach(([key,value])=>{if(ignored.has(key)||!isFilled(value))return;if(!isFilled(primary[key]))primary[key]=structuredClone(value);else if(JSON.stringify(primary[key])!==JSON.stringify(value))conflicts.push(`Quelle ${duplicate.sourceId||duplicate.id||'Dublettenbestand'}, ${displayFieldName(key,context)}: erhaltener Wert „${String(primary[key])}“; abweichender Wert „${String(value)}“`);});
  const originalId=duplicate.id||primary.id||type.toUpperCase();duplicate.originalId=originalId;duplicate.id=uniqueHistoricalRegisterId(type,originalId,sourceState);duplicate.sourceActive=false;duplicate.historicalOf=primary.id;duplicate.historicalReason=conflicts.length?'Dublettenbereinigung mit erhaltenen Abweichungen: Der vollständige Eintrag bleibt historisch erhalten; kein Feld wurde gelöscht.':'Inhaltlich identische Dublette: Der vollständige Eintrag bleibt historisch erhalten; kein Feld wurde gelöscht.';duplicate.duplicateResolutionNote=duplicate.historicalReason;
  if(conflicts.length){duplicate.syncConflictEvidence=conflicts.join(' | ');primary.syncConflictEvidence=[primary.syncConflictEvidence,...conflicts].filter(isFilled).join(' | ');}else{delete duplicate.syncConflictEvidence;primary.duplicateResolutionNote=`Inhaltlich identische Dublette ${duplicate.id} wurde ohne fachlichen Konflikt historisch erhalten.`;}
}
/**
 * Synchronisiert abgeleitete REG-, RM-, O- und PB-Einträge anhand stabiler IDs.
 * Aktive Quellen aktualisieren bestehende Einträge; entfallene Quellen werden als
 * inaktive Historie bewahrt. Anwendbarkeit und Umsetzungsstatus bleiben getrennte
 * Aussagen. Manuell gepflegte Nachweise und Entscheidungen bleiben erhalten;
 * Konflikte werden sichtbar markiert statt still überschrieben.
 * @param {object} targetState Vollständiger Zielzustand, dessen Register abgeleitet werden.
 * @param {object} references Explizite, zum Zielzustand gehörende Referenzdaten.
 * @returns {void}
 * @description Datenquellen sind ausschließlich `targetState` und `references`. Die Funktion verändert nur `targetState`; sie liest oder ersetzt den globalen Arbeitszustand nicht und speichert nichts.
 */
function synchronizeDerivedRegistersInto(targetState,references){
  if(!targetState||!references)throw new Error('Für die Registersynchronisierung fehlen Zielzustand oder Referenzen.');
  const context=createEvaluationContext(targetState,references),KNOWLEDGE_BASE=references.knowledgeBase,orgAreas=references.orgAreas,orgCriteria=references.orgCriteria,prohibitedQuestions=references.prohibitedQuestions;
  {
    const desired=[],e=allRegulatoryEvaluations(context),assessmentDate=targetState.form.assessmentDate||'';
    const push=(type,sourceStep,sourceId,item)=>desired.push({type,sourceStep:String(sourceStep),sourceId,item:{sourceQuestionId:item.sourceQuestionId||sourceId,linkedResult:item.linkedResult||`Ergebnis aus Prüfschritt ${sourceStep}`,blocking:item.blocking||'no',...item}});
    requiredHighRiskDuties(context).forEach(duty=>{
      const temporal=dutyTemporalMeta(duty,context);
      const registrationTemporal=['DUTY-12','DUTY-20'].includes(duty.code)&&duty.registrationStatus!=='no'?section5TemporalMeta(`${duty.code}: bedingte Registrierung nach Art. 49.`,context):null;
      push('regulatory','4',`duty-${duty.code}`,{id:`REG-${duty.code}`,sourceQuestionId:duty.origin||duty.code,dutyCode:duty.code,basis:duty.basis,requirement:duty.label,linkedResult:duty.condition||duty.origin||'Regulatorisches Ergebnisprofil',obligatedRole:duty.role,...temporal,temporalPaths:temporal.temporalPaths||[],subRequirements:duty.subRequirements||[],registrationTemporal,assessmentDate,fulfillability:'not_assessable',fulfillabilityReason:'Die Erfüllbarkeit dieser abgeleiteten Pflicht ist durch die verantwortliche Stelle zu bestätigen.',beforeRelease:['DUTY-04','DUTY-12','DUTY-16','DUTY-20','DUTY-21'].includes(duty.code)?'yes':'no',decisionCritical:['DUTY-07','DUTY-08','DUTY-12','DUTY-16','DUTY-20','DUTY-21','DUTY-31','DUTY-35'].includes(duty.code)?'yes':'no',blocking:'no',owner:'',due:'',status:'open',evidence:'',priority:'high'});
      if(['DUTY-12','DUTY-20'].includes(duty.code)&&duty.registrationStatus!=='no'){
        const registration=duty.registrationStatus==='review'?{applicability:'not_assessable',applicableDate:KNOWLEDGE_BASE.verifiedDates.aiActGeneral,applicabilityReason:`${duty.code}: Die sachlichen Voraussetzungen der Registrierung nach Art. 49 sind nicht eindeutig beurteilbar.`}:registrationTemporal;
        push('regulatory','4',`duty-${duty.code}-registration`,{id:`REG-${duty.code}-REG`,sourceQuestionId:duty.code==='DUTY-12'?'HR-06 bis HR-13 / Art. 49 Abs. 1':'CTX-14 / Art. 49 Abs. 3',dutyCode:`${duty.code}-REG`,parentDutyCode:duty.code,basis:duty.code==='DUTY-12'?'Art. 49 Abs. 1':'Art. 26 Abs. 8 und Art. 49 Abs. 3',requirement:duty.code==='DUTY-12'?'Registrierung des Anbieters und des Systems':'Registrierung des Betreibers, Auswahl des Systems und der Verwendung',linkedResult:duty.origin||duty.code,obligatedRole:duty.role,...registration,assessmentDate,fulfillability:'not_assessable',fulfillabilityReason:'Erfüllbarkeit und konkrete Registerhandlung sind für diese Teilpflicht gesondert zu bestätigen.',beforeRelease:'yes',decisionCritical:'no',blocking:'no',owner:'',due:'',status:'open',evidence:'',priority:'high',subRequirement:true});
      }
    });
    dutyOperationalResults(context).filter(item=>Number(item.id.slice(-2))>=41&&shouldDerivePBResult(item,targetState)).forEach(item=>{
      const legal=['DUTY-42','DUTY-43','DUTY-45','DUTY-47'].includes(item.id),type=legal?'legal':'expert',short=item.id.replace('DUTY-','');
      const sourceQuestionId=item.id==='DUTY-45'?'CTX-02 / DUTY-45':item.id;
      const sourceStep=item.id==='DUTY-44'||item.id==='DUTY-46'?'5':item.id==='DUTY-45'?'3':item.id==='DUTY-47'?'7':'4';
      const block=pbBlockingDecision(item,targetState),common={id:`PB-${item.id}`,sourceQuestionId,question:item.label,reason:item.reason,linkedResult:item.sources.join(' · '),owner:'',sourceStep,assessmentImpact:block.value==='yes'?'Ohne Klärung ist keine belastbare Entscheidung möglich.':block.value==='no'?'Offener Prüfpunkt beziehungsweise offene Maßnahme ohne automatische Abschlussblockierung.':'Auswirkung auf die Abschlussentscheidung ist noch zu klären.',craDecisionArea:'not_applicable',priority:block.value==='no'?'medium':'high',due:'',status:'open',result:'',ruleBlocking:block.value,ruleBlockingReason:block.reason,blocking:block.value,blockingReason:block.reason};
      if(legal)push(type,common.sourceStep,`duty-${short}`,{...common,legalBasis:item.id==='DUTY-47'?'EU AI Act / Cyber Resilience Act / Datenschutzrecht / sektorales und weiteres dokumentiertes Recht':'EU AI Act und anwendbare Spezialregelungen'});
      else push(type,common.sourceStep,`duty-${short}`,{...common,expertise:'Fachliche Prüfung anhand der dokumentierten System- und Risikoinformationen'});
    });
    const repeatedRiskIds=new Set(duplicateRiskIds(context));
    targetState.risks.filter(r=>r.treatmentNeeded==='yes').forEach((risk,index)=>{const base=risk.riskId||`risk-${index+1}`,suffix=repeatedRiskIds.has(risk.riskId)?`-DUP-${index+1}`:'';push('risk','5',`${base}${suffix}`,{id:`RM-${base}${suffix}`,sourceQuestionId:risk.sourceGuideId||'RISK-24 bis RISK-31',riskId:risk.riskId||'',basis:'Kapitel 3 – 3×3-Risikomatrix',measure:risk.proposedTreatment||'',target:`Erwartetes Restrisiko ${labelFor(risk.expectedResidual)}`,linkedResult:`${risk.riskId||`Risiko ${index+1}`}: ${labelFor(effectiveCurrentRisk(risk))}`,strategy:risk.treatmentStrategy||'',priority:risk.priority||'',beforeRelease:effectiveCurrentRisk(risk)==='high'?'yes':'no',owner:risk.owner||'',due:risk.treatmentDue||'',status:risk.treatmentStatus||'planned',effectivenessCriterion:risk.effectivenessCriterion||'',effectivenessReview:risk.effectivenessDate||'',reviewer:risk.effectivenessReviewer||'',evidence:risk.treatmentStatus==='verified'?(risk.effectivenessEvidence||''):'',residual:risk.treatmentStatus==='verified'?(risk.verifiedResidual||'unknown'):'unknown'});});
    orgAreas.forEach(([id,label])=>{const item=targetState.org[id]||{};(orgCriteria[id]||[]).forEach(([key,criterionLabel,,guideId])=>{const criterion=item.criteria?.[key]||{},regulatory=regulatoryOrgCriterionContext(guideId,context);if(regulatory.defined&&!regulatory.relevant)return;const mandatoryGap=['partial','notFulfilled'].includes(criterion.answer)||(regulatory.relevant&&criterion.answer==='notAssessable'),optionalUnknown=criterion.answer==='notAssessable'&&item.transfer==='yes';if(!mandatoryGap&&!optionalUnknown)return;const number=guideId.replace('ORG-',''),regulatoryBasis=regulatory.relevant?`${regulatory.rule.basis}; ${regulatory.rule.reason}`:'',areaCritical=item.decisionCritical==='notAssessable'?'review':['yes','no'].includes(item.decisionCritical)?item.decisionCritical:'no',decisionCritical=regulatory.relevant?'yes':areaCritical,beforeRelease=regulatory.relevant||decisionCritical==='yes'?'yes':decisionCritical==='review'?'review':'no',blocking=regulatory.relevant||decisionCritical==='review'?'review':'no';push('organizational','6',guideId,{id:`OM-${guideId}`,organizationalGapId:`O-${number}`,sourceQuestionId:guideId,area:label,measure:item.measure||criterion.reason||'Organisatorische Lücke fachlich schließen und Wirksamkeit nachweisen.',impact:[criterionLabel,criterion.reason,item.gap,item.impact,regulatoryBasis].filter(isFilled).join(' · '),linkedResult:`${guideId}: ${orgStatusLabel(criterion.answer)}`,basis:regulatoryBasis||item.rationale||'Organisatorische Bewertung nach Kapitel 3',priority:regulatory.relevant||decisionCritical==='yes'?'high':'medium',beforeRelease,decisionCritical,blocking,blockingReason:blocking==='review'?'Die Blockierungswirkung der nicht vollständig erfüllten oder nicht abschließend beurteilbaren Organisationsanforderung ist fachlich zu bestätigen.':'',owner:item.owner||'',due:item.deadline||'',status:'planned',evidence:item.evidence||'',automaticTransfer:mandatoryGap?'Ja – verpflichtende Übernahme unabhängig von der manuellen Übertragungseinstellung':'Übernahme aufgrund der manuellen Einstellung'});});});
    if(e.prohibition.code==='possible'||(e.prohibition.code==='review'&&(targetState.evaluated[3]||prohibitedQuestions.some(([key])=>['possible','review','exception_review'].includes(targetState.form[key])))))push('legal','4','prohibition',{id:'JP-ART5',question:'Liegt ein Verbotstatbestand nach Art. 5 vor?',reason:e.prohibition.label,owner:'',sourceStep:'4',legalBasis:'EU AI Act Art. 5',assessmentImpact:'Entscheidungskritisch; keine abschließbare Bewertung.',craDecisionArea:'not_applicable',priority:'high',due:'',status:'open',result:'',ruleBlocking:'yes',ruleBlockingReason:'Ein möglicher Verbotstatbestand muss vor einer belastbaren Entscheidung geklärt werden.',blocking:'yes',blockingReason:'Ein möglicher Verbotstatbestand muss vor einer belastbaren Entscheidung geklärt werden.'});
    const aiPath=aiActPathStatus(context);
    if(aiPath.scope?.annexIBLimitation)push('legal','2','scope-08-limitation',{id:'PB-SCOPE-08',sourceQuestionId:'SCOPE-08',question:'Welche Hochrisiko-Anforderungen verbleiben im begrenzten Anwendungsbereich des Art. 2 Abs. 2?',reason:'Der konkrete Umfang der für das Produkt nach Anhang I Abschnitt B verbleibenden Anforderungen ist fallbezogen zu bestimmen.',linkedResult:aiPath.scope.label,owner:targetState.form.scopeLimitationOwner||'',sourceStep:'2',legalBasis:'EU AI Act Art. 2 Abs. 2',assessmentImpact:'Betroffene Pflichten bleiben nicht abschließend beurteilbar; nicht betroffene Pflichten werden regulär ausgewertet.',craDecisionArea:'not_applicable',priority:'high',due:targetState.form.scopeLimitationDue||'',status:'open',result:'',ruleBlocking:'review',ruleBlockingReason:'Ohne Klärung des Pflichtenumfangs ist keine abschließende Gesamtbewertung möglich.',blocking:'review',blockingReason:'Pflichtenumfang nach SCOPE-08 noch nicht abschließend bestimmt.'});
    if(aiPath.scope?.annexIAEquivalentLimitation)push('legal','2','scope-18-limitation',{id:'PB-SCOPE-18',sourceQuestionId:'SCOPE-18',question:'Welche Anforderungen werden durch gleichwertiges oder strengeres Harmonisierungsrecht nach Anhang I Abschnitt A abgedeckt?',reason:'Die mögliche Begrenzung einzelner Anforderungen ist noch nicht durch eine konkrete Zuordnung und einen Gleichwertigkeitsnachweis belegt.',linkedResult:aiPath.scope.label,owner:targetState.form.scopeLimitationOwner||'',sourceStep:'2',legalBasis:'EU AI Act Art. 2 Abs. 13',assessmentImpact:'Betroffene Pflichten bleiben nicht abschließend beurteilbar; nicht betroffene Pflichten werden regulär ausgewertet.',craDecisionArea:'not_applicable',priority:'high',due:targetState.form.scopeLimitationDue||'',status:'open',result:'',ruleBlocking:'review',ruleBlockingReason:'Ohne konkrete Zuordnung und Gleichwertigkeitsnachweis ist keine abschließende Bewertung der betroffenen Pflichten möglich.',blocking:'review',blockingReason:'Pflichtenumfang nach SCOPE-18 noch nicht abschließend bestimmt.'});
    if(aiPath.required&&aiPath.provisional)push('legal','2','scope-special',{id:'PB-SCOPE-SONDERREGEL',sourceQuestionId:'SCOPE-01 bis SCOPE-18',question:'Ist der Anwendungsbereich nach Art. 2 eindeutig bestimmt?',reason:aiPath.reason,linkedResult:aiPath.scope.label,owner:'',sourceStep:'2',legalBasis:'EU AI Act Art. 2 und Übergangsbestimmungen',assessmentImpact:'Reguläre Pflichten werden nicht automatisch abgeleitet; die verbleibende Reichweite ist fallbezogen zu klären.',craDecisionArea:'not_applicable',priority:'high',due:'',status:'open',result:'',ruleBlocking:'review',ruleBlockingReason:'Die Blockierungswirkung hängt von der fallbezogenen Reichweite der Sonderregel ab.',blocking:'review',blockingReason:'Noch nicht abschließend beurteilt.'});
    if(targetState.form.manualBlockerActive==='yes')push('legal','8','manual-review',{id:'PB-MANUELLER-PRUEFBEDARF',sourceQuestionId:'REVIEW-11',question:'Ist der zusätzlich dokumentierte Sachverhalt entscheidungsblockierend?',reason:targetState.form.manualBlockerReason||'Zusätzlicher Sachverhalt ohne Begründung.',linkedResult:'Zusätzlicher entscheidungsbezogener Prüfbedarf',owner:'',sourceStep:'8',legalBasis:'Fallbezogene fachliche oder juristische Prüfung',assessmentImpact:'Die Blockierungswirkung ist ausdrücklich festzulegen.',craDecisionArea:'not_applicable',priority:'high',due:'',status:'open',result:'',ruleBlocking:'review',ruleBlockingReason:'Ein freier Hinweis ist kein Hindernis; die Blockierungswirkung muss gesondert bestätigt werden.',blocking:'review',blockingReason:'Noch nicht bestätigt.'});
    const active=new Set(desired.map(d=>`${d.type}:${d.sourceStep}:${d.sourceId}`)),identityFields=new Set(['dutyCode','riskId']),conflictFields=new Set(['sourceQuestionId','basis','legalBasis','requirement','measure','question','obligatedRole','riskId','dutyCode']);
    desired.forEach(({type,sourceStep,sourceId,item})=>{
      const list=targetState.registers[type],byTarget=list.filter(entry=>isActiveRegisterItem(entry)&&entry.id===item.id);let existing=byTarget.find(entry=>!entry.derived)||byTarget.find(entry=>String(entry.sourceStep)===sourceStep&&entry.sourceId===sourceId)||byTarget[0];
      if(existing)byTarget.filter(entry=>entry!==existing).forEach(entry=>mergeDuplicateRegisterEntry(type,existing,entry,targetState,context));
      if(!existing)existing=list.find(entry=>entry.derived&&String(entry.sourceStep)===sourceStep&&entry.sourceId===sourceId);
      if(!existing){list.push({...item,derived:true,sourceStep,sourceId,sourceActive:true,sourceSnapshot:{...item}});return;}
      if(!existing.derived){
        const conflicts=[];Object.entries(item).forEach(([key,value])=>{if(!isFilled(existing[key]))existing[key]=structuredClone(value);else if(isFilled(value)&&JSON.stringify(existing[key])!==JSON.stringify(value)&&conflictFields.has(key))conflicts.push(`Quelle ${sourceStep}/${sourceId}, ${displayFieldName(key,context)}: manueller Wert „${String(existing[key])}“ bleibt erhalten; Quellwert „${String(value)}“`);});
        if(['expert','legal'].includes(type)&&existing.status==='resolved'&&item.status==='open'){existing.status='open';conflicts.push(`Quelle ${sourceStep}/${sourceId}: Der automatisch ausgelöste Prüfbedarf ist weiterhin offen; der zuvor manuell als geklärt markierte Status wurde wieder geöffnet.`);}
        existing.syncSourceActive=true;existing.syncSourceStep=sourceStep;existing.syncSourceId=sourceId;existing.syncSourceSnapshot={...item};existing.syncConflictEvidence=[existing.syncConflictEvidence,...conflicts].filter(isFilled).join(' | ');return;
      }
      const previous=existing.sourceSnapshot||{},conflicts=[];
      Object.entries(item).forEach(([key,value])=>{
        if(!isFilled(existing[key])||(Object.prototype.hasOwnProperty.call(previous,key)&&JSON.stringify(existing[key])===JSON.stringify(previous[key])))existing[key]=structuredClone(value);
        else if((identityFields.has(key)||conflictFields.has(key))&&isFilled(value)&&JSON.stringify(existing[key])!==JSON.stringify(value))conflicts.push(displayFieldName(key,context));
      });
      if(['expert','legal'].includes(type)&&existing.status==='resolved'&&item.status==='open'){existing.status='open';conflicts.push('status');existing.syncConflictEvidence=[existing.syncConflictEvidence,`Quelle ${sourceStep}/${sourceId}: Die Quellbedingung ist weiterhin ungeklärt; der automatisch abgeleitete Prüfbedarf wurde erneut geöffnet.`].filter(isFilled).join(' | ');}
      existing.derived=true;existing.sourceStep=sourceStep;existing.sourceId=sourceId;existing.sourceActive=true;existing.sourceSnapshot={...item};existing.syncConflict=conflicts.join(', ');
    });
    Object.entries(targetState.registers).forEach(([type,list])=>list.forEach(item=>{if(item.derived&&!active.has(`${type}:${item.sourceStep}:${item.sourceId}`))item.sourceActive=false;if(!item.derived&&item.syncSourceId&&!active.has(`${type}:${item.syncSourceStep}:${item.syncSourceId}`))item.syncSourceActive=false;}));
    Object.entries(targetState.registers).forEach(([type,list])=>{const groups=new Map();list.filter(isActiveRegisterItem).forEach(item=>{if(!isFilled(item.id))return;const group=groups.get(item.id)||[];group.push(item);groups.set(item.id,group);});groups.forEach(group=>{if(group.length<2)return;const primary=group.find(item=>!item.derived)||group[0];group.filter(item=>item!==primary).forEach(item=>mergeDuplicateRegisterEntry(type,primary,item,targetState,context));});});
  }
}
/**
 * Synchronisiert die abgeleiteten Register des interaktiven Arbeitsstands.
 * @returns {void}
 * @description Datenquelle ist der Live-Zustand. Die Funktion verändert ausschließlich dessen Register und ist bewusst von der privaten Berichtssynchronisierung getrennt.
 */
function syncDerivedRegisters(){
  if(registerSyncInProgress)return;registerSyncInProgress=true;
  try{synchronizeDerivedRegistersInto(state,liveEvaluationReferences());}finally{registerSyncInProgress=false;}
}

/**
 * Synchronisiert eine bereits private Berichtskopie ohne eine weitere Vollkopie.
 * @param {object} sourceState Bereits einmalig kopierter, privater Berichtszustand.
 * @param {object} references Zum selben Bericht gehörende, private Referenzdaten.
 * @returns {object} Derselbe private Zustand nach Registersynchronisierung.
 * @description Die Funktion verändert ausschließlich `sourceState`; der globale Arbeitsstand bleibt unberührt. Sie speichert nichts und aktualisiert keine Oberfläche.
 */
function deriveSynchronizedReportState(sourceState,references){synchronizeDerivedRegistersInto(sourceState,references);return sourceState;}
/**
 * Aktualisiert die abgeleiteten Register des interaktiven Arbeitsstands.
 * @returns {void}
 * @description Datenquelle ist der Live-Zustand mit den aktuellen Live-Referenzen. Seiteneffekt ist ausschließlich die Registersynchronisierung im Arbeitsstand; Speicherung und Oberflächenrendering erfolgen nicht hier.
 */
function deriveRegisters(){syncDerivedRegisters();}

/* 15. Plausibilisierung und Gesamtstatus */

function step4Requirements(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),craRoleFields=references.craRoleFields,prohibitedQuestions=references.prohibitedQuestions,annexAreas=references.annexAreas,transparencyQuestions=references.transparencyQuestions,gpaiQuestions=references.gpaiQuestions,path=aiActPathStatus(context),gpaiPath=gpaiPathStatus(context),craGate=craApplicabilityGate(context),craOpeningKeys=['craDigitalProduct','craRemoteProcessing','craDataConnection','craCommercial','craPrototype','craOpenSource','craExclusion'],craContinuationKeys=['craSubstantialChange','craManufacturerTakeover','craProductClass','craAiActOverlap'],craRoleKeys=craRoleFields.map(([field])=>field),timeKeys=['timeAssessmentBasis','timeDutyStatuses','timeTransition','timeLawChanged'],required=[...craOpeningKeys,...timeKeys,'publicAuthorityIntendedUse','timeBasis','timeEvidence','intendedUseDate','firstMarketDate','firstOperationDate','substantialChangeStatus','craConclusion','craBasis','craEvidence',...dynamicReasonsFor([...craOpeningKeys,...timeKeys],context)];
  if(craGate.status!=='no')required.push(...craContinuationKeys,...craRoleKeys,...dynamicReasonsFor([...craContinuationKeys,...craRoleKeys],context));
  if(state.form.substantialChangeStatus==='yes')required.push('substantialChangeDate');
  if(craGate.status!=='no'&&state.form.craDigitalProduct==='yes'&&state.form.craDataConnection==='yes'&&state.form.craCommercial==='yes')required.push('craProductType','craProductRelation','craProductClass','craConformityProcedure','craVulnerabilityProcess','craReportingProcess','craTransitionDates','craFirstMarketDate','craTransitionEvidence');
  if(craGate.status!=='no'&&state.form.craSubstantialChange==='yes')required.push('craSubstantialChangeDate');
  if(craGate.status!=='no'&&state.form.craPrototype==='yes')required.push('craPrototypeLimitedTesting','craPrototypeMarked');
  if(craGate.status!=='no'&&state.form.craExclusion==='yes')required.push('craExclusionBasis','craExclusionRequirements','craExclusionEvidence');
  if(path.required){
    const aiKeys=[...prohibitedQuestions,...annexAreas,...transparencyQuestions].map(([key])=>key),highRiskKeys=['productCovered','productSafetyComponent','annexISection','thirdPartyConformity','conformityNonSafetyOnly'];
    required.push(...aiKeys,...highRiskKeys,'prohibitionConclusion','prohibitionBasis','prohibitionEvidence','productHighRiskConclusion','productHighRiskBasis','productHighRiskEvidence','annexHighRiskConclusion','annexBasis','annexEvidence','transparencyConclusion','transparencyBasis','transparencyEvidence',...dynamicReasonsFor([...aiKeys,...highRiskKeys],context));
    prohibitedQuestions.forEach(([key])=>{if(['yes','review','na','exception_review'].includes(state.form[key]))required.push(...prohibitedFollowFields(key));if(!isSensitiveArt5(key)&&state.form[`${key}Exception`]==='confirmed')required.push(`${key}ExceptionBasis`,`${key}ExceptionRequirements`,`${key}ExceptionScope`);});
    transparencyQuestions.forEach(([key])=>{if(state.form[key]==='yes'){required.push(`${key}Use`,`${key}Actor`,`${key}Duty`,`${key}Exception`,`${key}Reason`,`${key}Evidence`,`${key}Result`);if(state.form[`${key}Exception`]==='yes')required.push(`${key}ExceptionBasis`,`${key}ExceptionRequirements`,`${key}ExceptionScope`);}});
    if(evaluateHighRiskSummary(context).code==='high_risk')required.push('art25OwnBrand','art25SubstantialModification','art25PurposeChange','art25ProductIntegration','art25Conclusion','art25Basis','art25SupplierRelationship','art25SupplierEvidence',...temporalRequirements('highRisk',context));
    if(annexAreas.some(([key])=>state.form[key]==='yes'))required.push('specificAnnexUse','narrowProcedural','completedResultImprovement','patternDetection','preparatoryTask','materialInfluenceControl','profiling',...(state.form.annexEssentialServices==='yes'?['annexIII5bc']:[]),...dynamicReasonsFor(['narrowProcedural','completedResultImprovement','patternDetection','preparatoryTask','materialInfluenceControl','profiling','annexIII5bc'],context));
  }
  if(gpaiPath.required){const gpaiKeys=gpaiQuestions.map(([key])=>key);required.push(...gpaiKeys,'gpaiConclusion','gpaiOrganizationRole','gpaiBasis','gpaiEvidence',...dynamicReasonsFor(gpaiKeys,context));}
  const evaluations=allRegulatoryEvaluations(context);
  if(evaluations.art25.code==='applicable')required.push(...temporalRequirements('art25',context));
  if(['provider','deployer','multiple'].includes(evaluations.transparency.code))required.push(...temporalRequirements('transparency',context));
  if(['model','integration','systemic'].includes(evaluations.gpai.code))required.push(...temporalRequirements('gpai',context));
  let unique=[...new Set(required)];
  if(evaluateProhibitedPractices(context).code==='confirmed')unique=unique.filter(key=>!/^(annex|specificAnnex|narrowProcedural|completedResultImprovement|patternDetection|preparatoryTask|materialInfluenceControl|profiling|product|thirdParty|conformity|art25|transparency|tInteraction|tEmotion|tBiometric|tSynthetic|tDeepfake|tPublicText|tGeneral|tHighRisk)/.test(key));
  return{required:unique,optional:['regulatoryNotes','legalSources','transitionNotes']};
}
function step5Stats(context=null){
  const state=evaluationState(context),references=evaluationReferences(context),riskDomainKeys=references.riskDomainKeys,riskEvaluationKeys=references.riskEvaluationKeys,guideKeys=[...references.riskContextKeys,...riskDomainKeys,...riskEvaluationKeys],guideRequired=[...guideKeys,...dynamicReasonsFor([...riskDomainKeys,...riskEvaluationKeys],context)];
  let missing=guideRequired.filter(key=>!isFilled(state.form[key])),requiredFilled=guideRequired.length-missing.length,requiredTotal=guideRequired.length,optionalFilled=0,optionalMissing=0;
  if(!state.risks.length)missing.push('Mindestens ein konkretes Risiko erfassen.');
  state.risks.forEach((risk,index)=>{const required=riskRequiredFor(risk);requiredTotal+=required.length;required.forEach(key=>{if(isFilled(risk[key]))requiredFilled++;else missing.push(`${risk.riskId||`Risiko ${index+1}`}: ${displayFieldName(key,context)}`);});['linkedRequirement','monitoringIndicator','comments'].forEach(key=>{if(isFilled(risk[key]))optionalFilled++;else optionalMissing++;});});
  return{requiredMissing:missing.length>0,requiredFilled,requiredTotal:requiredTotal+1,optionalFilled,optionalMissing,optionalTotal:optionalFilled+optionalMissing,filled:requiredFilled+optionalFilled+(state.risks.length?1:0),total:requiredTotal+1+optionalFilled+optionalMissing,missing,contradictions:allRiskContradictions(context)};
}

function standardStats(requirements,context=null){
  const state=evaluationState(context),missing=requirements.required.filter(key=>!isFilled(state.form[key])).map(key=>displayFieldName(key,context));if(requirements.customRequired&&!requirements.customRequired())missing.push('Mindestens eine Akteursrolle');
  const optionalFilled=requirements.optional.filter(key=>isFilled(state.form[key])).length;
  const requiredFilled=Math.max(0,requirements.required.length-missing.length);
  return{requiredMissing:missing.length>0,requiredFilled,requiredTotal:requirements.required.length,optionalFilled,optionalMissing:requirements.optional.length-optionalFilled,optionalTotal:requirements.optional.length,filled:requiredFilled+optionalFilled,total:requirements.required.length+requirements.optional.length,missing,contradictions:[]};
}
function stepStats(index,context=null){
  let stats;if(index===0)stats=standardStats(step1Requirements(context),context);else if(index===1)stats=standardStats(step2Requirements(context),context);else if(index===2)stats=standardStats(step3Requirements(context),context);else if(index===3)stats=standardStats(step4Requirements(context),context);else if(index===4)stats=step5Stats(context);else if(index===5)stats=step6Stats(context);else if(index===6)stats=step7Stats(context);else stats=step8Stats(context);
  stats.requiredTotal??=Math.max(1,stats.total-stats.optionalMissing);stats.requiredFilled??=Math.max(0,stats.requiredTotal-(stats.missing?.length||0));stats.optionalTotal??=stats.optionalMissing;stats.optionalFilled??=Math.max(0,stats.optionalTotal-stats.optionalMissing);
  stats.contradictions=[...(stats.contradictions||[]),...(index===3?regulatoryContradictions(context):[]),...(index===6?[...registerValidation(context).issues,...registerValidation(context).missingLinks]:[])];return stats;
}
/**
 * Bestimmt die Navigationsfarbe nur aus Feldern: Rot bei fehlendem Pflichtfeld,
 * Gelb bei vollständigen Pflichtfeldern und mehr als einem offenen optionalen Feld,
 * Grün bei höchstens einem offenen optionalen Feld. Bloßes Öffnen ändert nichts.
 */
function stepStatus(index,context=null){if(!evaluationState(context).evaluated[index])return'neutral';const stats=stepStats(index,context);if(stats.requiredMissing||stats.contradictions.length)return'red';if(stats.optionalMissing>1)return'yellow';return'green';}

/** Berechnet den Fortschritt aus der fachlichen Feldvollständigkeit aller acht Schritte. */
function completionPercent(){
  const scores=steps.map((_,index)=>{const s=stepStats(index),total=s.requiredTotal*2+s.optionalTotal;if(!total)return 0;let value=Math.max(0,(s.requiredFilled*2+s.optionalFilled)/total);if(state.evaluated[index]&&stepStatus(index)==='green')value=1;return Math.min(1,value);});
  return Math.round(scores.reduce((sum,value)=>sum+value,0)/scores.length*100);
}

function approvalConsistency(decision=null,context=null){
  decision??=overallDecision(false,true,{synchronize:false,context});
  const value=evaluationState(context).form.approvalStatus,all=['pending','rejected','conditional','approved'],plausible={USE_NOT_CONTINUABLE:['pending','rejected'],ASSESSMENT_NOT_CONCLUDABLE:['pending','rejected'],ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES:['pending','rejected','conditional'],ASSESSMENT_COMPLETE:all}[decision.code]||['pending','rejected'];
  const warnings=value&&!plausible.includes(value)?[`Hinweis: Die gesonderte Entscheidung „${labelFor(value)}“ weicht vom regelbasierten Bewertungsstatus „${decision.label}“ ab. Der regelbasierte Status wird dadurch nicht verändert.`]:[];return{allowed:all,plausible,warnings,errors:warnings};
}

/**
 * Leitet den Gesamtstatus mit fester Priorität ab: (1) festgestelltes Hindernis,
 * (2) Bewertung nicht abschließbar, (3) offene Maßnahmen, (4) abgeschlossen.
 * Die menschliche Entscheidung wird nur als gesonderter Hinweis geprüft und kann
 * den regelbasierten Status weder verschärfen noch herabstufen.
 * @param {boolean} [includeApproval=true] Ergänzt Hinweise zur gesonderten menschlichen Entscheidung.
 * @param {boolean} [skipCompleteness=false] Überspringt ausschließlich die abschließende Vollständigkeitsprüfung.
 * @param {{synchronize?:boolean,context?:object}} [options] Steuert die interaktive Registersynchronisierung und enthält bei Berichtsaufrufen den privaten Evaluationskontext.
 * @returns {object} Regelbasierter Status mit Blockern, Unsicherheiten, Maßnahmen und Auflagen.
 * @description Datenquelle ist der übergebene Evaluationskontext; ohne Kontext dient der Live-Zustand ausschließlich interaktiven Aufrufen. Bei `synchronize=true` wird der jeweilige Kontextzustand synchronisiert. Die Funktion speichert nichts und erteilt keine organisatorische Genehmigung.
 */
function overallDecision(includeApproval=true,skipCompleteness=false,{synchronize=true,context=null}={}){
  if(synchronize){if(context)synchronizeDerivedRegistersInto(context.state,context.references);else syncDerivedRegisters();}
  const blockers=[],uncertainties=[],mandatory=[],conditions=[];
  const add=(group,code,source,text)=>group.push({code,severity:group===blockers?'blocker':group===uncertainties?'uncertainty':group===mandatory?'mandatory':'condition',source,text});
  const openStatus=registerItemOpen;
  statusRelevantRegisterItems('regulatory',context).filter(openStatus).forEach(item=>add(item.applicability==='current'&&item.beforeRelease==='yes'?mandatory:conditions,'REGULATORY-OPEN',item.id,item.applicability==='future'?'Künftig anwendbare Pflicht wird als Vorbereitung nachverfolgt.':'Einschlägige regulatorische Anforderung ist offen.'));
  activeRegisterItems('risk',context).filter(openStatus).forEach(item=>add(item.beforeRelease==='yes'?mandatory:conditions,'RISK-MEASURE-OPEN',item.id,item.beforeRelease==='yes'?'Zugewiesene Risikomaßnahme ist vor der Nutzung noch offen.':'Risikomaßnahme ist offen.'));
  activeRegisterItems('organizational',context).filter(openStatus).forEach(item=>add(item.beforeRelease==='yes'?mandatory:conditions,'ORGANIZATION-MEASURE-OPEN',item.id,item.beforeRelease==='yes'?'Zugewiesene organisatorische Maßnahme ist vor der Nutzung noch offen.':'Organisatorische Maßnahme ist offen.'));
  for(const type of ['expert','legal'])activeRegisterItems(type,context).filter(item=>item.status!=='resolved').forEach(item=>add(item.blocking==='no'?conditions:uncertainties,'REVIEW-OPEN',item.id,item.blocking==='no'?'Nicht entscheidungsblockierender Prüfbedarf ist offen.':item.blocking==='yes'?'Entscheidungsblockierender Prüfbedarf ist offen.':'Die Blockierungswirkung des Prüfbedarfs ist nicht abschließend beurteilt.'));
  const reviews=Object.fromEntries([8,9,10,11,12].map(number=>{const key=`REVIEW-${String(number).padStart(2,'0')}`;return[key,reviewOperationalResult(key,null,context)];}));
  for(const key of ['REVIEW-08','REVIEW-09','REVIEW-10']){
    const item=reviews[key];if(item.value==='yes')add(blockers,key,'Entscheidungstabelle 34',item.reason);else if(item.value==='review')add(uncertainties,key,'Entscheidungstabelle 34',item.reason);
  }
  if(reviews['REVIEW-11'].value==='yes')add(uncertainties,'REVIEW-11','Entscheidungstabelle 34',reviews['REVIEW-11'].reason);
  else if(reviews['REVIEW-11'].value==='review')add(uncertainties,'REVIEW-11','Entscheidungstabelle 34',reviews['REVIEW-11'].reason);
  if(reviews['REVIEW-12'].value==='yes'&&!mandatory.length&&!conditions.length)add(conditions,'REVIEW-12','Entscheidungstabelle 34',reviews['REVIEW-12'].reason);
  let code,label,tone;
  if(['REVIEW-08','REVIEW-09','REVIEW-10'].some(key=>reviews[key].value==='yes')){code='USE_NOT_CONTINUABLE';label='Vorgesehene Verwendung aufgrund eines festgestellten Hindernisses nicht fortführbar';tone='danger';}
  else if(reviews['REVIEW-11'].value==='yes'||[8,9,10,11].some(number=>reviews[`REVIEW-${String(number).padStart(2,'0')}`].value==='review')){code='ASSESSMENT_NOT_CONCLUDABLE';label='Bewertung nicht abschließbar';tone='danger';}
  else if(reviews['REVIEW-12'].value==='yes'){code='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES';label='Bewertung abgeschlossen mit offenen Maßnahmen';tone='warning';}
  else{code='ASSESSMENT_COMPLETE';label='Bewertung abgeschlossen';tone='positive';}
  const decision={code,label,tone,blockers,uncertainties,mandatory,conditions,reviews,reasons:[...blockers,...uncertainties,...mandatory,...conditions]};
  decision.approvalWarnings=includeApproval?approvalConsistency(decision,context).warnings:[];
  return decision;
}

function step8Stats(context=null){
  const state=evaluationState(context);
  const required=['assessmentId','assessmentVersion','guideVersion','changeHistory','documentationOwner','documentLocation','accessRights','statutoryRetentionStatus','statutoryRetentionBasis','internalRetentionPeriod','preservePreviousAssessments','evidenceInventory','evidenceInventoryVersion','evidenceInventoryDate','evidenceInventoryLocation','legalSources','reviewer','approver','overallReasoning','manualBlockerActive','nextReviewDate','reviewFrequency','reviewEvidence','approvalStatus','approvalDate'];
  if(isFilled(state.form.assessmentDate)&&isFilled(state.form.assessmentUpdate)&&state.form.assessmentDate!==state.form.assessmentUpdate)required.push('assessmentUpdateReason');
  if(state.form.manualBlockerActive==='yes')required.push('manualBlockerReason');
  const missing=required.filter(key=>!isFilled(state.form[key])).map(key=>displayFieldName(key,context));state.triggers.forEach((trigger,index)=>{if(!isFilled(trigger.required))missing.push(`Neubewertungsauslöser ${index+1}: Festlegung`);if(trigger.required==='yes')['steps','owner','due'].forEach(key=>{if(!isFilled(trigger[key]))missing.push(`Neubewertungsauslöser ${index+1}: ${{steps:'Betroffene Prüfschritte',owner:'Verantwortliche Stelle',due:'Frist'}[key]}`);});if(trigger.required==='no'&&!isFilled(trigger.reason))missing.push(`Neubewertungsauslöser ${index+1}: Begründung der Nichtanwendung`);});
  const optional=['distribution','conditions','blockers','openRequirements','openMeasures','openReviews','additionalNotes'],optionalFilled=optional.filter(key=>isFilled(state.form[key])).length;
  return{requiredMissing:missing.length>0,requiredFilled:required.length-missing.length,requiredTotal:required.length,optionalFilled,optionalMissing:optional.length-optionalFilled,optionalTotal:optional.length,filled:required.length-missing.length+optionalFilled,total:required.length+optional.length,missing,contradictions:[]};
}

function validationItem(text,source,type='review',critical=false,owner='',due='',status='open'){return{text,source,type,critical:Boolean(critical),owner:owner||'',due:due||'',status:status||'open'};}
function getStepValidation(index,{skipApproval=false,decision=null,context=null}={}){
  const state=evaluationState(context),references=evaluationReferences(context),steps=references.steps,orgAreas=references.orgAreas,step3Questions=references.step3Questions,roleQuestionKeys=references.roleQuestionKeys,stats=stepStats(index,context),source=`Prüfschritt ${index+1} – ${steps[index][0]}`,items=[];
  (stats.missing||[]).forEach(text=>items.push(validationItem(sanitizeVisibleText(String(text),context),source,'missing',true)));
  (stats.contradictions||[]).forEach(text=>items.push(validationItem(String(text),source,'contradiction',true)));
  if(index===0&&['partial','missing'].includes(state.form.infoStatus))items.push(validationItem('Offener Informationsbedarf aus der Vollständigkeitsprüfung.',source,'review',true,state.form.infoRequestOwner,state.form.infoDeadline));
  if(index===1){const scope=evaluateScope(context),ai=evaluateAISystemDefinition(context);[...scope.reviewNeeds,...scope.missing].forEach(text=>items.push(validationItem(String(text),source,'review',true)));[...ai.reviewNeeds,...ai.missing].forEach(text=>items.push(validationItem(String(text),source,'review',true)));}
  if(index===2){const path=aiActPathStatus(context);step3Questions.filter(([key])=>path.required||!roleQuestionKeys.includes(key)).forEach(([key,label])=>{if(state.form[key]==='review')items.push(validationItem(label,source,'review',['ownBrand','substantialModification','purposeChange','individualImpact','humanCorrection'].includes(key),state.form.owner,state.form.roleReviewDate));});if(path.required&&!roleLabels(context).length)items.push(validationItem('Keine Akteursrolle bestimmt.',source,'review',true,state.form.owner,state.form.roleReviewDate));}
  if(index===3)Object.entries(allRegulatoryEvaluations(context)).forEach(([key,result])=>{
    const pathLabel={prohibition:'Art. 5',productHighRisk:'Art. 6 Abs. 1 / Anhang I',annexHighRisk:'Art. 6 Abs. 2 / Anhang III',art25:'Art. 25',transparency:'Art. 50',gpai:'GPAI',cra:'Cyber Resilience Act'}[key]||'Regulatorischer Prüfpfad';
    result.reviewNeeds.forEach(text=>items.push(validationItem(String(text),`${source} / ${pathLabel}`,'review',result.critical)));
    result.missing.forEach(text=>items.push(validationItem(String(text),`${source} / ${pathLabel}`,'missing',result.critical)));
    result.contradictions.forEach(text=>items.push(validationItem(String(text),`${source} / ${pathLabel}`,'contradiction',true)));
  });
  if(index===4)state.risks.forEach(risk=>{if(risk.treatmentNeeded==='review'||risk.expertReview==='yes'||risk.legalReview==='yes')items.push(validationItem(`${risk.riskId||'Risiko'}: weiterer Prüfbedarf.`,source,'review',risk.decisionCriticality==='yes',risk.reviewOwner||risk.owner,risk.reviewDue||risk.treatmentDue));});
  if(index===5)orgAreas.forEach(([id,label])=>{const evaluation=evaluateOrgArea(id,context),org=state.org[id]||{};evaluation.criticalIssues.forEach(text=>items.push(validationItem(`${label}: ${text}`,source,'review',true,org.owner,org.deadline)));if(org.status==='notAssessable')items.push(validationItem(`${label}: Gesamtstatus nicht beurteilbar.`,source,'review',org.decisionCritical==='yes',org.owner,org.deadline));});
  if(index===6){for(const type of ['expert','legal'])activeRegisterItems(type,context).filter(item=>item.status!=='resolved').forEach(item=>items.push(validationItem(item.question||item.id,`${source} / ${item.id||type}`,'review',item.blocking==='yes',item.owner,item.due,item.status)));}
  if(index===7&&!skipApproval){const base=decision||overallDecision(false,true,{synchronize:false,context}),check=approvalConsistency(base,context);check.warnings.forEach(text=>items.push(validationItem(text,source,'warning',false,state.form.approver,state.form.approvalDate)));}
  const unique=[];const seen=new Set();items.forEach(item=>{const key=`${item.source}|${item.type}|${item.text}`;if(!seen.has(key)){seen.add(key);unique.push(item);}});
  const result=index===7?(decision?.label||'Dokumentation, Review und Genehmigung werden geprüft'):stepSubstantiveResult(index,decision,context);
  return{items:unique,missing:unique.filter(item=>item.type==='missing').map(item=>item.text),optionalMissing:stats.optionalMissing||0,contradictions:unique.filter(item=>item.type==='contradiction').map(item=>item.text),reviewNeeds:unique.filter(item=>item.type==='review').map(item=>item.text),warnings:unique.filter(item=>item.type==='warning').map(item=>item.text),critical:unique.filter(item=>item.critical&&item.status!=='resolved'),result};
}

function reportCompletionStatus(decision=null,context=null){
  const state=evaluationState(context),steps=evaluationReferences(context).steps;
  decision??=overallDecision(false,true,{synchronize:false,context});const validations=steps.map((_,index)=>getStepValidation(index,{decision,context})),items=validations.flatMap(item=>item.items).filter(item=>item.status!=='resolved'&&item.type!=='warning');
  const documentationCritical=items.filter(item=>item.critical),decisionCritical=[...decision.blockers.map(item=>validationItem(item.text,item.source,'blocker',true)),...decision.uncertainties.map(item=>validationItem(item.text,item.source,'review',true))],criticalOpen=[...documentationCritical,...decisionCritical];
  state.risks.forEach(risk=>{if(effectiveCurrentRisk(risk)==='unknown'&&risk.decisionCriticality==='yes')criticalOpen.push(validationItem(`${risk.riskId||'Risiko'}: entscheidungskritisches Risiko nicht bestimmbar.`,'Prüfschritt 5','review',true,risk.owner,risk.treatmentDue));if(risk.treatmentNeeded==='yes'&&['implemented','verified'].includes(risk.treatmentStatus)&&review10RiskState(risk).level==='unknown')criticalOpen.push(validationItem(`${risk.riskId||'Risiko'}: maßgebliches Restrisiko nicht bestimmt oder noch nicht verifiziert.`,'Prüfschritt 5','review',true,risk.owner,risk.treatmentDue));});
  const nonCriticalOpen=[...items.filter(item=>!item.critical),...decision.conditions.map(item=>validationItem(item.text,item.source,'condition',false))];
  const unevaluated=state.evaluated.map((value,index)=>!value?`Prüfschritt ${index+1} wurde noch nicht bewertet.`:'').filter(Boolean),reasons=[...unevaluated,...criticalOpen.map(item=>item.text)];
  const uniqueCritical=criticalOpen.filter((item,index,list)=>list.findIndex(other=>other.text===item.text&&other.source===item.source)===index),uniqueNonCritical=nonCriticalOpen.filter((item,index,list)=>list.findIndex(other=>other.text===item.text&&other.source===item.source)===index);
  const documentationIncomplete=documentationCritical.length>0||unevaluated.length>0,documentationStatus=documentationIncomplete?'incomplete':items.some(item=>!item.critical)?'complete_with_open_points':'complete',editingStatus=unevaluated.length?'in_progress':'all_steps_assessed';
  const status=documentationIncomplete||decision.code==='ASSESSMENT_NOT_CONCLUDABLE'?'draft':decision.code==='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES'?'conditional':'final';
  return{status,draft:status==='draft',editingStatus,documentationStatus,domainDecisionStatus:decision.code,unevaluated,reasons:[...new Set(reasons)],documentationCriticalOpen:documentationCritical,decisionCriticalOpen:decisionCritical,criticalOpen:uniqueCritical,nonCriticalOpen:uniqueNonCritical,decision};
}
function isDraftReport(){return reportCompletionStatus().draft;}

/** Liefert die getrennten sichtbaren Bezeichnungen für Bearbeitung, Dokumentation und Bericht. */
function reportStatusLabels(completion){
  return{
    editing:completion.editingStatus==='all_steps_assessed'?'Alle acht Prüfschritte bewertet':'Bearbeitung noch nicht abgeschlossen',
    documentation:completion.documentationStatus==='complete'?'Dokumentation vollständig':completion.documentationStatus==='complete_with_open_points'?'Dokumentation vollständig; nichtkritische offene Punkte vorhanden':'Dokumentation unvollständig',
    report:completion.status==='final'?'Abschließender Bericht':completion.status==='conditional'?'Abgeschlossener Bericht mit offenen Maßnahmen':'Entwurf'
  };
}

/** Rendert die vier getrennten Statusebenen eines eingefrorenen Berichtsdatenstands. */
function reportStatusFacts(completion,reportFact){
  const labels=reportStatusLabels(completion);
  return`${reportFact('Bearbeitungsstand',labels.editing)}${reportFact('Dokumentationsstatus',labels.documentation)}${reportFact('Fachlicher Bewertungsstatus',completion.decision.label)}${reportFact('Berichtsstatus',labels.report)}`;
}

/** Erklärt einen Entwurfsstatus, ohne einen fachlichen Hinderungsgrund zu verdecken. */
function reportStatusBanner(completion){
  if(completion.status==='final')return'';
  if(completion.status==='conditional')return'<div class="draft-banner conditional-banner">Bewertung abgeschlossen mit offenen Maßnahmen – Nachverfolgung ist dokumentiert</div>';
  const documentationOpen=completion.documentationStatus==='incomplete'||completion.editingStatus==='in_progress';
  const reason=documentationOpen?'Bearbeitungs- oder Dokumentationsstand nicht abgeschlossen':'fachliche Bewertung nicht abschließbar';
  return`<div class="draft-banner">Entwurf – ${escapeHtml(reason)} · Fachlicher Bewertungsstatus: ${escapeHtml(completion.decision.label)}</div>`;
}

/** Ordnet den verwendeten Rechtsstand zeitlich zum Bewertungsstichtag ein. */
function reportTemporalContext(form,knowledgeBase){
  const legalMatch=String(knowledgeBase.legalStatus||'').match(/^(\d{2})\.(\d{2})\.(\d{4})$/),assessment=form.assessmentDate||'';
  if(!assessment)return'Der Bewertungsstichtag ist nicht dokumentiert; eine zeitliche Einordnung des verwendeten Rechtsstands ist daher noch offen.';
  if(!legalMatch)return'Der verwendete Rechtsstand und der Bewertungsstichtag werden getrennt ausgewiesen; der Rechtsstand ist nicht als maschinenlesbares Datum hinterlegt.';
  const legalIso=`${legalMatch[3]}-${legalMatch[2]}-${legalMatch[1]}`;
  if(legalIso>assessment)return`Rückblickende Einordnung: Der verwendete Rechtsstand vom ${knowledgeBase.legalStatus} liegt nach dem Bewertungsstichtag ${fmtDate(assessment)}. Dies ist nicht automatisch unzulässig; im Bericht wird transparent zwischen Bewertungsstichtag, späterer Aktualisierung und Quellenstand unterschieden.`;
  return`Der verwendete Rechtsstand vom ${knowledgeBase.legalStatus} liegt am oder vor dem Bewertungsstichtag ${fmtDate(assessment)}. Bearbeitungs-, Entscheidungs- und Berichtserzeugungsdatum werden davon getrennt ausgewiesen.`;
}

/* 16. Berichtsdatenstand und Berichtsausgabe */

/**
 * Ordnet der technischen Berichtsart ihre sichtbare deutsche Bezeichnung zu.
 * @param {'compact'|'evidence'} type Gewählte Berichtsart.
 * @returns {string} Sichtbare, feste Bezeichnung der Berichtsart.
 * @description Die reine Funktion verwendet nur den übergebenen Wert, liest keine Zustands- oder Referenzdaten und hat keine Seiteneffekte.
 */
function reportTypeLabel(type){return type==='compact'?'Kompakter Bewertungsbericht':'Vollständiger Nachweisbericht';}
/**
 * Bereinigt einen benutzergeprägten Kennungsanteil für einen portablen Dateinamen.
 * @param {*} value Unbereinigter Wert aus dem fixierten Berichtsformular.
 * @returns {string} Normalisierter, begrenzter und nicht leerer Dateinamenanteil.
 * @description Die reine Formatierungsfunktion liest keine globalen Zustands- oder Referenzdaten und verändert keine Eingabe.
 */
function safeFilenamePart(value){return String(value||'ohne-Kennung').normalize('NFKC').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/\s+/g,'-').replace(/\.+$/g,'').replace(/-+/g,'-').slice(0,80)||'ohne-Kennung';}
/**
 * Erzeugt den stabilen PDF-Dateinamen aus Berichtsart und interner Tool-Kennung.
 * @param {'compact'|'evidence'} type Berichtsart.
 * @param {object} form Fixierte Formulardaten des Berichtssnapshots.
 * @returns {string} Portabler PDF-Dateiname.
 * @description Die Funktion ist nebenwirkungsfrei und verwendet keine späteren Live-Daten; sie benennt nur die Ausgabe und erzeugt keine PDF-Datei.
 */
function reportFilename(type,form){if(!form)throw new Error('Für den Dateinamen fehlen die fixierten Berichtsdaten.');return`KI-Risikobewertung-${type==='compact'?'Kurzbericht':'Nachweisbericht'}-${safeFilenamePart(form.internalToolId)}.pdf`;}
/**
 * Bildet den sichtbaren Fenstertitel aus Berichtsart und fixiertem Bewertungsgegenstand.
 * @param {'compact'|'evidence'} type Berichtsart.
 * @param {object} form Fixierte Formulardaten des Berichtssnapshots.
 * @param {object} reportReference Fixierte Referenzdaten desselben Berichtssnapshots.
 * @returns {string} Bereinigter Fenstertitel.
 * @description Die Funktion bereitet den Titel ausschließlich aus den übergebenen Snapshotdaten auf und ist nebenwirkungsfrei; das Setzen von `document.title` erfolgt ausschließlich beim Anzeigen oder Drucken.
 */
function reportBrowserTitle(type,form,reportReference){if(!form||!reportReference)throw new Error('Für den Fenstertitel fehlen die fixierten Berichtsdaten.');const{sanitize}=createReportTextHelpers(reportReference);return`${reportTypeLabel(type)} – ${sanitize(form.toolName||form.internalToolId||'KI-Risikobewertung')}`;}
/** Rendert den rein typografischen Kapitelkopf ohne Zugriff auf Live- oder Referenzdaten. */
function reportHeader(page,total,title,type='evidence'){return`<div class="report-header"><div><span class="report-mini-mark"><small>EU</small><strong>AI ACT</strong></span><strong>${reportTypeLabel(type)}</strong></div><span>${escapeHtml(title)} · Berichtskapitel ${page} von ${total}</span></div>`;}
/** Rendert die Kapitel-Fußzeile ausschließlich aus dem übergebenen Berichtsdatenstand. */
function reportFooter(reportData,page,total,type='evidence'){const form=reportData.form;return`<div class="report-footer"><span>${escapeHtml(reportTypeLabel(type))} · ${escapeHtml(form.assessmentId||'Bewertungs-ID offen')} · Version ${escapeHtml(form.assessmentVersion||'offen')} · Die physische Seitenzahl steht in der PDF-Druckfußzeile.</span><strong>Kapitel ${page} / ${total}</strong></div>`;}
/** Fügt Kopf, fixierten Inhalt und Fuß zu einem druckbaren Berichtskapitel zusammen. */
function reportPage(reportData,page,total,title,body,cls='',type='evidence'){const coverChapter=type==='compact'&&page===1?`<h2 class="report-page-title cover-chapter-title">${escapeHtml(title)}</h2>`:'',resolvedClass=`${cls}${type==='compact'&&page===9?' compact-status-page':''}`.trim();return`<section class="report-page ${resolvedClass}" data-report-type="${type}">${reportHeader(page,total,title,type)}${coverChapter}${body}${reportFooter(reportData,page,total,type)}</section>`;}
const reportPageWithData=reportPage;
function reportFact(label,value){return`<div><span>${escapeHtml(sanitizeVisibleText(label))}</span><strong>${escapeHtml(sanitizeVisibleText(value||'Nicht dokumentiert'))}</strong></div>`;}
function reportList(items,empty='Keine Angaben dokumentiert.'){return items.length?`<ul class="report-list">${items.map(item=>`<li>${escapeHtml(sanitizeVisibleText(item))}</li>`).join('')}</ul>`:`<p>${escapeHtml(sanitizeVisibleText(empty))}</p>`;}
function reportTable(headers,rows){return`<div class="report-table-wrap"><table class="report-table"><thead><tr>${headers.map(h=>`<th>${escapeHtml(sanitizeVisibleText(h))}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(sanitizeVisibleText(cell??''))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">Keine Einträge dokumentiert.</td></tr>`}</tbody></table></div>`;}

const FIELD_BY_GUIDE_ID=Object.freeze(Object.fromEntries(Object.entries(QUESTION_IDS).map(([field,id])=>[id,field])));
function deriveGuideReferenceStatusFromInteractiveState(item,operational,orgValue,context=null){
  const state=evaluationState(context),references=evaluationReferences(context),FIELD_BY_GUIDE_ID=references.fieldByGuideId,annexAreas=references.annexAreas;
  if(item.reserved)return'Reserviert';
  if(operational)return`${labelFor(operational.value)} · ${sanitizeVisibleText(operational.reason,context)}`;
  const id=item.id,field=FIELD_BY_GUIDE_ID[id],stored=field?state.form[field]:state.guideAnswers?.[id]?.value??orgValue,hasHistorical=isFilled(stored);
  let inactive='';
  const aiPath=aiActPathStatus(context),prohibition=evaluateProhibitedPractices(context),high=evaluateHighRiskSummary(context),gpaiPath=gpaiPathStatus(context),craGate=craApplicabilityGate(context),annexHit=annexAreas.some(([key])=>state.form[key]==='yes');
  if(/^ROLE-(0[1-9]|1[01])$/.test(id)&&!aiPath.required)inactive='nicht erforderlich';
  else if(/^ROLE-1[2-5]$/.test(id)&&high.code!=='high_risk')inactive='nicht erforderlich';
  else if(id.startsWith('ART5-')&&!aiPath.required)inactive='nicht erforderlich';
  else if(/^HR-(0[1-9]|1[0-3])$/.test(id)&&(!aiPath.required||prohibition.code==='confirmed'))inactive=prohibition.code==='confirmed'?'nicht fortgeführt':'nicht erforderlich';
  else if(/^HR-(1[4-9]|20)$/.test(id)&&(!aiPath.required||prohibition.code==='confirmed'||!annexHit))inactive=prohibition.code==='confirmed'?'nicht fortgeführt':'nicht erforderlich';
  else if(id.startsWith('TR-')&&(!aiPath.required||prohibition.code==='confirmed'))inactive=prohibition.code==='confirmed'?'nicht fortgeführt':'nicht erforderlich';
  else if(id.startsWith('GPAI-')&&!gpaiPath.required)inactive='nicht erforderlich';
  else if(/^CRA-(0[89]|1[0-2])$/.test(id)&&craGate.status==='no')inactive='nicht erforderlich';
  if(inactive)return hasHistorical?`Historisch vorhanden, derzeit inaktiv – ${inactive}`:inactive[0].toUpperCase()+inactive.slice(1);
  return hasHistorical?`Beantwortet – ${questionValueLabel(id,stored,context)}`:'Offen und erforderlich';
}

/**
 * Liest den bereits vor dem Rendern fixierten Dokumentationsstand einer Leitfaden-ID.
 * @param {object} item Referenzeintrag aus dem Berichtssnapshot.
 * @param {object} reportData Vollständiger Berichtsdatenstand.
 * @returns {string} Fixierter Dokumentationsstatus.
 * @description Nebenwirkungsfrei; ein unvollständiger Snapshot wird abgewiesen und niemals durch globale Referenzdaten ergänzt.
 */
function guideReferenceStatus(item,reportData){
  if(!reportData?.guideReferenceStatuses||!Object.prototype.hasOwnProperty.call(reportData.guideReferenceStatuses,item?.id))throw new Error(`Im Berichtsdatenstand fehlt der Leitfadenstatus für ${item?.id||'eine unbekannte Kennung'}.`);
  return reportData.guideReferenceStatuses[item.id];
}

/** Validiert die vollständig eingebetteten Referenzdaten eines Snapshots. */
function requireReportReference(reportData){
  const reportReference=reportData?.reference;
  if(!reportReference?.knowledgeBase||!Array.isArray(reportReference.guideReference)||!Array.isArray(reportReference.steps)||!Array.isArray(reportReference.orgAreas)||!reportReference.orgCriteria||!Array.isArray(reportReference.triggerDefs)||!reportReference.registerSchemas||!reportReference.regulatoryPathLabels||!reportReference.guideLabels)throw new Error('Der Berichtsdatenstand enthält keine vollständigen fixierten Referenzdaten.');
  return reportReference;
}

/**
 * Erstellt berichtsspezifische Text-, Fakten-, Listen- und Tabellenhelfer.
 * @param {object} reportReference Vollständige fixierte Referenzen des zu rendernden Berichtssnapshots.
 * @returns {{sanitize:function(*):string,fact:function(string,*):string,list:function(Array,string=):string,table:function(Array,Array):string}} Reine Ausgabehelfer, deren Beschriftungen an den Snapshot gebunden sind.
 * @description Datenquelle ist ausschließlich `reportReference`, einschließlich Feldbezeichnungen und Registerschemas. Die Funktion sowie alle zurückgegebenen Helfer sind nebenwirkungsfrei und lesen keine globalen Referenztabellen.
 */
function createReportTextHelpers(reportReference){
  const reportLabels=reportReference.guideLabels,fieldLabels=reportReference.fieldDisplayLabels,questionIds=reportReference.questionIds,schemas=reportReference.registerSchemas;
  const displayName=key=>{const value=String(key??'').trim();if(!value)return'Nicht bezeichnete Angabe';if(fieldLabels[value])return fieldLabels[value];const guideId=questionIds[value];if(guideId)return`${guideId} – ${reportLabels[guideId]||guideId}`;const registerLabel=Object.values(schemas).flatMap(schema=>schema.fields||[]).find(([field])=>field===value)?.[1];return registerLabel||value.replace(/([a-zäöüß])([A-ZÄÖÜ])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/^./,char=>char.toUpperCase());};
  const sanitize=value=>{let text=String(value??'');const technical={requiredHighRiskDuties:'Regulatorische Pflichtenableitung',evaluateDutyOperationalResult:'Bewertungslogik der Pflichten',reviewOperationalResult:'Bewertungslogik der Review-Ergebnisse',sourceQuestionId:fieldLabels.sourceQuestionId,linkedResult:fieldLabels.linkedResult,system_with_model:'KI-System unter Verwendung eines KI-Modells',matches:'Entspricht der Zweckbestimmung',substantial:'Wesentlich abweichend',automated:'Weitgehend automatisierte Entscheidung',limited:'Nur eingeschränkt möglich',integrating:'Integrierendes System'};Object.entries({...fieldLabels,...technical}).sort((a,b)=>b[0].length-a[0].length).forEach(([key,label])=>{text=text.replace(new RegExp(`\\b${key}\\b`,'g'),label);});['ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','ASSESSMENT_NOT_CONCLUDABLE','USE_NOT_CONTINUABLE','ASSESSMENT_COMPLETE','temporally_not_applicable','future_prohibition','future_confirmed','exception_confirmed','exception_review','not_continued','not_applicable','not_assessable','product_only','notFulfilled','inReview','not_met','possible','confirmed','provider','deployer','multiple','none'].forEach(code=>{text=text.replace(new RegExp(`\\b${code}\\b`,'g'),labelFor(code));});return text.replace(/\b[a-z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+\b/g,displayName);};
  const fact=(label,value)=>`<div><span>${escapeHtml(sanitize(label))}</span><strong>${escapeHtml(sanitize(value||'Nicht dokumentiert'))}</strong></div>`;
  const list=(items,empty='Keine Angaben dokumentiert.')=>items.length?`<ul class="report-list">${items.map(item=>`<li>${escapeHtml(sanitize(item))}</li>`).join('')}</ul>`:`<p>${escapeHtml(sanitize(empty))}</p>`;
  const table=(headers,rows)=>`<div class="report-table-wrap"><table class="report-table"><thead><tr>${headers.map(header=>`<th>${escapeHtml(sanitize(header))}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(sanitize(cell??''))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">Keine Einträge dokumentiert.</td></tr>`}</tbody></table></div>`;
  return{sanitize,fact,list,table};
}

/**
 * Baut die gemeinsamen Kapitel 1 bis 12 ausschließlich aus dem übergebenen Berichtsdatenstand.
 * @param {object} reportData Rekursiv eingefrorener, vollständig referenzierter Berichtssnapshot.
 * @returns {string} HTML-Grundgerüst des vollständigen Nachweisberichts.
 * @description Datenquelle ist allein `reportData`; fehlende Referenzdaten werden abgewiesen. Die Funktion ist nebenwirkungsfrei und trifft keine neue fachliche Bewertung.
 */
function buildReportBase(reportData){
  if(!reportData?.snapshotState)throw new Error('Für den Nachweisbericht fehlt ein gültiger Berichtsdatenstand.');
  const reportReference=requireReportReference(reportData),reportKnowledgeBase=reportReference.knowledgeBase,reportLabels=reportData.labels,reportText=createReportTextHelpers(reportReference),sanitizeVisibleText=reportText.sanitize,reportFact=reportText.fact,reportList=reportText.list,reportTable=reportText.table,reportState=reportData.snapshotState,total=15,f=reportData.form,decision=reportData.decision,reg=reportData.regulatoryLabels,evals=reportData.regulatory,dutyResults=reportData.duties,reviewResults=reportData.reviews;
  const reportPage=(...args)=>reportPageWithData(reportData,...args),questionIdFor=key=>reportReference.questionIds[key]||'',prohibitedQuestions=reportReference.prohibitedQuestions,stepStatus=index=>reportData.stepStatuses[index],stepSubstantiveResult=index=>reportData.stepResults[index],aiSystemResult=()=>reportData.definition.label,scopeResult=()=>reportData.scope.label,evaluateScope=()=>reportData.scope,roleLabels=()=>reportData.roles,allRegulatoryEvaluations=()=>reportData.regulatory,activeRegisterItems=type=>reportData.registers[type],renderMatrix=()=>renderReportMatrix(reportState.risks,reportKnowledgeBase.matrix),evaluateReview10=()=>reportData.review10,regulatoryOrgCriterionContext=id=>reportData.orgRegulatoryContexts[id],organizationalOverall=()=>reportData.organizationalOverall,requiredHighRiskDuties=()=>reportData.highRiskDuties,approvalConsistency=()=>reportData.approvalConsistency;
  const decisionReasons=decision.reasons.map(r=>`${r.source}: ${r.text}`);
  const questionRows=reportReference.guideReference.map(item=>[item.id,`Prüfschritt ${item.step}`,item.label,guideReferenceStatus(item,reportData)]);
  const stepRows=reportReference.steps.map((step,index)=>[`${index+1}`,step[0],stepStatus(index)==='neutral'?'Nicht bewertet':({red:'Pflichtangaben fehlen',yellow:'Pflichtangaben vollständig; optionale Angaben offen',green:'Ausreichend ausgefüllt'}[stepStatus(index)]),stepSubstantiveResult(index)]);
  const riskSummaryRows=reportState.risks.map(r=>[r.riskId,r.description,r.category,`${riskScore(r)??'–'} · ${labelFor(effectiveCurrentRisk(r))}`,labelFor(r.acceptance),r.owner]);
  const riskTreatmentRows=reportState.risks.map(r=>[r.riskId,labelFor(r.suitableTreatmentAvailability),labelFor(r.treatmentStatus),labelFor(r.expectedResidual),r.treatmentStatus==='verified'?labelFor(r.verifiedResidual):'Noch nicht verifiziert',r.decisionCriticality==='yes'?'Ja':'Nein',r.treatmentStatus==='verified'?[r.proposedTreatment,r.effectivenessEvidence].filter(isFilled).join(' · Wirksamkeitsnachweis: ')||'Nicht dokumentiert':r.proposedTreatment||'Nicht dokumentiert']);
  const orgRows=reportReference.orgAreas.map(([id,label])=>{const item=reportState.org[id]||{};return[label,orgStatusLabel(item.status),item.finding,item.gap,item.measure,item.owner,labelFor(item.decisionCritical)];});
  const triggerRows=reportReference.triggerDefs.map(([id,title],index)=>{const t=reportState.triggers[index];return[title,labelFor(t.required),t.steps,t.owner,t.due?fmtDate(t.due):''];});
  const legalTimeRows=[
    ['Art. 4 – KI-Kompetenz',reportKnowledgeBase.verifiedDates.aiLiteracy,'Eigenständiger Pflichtpfad'],
    ['Art. 5 – allgemeine Verbote',reportKnowledgeBase.verifiedDates.article5General,'Grundsätzlich seit 2. Februar 2025'],
    ['Art. 5 Abs. 1 Buchst. ba und bb',reportKnowledgeBase.verifiedDates.article5New,'Seit 2. Dezember 2026'],
    ['Art. 50',reportKnowledgeBase.verifiedDates.transparency,'Art. 111 Abs. 4 für bestimmte Alt-Systeme nach Art. 50 Abs. 2 gesondert: 2. Dezember 2026'],
    ['GPAI',reportKnowledgeBase.verifiedDates.gpai,'Vor dem 2. August 2025 in Verkehr gebrachte Modelle gesondert: 2. August 2027'],
    ['Art. 6 Abs. 2 / Anhang III – Kapitel III Abschnitte 1 bis 3',reportKnowledgeBase.verifiedDates.highRiskAnnexIII,'2. Dezember 2027'],
    ['Art. 6 Abs. 1 / Anhang I – Kapitel III Abschnitte 1 bis 3',reportKnowledgeBase.verifiedDates.highRiskAnnexI,'2. August 2028'],
    ['Kapitel III Abschnitt 5 / Art. 40 bis 49',reportKnowledgeBase.verifiedDates.aiActGeneral,'Nicht automatisch dem verschobenen Hochrisikopfad zugeordnet'],
    ['Besonderer Übergangsfall für bestimmte bestehende Hochrisiko-Systeme öffentlicher Stellen',reportKnowledgeBase.verifiedDates.publicExistingHighRisk,'2. August 2030 ist kein allgemeiner Geltungsbeginn'],
    ['CRA-Meldepflichten',reportKnowledgeBase.verifiedDates.craReporting,'11. September 2026'],
    ['Allgemeine CRA-Pflichten',reportKnowledgeBase.verifiedDates.craGeneral,'11. Dezember 2027; Altprodukte nur nach Maßgabe der wesentlichen Änderung']
  ];
  const craDependencyLabels={product_applicability:'Produktanwendbarkeit',organizational_role:'Organisationsrolle',individual_duty:'Einzelne Pflicht',temporal_applicability:'Zeitliche Anwendbarkeit',operational_condition:'Bedingung für Pilot- oder Regelbetrieb',review:'Zuordnung noch zu bestätigen'};
  const craDependencyRows=Object.entries(reportData.craDependencies||{}).map(([area,items])=>[craDependencyLabels[area]||area,items.map(item=>item.id).join(', ')||'Keine offenen Einträge',items.map(item=>item.craDependencyReason||item.question||item.reason||'').filter(isFilled).join(' · ')||'–']);
  const report=[];
  report.push(reportPage(1,total,'Bewertungsstatus',`<div class="report-cover"><span>Nachvollziehbare Erstbewertung</span><h2>${escapeHtml(f.toolName||'Bewertungsgegenstand noch nicht bezeichnet')}</h2><p>EU AI Act · ergänzende CRA-Prüfung · technische und organisatorische Bewertung</p></div><div class="report-decision ${decision.tone}"><span>Regelbasiert abgeleiteter fachlicher Bewertungsstatus</span><h2>${escapeHtml(decision.label)}</h2></div><div class="report-facts">${reportStatusFacts(reportData.completion,reportFact)}</div><div class="validation-alert"><strong>Wichtiger Hinweis</strong><p>Der fachliche Bewertungsstatus, der Bearbeitungsstand, der Dokumentationsstatus und die gesonderte menschliche Entscheidung sind unterschiedliche Ebenen. Keine davon ersetzt eine fachliche, juristische oder organisatorische Genehmigung.</p></div><div class="report-facts">${reportFact('Bewertungs-ID',f.assessmentId)}${reportFact('Interne Tool-Kennung',f.internalToolId)}${reportFact('Bewertungsversion',f.assessmentVersion)}${reportFact('Leitfadenversion',f.guideVersion)}${reportFact('Prototypversion',reportKnowledgeBase.prototypeVersion)}${reportFact('Datenmodellversion',reportKnowledgeBase.dataModelVersion)}${reportFact('Regelwerksversion',reportKnowledgeBase.ruleSetVersion)}${reportFact('Methodikversion',reportKnowledgeBase.methodologyVersion)}${reportFact('Bewertungsstichtag',fmtDate(f.assessmentDate))}${reportFact('Letzte inhaltliche Aktualisierung',fmtDate(f.assessmentUpdate))}${reportFact('Erläuterung der Aktualisierung',f.assessmentUpdateReason||'Keine abweichende Aktualisierung dokumentiert')}${reportFact('Geprüfter Rechtsstand',reportKnowledgeBase.legalStatus)}${reportFact('Bericht erzeugt am',fmtDate(reportData.generatedAt))}${reportFact('Vollständige Quellenprüfung',fmtDate(reportKnowledgeBase.fullSourceReview))}${reportFact('Letzte Aktualitätsprüfung',fmtDate(reportKnowledgeBase.lastCurrentnessReview))}${reportFact('Menschliche / organisatorische Entscheidung',labelFor(f.approvalStatus))}${reportFact('Entscheidungsdatum',fmtDate(f.approvalDate))}</div><div class="report-section"><h3>Zeitlicher Kontext</h3><p>${escapeHtml(reportData.temporalContext)}</p></div><div class="report-section"><h3>Quellen und Rechtsgrundlagen</h3>${reportList(reportKnowledgeBase.sources)}</div><div class="report-section"><h3>Regelbasiert abgeleitete Gründe</h3>${reportList(decisionReasons)}</div>`,'cover-page'));
  report.push(reportPage(2,total,'Prüfstatus und Nachvollziehbarkeit',`<h2 class="report-page-title">Acht Prüfschritte im Überblick</h2><p class="report-lead">Bearbeitungsstand, fachliches Ergebnis und menschliche Entscheidung bleiben getrennt. Eine grüne Vollständigkeitsanzeige ist keine Genehmigung.</p>${reportTable(['Nr.','Prüfschritt','Bearbeitungsstand','Fachliches Ergebnis'],stepRows)}<div class="report-section guide-reference-report"><h3>Vollständige Leitfadenreferenz</h3><p>Die reservierten Kennungen RISK-07 bis RISK-09 werden nicht als Fragen oder Datenfelder verwendet.</p>${reportTable(['ID','Prüfschritt','Wortlaut','Dokumentationsstand'],questionRows)}</div><div class="report-section"><h3>Offene Punkte und Hindernisse</h3><div class="report-facts">${reportFact('Bedingungen',f.conditions)}${reportFact('Hindernisse',f.blockers)}${reportFact('Offene Anforderungen',f.openRequirements)}${reportFact('Offene Maßnahmen',f.openMeasures)}</div></div>`));
  report.push(reportPage(3,total,'Toolprofil',`<h2 class="report-page-title">Toolprofil und Informationsstand</h2><div class="report-facts">${reportFact('Interne Tool-Kennung',f.internalToolId)}${reportFact('Bezeichnung',f.toolName)}${reportFact('Anbieter',f.provider)}${reportFact('Version',f.version)}${reportFact('Organisationseinheit',f.department)}${reportFact('Verantwortlich',f.owner)}${reportFact('Informationsstand',labelFor(f.infoStatus))}</div><div class="report-section"><h3>Zweck und Systemgrenze</h3><p><strong>Zweck:</strong> ${escapeHtml(f.purpose||'Nicht dokumentiert')}</p><p><strong>Aufgaben:</strong> ${escapeHtml(f.tasks||'Nicht dokumentiert')}</p><p><strong>Systemgrenze:</strong> ${escapeHtml(f.systemBoundary||'Nicht dokumentiert')}</p></div><div class="report-section"><h3>Daten, Ausgaben und Technik</h3><p><strong>Eingaben:</strong> ${escapeHtml(f.inputs||'Nicht dokumentiert')}</p><p><strong>Datenquellen:</strong> ${escapeHtml(f.dataSources||'Nicht dokumentiert')}</p><p><strong>Ausgaben:</strong> ${escapeHtml(f.outputsDescription||'Nicht dokumentiert')}</p><p><strong>Komponenten:</strong> ${escapeHtml(f.techComponents||'Nicht dokumentiert')}</p><p><strong>Schnittstellen:</strong> ${escapeHtml(f.interfaces||'Nicht dokumentiert')}</p></div><div class="report-section"><h3>Offener Informationsbedarf</h3><p>${escapeHtml(f.missingInfo||'Kein offener Informationsbedarf dokumentiert.')}</p><p><strong>Auswirkung:</strong> ${escapeHtml(f.missingImpact||'–')} · <strong>Verantwortlich:</strong> ${escapeHtml(f.infoRequestOwner||'–')}</p></div>`));
  report.push(reportPage(4,total,'KI-System, Anwendungsbereich und Rolle',`<h2 class="report-page-title">Definitions-, Anwendungs- und Rollenprofil</h2><div class="report-decision"><span>KI-System-Definition nach Art. 3 Nr. 1</span><h2>${escapeHtml(aiSystemResult())}</h2><p>${escapeHtml(f.definitionBasis||'Begründung fehlt.')}</p></div><div class="report-decision ${evaluateScope().code==='review'?'warning':''}"><span>Anwendungsbereich nach Art. 2</span><h2>${escapeHtml(scopeResult())}</h2><p>${escapeHtml(f.scopeBasis||'Begründung fehlt.')}</p></div><div class="report-section"><h3>Einsatzkontext und Akteursrolle</h3><div class="report-facts">${reportFact('Vorgesehene Nutzung',f.intendedUse)}${reportFact('Tatsächliche Nutzung',f.actualUse)}${reportFact('Ort / Bereich',`${f.useLocation||'–'} · ${f.businessArea||'–'}`)}${reportFact('Prozess',f.process)}${reportFact('Betroffene',f.affected)}</div>${reportList(roleLabels(),'Keine Rolle bestimmt.')}<p><strong>Art.-25-Ergebnis:</strong> ${escapeHtml(allRegulatoryEvaluations().art25.label)} · ${escapeHtml(f.art25Basis||allRegulatoryEvaluations().art25.reason||'Keine zusätzliche Begründung erforderlich.')}</p></div>`));
  report.push(reportPage(5,total,'Regulatorische Einordnung',`<h2 class="report-page-title">Regulatorisches Einordnungsprofil</h2><div class="report-facts">${reportFact('Behörden- oder öffentliche Stelle im Nutzungskontext',f.publicServiceEntity==='yes'||f.unionAuthority==='yes'?'Ja':'Nein')}${reportFact('Zur Verwendung durch eine Behörde oder öffentliche Stelle bestimmt',labelFor(f.publicAuthorityIntendedUse))}${reportFact('Erstmalige Inbetriebnahme',fmtDate(f.firstOperationDate))}${reportFact('Erstmaliges Inverkehrbringen',fmtDate(f.firstMarketDate))}${reportFact('Zeitlicher Nachweis',f.timeEvidence)}</div>${reportTable(['Prüfpfad','Ergebnis','Begründung / Nachweis'],[
    ['Verbotene KI-Praktiken Art. 5',reg.prohibition,`${f.prohibitionBasis||evals.prohibition.reason||''} ${f.prohibitionEvidence||''}`],['Hochrisiko Art. 6 Abs. 1',reg.productHighRisk,`${f.productHighRiskBasis||evals.productHighRisk.reason||''} ${f.productHighRiskEvidence||''}`],['Hochrisiko Art. 6 Abs. 2',reg.annexHighRisk,`${f.annexBasis||evals.annexHighRisk.reason||''} ${f.annexEvidence||''}`],['Anbieterpflichten Art. 25',reg.art25,f.art25Basis||evals.art25.reason||'Nicht eindeutig beurteilbar'],['Transparenz Art. 50',reg.transparency,`${f.transparencyBasis||evals.transparency.reason||''} ${f.transparencyEvidence||''}`],['GPAI – eigenständiger Pfad',reg.gpai,`${f.gpaiBasis||evals.gpai.reason||''} ${f.gpaiEvidence||''}`],['Cyber Resilience Act – eigenständiger Pfad',reg.cra,`${f.craBasis||evals.cra.reason||''} ${f.craEvidence||''}`]
  ])}<div class="report-section"><h3>Normspezifische Stichtage des Leitfadens</h3>${reportTable(['Pflichtpfad','Allgemeiner Stichtag','Einordnung'],legalTimeRows.map(([path,date,note])=>[path,fmtDate(date),note]))}</div><div class="report-section"><h3>Zeitliche Anwendbarkeit aktiver Pflichten</h3>${reportTable(['ID','Rechtsgrundlage','Zeitstatus','Bewertungsstichtag','Anwendbar ab','Teilpfade','Begründung'],activeRegisterItems('regulatory').map(item=>[item.id,item.basis,labelFor(item.applicability),item.assessmentDate?fmtDate(item.assessmentDate):fmtDate(f.assessmentDate),item.applicableDate?fmtDate(item.applicableDate):'Kein belegter Stichtag',[...(item.temporalPaths||[]).map(path=>`${path.path||'Zeitpfad'}: ${path.applicableDate?fmtDate(path.applicableDate):labelFor(path.applicability)}`),...(item.registrationTemporal?[`Registrierung nach Art. 49: ${item.registrationTemporal.applicableDate?fmtDate(item.registrationTemporal.applicableDate):labelFor(item.registrationTemporal.applicability)}`]:[])].join(' · ')||'Ein Zeitpfad',item.applicabilityReason||'Begründung fehlt']))}</div>`));
  report.push(reportPage(6,total,'Risikoprofil',`<h2 class="report-page-title">Risikoregister und Bewertungsstufen</h2><p class="report-lead">Das aus Eintrittswahrscheinlichkeit und Auswirkung berechnete aktuelle Risiko ist das technische Bewertungsergebnis. Erwartetes und verifiziertes Restrisiko sowie die Eignung einer Behandlung werden getrennt dokumentiert und nicht zu einem Gesamtscore verrechnet. Ein Wirksamkeitskriterium ist ein Sollkriterium; ein eingetragener Nachweisverweis bestätigt keine automatische inhaltliche Prüfung.</p>${renderMatrix()}<div class="report-section"><h3>Aktuelles Risikoprofil</h3>${reportTable(['ID','Risiko','Kategorie','Aktuelles Ergebnis R = E × A','Akzeptanzentscheidung','Verantwortlich'],riskSummaryRows)}</div><div class="report-section"><h3>Behandlung und Restrisiko</h3>${reportTable(['ID','Behandlung bestimmbar','Behandlungsstatus','Erwartetes Restrisiko','Verifiziertes Restrisiko','Entscheidungskritisch','Maßnahme oder Nachweisverweis'],riskTreatmentRows)}</div><div class="report-section"><h3>REVIEW-10 – Behandlungsmöglichkeit außerhalb der Toleranz</h3><p><strong>${escapeHtml(labelFor(evaluateReview10().value))}:</strong> ${escapeHtml(evaluateReview10().reason)}</p></div><div class="report-section"><h3>Entscheidungskritische Risiken</h3>${reportList(reportState.risks.filter(r=>r.decisionCriticality==='yes').map(r=>`${r.riskId}: ${r.description} – ${labelFor(effectiveCurrentRisk(r))}`),'Keine entscheidungskritischen Risiken dokumentiert.')}</div>`));
  const orgCriterionRows=reportReference.orgAreas.flatMap(([areaId,areaLabel])=>(reportReference.orgCriteria[areaId]||[]).map(([key,label,,guideId])=>{const regulatory=regulatoryOrgCriterionContext(guideId),status=regulatory.defined&&!regulatory.relevant?'Nicht einschlägig':orgStatusLabel(reportState.org[areaId]?.criteria?.[key]?.answer),derivation=regulatory.relevant?`${regulatory.rule.dutyCode} · ${regulatory.rule.basis} · ${regulatory.rule.reason}`:regulatory.defined?'Verknüpfte Pflicht im aktuellen Pfad nicht relevant; neutrale Behandlung.':'Keine unmittelbare regulatorische Pflichtverknüpfung.';return[guideId,areaLabel,label,status,derivation,reportState.org[areaId]?.criteria?.[key]?.reason||''];}));
  report.push(reportPage(7,total,'Organisation',`<h2 class="report-page-title">Organisatorisches Bewertungsprofil</h2><div class="report-decision ${organizationalOverall().includes('unzureichend')?'danger':'warning'}"><span>Organisatorischer Gesamtstatus</span><h2>${escapeHtml(organizationalOverall())}</h2></div>${reportTable(['Bereich','Status','Feststellung','Lücke','Maßnahme','Verantwortung','entscheidungskritisch'],orgRows)}<div class="report-section"><h3>Einzelkriterien ORG-01 bis ORG-36</h3>${reportTable(['ID','Bereich','Kriterium','Status','Regulatorische Relevanz / Herleitung','Begründung / Auswirkung'],orgCriterionRows)}</div>`));
  const registerRow=(schema,item)=>[schema.title,item.id,item.sourceQuestionId||item.sourceId||'',item.basis||item.legalBasis||'',item.requirement||item.measure||item.question||'',item.linkedResult||'',item.owner,item.due?fmtDate(item.due):'',item.applicability==='not_applicable'?'Nicht einschlägig':labelFor(item.status),`${item.dutyCode?`Erfüllbarkeit: ${item.applicability==='not_applicable'?'Nicht einschlägig':labelFor(item.fulfillability)} – ${item.fulfillabilityReason||''} | `:''}Blockierungswirkung: ${labelFor(item.blocking)}${item.blockingReason?` – ${item.blockingReason}`:''}${item.syncConflictEvidence?` | Synchronisierungskonflikt: ${item.syncConflictEvidence}${item.conflictResolutionStatus==='resolved'?` | Geklärt: ${item.conflictResolutionReason||'Begründung fehlt'}`:''}`:''}`,item.evidence||item.result||''];
  const registerRows=[],historicalRegisterRows=[];Object.entries(reportReference.registerSchemas).forEach(([type,schema])=>reportState.registers[type].forEach(item=>(isActiveRegisterItem(item)?registerRows:historicalRegisterRows).push(registerRow(schema,item))));
  const registerSummaryRows=registerRows.map(row=>[row[0],row[1],row[4],row[6],row[7],row[8]]);
  const registerDetailRows=registerRows.map(row=>[row[1],row[2],row[3],row[5],row[9],row[10]]);
  const historicalSummaryRows=historicalRegisterRows.map(row=>[row[0],row[1],row[4],row[6],row[7],row[8]]);
  const historicalDetailRows=historicalRegisterRows.map(row=>[row[1],row[2],row[3],row[5],row[9],row[10]]);
  report.push(reportPage(8,total,'Anforderungen und Maßnahmen',`<h2 class="report-page-title">Konsolidierter Anforderungs- und Maßnahmenplan</h2><p class="report-lead">Nur aktive Einträge fließen in Vollständigkeit, Status und die fallbezogene Blockierungsprüfung ein. Anwendbarkeit, Erfüllbarkeit, Umsetzungsstatus und Nachweisverweis sind getrennte Angaben. Ein Nachweisverweis wird nicht automatisch inhaltlich geprüft.</p><div class="report-section"><h3>Aktive Einträge – Übersicht</h3>${reportTable(['Register','ID','Beschreibung','Verantwortlich','Frist','Status'],registerSummaryRows)}</div><div class="report-section"><h3>Aktive Einträge – Herleitung, Wirkung und Nachweise</h3>${reportTable(['ID','Herkunft','Grundlage','Verknüpftes Ergebnis','Erfüllbarkeit / Blockierungswirkung','Nachweisverweis (inhaltlich nicht automatisch geprüft)'],registerDetailRows)}</div><div class="report-section"><h3>Historische beziehungsweise nicht mehr aktive Einträge</h3><p>Diese Einträge werden ausschließlich zur Nachvollziehbarkeit ausgewiesen und beeinflussen den aktuellen Bewertungsstatus nicht.</p><h4>Historische Übersicht</h4>${reportTable(['Register','ID','Beschreibung','Verantwortlich','Frist','historischer Status'],historicalSummaryRows)}<h4>Historische Herleitung und Nachweise</h4>${reportTable(['ID','Herkunft','Grundlage','Verknüpftes Ergebnis','frühere Erfüllbarkeit / Blockierungswirkung','Nachweisverweis'],historicalDetailRows)}</div><div class="report-section"><h3>Strukturierte Prüfung DUTY-47</h3><p><strong>${escapeHtml(labelFor(f.legalRegimeFulfilment))}:</strong> ${escapeHtml(sanitizeVisibleText(f.legalRegimeFulfilmentEvidence||'Begründung und Nachweis fehlen.'))}</p></div><div class="report-section"><h3>Operationalisierte Pflichten DUTY-01 bis DUTY-47</h3>${reportTable(['ID','Ergebnis','Begründung','Eingaben und Quellen','Fachliche Herleitung'],dutyResults.map(item=>[item.id,labelFor(item.value),item.reason,item.sources.join(' · '),operationalPathLabel(item.id)]))}</div><div class="report-section"><h3>Koordination und Querverweise</h3><p><strong>Koordination:</strong> ${escapeHtml(sanitizeVisibleText(f.planCoordinator||'Nicht dokumentiert'))}</p><p>${escapeHtml(sanitizeVisibleText(f.crossReferences||'Keine Querverweise dokumentiert.'))}</p></div>`));
  report.push(reportPage(9,total,'Zusammenführung und Neubewertung',`<h2 class="report-page-title">Operationalisierte Review-Ergebnisse REVIEW-01 bis REVIEW-42</h2>${reportTable(['ID','Ergebnis','Begründung','Eingaben und Quellen','Fachliche Herleitung'],reviewResults.map(item=>[item.id,labelFor(item.value),item.reason,item.sources.join(' · '),operationalPathLabel(item.id)]))}<div class="report-section"><h3>Review- und Neubewertungsplan</h3><div class="report-facts">${reportFact('Nächster Review',fmtDate(f.nextReviewDate))}${reportFact('Reviewfrequenz',f.reviewFrequency)}${reportFact('Reviewnachweis',f.reviewEvidence)}${reportFact('Offene Prüfbedarfe',f.openReviews)}</div>${reportTable(['ID','Auslöser','Pflicht','Betroffene Schritte','Verantwortlich','Frist'],reportReference.triggerDefs.map(([id,title],index)=>{const t=reportState.triggers[index];return[id,title,labelFor(t.required),t.steps,t.owner,t.due?fmtDate(t.due):''];}))}</div>`));
  report.push(reportPage(10,total,'Dokumentation und Entscheidung',`<h2 class="report-page-title">Bewertungsakte und gesonderte Entscheidung</h2><div class="report-section"><h3>Identifikation der Bewertungsakte</h3><div class="report-facts">${reportFact('Bewertungs-ID',f.assessmentId)}${reportFact('Interne Tool-Kennung',f.internalToolId)}${reportFact('Tool / System',f.toolName)}${reportFact('Anbieter',f.provider)}${reportFact('Produktstand',f.version)}${reportFact('Bewertungsstichtag',fmtDate(f.assessmentDate))}${reportFact('Letzte inhaltliche Aktualisierung',fmtDate(f.assessmentUpdate))}${reportFact('Erläuterung der Aktualisierung',f.assessmentUpdateReason||'Keine abweichende Aktualisierung dokumentiert')}${reportFact('Entscheidungsdatum',fmtDate(f.approvalDate))}${reportFact('Geprüfter Rechtsstand',reportKnowledgeBase.legalStatus)}</div></div><div class="report-section"><h3>Zusammenfassende Begründung</h3><p>${escapeHtml(f.overallReasoning||'Nicht dokumentiert')}</p></div><div class="report-section"><h3>Änderungshistorie</h3><p>${escapeHtml(f.changeHistory||'Nicht dokumentiert')}</p></div><div class="report-section"><h3>Dokumentation</h3><div class="report-facts">${reportFact('Verantwortlich',f.documentationOwner)}${reportFact('Ablageort',f.documentLocation)}${reportFact('Verteilung',f.distribution)}${reportFact('Bewertungsversion',f.assessmentVersion)}${reportFact('Leitfadenversion',f.guideVersion)}${reportFact('Regelwerksversion',reportKnowledgeBase.ruleSetVersion)}${reportFact('Datenmodellversion',reportKnowledgeBase.dataModelVersion)}${reportFact('Prototypversion',reportKnowledgeBase.prototypeVersion)}</div></div><div class="report-section"><h3>Entscheidungsrelevante Nachweise und Rechtsquellen</h3><p>Die Fundstellen sind dokumentierte Nachweisverweise; ihre Inhalte werden durch den Prototyp nicht automatisch geprüft.</p><div class="report-facts">${reportFact('Nachweisverzeichnis',f.evidenceInventory)}${reportFact('Version',f.evidenceInventoryVersion)}${reportFact('Stand',fmtDate(f.evidenceInventoryDate))}${reportFact('Fundstelle',f.evidenceInventoryLocation)}${reportFact('Rechtsquellen und Fundstellen',f.legalSources)}</div></div><div class="report-section"><h3>Gesonderte menschliche beziehungsweise organisatorische Entscheidung</h3><p>Diese Entscheidung verändert den regelbasierten Bewertungsstatus nicht.</p><div class="report-facts">${reportFact('Prüfer/in',f.reviewer)}${reportFact('Entscheidende Stelle',f.approver)}${reportFact('Status',labelFor(f.approvalStatus))}${reportFact('Datum',fmtDate(f.approvalDate))}</div>${reportList(approvalConsistency(decision).warnings,'Keine Abweichung zum regelbasierten Status dokumentiert.')}</div><div class="signature-grid"><div><span>Prüfung / Datum</span></div><div><span>Entscheidung / Datum</span></div></div><div class="report-section"><h3>Zusätzliche Hinweise</h3><p>${escapeHtml(f.additionalNotes||'Keine weiteren Hinweise.')}</p></div>`));
  const art5Labels={not_applicable:'Nicht einschlägig',not_met:'Tatbestand nicht festgestellt',temporally_not_applicable:'Inhaltlich festgestellt, am Stichtag noch nicht anwendbar',future_confirmed:'Inhaltlich festgestellt, künftig anwendbar',confirmed:'Festgestelltes Hindernis',exception_confirmed:'Ausnahme oder Rechtfertigung nachgewiesen',review:'Weiterer Prüfbedarf',possible:'Weiterer Prüfbedarf'};
  const art5Items=evals.prohibition.items||[];
  report.push(reportPage(11,total,'Vertiefung Artikel 5',`<h2 class="report-page-title">Getrennte Prüfung verbotener Praktiken</h2><p class="report-lead">Inhaltlicher Tatbestand und zeitliche Wirksamkeit werden getrennt ausgewiesen. Anbieter- und Betreiberkonstellation, vorgesehener Zweck, technische Schutzmaßnahmen, Einwilligung oder Rechtfertigung bleiben nachvollziehbar.</p><div class="report-section"><h3>Inhaltliche Tatbestandsprüfung</h3>${reportTable(['ID','Tatbestand','Inhaltliches Ergebnis','Zuständige Prüfstelle','Nachweis'],art5Items.map(item=>[questionIdFor(item.key),item.label,art5Labels[item.code]||item.code,f[`${item.key}LegalOwner`]||'',f[`${item.key}Evidence`]||'']))}</div><div class="report-section"><h3>Zeitliche Wirksamkeit</h3>${reportTable(['ID','Zeitstatus','Wirksam ab','Zeitbegründung'],art5Items.map(item=>[questionIdFor(item.key),item.temporal?labelFor(item.temporal.applicability):'Allgemeiner Art.-5-Pfad',item.temporal?.applicableDate?fmtDate(item.temporal.applicableDate):'',item.temporal?.applicabilityReason||'']))}</div><div class="report-section"><h3>Besonders ausdifferenzierte Tatbestände</h3>${reportTable(['ID','Tatbestand','Anbieterbereitstellung','Betreiberverwendung','Vorgesehener Zweck','Schutzmaßnahmen','Einwilligung / Rechtfertigung'],['pNonConsensualIntimate','pCsam'].map(key=>[questionIdFor(key),prohibitedQuestions.find(([candidate])=>candidate===key)?.[1]||key,labelFor(f[`${key}ProviderProvision`]),labelFor(f[`${key}OperatorUse`]),labelFor(f[`${key}IntendedPurpose`]),labelFor(f[`${key}Safeguards`]),labelFor(f[key==='pNonConsensualIntimate'?`${key}Consent`:`${key}LegalJustification`])]))}</div>`));
  report.push(reportPage(12,total,'Akteursbezogene Pflichten',`<h2 class="report-page-title">Akteursrollen und abgeleitete Pflichten</h2><p class="report-lead">Pflichten werden nur aus dokumentierten Rollen und den jeweiligen gesetzlichen Voraussetzungen abgeleitet.</p>${reportTable(['Pflicht','Rolle','Rechtsgrundlage','Inhalt'],requiredHighRiskDuties().map(item=>[item.code,item.role,item.basis,item.code==='DUTY-15'?`${item.label} · Anbieter-/Zuliefererzuordnung: ${item.supplierRelationship||'nicht dokumentiert'} · Nachweis: ${item.supplierEvidence||'nicht dokumentiert'}`:item.label]))}<div class="report-section"><h3>Transparenzpflichten nach Art. 50</h3>${reportTable(['ID','Tatbestand','Gesetzliche Rolle','Regelbasierte Auswertung','Manuelles Ergebnis'],(evals.transparency.items||[]).map(item=>[questionIdFor(item.key),item.label,item.actor==='provider'?'Anbieter':item.actor==='deployer'?'Betreiber':'–',item.code==='applicable'?'Pflicht anwendbar':item.code==='exception'?'Ausnahme dokumentiert':item.code==='not_applicable'?'Nicht anwendbar':'Weiterer Prüfbedarf',labelFor(f[`${item.key}Result`])]))}</div><div class="report-section"><h3>Cyber Resilience Act</h3><div class="report-facts">${reportFact('Produktanwendbarkeit',evals.cra.productApplicable?'Ja':evals.cra.code==='no'?'Nein':'Nicht abschließend')}${reportFact('Eigene Pflichten der Organisation',evals.cra.ownObligations?'Ja':'Keine festgestellt')}${reportFact('Bestätigte Rolle(n)',(evals.cra.roles||[]).join(', ')||'Keine Wirtschaftsakteursrolle festgestellt')}${reportFact('Ungeklärte mögliche Rolle(n)',(evals.cra.possibleRoles||[]).join(', ')||'Keine')}</div><h4>Strukturierte offene CRA-Abhängigkeiten</h4>${reportTable(['Teilentscheidung','Offene Kennungen','Zuordnungsgrund'],craDependencyRows)}</div>`));
  return `<div class="report-area evidence-report"><div class="report-toolbar"><div><strong>Vollständiger Nachweisbericht</strong><span>15 Kapitel · vollständige Herleitung, Register, Nachweise und Historie</span></div><div><button type="button" class="secondary-button" id="hideReportButton">Bericht ausblenden</button><button type="button" class="primary-button" id="printButton">Vollständigen Nachweisbericht als PDF speichern</button></div></div>${report.join('')}</div>`;
}

/**
 * Friert einen vollständigen Berichtsdatenstand rekursiv ein.
 * @param {*} value Zu sperrender Snapshotbestandteil.
 * @returns {*} Dieselbe, bis in Unterobjekte eingefrorene Struktur.
 * @description Die Funktion verändert ausschließlich den bereits privaten Snapshot durch Objektsperren; sie liest keine Live-Daten und erzeugt keine Kopie.
 */
function freezeReportSnapshot(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.values(value).forEach(freezeReportSnapshot);return Object.freeze(value);
}

/**
 * Sortiert Objektschlüssel rekursiv; fachlich relevante Arrayreihenfolgen bleiben erhalten.
 * @param {*} value Beliebiger Bestandteil der Signaturgrundlage.
 * @returns {*} Kanonisch geordnete Kopie ohne Funktionen und undefinierte Werte.
 * @description Die reine Funktion liest keine globalen Daten und verändert die Eingabe nicht; sie sortiert keine Arrays um.
 */
function stableReportValue(value){
  if(Array.isArray(value))return value.map(stableReportValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined&&typeof value[key]!=='function').map(key=>[key,stableReportValue(value[key])]));
  return value;
}

/**
 * Liefert eine plattformunabhängige, stabile Serialisierung für die Berichtssignatur.
 * @param {*} value Vollständige sichtbare Berichtsdaten ohne Signaturfeld.
 * @returns {string} Deterministischer JSON-Text.
 * @description Die Funktion ist nebenwirkungsfrei und führt weder Zufalls- noch Netzwerkzugriffe aus.
 */
function stableReportSerialize(value){return JSON.stringify(stableReportValue(value));}

/**
 * Verdichtet den kanonischen Vollinhalt deterministisch auf 128 Bit. Die
 * Signatur dient der Identitätsprüfung eines Berichtsstands, nicht als
 * kryptografischer Echtheitsnachweis.
 * @param {*} value Vollständige sichtbare Berichtsdaten einschließlich fixierter Referenzen, jedoch ohne Signaturfeld.
 * @returns {string} Deterministische Berichtssignatur mit Längenangabe.
 * @description Die reine Funktion verwendet ausschließlich die stabile Serialisierung und keine externe Bibliothek; sie ist ausdrücklich kein kryptografischer Signaturnachweis.
 */
function deterministicReportSignature(value){
  const text=stableReportSerialize(value),mask=0xffffffffffffffffn,primeA=0x100000001b3n,primeB=0x100000001f3n;
  let hashA=0xcbf29ce484222325n,hashB=0x84222325cbf29ce4n;
  for(let index=0;index<text.length;index++){const code=BigInt(text.charCodeAt(index));hashA=((hashA^code)*primeA)&mask;hashB=((hashB^(code+BigInt(index&255)))*primeB)&mask;}
  return`bericht-v1-${hashA.toString(16).padStart(16,'0')}${hashB.toString(16).padStart(16,'0')}-${text.length}`;
}

/**
 * Entfernt ausschließlich flüchtige Oberflächenwerte aus der Signaturgrundlage.
 * @param {object} snapshotState Vollständiger privater und synchronisierter Berichtszustand.
 * @returns {object} Neuer Verweisrahmen mit allen fachlichen Zustandswerten außer aktuellem Schritt und Sichtbarkeit des Berichts.
 * @description Die Funktion ist nebenwirkungsfrei. Datenquelle ist ausschließlich der übergebene Snapshotzustand; fachliche und sichtbare Werte bleiben erhalten.
 */
function reportRelevantState(snapshotState){const{step,reportVisible,...relevant}=snapshotState;return relevant;}

/**
 * Erfasst alle sichtbaren Referenz-, Struktur- und Beschriftungsdaten für einen
 * Bericht. Die Rückgabe besitzt keine Referenzen auf die globalen Tabellen.
 * @returns {object} Vollständige private Referenzkopie für Bericht und Signatur.
 * @sideeffect Nebenwirkungsfrei; globale Referenzwerte werden nur gelesen.
 */
function captureReportReferenceData(){
  return structuredClone(liveEvaluationReferences());
}

/**
 * Kopiert zu Beginn genau einmal den aktuellen Arbeitsstand. Diese private Kopie
 * wird anschließend mit den ebenfalls privat erfassten Referenzen synchronisiert
 * und von allen Fachfunktionen über denselben Evaluationskontext ausgewertet.
 * Kurz- und Nachweisbericht verwenden nur dann denselben Snapshot, wenn ihnen
 * ausdrücklich dasselbe `reportData` übergeben wird. Spätere Änderungen am
 * Arbeitsstand oder an globalen Referenztabellen können den eingefrorenen
 * Berichtsdatenstand nicht beeinflussen.
 * @returns {object} Unveränderlicher, in sich konsistenter Berichtsdatenstand.
 * @description Datenquellen sind genau eine Vollkopie des Live-Zustands und eine private Kopie aller sichtbaren Referenztabellen. Seiteneffekte beschränken sich auf die Synchronisierung dieser privaten Zustandskopie; Live-Zustand, Speicherung und Oberfläche bleiben unverändert. Der Snapshot ist eine Dokumentationsgrundlage und keine Genehmigung.
 */
function buildReportData(sourceState=state){
  const reportState = structuredClone(sourceState);
  const reportReference=captureReportReferenceData(),reportContext=createEvaluationContext(reportState,reportReference),reportKnowledgeBase=reportReference.knowledgeBase,reportLabels={guide:reportReference.guideLabels,regulatoryPaths:reportReference.regulatoryPathLabels};
  deriveSynchronizedReportState(reportState,reportReference);
  const decision=overallDecision(true,false,{synchronize:false,context:reportContext}),completion=reportCompletionStatus(decision,reportContext),regulatory=allRegulatoryEvaluations(reportContext),duties=dutyOperationalResults(reportContext),reviews=reviewOperationalResults(decision,reportContext);
  const orgRegulatoryContexts=Object.fromEntries(Object.values(reportReference.orgCriteria).flat().map(([, , ,id])=>[id,regulatoryOrgCriterionContext(id,reportContext)]));
  const orgSummary=reportReference.orgAreas.map(([id,label])=>{const evaluation=evaluateOrgArea(id,reportContext);return{id,label,result:orgStatusLabel(evaluation.proposed),...evaluation};});
  const orgExceptions=reportReference.orgAreas.flatMap(([areaId,areaLabel])=>(reportReference.orgCriteria[areaId]||[]).flatMap(([key,label,,id])=>{const criterion=reportState.org[areaId]?.criteria?.[key]||{},regulatoryContext=orgRegulatoryContexts[id];const mustShow=['partial','notFulfilled','notAssessable'].includes(criterion.answer)||(id==='ORG-22'&&regulatoryContext.relevant);return mustShow?[{id,area:areaLabel,label,status:regulatoryContext.defined&&!regulatoryContext.relevant?'Nicht einschlägig':orgStatusLabel(criterion.answer),reason:criterion.reason||'',regulatoryContext}]:[];}));
  const operationalById=Object.fromEntries([...duties,...reviews].map(item=>[item.id,item])),orgById=Object.fromEntries(reportReference.orgAreas.flatMap(([area])=>(reportReference.orgCriteria[area]||[]).map(([key,,,id])=>[id,reportState.org[area]?.criteria?.[key]?.answer])));
  const guideReferenceStatuses=Object.fromEntries(reportReference.guideReference.map(item=>[item.id,deriveGuideReferenceStatusFromInteractiveState(item,operationalById[item.id],orgById[item.id],reportContext)]));
  const derivedSnapshot={decision,completion,regulatory,regulatoryLabels:regulatoryResults(reportContext),highRisk:evaluateHighRiskSummary(reportContext),definition:evaluateAISystemDefinition(reportContext),scope:evaluateScope(reportContext),art25:evaluateArt25(reportContext),roles:roleLabels(reportContext),duties,reviews,review10:evaluateReview10(reportContext),stepStatuses:reportReference.steps.map((_,index)=>stepStatus(index,reportContext)),stepResults:reportReference.steps.map((_,index)=>stepSubstantiveResult(index,decision,reportContext)),validations:reportReference.steps.map((_,index)=>getStepValidation(index,{decision,context:reportContext})),riskContradictions:reportState.risks.map((risk,index)=>riskContradictions(risk,index,reportContext)),organizationalOverall:organizationalOverall(reportContext),orgSummary,orgExceptions,orgRegulatoryContexts,guideReferenceStatuses,highRiskDuties:requiredHighRiskDuties(reportContext),approvalConsistency:approvalConsistency(decision,reportContext),versions:reportKnowledgeBase};
  const snapshotState=reportState,registers=Object.fromEntries(Object.keys(reportReference.registerSchemas).map(type=>[type,(reportState.registers[type]||[]).filter(isActiveRegisterItem)])),historicalRegisters=Object.fromEntries(Object.keys(reportReference.registerSchemas).map(type=>[type,(reportState.registers[type]||[]).filter(item=>!isActiveRegisterItem(item))]));
  const applicableDuties=registers.regulatory.filter(item=>item.applicability!=='not_applicable'),openMeasures=[...registers.risk,...registers.organizational].filter(registerItemOpen),openReviews=[...registers.expert,...registers.legal].filter(registerItemOpen),risks=reportState.risks,riskLevels=risks.map(effectiveCurrentRisk),riskCounts=['low','medium','high','unknown'].reduce((counts,level)=>({...counts,[level]:riskLevels.filter(value=>value===level).length}),{});
  const generatedAt=new Date().toISOString(),data={snapshotState,reference:reportReference,knowledgeBase:reportKnowledgeBase,labels:reportLabels,form:reportState.form,generatedAt,temporalContext:reportTemporalContext(reportState.form,reportKnowledgeBase),craDependencies:openCraDependencyGroups(reportContext),...derivedSnapshot,risks,riskLevels,riskCounts,highestRisk:highestRiskLabel(riskLevels),registers,historicalRegisters,applicableDuties,openMeasures,openReviews,blockingReviews:openReviews.filter(item=>item.blocking==='yes'||item.blocking==='review'),triggers:reportState.triggers};
  const{snapshotState:fullSnapshot,generatedAt:ignoredGeneratedAt,...visibleReportData}=data,signaturePayload={snapshotState:reportRelevantState(fullSnapshot),...visibleReportData};
  data.resultSignature=deterministicReportSignature(signaturePayload);
  return freezeReportSnapshot(data);
}

/**
 * Verdichtet offene Punkte mit einem ausschließlich snapshotgebundenen Textbereiniger.
 * @param {object} result Fixiertes fachliches Teilergebnis.
 * @param {function(*):string} sanitizeReportText Textbereiniger aus `reportData.reference`.
 * @returns {string} Sichtbarer, bereinigter Kurztext.
 * @description Nebenwirkungsfrei; globale Feld- oder Registerschemas werden nicht gelesen.
 */
function compactOpenPoints(result,sanitizeReportText){return[...(result.missing||[]),...(result.reviewNeeds||[]),...(result.contradictions||[]),...(result.limitationsRequiringReview||[])].map(sanitizeReportText).join('; ')||'Keine offenen Punkte in diesem Prüfpfad.';}
/**
 * Verdichtet Auslöser und Begründung eines fixierten Teilergebnisses.
 * @param {object} result Fixiertes fachliches Teilergebnis.
 * @param {function(*):string} sanitizeReportText Textbereiniger aus `reportData.reference`.
 * @param {string} [fallback='Keine zusätzliche Begründung erforderlich.'] Ersatztext bei leerem Ergebnis.
 * @returns {string} Sichtbare, snapshotgebunden bereinigte Begründung.
 * @description Die Funktion ist nebenwirkungsfrei und liest weder Live-Zustand noch globale Registerschemas.
 */
function compactEvaluationReason(result,sanitizeReportText,fallback='Keine zusätzliche Begründung erforderlich.'){return sanitizeReportText([...(result.triggers||[]),result.reason].filter(isFilled).join(' ')||fallback);}
/** Erstellt Maßnahmenzeilen aus fixierten Berichtsdaten; die abschließende Textbereinigung übernimmt die snapshotgebundene Berichtstabelle. */
function compactMeasureRows(data){return data.openMeasures.map(item=>[item.id,item.sourceQuestionId||item.riskId||item.area||'',item.measure||item.requirement||'',labelFor(item.status),item.owner||'',item.due?fmtDate(item.due):'Nicht festgelegt']);}
/** Erstellt Reviewzeilen aus fixierten Berichtsdaten; die abschließende Textbereinigung übernimmt die snapshotgebundene Berichtstabelle. */
function compactReviewRows(data){return data.openReviews.map(item=>[`${item.id} · Quelle: ${item.sourceQuestionId||item.sourceId||'nicht dokumentiert'}`,[item.question,item.reason].filter(isFilled).join(' · ')||'Nicht dokumentiert',item.assessmentImpact||item.linkedResult||'',`Blockierungswirkung: ${item.blocking==='yes'?'Ja':item.blocking==='no'?'Nein':'Weiterer Prüfbedarf'} · Verantwortlich: ${item.owner||'nicht festgelegt'}`,item.due?fmtDate(item.due):'Nicht festgelegt']);}
/**
 * Rendert den kompakten 10-Kapitel-Bericht ausschließlich aus einem expliziten Snapshot.
 * @param {object} reportData Rekursiv eingefrorener Berichtsdatenstand mit Referenzen und Signatur.
 * @returns {string} Vollständiges HTML des kompakten Berichts.
 * @description Die Funktion ist nebenwirkungsfrei, liest keine globalen Zustands- oder Referenzdaten und verdichtet Details ohne sie fachlich neu zu bewerten.
 */
function buildCompactReportFromSnapshot(reportData){
  if(!reportData?.snapshotState)throw new Error('Für den Kurzbericht fehlt ein gültiger Berichtsdatenstand.');
  const reportReference=requireReportReference(reportData),reportKnowledgeBase=reportReference.knowledgeBase,reportLabels=reportData.labels,reportText=createReportTextHelpers(reportReference),sanitizeVisibleText=reportText.sanitize,reportFact=reportText.fact,reportList=reportText.list,reportTable=reportText.table,guideLabel=id=>{if(!Object.prototype.hasOwnProperty.call(reportLabels.guide,id))throw new Error(`Im Berichtsdatenstand fehlt die Leitfadenbeschriftung ${id}.`);return reportLabels.guide[id];},reportState=reportData.snapshotState,d=reportData,f=d.form,total=10,reportPage=(...args)=>reportPageWithData(reportData,...args),renderMatrix=()=>renderReportMatrix(reportState.risks,reportKnowledgeBase.matrix);
  const report=[],reg=d.regulatory;
  const specialRows=[
    ['SCOPE-08','Anhang-I-B-Sonderregel',f.scopeAnnexIB],['SCOPE-15','Persönliche, nicht berufliche Tätigkeit',f.personalUse],['SCOPE-16/17','Open-Source-Sonderregel',f.openSource],['SCOPE-18','Gleichwertiges oder strengeres Harmonisierungsrecht',f.scopeAnnexIAEquivalent]
  ].filter(([, ,value])=>value==='yes').map(([id,label])=>[id,label,'Einschlägig; der konkrete Pflichtenumfang wird im jeweiligen Prüfpfad berücksichtigt.']);
  const regulatoryRows=[
    ['KI-System-Definition',d.definition,'DEF-01 bis DEF-15'],['Anwendungsbereich',d.scope,'SCOPE-01 bis SCOPE-18'],['Art.-25-Rollenübernahme',d.art25,'ROLE-12 bis ROLE-15'],['Verbotene KI-Praktiken',reg.prohibition,'ART5-01 bis ART5-10'],['Hochrisiko nach Art. 6 Abs. 1',reg.productHighRisk,'HR-01 bis HR-05'],['Hochrisiko nach Art. 6 Abs. 2',reg.annexHighRisk,'HR-06 bis HR-20'],['Transparenzpflichten',reg.transparency,'TR-01 bis TR-07'],['GPAI-Relevanz',reg.gpai,'GPAI-01 bis GPAI-11'],['Cyber Resilience Act',reg.cra,'CRA-01 bis CRA-12']
  ].map(([path,result,ids])=>[path,result.label,compactEvaluationReason(result,sanitizeVisibleText),ids,compactOpenPoints(result,sanitizeVisibleText)]);
  const riskRows=d.risks.map((risk,index)=>{const level=d.riskLevels[index],scenario=[risk.description,risk.event,(level==='high'||level==='unknown')?`Wesentliche Begründung: ${risk.consequence||risk.uncertainty||risk.treatmentAvailabilityReason||'Weitere Prüfung erforderlich.'}`:''].filter(isFilled).join(' – ');return[risk.riskId,scenario,risk.probability||'–',risk.impact||'–',riskScore(risk)??'–',labelFor(level),labelFor(risk.treatmentNeeded),risk.treatmentStatus==='verified'?labelFor(risk.verifiedResidual):labelFor(risk.expectedResidual),labelFor(risk.treatmentStatus)];});
  const dutyRows=d.applicableDuties.map(item=>[item.dutyCode||item.id,item.basis||'',item.obligatedRole||'',item.requirement||'',labelFor(item.applicability),labelFor(item.status),item.fulfillabilityReason||item.requirement||'',item.owner||'',item.due?fmtDate(item.due):'Nicht festgelegt']);
  const inactiveDutyCount=d.duties.filter(item=>['no','not_required'].includes(item.value)).length;
  const temporalCounts=['current','future','not_assessable'].map(code=>`${d.applicableDuties.filter(item=>item.applicability===code).length} ${labelFor(code).toLowerCase()}`).join(' · ');
  const decisionReasons=d.decision.reasons.map(reason=>`${reason.source}: ${reason.text}`);
  const requiredTriggers=d.triggers.filter(trigger=>trigger.required==='yes');
  const profileRows=[['Regulatorische Einordnung',`${d.definition.label}; ${d.scope.label}; ${d.highRisk.label}`],['Technische Risikobewertung',`${countLabel(d.risks.length,'Risiko','Risiken')}; höchstes aktuelles Einzelrisiko: ${d.highestRisk}`],['Organisatorische Bewertung',d.organizationalOverall]];
  const craDependencyLabels={product_applicability:'Produktanwendbarkeit',organizational_role:'Organisationsrolle',individual_duty:'Einzelne Pflicht',temporal_applicability:'Zeitliche Anwendbarkeit',operational_condition:'Bedingung für Pilot- oder Regelbetrieb',review:'Zuordnung noch zu bestätigen'},craDependencyRows=Object.entries(d.craDependencies||{}).map(([area,items])=>[craDependencyLabels[area]||area,items.map(item=>item.id).join(', ')||'Keine offenen Einträge']);
  report.push(reportPage(1,total,'Dokumentinformationen und Bewertungsstatus',`<div class="report-cover"><span>Kompakter Bewertungsbericht</span><h2>${escapeHtml(f.toolName||'Bewertungsgegenstand noch nicht bezeichnet')}</h2><p>Entscheidungsorientierte KI-Risikobewertung nach EU AI Act und ergänzender Prüfung des Cyber Resilience Act</p></div><div class="report-decision ${d.decision.tone}"><span>Regelbasiert abgeleiteter fachlicher Bewertungsstatus</span><h2>${escapeHtml(d.decision.label)}</h2></div><div class="report-facts">${reportStatusFacts(d.completion,reportFact)}</div><div class="validation-alert"><strong>Wichtiger Hinweis</strong><p>Fachlicher Bewertungsstatus, Bearbeitungsstand und Dokumentationsstatus werden getrennt ausgewiesen. Die gesonderte menschliche beziehungsweise organisatorische Entscheidung bleibt erforderlich.</p></div><div class="report-facts">${reportFact('Toolbezeichnung',f.toolName)}${reportFact('Anbieter',f.provider)}${reportFact('Toolversion',f.version)}${reportFact('Bewertungs-ID',f.assessmentId)}${reportFact('Interne Tool-Kennung',f.internalToolId)}${reportFact('Bewertungsversion',f.assessmentVersion)}${reportFact('Leitfadenversion',f.guideVersion)}${reportFact('Bewertungsstichtag',fmtDate(f.assessmentDate))}${reportFact('Letzte inhaltliche Aktualisierung',fmtDate(f.assessmentUpdate))}${reportFact('Entscheidungsdatum',fmtDate(f.approvalDate))}${reportFact('Geprüfter Rechtsstand',reportKnowledgeBase.legalStatus)}${reportFact('Bericht erzeugt am',fmtDate(d.generatedAt))}${reportFact('Prototypversion',reportKnowledgeBase.prototypeVersion)}${reportFact('Datenmodellversion',reportKnowledgeBase.dataModelVersion)}${reportFact('Regelwerksversion',reportKnowledgeBase.ruleSetVersion)}${reportFact('Methodikversion',reportKnowledgeBase.methodologyVersion)}</div><div class="report-section"><h3>Zeitlicher Kontext</h3><p>${escapeHtml(d.temporalContext)}</p></div>`,'cover-page compact-cover','compact'));
  report.push(reportPage(2,total,'Zusammenfassung der Bewertung',`<h2 class="report-page-title">Zusammenfassung der Bewertung</h2><p class="report-lead">Regulatorische, technische und organisatorische Ergebnisse bleiben getrennt; ein gemeinsamer numerischer Gesamtscore wird nicht gebildet.</p>${reportTable(['Ergebnisprofil','Kernaussage'],profileRows)}<div class="report-section"><h3>Regulatorische Kernergebnisse</h3><div class="report-facts">${reportFact('KI-System-Eigenschaft',d.definition.label)}${reportFact('EU-AI-Act-Anwendungsbereich',d.scope.label)}${reportFact('Sonderregelungen',specialRows.length?specialRows.map(row=>row[0]).join(', '):'Keine einschlägige Sonderregel festgestellt')}${reportFact('Akteursrolle(n)',d.roles.join(', ')||'Keine Rolle festgestellt')}${reportFact('Art.-5-Prüfung',reg.prohibition.label)}${reportFact('Hochrisiko-Einstufung',d.highRisk.label)}${reportFact('Art.-25-Ergebnis',d.art25.label)}${reportFact('Transparenzpflichten',reg.transparency.label)}${reportFact('GPAI-Relevanz',reg.gpai.label)}${reportFact('CRA-Anwendbarkeit und Rolle',(reg.cra.roles||[]).length?`${reg.cra.label}; bestätigte Rolle(n): ${reg.cra.roles.join(', ')}`:reg.cra.label)}${reportFact('Zeitliche Anwendbarkeit',temporalCounts)}</div></div><div class="report-section"><h3>Steuerungskennzahlen</h3><div class="report-facts">${reportFact('Höchstes technisches Einzelrisiko',d.highestRisk)}${reportFact('Organisatorisches Gesamtergebnis',d.organizationalOverall)}${reportFact('Offene Pflichten',String(d.applicableDuties.filter(registerItemOpen).length))}${reportFact('Offene Maßnahmen',String(d.openMeasures.length))}${reportFact('Offene Prüfbedarfe',String(d.openReviews.length))}${reportFact('Entscheidungsblockierende Prüfbedarfe',String(d.blockingReviews.length))}${reportFact('Nächster Reviewtermin',fmtDate(f.nextReviewDate))}</div></div>`,'','compact'));
  report.push(reportPage(3,total,'Bewertungsgegenstand und Einsatzkontext',`<h2 class="report-page-title">Bewertungsgegenstand und Einsatzkontext</h2><div class="report-facts">${reportFact('Tool, Anbieter und Version',`${f.toolName||'–'} · ${f.provider||'–'} · ${f.version||'–'}`)}${reportFact('Interne Tool-Kennung',f.internalToolId)}${reportFact('Organisationseinheit',f.department)}${reportFact('Verantwortliche Stelle',f.owner)}${reportFact('Informationsstand',labelFor(f.infoStatus))}</div><div class="report-section"><h3>Zweck, Nutzung und Systemgrenze</h3><p><strong>Zweckbestimmung:</strong> ${escapeHtml(sanitizeVisibleText(f.purpose||'Nicht dokumentiert'))}</p><p><strong>Tatsächlicher beziehungsweise vorgesehener Einsatz:</strong> ${escapeHtml(sanitizeVisibleText([f.intendedUse,f.actualUse].filter(isFilled).join(' · ')||'Nicht dokumentiert'))}</p><p><strong>Systemgrenze:</strong> ${escapeHtml(sanitizeVisibleText(f.systemBoundary||'Nicht dokumentiert'))}</p></div><div class="report-section"><h3>Technik, Daten und Beteiligte</h3><div class="report-facts">${reportFact('Wesentliche technische Komponenten',f.techComponents)}${reportFact('Eingaben',f.inputs)}${reportFact('Ausgaben',f.outputsDescription)}${reportFact('Nutzergruppen',f.users||f.usersContext)}${reportFact('Betroffene Personen',f.affected)}${reportFact('Menschliche Aufsicht',`${labelFor(f.humanReview)}; Korrektur: ${labelFor(f.humanCorrection)}`)}</div></div><div class="report-section"><h3>Entscheidungsrelevante fehlende Informationen</h3><p>${escapeHtml(sanitizeVisibleText(f.missingInfo||'Keine entscheidungsrelevanten fehlenden Informationen dokumentiert.'))}</p><p><strong>Grundlage:</strong> TOOL-01 bis TOOL-12, CTX-01 bis CTX-14</p></div>`,'','compact'));
  report.push(reportPage(4,total,'Regulatorische Einordnung',`<h2 class="report-page-title">Regulatorische Einordnung</h2>${reportTable(['Prüfpfad','Ergebnis','Kurze Begründung','Maßgebliche IDs','Offene Punkte'],regulatoryRows)}<div class="report-section"><h3>Einschlägige Sonderregeln</h3>${reportTable(['ID','Sonderregel','Fallbezogene Wirkung'],specialRows)}</div><div class="report-section"><h3>Strukturierte offene CRA-Abhängigkeiten</h3>${reportTable(['Teilentscheidung','Offene Kennungen'],craDependencyRows)}</div><div class="report-section"><h3>Akteursrollen und Zeitstatus</h3><p><strong>Festgestellte Rolle(n):</strong> ${escapeHtml(d.roles.join(', ')||'Keine Rolle festgestellt')}.</p><p><strong>Zeitlicher Status aktiver Pflichten:</strong> ${escapeHtml(temporalCounts)}. Die besondere 2030-Übergangsregel für bestimmte bestehende Hochrisiko-Systeme öffentlicher Stellen ist kein allgemeiner Geltungsbeginn.</p></div>`,'','compact'));
  report.push(reportPage(5,total,'Technische Risikobewertung',`<h2 class="report-page-title">Technische Risikobewertung</h2><p class="report-lead">Die 3×3-Risikomatrix verwendet ${reportKnowledgeBase.matrix.formula}. Niedrig: ${reportKnowledgeBase.matrix.levels.low}, Mittel: ${reportKnowledgeBase.matrix.levels.medium}, Hoch: ${reportKnowledgeBase.matrix.levels.high}. Erwartetes und verifiziertes Restrisiko bleiben getrennte Zustände. Ein Wirksamkeitskriterium ist ein Sollkriterium; Nachweisverweise werden nicht automatisch inhaltlich geprüft.</p>${renderMatrix()}<div class="report-facts">${reportFact('Niedrige Risiken',String(d.riskCounts.low))}${reportFact('Mittlere Risiken',String(d.riskCounts.medium))}${reportFact('Hohe Risiken',String(d.riskCounts.high))}${reportFact('Nicht beurteilbare Risiken',String(d.riskCounts.unknown))}${reportFact('Höchstes aktuelles Einzelrisiko',d.highestRisk)}</div><div class="report-section"><h3>Tatsächlich erfasste Risikoszenarien</h3>${reportTable(['Risiko-ID','Risikoszenario','Eintrittswahrscheinlichkeit','Auswirkung','aktueller Risikowert','Risikostufe','Behandlungsbedarf','erwartetes / verifiziertes Restrisiko','Status der Behandlung'],riskRows)}</div><p>Ursachen, Nachweisverweise, Wirksamkeitskriterien und Verantwortlichkeiten sind im vollständigen Nachweisbericht dokumentiert.</p>`,'compact-risk-page','compact'));
  report.push(reportPage(6,total,'Organisatorische Bewertung',`<h2 class="report-page-title">Organisatorische Bewertung</h2><div class="report-decision ${d.organizationalOverall.includes('unzureichend')?'danger':'warning'}"><span>Organisatorisches Gesamtergebnis</span><h2>${escapeHtml(d.organizationalOverall)}</h2></div>${reportTable(['Themenbereich','Ergebnis','Teilweise','Nicht erfüllt','Nicht beurteilbar','Offene Nachweise / Widersprüche'],d.orgSummary.map(area=>[area.label,area.result,String(area.partial),String(area.notFulfilled),String(area.notAssessable),[...area.missing,...area.contradictions].join('; ')||'Keine']))}<div class="report-section"><h3>Regulatorisch relevante Lücken und Ausnahmen</h3>${reportTable(['ID','Themenbereich','Kriterium','Status','Begründung / Auswirkung'],d.orgExceptions.map(item=>[item.id,item.area,item.label,item.status,item.reason||item.regulatoryContext.rule?.reason||'']))}</div><div class="report-section"><h3>Offene organisatorische Maßnahmen</h3>${reportTable(['ID','Herkunft','Maßnahme','Status','Verantwortlich','Frist'],compactMeasureRows({...d,openMeasures:d.registers.organizational.filter(registerItemOpen)}))}</div><p>Vollständig erfüllte Einzelkriterien werden hier nicht wiederholt; alle ORG-01 bis ORG-36 stehen im Nachweisbericht.</p>`,'','compact'));
  report.push(reportPage(7,total,'Einschlägige Pflichten und Maßnahmen',`<h2 class="report-page-title">Einschlägige Pflichten und Maßnahmen</h2>${reportTable(['Pflicht-ID','Rechtsgrundlage','verpflichtete Rolle','Kurzbeschreibung','zeitlicher Status','Erfüllungsstatus','erforderliche Maßnahme','verantwortliche Stelle','Frist'],dutyRows)}<p><strong>Zusammenfassung:</strong> ${inactiveDutyCount} der operationalisierten Pflichten wurden als nicht erforderlich oder nicht einschlägig eingestuft und werden hier nicht einzeln wiederholt. Registrierungs- und Dokumentationspflichten sind bereits in der vorstehenden Tabelle enthalten; die vollständige Herleitung befindet sich im Nachweisbericht.</p><div class="report-section"><h3>Noch offene Risiko- und Organisationsmaßnahmen</h3>${reportTable(['ID','Herkunft','Maßnahme','Status','Verantwortlich','Frist'],compactMeasureRows(d))}</div>`,'','compact'));
  report.push(reportPage(8,total,'Offener Prüfbedarf',`<h2 class="report-page-title">Offener fachlicher und juristischer Prüfbedarf</h2>${reportTable(['ID und Quelle','Prüffrage und Grund','Auswirkung auf die Bewertung','Blockierungswirkung und Verantwortung','Frist'],compactReviewRows(d))}<p>Inaktive oder erledigte Prüfbedarfe werden ausschließlich im vollständigen Nachweisbericht ausgewiesen.</p>`,'','compact'));
  report.push(reportPage(9,total,'Bewertungsstatus und weitere Schritte',`<h2 class="report-page-title">Bewertungsstatus und weitere Schritte</h2><div class="report-decision ${d.decision.tone}"><span>Regelbasierter fachlicher Bewertungsstatus</span><h2>${escapeHtml(d.decision.label)}</h2></div><div class="report-facts">${reportStatusFacts(d.completion,reportFact)}</div><div class="report-section"><h3>Tragende Gründe</h3>${reportList(decisionReasons,'Keine zusätzlichen tragenden Gründe.')}</div><div class="report-section"><h3>Noch erforderliche Maßnahmen</h3>${reportList(d.openMeasures.map(item=>`${item.id}: ${item.measure||item.requirement||'Maßnahme'} – ${item.owner||'Verantwortung offen'}, ${item.due?fmtDate(item.due):'Frist offen'}`),'Keine offene Maßnahme.')}</div><div class="report-section"><h3>Noch erforderliche fachliche oder juristische Prüfungen</h3>${reportList(d.openReviews.map(item=>`${item.id}: ${item.question||item.reason||'Prüfbedarf'} – Blockierungswirkung: ${item.blocking==='yes'?'Ja':item.blocking==='no'?'Nein':'weiterer Prüfbedarf'}`),'Kein offener Prüfbedarf.')}</div><div class="report-section"><h3>Neubewertung und gesonderte Entscheidung</h3><div class="report-facts">${reportFact('Nächster Reviewtermin',fmtDate(f.nextReviewDate))}${reportFact('Reviewfrequenz',f.reviewFrequency)}${reportFact('Menschliche / organisatorische Entscheidung',labelFor(f.approvalStatus))}${reportFact('Entscheidungsdatum',fmtDate(f.approvalDate))}</div>${reportTable(['ID','Auslöser','Betroffene Schritte','Verantwortlich','Frist'],requiredTriggers.map(trigger=>[trigger.id,guideLabel(trigger.id),trigger.steps||'',trigger.owner||'',trigger.due?fmtDate(trigger.due):'Nicht festgelegt']))}<p>Es wird keine automatische Genehmigung und keine Freigabeempfehlung erzeugt.</p></div>`,'compact-status-page','compact'));
  report.push(reportPage(10,total,'Quellen- und Versionsübersicht',`<h2 class="report-page-title">Quellen- und Versionsübersicht</h2><div class="report-section"><h3>Verwendete Rechts- und Methodengrundlagen</h3>${reportList(reportKnowledgeBase.sources)}</div><div class="report-facts">${reportFact('Leitfadenversion',f.guideVersion)}${reportFact('Methodikversion',reportKnowledgeBase.methodologyVersion)}${reportFact('Regelwerksversion',reportKnowledgeBase.ruleSetVersion)}${reportFact('Datenmodellversion',reportKnowledgeBase.dataModelVersion)}${reportFact('Prototypversion',reportKnowledgeBase.prototypeVersion)}${reportFact('Geprüfter Rechtsstand',reportKnowledgeBase.legalStatus)}${reportFact('Vollständige Quellenprüfung',fmtDate(reportKnowledgeBase.fullSourceReview))}${reportFact('Letzte Aktualitätsprüfung',fmtDate(reportKnowledgeBase.lastCurrentnessReview))}${reportFact('Bewertungsstichtag',fmtDate(f.assessmentDate))}${reportFact('Letzte inhaltliche Aktualisierung',fmtDate(f.assessmentUpdate))}${reportFact('Erläuterung der Aktualisierung',f.assessmentUpdateReason||'Keine abweichende Aktualisierung dokumentiert')}${reportFact('Entscheidungsdatum',fmtDate(f.approvalDate))}</div><div class="validation-alert"><strong>Vollständige Nachweise</strong><p>Alle Einzelfragen, Antworten, DUTY- und REVIEW-Ergebnisse, vollständigen Risikodetails, Organisationskriterien, aktiven und historischen Registereinträge, Nachweisverweise sowie die Versions- und Änderungshistorie befinden sich im vollständigen Nachweisbericht. Die Anwendung prüft die Inhalte externer Nachweise nicht automatisch.</p></div>`,'compact-final-page','compact'));
  const banner=reportStatusBanner(d.completion);
  const reportHtml=report.join('').replace('<p>Es wird keine automatische Genehmigung und keine Freigabeempfehlung erzeugt.</p>','');
  return `<div class="report-area compact-report" data-result-signature="${escapeHtml(d.resultSignature)}">${banner}<div class="report-toolbar"><div><strong>Kompakter Bewertungsbericht</strong><span>10 Kapitel · entscheidungsorientierte Standardausgabe</span></div><div><button type="button" class="secondary-button" id="hideReportButton">Bericht ausblenden</button><button type="button" class="primary-button" id="printButton">Kompakten Bewertungsbericht als PDF speichern</button></div></div>${reportHtml}</div>`;
}

/**
 * Erstellt den kompakten Bericht über den expliziten Snapshot-Renderer.
 * @param {object} reportData Vollständiger Berichtsdatenstand.
 * @returns {string} HTML des kompakten Berichts.
 * @description Nebenwirkungsfreie öffentliche Fassade; ein fehlender Snapshot wird abgewiesen und nicht aus Live-Daten ersetzt.
 */
function buildCompactReport(reportData){return buildCompactReportFromSnapshot(reportData);}

/**
 * Rendert den vollständigen 15-Kapitel-Nachweisbericht ausschließlich aus einem expliziten Snapshot.
 * @param {object} reportData Rekursiv eingefrorener Berichtsdatenstand mit Referenzen und Signatur.
 * @returns {string} Vollständiges HTML des Nachweisberichts.
 * @description Die Funktion ist nebenwirkungsfrei, verwendet keine globalen Zustands- oder Referenzdaten und ergänzt Nachweisanhänge ohne Neuberechnung des Snapshots.
 */
function buildEvidenceReportFromSnapshot(reportData){
  if(!reportData?.snapshotState)throw new Error('Für den Nachweisbericht fehlt ein gültiger Berichtsdatenstand.');
  const reportReference=requireReportReference(reportData),reportKnowledgeBase=reportReference.knowledgeBase,reportLabels=reportData.labels,reportText=createReportTextHelpers(reportReference),sanitizeVisibleText=reportText.sanitize,reportFact=reportText.fact,reportList=reportText.list,reportTable=reportText.table,reportState=reportData.snapshotState,completion=reportData.completion,decision=reportData.decision,validations=reportData.validations,reportPage=(...args)=>reportPageWithData(reportData,...args),riskContradictions=(risk,index)=>reportData.riskContradictions[index]||[],regulatoryResults=()=>reportData.regulatoryLabels,evaluateHighRiskSummary=()=>reportData.highRisk,stepSubstantiveResult=index=>reportData.stepResults[index],organizationalOverall=()=>reportData.organizationalOverall,evaluateReview10=()=>reportData.review10,approvalConsistency=()=>reportData.approvalConsistency,reviewOperationalResult=id=>reportData.reviews.find(item=>item.id===id),reviewOperationalResults=()=>reportData.reviews;
  let base=buildReportBase(reportData);const reg=reportData.regulatory;
  const regulatoryPathLabels=reportLabels.regulatoryPaths;
  const groups=reportPage(13,15,'Entscheidungs- und Plausibilitätsanhang',`<h2 class="report-page-title">Vollständige Entscheidungsgründe</h2>${renderDecisionGroups(decision)}<div class="report-section"><h3>Getrennte Statusebenen</h3><div class="report-facts">${reportStatusFacts(completion,reportFact)}</div>${reportList(completion.reasons,'Keine entscheidungskritischen offenen Punkte.')}</div><div class="report-section"><h3>Strukturierte Plausibilitätsinformationen</h3>${reportTable(['Quelle','Typ','kritisch','Text','Zuständig','Frist','Status'],validations.flatMap(v=>v.items).map(item=>[item.source,labelFor(item.type),item.critical?'Ja':'Nein',item.text,item.owner,item.due?fmtDate(item.due):'',labelFor(item.status)]))}</div><div class="report-section"><h3>Manuelle und regelbasiert abgeleitete regulatorische Ergebnisse</h3>${reportTable(['Pfad','Regelbasiert plausibilisiert','Manuell','Abweichungen'],Object.entries(reg).map(([key,value])=>[regulatoryPathLabels[key]||'Regulatorischer Prüfpfad',value.label,value.manualLabel,value.contradictions.join('; ')]))}</div>`,'report-appendix');
  const riskAppendix=reportPage(14,15,'Risiko-, Register- und Entscheidungsanhang',`<h2 class="report-page-title">Akzeptanz, Restrisiko und Quellreferenzen</h2><p class="report-lead">Das Wirksamkeitskriterium ist ein dokumentiertes Sollkriterium. Der Nachweisverweis wird ausgegeben, aber nicht automatisch inhaltlich geprüft.</p>${reportTable(['Risiko','Akzeptanz','Risk Owner','Restrisikoprüfung','Behandlung bestimmbar','Geplante Behandlung','Eingetragener Wirksamkeitsnachweisverweis','Widersprüche'],reportState.risks.map((r,i)=>[r.riskId,labelFor(r.acceptance),r.riskOwner||r.owner,r.treatmentStatus==='verified'?labelFor(r.verifiedResidual):r.treatmentStatus==='implemented'?'Umgesetzt, aber noch nicht verifiziert':labelFor(r.expectedResidual),labelFor(r.suitableTreatmentAvailability),r.proposedTreatment||'Nicht dokumentiert',r.treatmentStatus==='verified'?(r.effectivenessEvidence||'Nicht dokumentiert'):'Noch kein verifizierter Wirksamkeitsnachweis',riskContradictions(r,i).join('; ')]))}<div class="report-section"><h3>Getrennte Ergebnisprofile</h3>${reportTable(['Ebene','Ergebnis'],[['Regulatorische Einordnung',regulatoryResults().prohibition+' · '+evaluateHighRiskSummary().label],['Technische Risikobewertung',stepSubstantiveResult(4)],['Organisatorische Bewertung',organizationalOverall()],['REVIEW-10',`${labelFor(evaluateReview10().value)} · ${evaluateReview10().reason}`]])}</div><div class="report-section"><h3>Gesonderte menschliche beziehungsweise organisatorische Entscheidung</h3><p>Gespeichert: <strong>${escapeHtml(labelFor(reportState.form.approvalStatus))}</strong> · Regelbasierter Bewertungsstatus: <strong>${escapeHtml(decision.label)}</strong></p><p>Die gesonderte Entscheidung verändert den regelbasierten Status nicht.</p>${reportList(approvalConsistency(decision).warnings,'Keine Abweichung zum regelbasierten Status dokumentiert.')}</div>`,'report-appendix');
  const documentationAppendix=reportPage(15,15,'Dokumentation, Rollen und Neubewertung',`<h2 class="report-page-title">Vollständige Dokumentations- und Reviewangaben</h2><div class="report-section"><h3>Aufbewahrung und Versionierung – REVIEW-21</h3><div class="report-facts">${reportFact('Ablageort',reportState.form.documentLocation)}${reportFact('Zugriffsrechte',reportState.form.accessRights)}${reportFact('Gesetzliche Frist / Rechtsgrundlage',reportState.form.statutoryRetentionBasis)}${reportFact('Interne Aufbewahrungsfrist',reportState.form.internalRetentionPeriod)}${reportFact('Version und Änderungshistorie',`${reportState.form.assessmentVersion||''} · ${reportState.form.changeHistory||''}`)}${reportFact('Frühere Bewertungsstände erhalten',labelFor(reportState.form.preservePreviousAssessments))}</div></div><div class="report-section"><h3>GPAI – Relevanz und Organisationsrolle getrennt</h3><p>${escapeHtml(reviewOperationalResult('REVIEW-35',decision).reason)}</p></div><div class="report-section"><h3>Konkrete Ergebniswerte REVIEW-31 bis REVIEW-40</h3>${reportTable(['ID','Ergebnis','Begründung'],reviewOperationalResults(decision).filter(item=>{const n=Number(item.id.slice(-2));return n>=31&&n<=40;}).map(item=>[item.id,labelFor(item.value),item.reason]))}</div><div class="report-section review-trigger-section"><h3>Neubewertungsauslöser REVIEW-22 bis REVIEW-28</h3><p>Die Auslöser steuern, wann und durch wen die Bewertung erneut durchzuführen ist. Sie werden zusammen mit dem regelmäßigen Reviewtermin und den vorgesehenen Nachweisen dokumentiert.</p><div class="report-facts review-trigger-facts">${reportFact('Nächster regelmäßiger Review',reportState.form.nextReviewDate?fmtDate(reportState.form.nextReviewDate):'Nicht dokumentiert')}${reportFact('Reviewfrequenz',reportState.form.reviewFrequency)}${reportFact('Verantwortliche Koordination',reportState.form.planCoordinator)}${reportFact('Reviewnachweise',reportState.form.reviewEvidence)}</div>${reportTable(['ID','Bewertung','Begründung bei Nichtanwendung','Betroffene Schritte','Verantwortlich','Frist'],reportState.triggers.map(trigger=>[trigger.id,labelFor(trigger.required),trigger.reason||'',trigger.steps||'',trigger.owner||'',trigger.due?fmtDate(trigger.due):'']))}</div>`,'report-appendix');
  const banner=reportStatusBanner(completion);
  base=base.replace('Nachvollziehbare Erstbewertung','Vollständiger Nachweisbericht · nachvollziehbare Erstbewertung').replace('<div class="report-area evidence-report">',`<div class="report-area evidence-report" data-result-signature="${escapeHtml(reportData.resultSignature)}">${banner}`);return base.replace(/<\/div>$/,`${groups}${riskAppendix}${documentationAppendix}</div>`);
}
/**
 * Erstellt den vollständigen Nachweisbericht über den expliziten Snapshot-Renderer.
 * @param {object} reportData Vollständiger Berichtsdatenstand.
 * @returns {string} HTML des Nachweisberichts.
 * @description Nebenwirkungsfreie öffentliche Fassade; ein fehlender Snapshot wird abgewiesen und nicht aus Live-Daten ersetzt.
 */
function buildEvidenceReport(reportData){return buildEvidenceReportFromSnapshot(reportData);}
/**
 * Erstellt den vollständigen Nachweisbericht aus einem ausdrücklich übergebenen Berichtsdatenstand.
 * @param {object} reportData Eingefrorener, vollständig ausgewerteter Berichtssnapshot.
 * @returns {string} HTML des vollständigen Nachweisberichts.
 * @description Die Fassade liest ausschließlich den übergebenen Snapshot, verändert weder Live-Zustand noch Referenzen und erzeugt keine PDF-Datei.
 */
function buildReport(reportData){return buildEvidenceReport(reportData);}
/**
 * Wählt für die Oberfläche den Renderer der aktuell ausgewählten Berichtsart.
 * @param {object} reportData Ausdrücklich zu rendernder, eingefrorener Berichtssnapshot.
 * @returns {string} HTML des kompakten oder vollständigen Berichts.
 * @description Die Auswahl liest nur die Oberflächenvariable `activeReportType`; die Berichtsinhalte stammen ausschließlich aus `reportData`. Die Funktion verändert keine Fach- oder Referenzdaten.
 */
function renderSelectedReport(reportData){return activeReportType==='evidence'?buildEvidenceReport(reportData):buildCompactReport(reportData);}

/**
 * Zeigt die gewählte Berichtsart auf Basis eines neu erzeugten, zeitlich fixierten Datenstands.
 * @param {'compact'|'evidence'} [type='compact'] Gewünschte Berichtsart.
 * @param {boolean} [scroll=true] Steuert das anschließende Scrollen zum Bericht.
 * @returns {void}
 * @description Datenquelle ist der aktuelle interaktive Bewertungszustand; die Funktion verändert nur Anzeigezustand, Dokumenttitel und lokalen Speicher. Sie erteilt keine fachliche Freigabe.
 */
function showReport(type='compact',scroll=true){activeReportType=type==='evidence'?'evidence':'compact';state.reportVisible=true;saveState();activeReportData=buildReportData();document.title=reportBrowserTitle(activeReportType,activeReportData.form,activeReportData.reference);renderStep();if(scroll)document.querySelector('.report-area')?.scrollIntoView({behavior:'smooth'});}

/**
 * Bereitet die gewählte Berichtsart mit eindeutigem Titel für den PDF-Druck vor.
 * @param {'compact'|'evidence'} [type='compact'] Zu druckende Berichtsart.
 * @returns {void}
 * @description Verwendet einen neuen Berichtsdatenstand, verändert Anzeige und Dokumenttitel und öffnet den Browser-Druckdialog; die PDF-Datei selbst wird nicht durch die Fachlogik erzeugt.
 */
function printSelectedReport(type='compact'){showReport(type,false);document.title=reportFilename(activeReportType,activeReportData.form).replace(/\.pdf$/i,'');window.print();}

/**
 * Schließt den achten Prüfschritt interaktiv ab und zeigt den kompakten Bericht.
 * @returns {void}
 * @description Synchronisiert und speichert ausschließlich den Live-Zustand des Bedienvorgangs; die anschließende Snapshot-Erzeugung bleibt davon getrennt.
 */
function finishAndReport(){syncDerivedRegisters();state.evaluated[7]=true;activeReportType='compact';state.reportVisible=true;saveState('Prüfschritt bewertet und kompakter Bewertungsbericht erstellt.');activeReportData=buildReportData();document.title=reportBrowserTitle('compact',activeReportData.form,activeReportData.reference);renderNavigation();renderStep();document.querySelector('.report-area')?.scrollIntoView({behavior:'smooth'});}

/* 17. Beispiel- und Testszenarien */

/**
 * Liefert den vollständig ausgefüllten Kapitel-4-Prüfstand. Die bewusst
 * erhaltenen fachlichen Widersprüche dienen als Regressionstest und dürfen
 * nicht durch automatische Annahmen oder Datenänderungen verdeckt werden.
 */
function exampleState(){
  const sample=freshState();
  const f=sample.form;
  Object.assign(f,{
    internalToolId:'TOOL-DOK-001',toolName:'Assistenzsystem zur Dokumentenklassifikation',provider:'Beispiel Software GmbH',version:'3.2',assessmentDate:'2026-09-16',assessmentUpdate:'2026-09-16',department:'Dokumentenmanagement',owner:'Fachverantwortung Dokumentenmanagement',purpose:'Eingehende Geschäftsdokumente vorsortieren und Mitarbeitenden Klassifikationsvorschläge bereitstellen.',tasks:'Dokumenttyp erkennen, Metadaten vorschlagen und Fälle an zuständige Teams verteilen.',systemBoundary:'Cloud-Anwendung einschließlich Modell, Konnektoren und Administrationsoberfläche; die fachliche Entscheidung verbleibt bei Mitarbeitenden.',inputs:'Geschäftsdokumente und freigegebene Metadaten.',dataSources:'Dokumentenmanagementsystem und manuelle Uploads.',outputsDescription:'Klassifikations- und Routingvorschläge mit Konfidenzwert.',techComponents:'Vortrainiertes Klassifikationsmodell, Regelwerk und API-Konnektor.',interfaces:'Dokumentenmanagement, Identitätsverwaltung und Monitoring.',integration:'Vorschlag wird vor Übernahme von einer sachbearbeitenden Person geprüft.',users:'Geschulte Sachbearbeitung und Administration.',infoSources:'Produktdokumentation, Vertrag, technische Systembeschreibung und Pilotprotokoll.',shortDescription:'Assistenzsystem ohne automatische Letztentscheidung.',infoStatus:'complete',otherEvidence:'Pilotbericht und Berechtigungskonzept.',providerContact:'Produktmanagement des Anbieters',
    personalScope:'yes',materialScope:'yes',territorialScope:'yes',euOutputEffect:'yes',specialRules:'no',researchScientificOnly:'no',researchBeforeMarket:'no',realWorldTesting:'no',actualOperationalUse:'yes',militarySecurity:'no',personalUse:'no',openSource:'no',machineBased:'yes',autonomy:'yes',adaptivity:'no',systemGoals:'yes',inference:'yes',aiOutputs:'yes',environmentInfluence:'yes',deterministicOnly:'no',modelOnly:'no',definitionEvidence:'yes',scopeBasis:'Einsatz und Ergebnisse liegen in der EU; kein Ausschluss festgestellt.',scopeEvidence:'Vertrag, Einsatzkonzept und Niederlassungsangaben.',definitionBasis:'Das System leitet Klassifikationsvorschläge aus Dokumentinhalten ab.',definitionEvidenceSource:'Technische Produktbeschreibung und Pilotbeobachtung.',scopeNotes:'Erstbewertung für den Pilotbetrieb.',definitionNotes:'Anpassungsfähigkeit nach Bereitstellung ist deaktiviert.',transitionDate:'2026-12-31',
    intendedUse:'Unterstützende Vorsortierung eingehender Dokumente.',actualUse:'Pilotbetrieb mit verpflichtender menschlicher Bestätigung.',useLocation:'Deutschland',businessArea:'Dokumentenmanagement',process:'Posteingang und Fallrouting',decisionInfluence:'support',usersContext:'Geschulte interne Mitarbeitende.',affected:'Beschäftigte, Kunden und Vertragspartner in den Dokumenten.',spatialTemporal:'Deutscher Pilotbetrieb, werktägliche Nutzung.',rightsImpact:'Mittelbare Verzögerungen oder Fehlzuordnungen möglich.',organizationalConsequences:'Fehlrouting kann Bearbeitungszeiten verlängern.',societalConsequences:'Keine wesentliche kollektive Wirkung erwartet.',humanCorrection:'yes',personalData:'yes',individualImpact:'yes',organizationalImpact:'yes',societalImpact:'no',ownBrand:'no',substantialModification:'no',purposeChange:'no',role_provider:true,role_deployer:true,roleBasis:'Die Organisation stellt die konkrete Assistenzoberfläche bereit und betreibt sie im eigenen Prozess; die zugrunde liegende Modellkomponente stammt von einem Dritten.',roleEvidence:'Vertrag, technische Systemabgrenzung und Einsatzkonzept.',roleReviewDate:'2027-03-31',roleNotes:'Rollen bei wesentlichen Änderungen erneut prüfen.',
    prohibitionConclusion:'none',prohibitionBasis:'Keine der geprüften Praktiken ist Bestandteil des vorgesehenen Einsatzes.',prohibitionEvidence:'Zweckbestimmung, Funktionsbeschreibung und Testfälle.',productOrSafetyComponent:'no',annexILaw:'no',thirdPartyConformity:'no',transitionRule:'yes',productTransitionEffect:'none',productHighRiskConclusion:'no',productHighRiskBasis:'Kein Produkt oder Sicherheitsbauteil nach Anhang I.',productHighRiskEvidence:'Produktbeschreibung.',annexHighRiskConclusion:'no',annexBasis:'Kein Verwendungsfall der acht Annex-III-Bereiche.',annexEvidence:'Prozessbeschreibung.',tInteraction:'yes',tInteractionUse:'Vorsortierung mit sichtbarem Klassifikationsvorschlag.',tInteractionActor:'provider',tInteractionDuty:'Anbieter stellt eine verständliche Information über die unmittelbare Interaktion mit dem KI-System sicher.',tInteractionException:'no',tInteractionReason:'Direkte Interaktion ist in der Oberfläche erkennbar.',tInteractionEvidence:'Abnahmetest und Oberflächenkonzept.',tInteractionResult:'applicable',transparencyConclusion:'provider',transparencyBasis:'Die direkte Interaktion löst nach Art. 50 Abs. 1 eine Anbieterpflicht aus.',transparencyEvidence:'Kennzeichnung in der Oberfläche vorgesehen.',transparencyTemporalStatus:'current',transparencyTemporalReason:'Die Informationspflicht ist für die dokumentierte Interaktion am Bewertungsstichtag umzusetzen.',gpaiOrganizationRole:'none',gpaiThreshold:'not_met',gpaiCommissionStatus:'no',gpaiConclusion:'none',gpaiBasis:'Kein GPAI-Modell wird durch die Organisation bereitgestellt oder integriert.',gpaiEvidence:'Anbieterangaben.',craDigitalProduct:'yes',craCommercial:'yes',craUseOnly:'yes',craOpenSource:'no',craManufacturerTakeover:'no',craExclusion:'no',craAiActOverlap:'yes',craProductType:'software',craProductRelation:'standalone',craRoleManufacturer:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleRepresentative:'no',craRoleSteward:'no',craProductClass:'other',craConformityProcedure:'Produktunterlagen des Herstellers werden als Nachweis geführt.',craVulnerabilityProcess:'Schwachstelleninformationen des Herstellers werden überwacht und intern bearbeitet.',craReportingProcess:'Interne Eskalation an den Hersteller ist dokumentiert; keine eigene Wirtschaftsakteursrolle festgestellt.',craTransitionDates:'Anwendungszeitpunkte werden im Rechtskataster überwacht.',craAiActOverlapNotes:'Cybersicherheitsanforderungen werden mit den AI-Act-Kontrollen abgestimmt.',craConclusion:'product_only',craBasis:'Das Produkt mit digitalen Elementen ist vom CRA erfasst; die betrachtete Organisation nutzt es ausschließlich und übernimmt keine CRA-Wirtschaftsakteursrolle.',craEvidence:'Vertrag, Herstellerangaben und technische Architektur.',regulatoryNotes:'Datenschutzprüfung wird separat durchgeführt.',legalSources:'EU AI Act Art. 3, 4, 22–27, 49 und 50; CRA.',transitionNotes:'Stichtage im Maßnahmenplan nachhalten.',
    planCoordinator:'Compliance-Koordination',planStatus:'complete',implementationNotes:'Monatliche Statusrunde bis Abschluss.',planEvidence:'Maßnahmenprotokoll.',crossReferences:'R-01 ↔ RM-R-01; REG-TR-01 ↔ Kennzeichnung.',newTechnicalFeature:'no',newTechnicalFeatureReason:'Die technische Systemgrenze und alle eingesetzten Komponenten sind im aktuellen Stand erfasst.',legalRegimeFulfilment:'clarified',legalRegimeFulfilmentEvidence:'EU AI Act, Cyber Resilience Act und Datenschutzrecht wurden für die vorgesehenen Maßnahmen abgegrenzt; Rechtskataster, Datenschutzprüfung und Herstellerunterlagen dokumentieren die Pflichterfüllung.',
    assessmentId:'KIR-2026-001',assessmentVersion:'1.0',guideVersion:'Version 2.0 – vorläufige Fassung',changeHistory:'1.0 – Erstbewertung des Pilotbetriebs; keine frühere Bewertung vorhanden.',documentationOwner:'Compliance-Koordination',reviewer:'Interne Revision',approver:'Bereichsleitung',overallReasoning:'Pilotbetrieb ist nur unter den dokumentierten Kontrollen und nach CRA-Klärung zulässig.',conditions:'Ergänzende Erläuterung: menschliche Bestätigung und Monitoring.',blockers:'Keine ergänzende Anmerkung.',openRequirements:'CRA-Abgrenzung als ergänzende Anmerkung.',openMeasures:'Monitoringindikator ergänzend beschrieben.',openReviews:'Nicht blockierende CRA-Rechtsprüfung.',manualBlockerActive:'no',manualBlockerReason:'',nextReviewDate:'2027-03-31',reviewFrequency:'Halbjährlich und anlassbezogen',reviewEvidence:'Reviewprotokoll, Monitoringbericht und Maßnahmenstatus.',approvalStatus:'conditional',approvalDate:'2026-09-16',documentLocation:'Zentrale Bewertungsakte / KIR-2026-001',accessRights:'Rollenbasierter Zugriff für Fachbereich, IT, Compliance, Datenschutz und Revision.',statutoryRetentionStatus:'determined',statutoryRetentionBasis:'Die einschlägige Frist und Rechtsgrundlage sind im Rechtskataster des Musterfalls dokumentiert.',internalRetentionPeriod:'Bis zum Abschluss des nächsten regulären Reviews, danach gemäß interner Aktenordnung.',preservePreviousAssessments:'yes',evidenceInventory:'Technische Dokumentation: Produktdokumentation und Systembeschreibung; Risikomanagement nach Art. 9: nicht einschlägig; Qualitätsmanagement: nicht einschlägig; Protokollierung: Pilotprotokoll; Konformitätserklärung: nicht einschlägig; Registrierung: nicht einschlägig; Post-Market-Monitoring: Monitoringbericht; Vorfälle: keine; Grundrechte-Folgenabschätzung: nicht einschlägig; Datenschutz-Folgenabschätzung: Datenschutzprüfung; GPAI-Dokumentation: nicht einschlägig; CRA-Risikobewertung und technische CRA-Dokumentation: Herstellerunterlagen.',evidenceInventoryVersion:'1.0',evidenceInventoryDate:'2026-09-16',evidenceInventoryLocation:'Zentrale Bewertungsakte / KIR-2026-001 / Nachweise',distribution:'Fachbereich, IT, Compliance, Datenschutz',additionalNotes:'Die Bewertung ersetzt keine Einzelfallrechtsberatung.'
  });
  definitionQuestionKeys.forEach(key=>{if(!isFilled(f[key]))f[key]=['adaptivity','deterministicOnly','basicDataProcessing','establishedMath','simpleHeuristics'].includes(key)?'no':'yes';});f.objectType='system_with_model';
  scopeQuestionKeys.forEach(key=>{if(!isFilled(f[key]))f[key]=['scopeProviderMarketEU','scopeDeployerEU','euOutputEffect','scopeAffectedEU'].includes(key)?'yes':'no';});
  Object.assign(f,{purposeAlignment:'matches',humanReview:'yes',humanCorrection:'yes',foreseeableMisuse:'no',sensitiveSituation:'no',publicServiceEntity:'no',unionAuthority:'no',roleProviderFact:'yes',roleGpaiProviderFact:'no',roleDeployerFact:'yes',roleRepresentativeFact:'no',roleImporterFact:'no',roleDistributorFact:'no',roleProductManufacturerFact:'no',productIntegration:'no'});
  prohibitedQuestions.forEach(([key])=>f[key]='not_met');annexAreas.forEach(([key])=>f[key]='no');transparencyQuestions.forEach(([key])=>{if(!isFilled(f[key]))f[key]='no';});
  Object.assign(f,{productCovered:'no',productSafetyComponent:'no',annexISection:'A',thirdPartyConformity:'no',conformityNonSafetyOnly:'no',gModel:'no',gIndicativeFlops:'no',gResearchOnly:'no',gObjectType:'system',gSelfProvision:'no',gModification:'no',gNonEuProvider:'no',gOpenSource:'no',gSystemicRisk:'no',gCommissionDesignation:'no',gAnnexXIII:'no',gpaiOrganizationRole:'none',craDigitalProduct:'yes',craRemoteProcessing:'yes',craDataConnection:'yes',craCommercial:'yes',craPrototype:'no',craOpenSource:'no',craExclusion:'no',craRole:'none',craRoleManufacturer:'no',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'no',craSubstantialChange:'no',craManufacturerTakeover:'no',craProductClass:'other',craAiActOverlap:'no',timeAssessmentBasis:'yes',timeDutyStatuses:'yes',timeTransition:'no',timeLawChanged:'no',publicAuthorityIntendedUse:'no',timeBasis:'Bewertungsstichtag und Rechtsstand sind dokumentiert.',timeEvidence:'Rechtskataster und Bewertungsakte.',intendedUseDate:'2026-09-16',firstMarketDate:'2026-09-01',firstOperationDate:'2026-09-16',substantialChangeStatus:'no',craFirstMarketDate:'2026-09-01',craTransitionEvidence:'Herstellerunterlagen und Produktakte belegen das erstmalige Inverkehrbringen.',scopeLimitationOwner:'Rechts- und Compliance-Funktion',scopeLimitationDue:'2026-10-15'});
  Object.assign(f,{riskSystemBoundary:f.systemBoundary,riskDataSources:f.dataSources,riskModelsComponents:f.techComponents,riskInterfacesEnvironment:f.interfaces,riskHumanOversight:'Menschliche Bestätigung und Übersteuerung sind möglich.',riskExistingControls:'Rollenbasierter Zugriff, Stichprobentests und Monitoring.'});
  riskDomainKeys.forEach((key,index)=>f[key]=[11,12,16,17,19,20].includes(index+10)?'yes':'no');riskEvaluationKeys.forEach(key=>f[key]='no');
  const markFictitious=value=>isFilled(value)&&!String(value).startsWith('Fiktiver Nachweisverweis – ')?`Fiktiver Nachweisverweis – ${value}`:value;
  Object.keys(f).filter(key=>/(?:Evidence|EvidenceSource)$/i.test(key)||['otherEvidence','infoSources','evidenceInventory'].includes(key)).forEach(key=>{f[key]=markFictitious(f[key]);});
  Object.entries(QUESTION_IDS).forEach(([key,id])=>{if(isFilled(f[key]))sample.guideAnswers[id]={value:f[key],sourceField:key};});
  sample.risks=[{
    riskId:'R-01',source:'Pilotbeobachtung',description:'Fehlklassifikation eines Geschäftsdokuments',event:'Das Modell ordnet ein Dokument dem falschen Vorgang zu.',consequence:'Verzögerte Bearbeitung und mögliche Fehladressierung.',affectedAreas:'Dokumentenmanagement sowie betroffene Kunden und Vertragspartner.',orgEffect:'Mehraufwand und Fristversäumnis.',personEffect:'Verspätete Bearbeitung eines Anliegens.',societalEffect:'Keine wesentliche kollektive Auswirkung.',environmentalEffect:'Keine erkennbare Umweltauswirkung.',category:'Zuverlässigkeit und Datenschutz',existingControls:'Menschliche Bestätigung und rollenbasierter Zugriff.',controlEvidence:'Pilotprotokoll und Berechtigungstest.',probability:'2',impact:'3',controlEffectiveness:'effective',currentRisk:'high',uncertainty:'low',acceptance:'conditional',riskOwner:'Fachverantwortung',acceptanceApproval:'Bedingte Akzeptanz für den Pilotbetrieb durch die Fachverantwortung.',treatmentNeeded:'yes',suitableTreatmentAvailability:'available',treatmentAvailabilityReason:'Konfidenzschwelle und Monitoring sind als geeignete Behandlung bestimmt.',treatmentStrategy:'reduce',priority:'high',proposedTreatment:'Konfidenzschwelle und Stichprobenmonitoring etablieren.',treatmentDue:'2026-10-15',expectedResidual:'low',owner:'Fachverantwortung',expertReview:'no',legalReview:'no',decisionCriticality:'no',verifiedResidual:'low',treatmentStatus:'verified',effectivenessCriterion:'Fehlklassifikationsquote unter 2 Prozent.',effectivenessEvidence:'Pilotmonitoring und Stichprobenprotokoll.',effectivenessDate:'2026-09-15',effectivenessReviewer:'Qualitätsmanagement',linkedRequirement:'Interne Qualitätsvorgabe',monitoringIndicator:'Fehlklassifikationsquote < 2 %',comments:'Monatliche Stichprobe.'
  }];
  orgAreas.forEach(([id])=>{sample.org[id]={status:'fulfilled',criteria:Object.fromEntries((orgCriteria[id]||[]).map(([key])=>[key,{answer:'fulfilled',reason:''}])),finding:'Verfahren ist für den Pilotbetrieb festgelegt.',rationale:'Rollen, Ablauf und Kontrollen sind dokumentiert.',evidence:'Freigegebene Prozessbeschreibung.',evidenceLocation:'Bewertungsakte',gap:'Keine entscheidungskritische Lücke.',impact:'Keine wesentliche Auswirkung.',measure:'Regelmäßig überprüfen und aktualisieren.',owner:'Bereichsleitung',transfer:'no',decisionCritical:'no',deadline:'2027-03-31',notes:'Im Review erneut bewerten.'};});
  sample.registers.regulatory=[
    {id:'REG-DUTY-22',sourceQuestionId:'TR-01',dutyCode:'DUTY-22',basis:'Art. 50 Abs. 1',requirement:guideLabel('DUTY-22'),linkedResult:'Transparenzpflicht – Anbieter',obligatedRole:'Anbieter',applicability:'current',applicableDate:'2026-09-16',applicabilityReason:'Für die dokumentierte Interaktion am Bewertungsstichtag umzusetzen.',assessmentDate:'2026-09-16',beforeRelease:'no',decisionCritical:'no',blocking:'no',owner:'Produktverantwortung',due:'2026-10-15',status:'fulfilled',evidence:'Abnahmetest Kennzeichnung',priority:'high'},
    {id:'REG-DUTY-26',sourceQuestionId:'TR-01 bis TR-05',dutyCode:'DUTY-26',basis:'Art. 50 Abs. 5',requirement:guideLabel('DUTY-26'),linkedResult:'Transparenzpflichten',obligatedRole:'Anbieter',applicability:'current',applicableDate:'2026-09-16',applicabilityReason:'Allgemeine Formanforderung zu der festgestellten Pflicht.',assessmentDate:'2026-09-16',beforeRelease:'no',decisionCritical:'no',blocking:'no',owner:'Produktverantwortung',due:'2026-10-15',status:'fulfilled',evidence:'Barrierefreier Oberflächentest',priority:'high'},
    {id:'REG-DUTY-01',sourceQuestionId:'ROLE-01 / ROLE-03',dutyCode:'DUTY-01',basis:'Art. 4 Abs. 1 i. d. F. der VO (EU) 2026/1744',requirement:guideLabel('DUTY-01'),linkedResult:'Anbieter- und Betreiberrolle',obligatedRole:'Anbieter / Betreiber',applicability:'current',applicableDate:'2026-09-16',applicabilityReason:'Für Anbieter und Betreiber einschlägig.',assessmentDate:'2026-09-16',beforeRelease:'yes',decisionCritical:'yes',blocking:'no',owner:'Personalentwicklung',due:'2026-09-16',status:'fulfilled',evidence:'Schulungskonzept und Teilnahmeprotokoll',priority:'medium'}
  ];
  sample.registers.risk=[{id:'RM-R-01',sourceQuestionId:'RISK-24 bis RISK-31',riskId:'R-01',basis:'Kapitel 3 – 3×3-Risikomatrix',measure:'Konfidenzschwelle und Stichprobenmonitoring etablieren.',target:'Erwartetes Restrisiko Niedrig',linkedResult:'R-01: Hoch',strategy:'reduce',priority:'high',beforeRelease:'yes',blocking:'no',owner:'Fachverantwortung',due:'2026-10-15',status:'verified',effectivenessCriterion:'Fehlklassifikationsquote unter 2 Prozent.',effectivenessReview:'2026-09-15',reviewer:'Qualitätsmanagement',evidence:'Pilotmonitoring und Stichprobenprotokoll.',residual:'low'}];
  sample.registers.organizational=[{id:'ORG-MON',area:'Monitoring und Review',measure:'Monatliches Qualitätsmonitoring',impact:'Dauerhafte Wirksamkeit der Kontrollen.',basis:'Organisationsbewertung Schritt 6',priority:'medium',beforeRelease:'no',decisionCritical:'no',owner:'Fachverantwortung',due:'2026-10-15',status:'verified',evidence:'Monitoringbericht'}];
  sample.registers.legal=[{id:'JP-CRA',sourceQuestionId:'CRA-01',craDecisionArea:'product_applicability',question:'Ist die konkrete Cloud-Anwendung ein Produkt mit digitalen Elementen?',reason:'CRA-Abgrenzung für kommerziellen Cloud-Dienst.',linkedResult:'CRA-Produktanwendbarkeit',owner:'Rechtsabteilung',sourceStep:'4',legalBasis:'Cyber Resilience Act',assessmentImpact:'Nicht entscheidungsblockierend; Auflage bis Regelbetrieb.',priority:'medium',due:'2026-10-31',status:'inReview',result:'Prüfung beauftragt.',ruleBlocking:'no',ruleBlockingReason:'Die Produktabgrenzung ist als Auflage nachverfolgbar und verhindert den dokumentierten Pilotbetrieb nicht.',blocking:'no',blockingReason:'Fachlich als nicht blockierend festgelegt; Klärung vor dem Regelbetrieb.'}];
  sample.triggers.forEach(trigger=>Object.assign(trigger,{required:'yes',steps:triggerDefs.find(([id])=>id===trigger.id)?.[3]||'1–8 je nach Auswirkung',owner:'Compliance-Koordination',due:'2026-09-30'}));
  sample.risks.forEach(risk=>['controlEvidence','effectivenessEvidence'].forEach(key=>{if(isFilled(risk[key]))risk[key]=markFictitious(risk[key]);}));
  Object.values(sample.org).forEach(area=>{if(isFilled(area.evidence))area.evidence=markFictitious(area.evidence);});
  Object.values(sample.registers).flat().forEach(item=>{item.sourceQuestionId??=item.sourceId||'REVIEW-07';item.linkedResult??='Bewertungsergebnis des zugehörigen Prüfschritts';item.blocking??=item.decisionCritical==='yes'?'yes':'no';if(isFilled(item.evidence))item.evidence=markFictitious(item.evidence);if(item.dutyCode){item.fulfillability??='fulfillable';item.fulfillabilityReason??=['fulfilled','verified'].includes(item.status)?'Erfüllbarkeit wurde bejaht; der Umsetzungsstatus ist gesondert manuell als erfüllt dokumentiert.':'Erfüllbarkeit ist dokumentiert; der Umsetzungsstatus bleibt gesondert.';}if('blocking' in item&&(sample.registers.expert.includes(item)||sample.registers.legal.includes(item))){item.ruleBlocking??=item.blocking;item.ruleBlockingReason??=item.blockingReason||'Fallbezogene Bewertung im Musterfall.';item.blockingReason??=item.ruleBlockingReason;}});
  sample.evaluated=Array(8).fill(true);return sample;
}

function withTemporaryState(testState,fn){const previous=state;state=testState;try{return fn();}finally{state=previous;}}
function fillRegulatoryNo(testState){
  const f=testState.form;definitionQuestionKeys.forEach(key=>f[key]=['adaptivity','deterministicOnly','basicDataProcessing','establishedMath','simpleHeuristics'].includes(key)?'no':'yes');f.objectType='system';scopeQuestionKeys.forEach(key=>f[key]='no');f.scopeDeployerEU='yes';
  prohibitedQuestions.forEach(([key])=>f[key]='not_met');annexAreas.forEach(([key])=>f[key]='no');transparencyQuestions.forEach(([key])=>f[key]='no');
  Object.assign(f,{realWorldTesting:'no',actualOperationalUse:'yes',scopeBasis:'Begründet',scopeEvidence:'Nachweis',definitionBasis:'Begründet',definitionEvidenceSource:'Nachweis',role_deployer:true,roleDeployerFact:'yes',ownBrand:'no',substantialModification:'no',purposeChange:'no',productIntegration:'no',humanCorrection:'yes',prohibitionConclusion:'none',prohibitionBasis:'Begründet',prohibitionEvidence:'Nachweis',productCovered:'no',productSafetyComponent:'no',annexISection:'A',thirdPartyConformity:'no',conformityNonSafetyOnly:'no',productHighRiskConclusion:'no',productHighRiskBasis:'Begründet',productHighRiskEvidence:'Nachweis',annexHighRiskConclusion:'no',annexBasis:'Begründet',annexEvidence:'Nachweis',transparencyConclusion:'none',transparencyBasis:'Begründet',transparencyEvidence:'Nachweis',gModel:'no',gIndicativeFlops:'no',gResearchOnly:'no',gObjectType:'system',gSelfProvision:'no',gModification:'no',gNonEuProvider:'no',gOpenSource:'no',gSystemicRisk:'no',gCommissionDesignation:'no',gAnnexXIII:'no',gpaiOrganizationRole:'none',gpaiBasis:'Keine GPAI-Relevanz.',gpaiEvidence:'Nachweis',gpaiConclusion:'none',craDigitalProduct:'no',craRemoteProcessing:'no',craDataConnection:'no',craCommercial:'no',craPrototype:'no',craOpenSource:'no',craExclusion:'no',craRole:'none',craRoleManufacturer:'no',craRoleRepresentative:'no',craRoleImporter:'no',craRoleDistributor:'no',craRoleSteward:'no',craSubstantialChange:'no',craManufacturerTakeover:'no',craProductClass:'none',craAiActOverlap:'no',craBasis:'Nicht anwendbar.',craEvidence:'Nachweis',craConclusion:'no',timeAssessmentBasis:'yes',timeDutyStatuses:'yes',timeTransition:'no',timeLawChanged:'no',publicAuthorityIntendedUse:'no',timeBasis:'Begründet',timeEvidence:'Nachweis',legalRegimeFulfilment:'clarified',legalRegimeFulfilmentEvidence:'Pflichterfüllung und Zusammenwirken der einschlägigen Rechtsregime sind dokumentiert.'});
  orgAreas.forEach(([id])=>{testState.org[id]={status:'fulfilled',criteria:Object.fromEntries((orgCriteria[id]||[]).map(([key])=>[key,{answer:'fulfilled',reason:''}]))};});
  testState.registers.regulatory=[{id:'REG-DUTY-01',sourceQuestionId:'ROLE-01 / ROLE-03',dutyCode:'DUTY-01',basis:highRiskDutyCatalog.find(item=>item[0]==='DUTY-01')?.[2]||'Art. 4',requirement:guideLabel('DUTY-01'),linkedResult:'Betreiberrolle',obligatedRole:'Betreiber',applicability:'current',applicabilityReason:'Regulatorisch relevant.',assessmentDate:'2026-09-30',fulfillability:'fulfillable',fulfillabilityReason:'Erfüllung ist belegt.',beforeRelease:'no',decisionCritical:'no',blocking:'no',owner:'Organisation',due:'2026-09-30',status:'fulfilled',evidence:'Nachweis',priority:'medium'}];return testState;
}

/** Liefert für dynamische Isolationstests eine unabhängige Referenzkopie. */
function getReportReferencesForTest(){return captureReportReferenceData();}

/**
 * Ersetzt Referenztabellen ausschließlich am kontrollierten Testzugang. Jede
 * übernommene Wissensbasis wird erneut rekursiv eingefroren.
 */
function setReportReferencesForTest(next){
  if(!next?.knowledgeBase||!Array.isArray(next.guideReference)||!Array.isArray(next.steps)||!Array.isArray(next.orgAreas)||!next.orgCriteria||!Array.isArray(next.triggerDefs)||!next.registerSchemas||!next.regulatoryPathLabels)throw new Error('Unvollständige Referenzdaten für den Isolationstest.');
  KNOWLEDGE_BASE=deepFreezeReference(structuredClone(next.knowledgeBase));
  GUIDE_REFERENCE=structuredClone(next.guideReference);GUIDE_REFERENCE_IDS=GUIDE_REFERENCE.map(item=>item.id);GUIDE_REFERENCE_BY_ID=Object.fromEntries(GUIDE_REFERENCE.map(item=>[item.id,item]));
  steps=structuredClone(next.steps);orgAreas=structuredClone(next.orgAreas);orgCriteria=structuredClone(next.orgCriteria);triggerDefs=structuredClone(next.triggerDefs);registerSchemas=structuredClone(next.registerSchemas);regulatoryPathLabels=structuredClone(next.regulatoryPathLabels);
}
function runSelfTests(){
  const results=[];const test=(name,fn)=>{try{const pass=Boolean(fn());results.push({name,pass,detail:pass?'OK':'Erwartung nicht erfüllt'});}catch(error){results.push({name,pass:false,detail:error.message});}};
  test('Neue Bewertung startet neutral',()=>withTemporaryState(freshState(),()=>steps.every((_,i)=>stepStatus(i)==='neutral')));
  test('Neue Bewertung startet bei 0 %',()=>withTemporaryState(freshState(),()=>completionPercent()===0));
  test('Leerer Schritt wird nach Verlassen rot',()=>{const s=freshState();s.evaluated[0]=true;return withTemporaryState(s,()=>stepStatus(0)==='red');});
  test('Risikoanalyse startet ohne Risiken',()=>freshState().risks.length===0);
  test('SCOPE-03 eröffnet als eigenständige Alternative den territorialen Anwendungsbereich',()=>{const s=fillRegulatoryNo(freshState());scopeQuestionKeys.forEach(key=>s.form[key]='no');Object.assign(s.form,{euOutputEffect:'yes',realWorldTesting:'no',actualOperationalUse:'yes'});return withTemporaryState(s,()=>evaluateScope().code==='applicable');});
  test('Definitionsinformationen verändern Anwendungsstatus nicht',()=>{const s=fillRegulatoryNo(freshState());return withTemporaryState(s,()=>{const a=evaluateScope().code;s.form.definitionEvidence='no';return a===evaluateScope().code;});});
  test('Widerspruch zwischen Tatbestand und Schlussfolgerung',()=>{const s=fillRegulatoryNo(freshState());const key=prohibitedQuestions[0][0];Object.assign(s.form,{[key]:'yes',[`${key}Use`]:'Dokumentiert',[`${key}ElementsResult`]:'met',[`${key}Elements`]:'Merkmale erfüllt',[`${key}Exception`]:'none',[`${key}Reason`]:'Begründet',[`${key}Evidence`]:'Nachweis',[`${key}Affected`]:'Betroffene',[`${key}LegalOwner`]:'Rechtsstelle',[`${key}Critical`]:'yes',prohibitionConclusion:'none'});return withTemporaryState(s,()=>evaluateProhibitedPractices().contradictions.length>0);});
  test('Anhang-III-Treffer ohne Vertiefung bleibt offen',()=>{const s=fillRegulatoryNo(freshState());s.form.annexEmployment='yes';return withTemporaryState(s,()=>evaluateAnnexHighRisk().code==='review');});
  test('Profiling verhindert Ausnahme nach Art. 6 Abs. 3',()=>{const s=fillRegulatoryNo(freshState());Object.assign(s.form,{annexEmployment:'yes',specificAnnexUse:'Personalvorauswahl',art63Exception:'yes',narrowProcedural:'yes',completedResultImprovement:'no',patternDetection:'no',preparatoryTask:'no',significantRisk:'no',profiling:'yes',annexDocumentation:'yes',annexRegistration:'yes',annexRoleChange:'no',annexBasis:'Begründet',annexEvidence:'Nachweis',annexHighRiskConclusion:'exception'});return withTemporaryState(s,()=>evaluateAnnexHighRisk().contradictions.some(x=>/Profiling/.test(x)));});
  test('Bestätigter Verbotstatbestand beendet die konkrete Verwendung',()=>{const s=fillRegulatoryNo(freshState());const key=prohibitedQuestions[0][0];Object.assign(s.form,{[key]:'yes',[`${key}Use`]:'Dokumentiert',[`${key}ElementsResult`]:'met',[`${key}Elements`]:'Merkmale erfüllt',[`${key}Exception`]:'none',[`${key}Reason`]:'Begründet',[`${key}Evidence`]:'Nachweis',[`${key}Affected`]:'Betroffene',[`${key}LegalOwner`]:'Rechtsstelle',[`${key}Critical`]:'yes',prohibitionConclusion:'confirmed'});return withTemporaryState(s,()=>overallDecision(false,true).code==='USE_NOT_CONTINUABLE');});
  test('Möglicher Verbotstatbestand macht die Bewertung nicht abschließbar',()=>{const s=fillRegulatoryNo(freshState());const key=prohibitedQuestions[0][0];s.form[key]='possible';s.form.prohibitionConclusion='review';return withTemporaryState(s,()=>overallDecision(false,true).code==='ASSESSMENT_NOT_CONCLUDABLE');});
  test('Nicht akzeptiertes Risiko ohne Behandlung ist widersprüchlich',()=>{const s=fillRegulatoryNo(freshState());s.risks=[{riskId:'R-1',acceptance:'notAccepted',treatmentNeeded:'no'}];return withTemporaryState(s,()=>allRiskContradictions().length>0);});
  test('REVIEW-10: Hohes Risiko ohne bestimmbare Behandlung ist ein festgestelltes Hindernis',()=>{const s=fillRegulatoryNo(freshState());s.risks=[{riskId:'R-1',currentRisk:'high',verifiedResidual:'low',acceptance:'notAccepted',treatmentNeeded:'review',suitableTreatmentAvailability:'unavailable',treatmentAvailabilityReason:'Keine geeignete Behandlung bestimmbar.'}];return withTemporaryState(s,()=>overallDecision(false,true).code==='USE_NOT_CONTINUABLE'&&evaluateReview10().value==='yes');});
  test('REVIEW-10: Verfügbare Behandlung mit niedrigem erwartetem Restrisiko erzeugt keinen Blocker',()=>{const s=fillRegulatoryNo(freshState());s.risks=[{riskId:'R-1',currentRisk:'high',acceptance:'notAccepted',treatmentNeeded:'yes',expectedResidual:'low',suitableTreatmentAvailability:'available',treatmentAvailabilityReason:'Maßnahme ist bestimmt.',treatmentStatus:'planned',proposedTreatment:'Kontrolle',owner:'Fachbereich',treatmentDue:'2027-01-01'}];return withTemporaryState(s,()=>overallDecision(false,true).code!=='USE_NOT_CONTINUABLE'&&evaluateReview10().value==='no');});
  test('REVIEW-10: Unklare Behandlungsmöglichkeit macht die Bewertung nicht abschließbar',()=>{const s=fillRegulatoryNo(freshState());s.risks=[{riskId:'R-1',currentRisk:'high',acceptance:'notAccepted',treatmentNeeded:'review',suitableTreatmentAvailability:'review',treatmentAvailabilityReason:'Fachprüfung offen.'}];return withTemporaryState(s,()=>overallDecision(false,true).code==='ASSESSMENT_NOT_CONCLUDABLE'&&evaluateReview10().value==='review');});
  test('Offene kritische Organisationsmaßnahme verhindert den Abschluss',()=>{const s=fillRegulatoryNo(freshState());s.registers.organizational=[{id:'ORG-1',decisionCritical:'yes',beforeRelease:'yes',status:'open'}];return withTemporaryState(s,()=>overallDecision(false,true).code==='ASSESSMENT_NOT_CONCLUDABLE');});
  test('Vollständig nachverfolgter nichtkritischer Prüfbedarf ergibt offenen Maßnahmenstatus',()=>{const s=fillRegulatoryNo(freshState());s.risks=[{riskId:'R-STABIL',probability:'1',impact:'1',acceptance:'accepted',treatmentNeeded:'no',acceptanceReason:'Niedriges Risiko.',riskOwner:'Fachbereich',acceptanceApproval:'Dokumentierte Akzeptanz.'}];s.registers.legal=[{id:'JP-1',sourceQuestionId:'DUTY-47',linkedResult:'CRA-Ergebnis',craDecisionArea:'not_applicable',status:'open',blocking:'no',owner:'Recht',due:'2027-01-01',result:'Prüfauftrag'}];return withTemporaryState(s,()=>overallDecision(false,true).code==='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES');});
  test('Gesonderte Entscheidung erzeugt nur einen Hinweis und verändert den Status nicht',()=>{const s=freshState();return withTemporaryState(s,()=>{const before=overallDecision(false,true).code;s.form.approvalStatus='approved';const after=overallDecision(true,true);return after.code===before&&approvalConsistency(after).warnings.length===1&&!after.reasons.some(item=>item.code==='APPROVAL-CONTRADICTION');});});
  test('Unvollständige Bewertung ist ein Entwurf',()=>withTemporaryState(freshState(),()=>isDraftReport()));
  test('Abgeleitete Register werden aktualisiert und nicht dupliziert',()=>{const s=fillRegulatoryNo(freshState());s.risks=[{riskId:'R-1',treatmentNeeded:'yes',proposedTreatment:'A',currentRisk:'medium'}];return withTemporaryState(s,()=>{syncDerivedRegisters();s.risks[0].proposedTreatment='B';syncDerivedRegisters();return s.registers.risk.length===1&&s.registers.risk[0].measure==='B';});});
  test('Hohes akzeptiertes Risiko braucht Begründung und menschliche Entscheidung',()=>{const s=freshState();s.risks=[{riskId:'R-1',currentRisk:'high',acceptance:'accepted',treatmentNeeded:'yes'}];return withTemporaryState(s,()=>riskContradictions(s.risks[0]).some(item=>/menschliche Entscheidung/.test(item)));});
  test('Hohes verifiziertes Restrisiko außerhalb der Toleranz ist ein festgestelltes Hindernis',()=>{const s=fillRegulatoryNo(freshState());s.risks=[{riskId:'R-1',currentRisk:'high',verifiedResidual:'high',acceptance:'conditional',treatmentNeeded:'yes',treatmentStatus:'verified',effectivenessEvidence:'Nachweis'}];return withTemporaryState(s,()=>overallDecision(false,true).code==='USE_NOT_CONTINUABLE');});
  test('Mehr als ein fehlendes optionales Feld ergibt Gelb',()=>{const s=exampleState();delete s.form.assessmentUpdate;delete s.form.providerContact;delete s.form.otherEvidence;return withTemporaryState(s,()=>stepStatus(0)==='yellow');});
  test('Höchstens ein fehlendes optionales Feld ergibt Grün',()=>{const s=exampleState();delete s.form.providerContact;return withTemporaryState(s,()=>stepStatus(0)==='green');});
  test('Musterfall bleibt vollständig ladbar',()=>{const s=exampleState();return withTemporaryState(s,()=>s.risks.length===1&&s.evaluated.every(Boolean));});
  test('Ursprünglich widersprüchlicher Musterfall markiert die betroffenen Prüfschritte rot',()=>{const s=exampleState();return withTemporaryState(s,()=>stepStatus(3)==='red'&&stepStatus(6)==='red');});
  test('Ursprünglich widersprüchlicher Musterfall bleibt bis zur fachlichen Klärung nicht abschließbar',()=>{const s=exampleState();return withTemporaryState(s,()=>overallDecision().code==='ASSESSMENT_NOT_CONCLUDABLE');});
  test('Vollständiger Bericht enthält alle Pflichtkapitel und kennzeichnet den ungeklärten Musterfall als Entwurf',()=>{const s=exampleState();return withTemporaryState(s,()=>{const report=buildReport(buildReportData());const required=['Bewertungsstatus','Vollständige Leitfadenreferenz','KI-System, Anwendungsbereich und Rolle','Regulatorische Einordnung','Risikoregister und Bewertungsstufen','Organisatorisches Bewertungsprofil','Konsolidierter Anforderungs- und Maßnahmenplan','Operationalisierte Pflichten DUTY-01 bis DUTY-47','Operationalisierte Review-Ergebnisse REVIEW-01 bis REVIEW-42','Gesonderte menschliche beziehungsweise organisatorische Entscheidung','Entscheidungs- und Plausibilitätsanhang','Risiko-, Register- und Entscheidungsanhang'];return (report.match(/<section class="report-page(?:\s|")/g)||[]).length>=14&&required.every(title=>report.includes(title))&&report.includes('Entwurf –');});});
  test('Implementierungsprüfung erkennt absichtlich fehlende DUTY-ID',()=>!validateGuideImplementation({omit:['DUTY-47']}).valid&&validateGuideImplementation({omit:['DUTY-47']}).missing.includes('DUTY-47'));
  test('Implementierungsprüfung erkennt absichtlich fehlende REVIEW-ID',()=>!validateGuideImplementation({omit:['REVIEW-42']}).valid&&validateGuideImplementation({omit:['REVIEW-42']}).missing.includes('REVIEW-42'));
  test('Alle DUTY- und REVIEW-Kennungen liefern operationale Ergebnisse',()=>withTemporaryState(exampleState(),()=>dutyOperationalResults().length===47&&reviewOperationalResults().length===42&&dutyOperationalResults().every(item=>item.path&&item.reason)&&reviewOperationalResults().every(item=>item.path&&item.reason)));
  test('DUTY-16 gilt für Bevollmächtigte bei dokumentierter Ausnahme ohne Duplikat',()=>{const s=fillRegulatoryNo(freshState());Object.assign(s.form,{role_authorisedRepresentative:true,role_provider:false,annexEmployment:'yes',specificAnnexUse:'Personalvorauswahl',narrowProcedural:'yes',completedResultImprovement:'no',patternDetection:'no',preparatoryTask:'no',materialInfluenceControl:'no',profiling:'no',annexHighRiskConclusion:'exception',annexBasis:'Ausnahme belegt.',annexEvidence:'Nachweis'});return withTemporaryState(s,()=>{const duties=requiredHighRiskDuties().filter(item=>item.code==='DUTY-16');return duties.length===1&&duties[0].role.includes('Bevollmächtigter');});});
  test('DUTY-16 nennt Anbieter und Bevollmächtigten bei Mehrfachrolle nur einmal',()=>{const s=fillRegulatoryNo(freshState());Object.assign(s.form,{role_authorisedRepresentative:true,role_provider:true,annexEmployment:'yes',specificAnnexUse:'Personalvorauswahl',narrowProcedural:'yes',completedResultImprovement:'no',patternDetection:'no',preparatoryTask:'no',materialInfluenceControl:'no',profiling:'no',annexHighRiskConclusion:'exception',annexBasis:'Ausnahme belegt.',annexEvidence:'Nachweis'});return withTemporaryState(s,()=>{const duties=requiredHighRiskDuties().filter(item=>item.code==='DUTY-16');return duties.length===1&&duties[0].role.includes('Anbieter')&&duties[0].role.includes('Bevollmächtigter');});});
  test('REVIEW-01 bis REVIEW-12 besitzen Werte, Begründungen und Quellen',()=>withTemporaryState(exampleState(),()=>reviewOperationalResults().slice(0,12).every(item=>isFilled(item.value)&&isFilled(item.reason)&&item.sources.length>0)));
  test('Ergebnisprofile bleiben getrennt und es wird kein numerischer Gesamtscore erzeugt',()=>withTemporaryState(exampleState(),()=>{const report=buildReport(buildReportData());return['Regulatorische Einordnung','Technische Risikobewertung','Organisatorische Bewertung'].every(text=>report.includes(text))&&!/Gesamtscore\s*[:=]\s*\d/i.test(report);}));
  test('Speichern und erneutes Laden erhält alle Daten',()=>{const previous=localStorage.getItem(STORAGE_KEY),s=exampleState();const passed=withTemporaryState(s,()=>{saveState();const loaded=loadState();return loaded.form.assessmentId===s.form.assessmentId&&loaded.risks[0].riskId==='R-01'&&loaded.evaluated.every(Boolean);});if(previous===null)localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY,previous);return passed;});
  test('Neu beginnen löscht Daten und Status',()=>{const previousState=state,previous=localStorage.getItem(STORAGE_KEY);try{state=exampleState();saveState();resetAssessment();return Object.keys(state.form).length===0&&state.risks.length===0&&state.evaluated.every(value=>!value)&&JSON.parse(localStorage.getItem(STORAGE_KEY)).evaluated.every(value=>!value);}finally{state=previousState;if(previous===null)localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY,previous);}});
  return{passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
}

window.__riskAppTest={
  getState:()=>structuredClone(state),
  freshState,
  stepStats,
  stepStatus,
  completionPercent,
  overallDecision,
  evaluateScope,
  evaluateAISystemDefinition,
  evaluateProhibitedPractices,
  evaluateProductHighRisk,
  evaluateAnnexHighRisk,
  evaluateTransparency,
  evaluateGPAI,
  evaluateCRA,
  craApplicabilityGate,
  evaluateHighRiskSummary,
  evaluateArt25,
  allRegulatoryEvaluations,
  gpaiPathStatus,
  aiActPathStatus,
  highRiskTemporalMeta,
  transparencyTemporalMeta,
  gpaiTemporalMeta,
  dutyTemporalMeta,
  riskScore,
  riskLevel,
  migrateV3ToV4,
  migrateV4ToV5,
  migrateV5ToV6,
  migrateV6ToV7,
  migrateV7ToV8,
  migrateV8ToV9,
  migrateV9ToV10,
  migrateV10ToV11,
  migrateV11ToV12,
  migrateV12ToV13,
  migrateV13ToV14,
  migrateV14ToV15,
  migrateV15ToV16,
  migrateToCurrent,
  deriveCraRoleSummary,
  applyCraRoleDerivation,
  classifyCraRegisterItem,
  openCraDependencyGroups,
  storedStateValidation,
  loadState,
  saveState,
  preparePersistableState,
  getPersistenceError:()=>lastPersistenceError,
  assessmentExportObject,
  assessmentExportJson,
  importAssessmentJson,
  validateGuideImplementation,
  guideReference:GUIDE_REFERENCE,
  questionIds:QUESTION_IDS,
  requiredHighRiskDuties,
  regulatoryOrgCriterionContext,
  evaluateOrgArea,
  organizationalOverall,
  guideReferenceStatus,
  questionValueLabel,
  exampleState,
  setStateForTest:(next)=>replaceActiveAssessment(next,'Teststand geladen.'),
  setRawStateForTest:(next)=>{state=normalizeState(next);state.reportVisible=false;activeReportType='compact';activeReportData=null;document.title=APPLICATION_TITLE;},
  getActiveReportInfo:()=>({type:activeReportType,visible:state.reportVisible,hasSnapshot:Boolean(activeReportData),title:document.title,toolName:activeReportData?.form?.toolName||'',internalToolId:activeReportData?.form?.internalToolId||''}),
  getReportReferencesForTest,
  setReportReferencesForTest,
  riskContradictions,
  duplicateRiskIds,
  registerValidation,
  approvalConsistency,
  evaluateReview10,
  review10RiskState,
  dutyOperationalResults,
  reviewOperationalResults,
  dutyImplementationRules:DUTY_IMPLEMENTATION_RULES,
  reviewImplementationRules:REVIEW_IMPLEMENTATION_RULES,
  syncDerivedRegisters,
  activeRegisterItems,
  statusRelevantRegisterItems,
  incompleteRegisterItems,
  isDraftReport,
  reportCompletionStatus,
  reportHeader,
  reportFooter,
  reportPage,
  buildReportData,
  buildReportBase,
  buildCompactReportFromSnapshot,
  buildEvidenceReportFromSnapshot,
  buildCompactReport,
  buildEvidenceReport,
  renderSelectedReport,
  reportFilename,
  reportBrowserTitle,
  showReportForTest:(type)=>showReport(type,false),
  printReportForTest:(type)=>printSelectedReport(type),
  setReportTypeForTest:(type)=>{activeReportType=type==='evidence'?'evidence':'compact';state.reportVisible=true;activeReportData=buildReportData();document.title=reportBrowserTitle(activeReportType,activeReportData.form,activeReportData.reference);renderStep();},
  buildReport,
  renderMatrix,
  stepStats,
  getStepValidation,
  stepSubstantiveResult,
  stepTitles:steps.map(([title])=>title),
  knowledgeBase:KNOWLEDGE_BASE,
  runSelfTests,
  resetAssessment,
  setField:(key,value)=>{state.form[key]=value;saveState();renderNavigation();renderStep();},
  setStepEvaluated:(index,value=true)=>{state.evaluated[index]=value;saveState();renderNavigation();renderStep();},
  loadExample:()=>replaceActiveAssessment(exampleState(),'Musterfall geladen.'),
  reset:resetAssessment
};

if(new URLSearchParams(window.location.search).has('selftest')){
  window.__riskSelfTestResult=runSelfTests();
}

/* 18. Ereignisbindung und Anwendungsstart */

function bindStepEvents(){
  document.querySelectorAll('[data-field]').forEach(element=>element.addEventListener(element.tagName==='SELECT'?'change':'input',()=>updateFormElement(element,element.tagName==='SELECT')));
  document.querySelectorAll('[data-question]').forEach(block=>block.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{const key=block.dataset.question;state.form[key]=button.dataset.answer;if(block.dataset.guideId)state.guideAnswers[block.dataset.guideId]={value:button.dataset.answer,sourceField:key};if(roleFlagByQuestion[key])state.form[`role_${roleFlagByQuestion[key]}`]=button.dataset.answer==='yes';if(button.dataset.answer==='yes'&&transparencyActorByKey[key])state.form[`${key}Actor`]=transparencyActorByKey[key];saveState();renderStep();refreshChrome();})));
  document.querySelectorAll('[data-role]').forEach(element=>element.addEventListener('change',()=>{state.form[`role_${element.dataset.role}`]=element.checked;saveState();renderStep();refreshChrome();}));
  document.querySelectorAll('[data-risk-field]').forEach(element=>element.addEventListener(element.tagName==='SELECT'?'change':'input',()=>updateRiskElement(element,element.tagName==='SELECT')));
  document.querySelector('#addRiskButton')?.addEventListener('click',()=>{const used=new Set(state.risks.map(risk=>risk.riskId).filter(isFilled));let number=1,id='';do{id=`R-${String(number++).padStart(2,'0')}`;}while(used.has(id));state.risks.push({riskId:id});saveState();renderStep();refreshChrome();});
  document.querySelectorAll('[data-remove-risk]').forEach(button=>button.addEventListener('click',()=>{state.risks.splice(Number(button.dataset.removeRisk),1);saveState();renderStep();refreshChrome();}));
  document.querySelectorAll('[data-org-field]').forEach(element=>element.addEventListener(element.tagName==='SELECT'?'change':'input',()=>updateOrgElement(element,element.tagName==='SELECT')));
  document.querySelectorAll('[data-org-criterion]').forEach(element=>element.addEventListener(element.tagName==='SELECT'?'change':'input',()=>updateOrgCriterionElement(element,element.tagName==='SELECT')));
  document.querySelectorAll('[data-register-field]').forEach(element=>element.addEventListener(element.tagName==='SELECT'?'change':'input',()=>updateRegisterElement(element,element.tagName==='SELECT')));
  document.querySelectorAll('[data-add-register]').forEach(button=>button.addEventListener('click',()=>{state.registers[button.dataset.addRegister].push({});saveState();renderStep();refreshChrome();}));
  document.querySelectorAll('[data-remove-register]').forEach(button=>button.addEventListener('click',()=>{state.registers[button.dataset.removeRegister].splice(Number(button.dataset.registerIndex),1);saveState();renderStep();refreshChrome();}));
  document.querySelector('#deriveRegistersButton')?.addEventListener('click',()=>{deriveRegisters();saveState('Befunde übernommen.');renderStep();refreshChrome();});
  document.querySelectorAll('[data-trigger-field]').forEach(element=>element.addEventListener(element.tagName==='SELECT'?'change':'input',()=>{state.triggers[Number(element.dataset.triggerIndex)][element.dataset.triggerField]=element.value;saveState();if(element.dataset.triggerField==='required')renderStep();refreshChrome();}));
  document.querySelector('#buildReportButton')?.addEventListener('click',finishAndReport);
  document.querySelector('#showCompactReportButton')?.addEventListener('click',()=>showReport('compact'));
  document.querySelector('#printCompactReportButton')?.addEventListener('click',()=>printSelectedReport('compact'));
  document.querySelector('#showEvidenceReportButton')?.addEventListener('click',()=>showReport('evidence'));
  document.querySelector('#printEvidenceReportButton')?.addEventListener('click',()=>printSelectedReport('evidence'));
  document.querySelector('#hideReportButton')?.addEventListener('click',()=>{state.reportVisible=false;activeReportData=null;document.title=APPLICATION_TITLE;saveState();renderStep();});
  document.querySelector('#printButton')?.addEventListener('click',()=>printSelectedReport(activeReportType));
}

document.querySelector('#previousButton').addEventListener('click',()=>{if(state.step>0)navigateTo(state.step-1);});
document.querySelector('#nextButton').addEventListener('click',()=>{if(state.step<7)navigateTo(state.step+1);else finishAndReport();});
document.querySelector('#resetButton').addEventListener('click',()=>{if(!confirm('Alle Eingaben, Risiken, Register, Bewertungen und Statusangaben löschen?'))return;resetAssessment();});
document.querySelector('#exampleButton').addEventListener('click',()=>{if(!confirm('Den aktuellen Stand durch einen vollständig ausgefüllten Musterfall ersetzen?'))return;replaceActiveAssessment(exampleState(),'Musterfall geladen.');});
document.querySelector('#exportButton')?.addEventListener('click',downloadAssessment);
document.querySelector('#importButton')?.addEventListener('click',()=>document.querySelector('#importFile')?.click());
document.querySelector('#recoveryExportButton')?.addEventListener('click',downloadRecoveryBackup);
document.querySelector('#importFile')?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{importAssessmentJson(await file.text());}catch(error){window.alert?.(error.message);}finally{event.target.value='';}});

renderNavigation();renderStep();
