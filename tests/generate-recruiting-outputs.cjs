/*
 * Erzeugt reproduzierbare Prüfartefakte für den vollständig fiktiven
 * Recruiting-Musterfall. Die fachlichen Inhalte stammen ausschließlich aus
 * guide-reference.js und app.js; diese Hilfsdatei ergänzt nur die HTML-Hülle.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const wurzel=path.join(__dirname,'..');
const ausgabe=path.join(wurzel,'output','recruiting');
const festerErzeugungszeitpunkt='2026-10-05T12:00:00.000Z';

const elemente=new Map();
function element(selector=''){
  if(!elemente.has(selector))elemente.set(selector,{
    textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},
    tagName:'DIV',value:'',checked:false,addEventListener(){},querySelector(){return null;},
    querySelectorAll(){return[];},scrollIntoView(){},click(){}
  });
  return elemente.get(selector);
}

const speicher=new Map();
const fenster={location:{search:''},scrollTo(){},print(){},alert(){}};
const kontext=vm.createContext({
  console,structuredClone,URLSearchParams,window:fenster,confirm:()=>true,
  localStorage:{
    getItem:schluessel=>speicher.has(schluessel)?speicher.get(schluessel):null,
    setItem:(schluessel,wert)=>speicher.set(schluessel,String(wert)),
    removeItem:schluessel=>speicher.delete(schluessel)
  },
  document:{
    title:'',querySelector:selector=>element(selector),querySelectorAll:()=>[],
    createElement:()=>element('erzeugter-anker')
  },
  Blob:class Blob{},URL:{createObjectURL:()=>'',revokeObjectURL(){}}
});
fenster.window=fenster;

vm.runInContext(fs.readFileSync(path.join(wurzel,'guide-reference.js'),'utf8'),kontext,{filename:'guide-reference.js'});
vm.runInContext(fs.readFileSync(path.join(wurzel,'app.js'),'utf8'),kontext,{filename:'app.js'});

const api=fenster.__riskAppTest;
if(!api)throw new Error('Die produktive Testschnittstelle window.__riskAppTest ist nicht verfügbar.');

api.setRawStateForTest(api.recruitingExampleState());
const exportObjekt=api.assessmentExportObject();
exportObjekt.exportedAt=festerErzeugungszeitpunkt;
const berichtsdaten=structuredClone(api.buildReportData());
berichtsdaten.generatedAt=festerErzeugungszeitpunkt;

function erwarte(bezeichnung,ist,soll){
  if(ist!==soll)throw new Error(`${bezeichnung}: erwartet ${JSON.stringify(soll)}, erhalten ${JSON.stringify(ist)}.`);
}

/* Alle fachlichen Vorbedingungen werden geprüft, bevor das Ausgabeverzeichnis oder eine Datei geschrieben wird. */
erwarte('Prototypversion',exportObjekt.versions.prototypeVersion,'1.12');
erwarte('Datenmodellversion der Exporthülle',exportObjekt.schemaVersion,17);
erwarte('Datenmodellversion des Regelstands',exportObjekt.versions.dataModelVersion,'17');
erwarte('Regelwerksversion',exportObjekt.versions.ruleSetVersion,'2.11');
erwarte('Interne Tool-Kennung',exportObjekt.assessmentSummary.toolId,'TOOL-REC-001');
erwarte('Zielstatus',exportObjekt.assessmentSummary.overallStatus.code,'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES');
erwarte('TR-07-Status',exportObjekt.assessmentSummary.tr07.status,'APPLICABLE');
erwarte('TR-07-Rechtsgrundlage',exportObjekt.assessmentSummary.tr07.primaryLegalBasis,'Art. 26 Abs. 11 EU AI Act');
erwarte('TR-07-Anwendungsdatum',exportObjekt.assessmentSummary.tr07.applicableDate,'2027-12-02');
erwarte('Berichtsstatus',berichtsdaten.decision.code,'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES');
erwarte('Berichtskennung',berichtsdaten.form.internalToolId,'TOOL-REC-001');
erwarte('Berichts-TR-07-Rechtsgrundlage',berichtsdaten.regulatory.tr07.primaryLegalBasis,'Art. 26 Abs. 11 EU AI Act');
erwarte('Berichts-TR-07-Anwendungsdatum',berichtsdaten.regulatory.tr07.applicableDate,'2027-12-02');
erwarte('Gemeinsame Ergebnissignatur',berichtsdaten.resultSignature,exportObjekt.assessmentSummary.resultSignature);

const css=fs.readFileSync(path.join(wurzel,'styles.css'),'utf8');
if(/<\/style/i.test(css))throw new Error('styles.css enthält eine schließende style-Zeichenfolge und kann nicht unverändert eingebettet werden.');

function htmlDokument(titel,bericht){
  if(!/^<div class="report-area\b/.test(bericht))throw new Error(`${titel}: Der produktive Bericht besitzt keinen vollständigen Berichtscontainer.`);
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titel}</title>
  <style>
${css}  </style>
</head>
<body>
${bericht}
</body>
</html>
`;
}

const kompaktbericht=htmlDokument(
  'Kompakter Bewertungsbericht – TOOL-REC-001',
  api.buildCompactReport(berichtsdaten)
);
const nachweisbericht=htmlDokument(
  'Vollständiger Nachweisbericht – TOOL-REC-001',
  api.buildEvidenceReport(berichtsdaten)
);
const json=`${JSON.stringify(exportObjekt,null,2)}\n`;

const dateien={
  json:'ki-risikobewertung-TOOL-REC-001.json',
  kompakt:'KI-Risikobewertung-Kompaktbericht-TOOL-REC-001.html',
  nachweis:'KI-Risikobewertung-Nachweisbericht-TOOL-REC-001.html'
};

fs.mkdirSync(ausgabe,{recursive:true});
fs.writeFileSync(path.join(ausgabe,dateien.json),json,'utf8');
fs.writeFileSync(path.join(ausgabe,dateien.kompakt),kompaktbericht,'utf8');
fs.writeFileSync(path.join(ausgabe,dateien.nachweis),nachweisbericht,'utf8');

const artefakte=Object.fromEntries(Object.entries(dateien).map(([art,name])=>{
  const dateipfad=path.join(ausgabe,name);
  return[art,{dateipfad,bytes:fs.statSync(dateipfad).size}];
}));

console.log(JSON.stringify({
  ausgabe,
  erzeugungszeitpunkt:festerErzeugungszeitpunkt,
  zielstatus:berichtsdaten.decision.code,
  ergebnissignatur:berichtsdaten.resultSignature,
  artefakte
},null,2));
