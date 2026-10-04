/*
 * Zweck und Abdeckung: Erzeugt die früheren Berichtsszenarien als PDF, prüft
 * Seitenzahl, Mindestschrift, Textvollständigkeit und visuelle Seitenränder.
 * Die Ausgabeprüfung bewertet ausschließlich die fertigen Dokumente.
 * Abgrenzung: Historische PDF-Szenarien; die acht verbindlichen Varianten prüft die Bericht-PDF-Suite.
 */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const runtimeRoot=path.resolve(path.dirname(process.execPath),'..','..');
const resolveRuntimePackage=name=>{try{return require.resolve(name);}catch{return require.resolve(path.join(runtimeRoot,'node','node_modules',name));}};
const {chromium}=require(resolveRuntimePackage('playwright'));

const root=path.join(__dirname,'..');
const outputDir=path.join(root,'output','pdf');
const tempRoot=path.join(root,'tmp','pdfs');
const pdfInfo=path.join(runtimeRoot,'bin','override','pdfinfo');
const pdfToPpm=path.join(runtimeRoot,'bin','override','pdftoppm');
const python=path.join(runtimeRoot,'python','bin','python3');
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputs=[
  {name:'Musterbericht',file:'KI-Risikobewertung-Musterbericht.pdf',mode:'sample',id:'KIR-2026-001'},
  {name:'Belastungstest',file:'KI-Risikobewertung-Belastungstest.pdf',mode:'stress',id:'KIR-STRESS-2026-001'},
  {name:'Bewertung abgeschlossen',file:'KI-Risikobewertung-Abgeschlossen.pdf',mode:'complete',id:'KIR-STATUS-01'},
  {name:'Bewertung abgeschlossen mit offenen Maßnahmen',file:'KI-Risikobewertung-Offene-Massnahmen.pdf',mode:'conditional',id:'KIR-STATUS-02'},
  {name:'Bewertung nicht abschließbar',file:'KI-Risikobewertung-Nicht-Abschliessbar.pdf',mode:'not-concludable',id:'KIR-STATUS-03'},
  {name:'Verwendung nicht fortführbar',file:'KI-Risikobewertung-Nicht-Fortfuehrbar.pdf',mode:'stopped',id:'KIR-STATUS-04'}
];

function inspectPdf(pdfPath,renderDir,stress){
  const info=execFileSync(pdfInfo,[pdfPath],{encoding:'utf8'});
  const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]||0);
  const size=info.match(/^Page size:\s+(.+)$/m)?.[1]||'';
  if(pages<15)throw new Error(`Nur ${pages} physische Seiten; mindestens fünfzehn erwartet.`);
  if(!/A4/i.test(size))throw new Error(`Seitenformat ist nicht A4: ${size}`);
  fs.rmSync(renderDir,{recursive:true,force:true});fs.mkdirSync(renderDir,{recursive:true});
  execFileSync(pdfToPpm,['-png','-r','105',pdfPath,path.join(renderDir,'page')],{stdio:'pipe'});
  const auditScript=String.raw`
import json, os, re, sys
from PIL import Image, ImageChops
from pypdf import PdfReader
import pdfplumber
pdf_path, render_dir, stress = sys.argv[1], sys.argv[2], sys.argv[3] == '1'
reader=PdfReader(pdf_path)
texts=[page.extract_text() or '' for page in reader.pages]
joined='\n'.join(texts)
normalized=' '.join(joined.split())
normalized_lower=normalized.lower()
document_metadata=reader.metadata or {}
allowed_metadata={'/Title','/Author','/Subject','/Keywords','/Creator','/Producer','/CreationDate','/ModDate','/Trapped'}
unexpected_metadata=sorted(str(key) for key in document_metadata.keys() if str(key) not in allowed_metadata)
unexpected_metadata_fields=sorted(str(key) for key in document_metadata.keys() if re.search(r'comment|generator|custom',str(key),re.I))
font_sizes=[]
with pdfplumber.open(pdf_path) as document:
    for pdf_page in document.pages:
        font_sizes.extend(float(char.get('size') or 0) for char in pdf_page.chars if char.get('text','').strip())
images=sorted((n for n in os.listdir(render_dir) if re.match(r'page-\d+\.png$',n)),key=lambda n:int(re.search(r'\d+',n).group()))
blank=[]; edge=[]; ink=[]
for i,name in enumerate(images,1):
    image=Image.open(os.path.join(render_dir,name)).convert('RGB')
    white=Image.new('RGB',image.size,'white')
    if ImageChops.difference(image,white).getbbox() is None: blank.append(i)
    histogram=image.convert('L').histogram()
    ink.append(sum(histogram[:245]) / float(image.width * image.height))
    bands=[image.crop((0,0,image.width,3)),image.crop((0,image.height-3,image.width,image.height)),image.crop((0,0,3,image.height)),image.crop((image.width-3,0,image.width,image.height))]
    if any(ImageChops.difference(b,Image.new('RGB',b.size,'white')).getbbox() is not None for b in bands): edge.append(i)
steps=[
'KI-Tool erfassen','KI-System-Definition und Anwendungsbereich prüfen','Einsatzkontext und Akteursrolle bestimmen','Regulatorische Einordnung und ergänzende Prüfung','Technische Eigenschaften und Risiken bewerten','Organisatorische Rahmenbedingungen bewerten','Einschlägige Pflichten, erforderliche Maßnahmen und weiteren Prüfbedarf ableiten','Bewertungsergebnisse zusammenführen und dokumentieren']
forbidden=['RELEASE'+'ABLE','Freigabe'+'fähig','Freigabe'+'empfehlung','Bericht mit'+' Auflagen','4×4-Risikomatrix']
internal_codes=['not_met','possible','confirmed','exception_confirmed','exception_review','not_continued','product_only','not_applicable','not_assessable','inReview','notFulfilled','ASSESSMENT_COMPLETE','ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','ASSESSMENT_NOT_CONCLUDABLE','USE_NOT_CONTINUABLE','requiredHighRiskDuties','evaluateDutyOperationalResult','reviewOperationalResult','sourceQuestionId','linkedResult','documentLocation','accessRights','statutoryRetentionStatus','productCovered','productSafetyComponent','thirdPartyConformity','actualOperationalUse','system_with_model','matches','substantial','automated','limited','integrating','future_prohibition']
risk_pages=[i+1 for i,t in enumerate(texts) if re.search(r'\bR-\d{2}\b',t)]
risk_header_pages=[i+1 for i,t in enumerate(texts) if re.search(r'\bR-\d{2}\b',t) and ('Aktuelles Ergebnis' in t or 'Risiko und Ereignis' in t or 'Risiko' in t)]
result={
 'pages':len(reader.pages),'images':len(images),'blank':blank,'edge':edge,
 'minimum_font_size':min(font_sizes) if font_sizes else 0,
 'unexpected_metadata':unexpected_metadata,
 'unexpected_metadata_fields':unexpected_metadata_fields,
 'steps':all(s in normalized for s in steps),'matrix':'3×3-Risikomatrix' in normalized,
 'forbidden':[term for term in forbidden if term in joined],
 'internal_codes':[term for term in internal_codes if re.search(r'(?<![A-Za-z0-9_])'+re.escape(term)+r'(?![A-Za-z0-9_])',joined)],
 'technical_snake_tokens':sorted(set(re.findall(r'(?<![A-Za-z0-9])(?:[a-z][a-z0-9]*_){1,}[a-z0-9]+(?![A-Za-z0-9])',joined))),
 'short_last_page':len(' '.join(texts[-1].split())) < 350 if texts else True,
 'last_page_ink':ink[-1] if ink else 0,
 'metadata':all(term.lower() in normalized_lower for term in ['Prototypversion','Datenmodellversion','Regelwerksversion','Methodikversion','Geprüfter Rechtsstand','Vollständige Quellenprüfung','Letzte Aktualitätsprüfung']),
 'ids':all(term in joined for term in ['TOOL-01','DEF-01','SCOPE-01','CTX-13','ROLE-01','ART5-01','HR-01','HR-20','TR-01','GPAI-01','CRA-01','TIME-01','RISK-01','RISK-31','ORG-01','ORG-36','DUTY-01','DUTY-47','REVIEW-01','REVIEW-42']),
 'profiles':all(term in joined for term in ['Regulatorische Einordnung','Technische Risikobewertung','Organisatorische Bewertung']),
 'operational':all(term in normalized for term in ['Operationalisierte Pflichten','Operationalisierte Review-Ergebnisse','REVIEW-10','Behandlung bestimmbar','Gesonderte menschliche beziehungsweise organisatorische Entscheidung']),
 'duty47':all(term in normalized for term in ['Strukturierte Prüfung DUTY-47','Ja – eindeutig geklärt','Datenschutzrecht']),
 'historical_registers':'Historische beziehungsweise nicht mehr aktive Einträge' in normalized,
 'review30':('REVIEW-30' in joined and 'KI-System im Anwendungsbereich' in normalized and re.search(r'REVIEW-30\s+Ja\s+KI-System-Definition:',normalized) is None),
 'corrected_results':all(term in normalized for term in ['Vollständige Dokumentations- und Reviewangaben','Aufbewahrung und Versionierung','Konkrete Ergebniswerte REVIEW-31 bis REVIEW-40','GPAI – Relevanz und Organisationsrolle getrennt','Neubewertungsauslöser REVIEW-22 bis REVIEW-28','Erfüllbarkeit:','Ausreichend','Interne Tool-Kennung']) and ('zur verwendung durch eine behörde oder öffentliche stelle bestimmt' in normalized_lower) and ('Kein Hochrisiko-KI-System' in normalized or 'nicht fortgeführt' in normalized.lower()) and ('Blockierungswirkung:' in re.sub(r'\s+','',normalized)),
 'art50':'Direkte Interaktion' in joined and 'Anbieter' in joined,
 'headers':sum('KI-Risikobewertung' in t for t in texts),'footers':sum(re.search(r'\d+\s*/\s*\d+',t) is not None for t in texts),
 'risk_pages':risk_pages,'risk_header_pages':risk_header_pages,
 'stress_risks':all(f'R-{i:02d}' in joined for i in range(1,31)) if stress else True,
 'stress_measures':all(re.search(rf'MASSNAHM\s*E-\s*{i:02d}',joined) is not None for i in range(1,31)) if stress else True,
 'tail':('TAILRISK30X' in joined and 'TAILFREETEXTX' in joined) if stress else True
}
print(json.dumps(result))
`;
  const audit=JSON.parse(execFileSync(python,['-c',auditScript,pdfPath,renderDir,stress?'1':'0'],{encoding:'utf8'}));
  if(audit.images!==pages)throw new Error(`Gerenderte Seiten ${audit.images} statt ${pages}.`);
  if(audit.blank.length)throw new Error(`Unbeabsichtigt leere Seiten: ${audit.blank.join(', ')}.`);
  if(audit.edge.length)throw new Error(`Inhalt berührt den physischen Seitenrand: ${audit.edge.join(', ')}.`);
  if(!audit.steps||!audit.matrix||!audit.metadata||!audit.ids||!audit.profiles||!audit.operational||!audit.duty47||!audit.historical_registers||!audit.review30||!audit.corrected_results||!audit.art50)throw new Error(`Inhaltliche PDF-Prüfung fehlgeschlagen: ${JSON.stringify(audit)}`);
  if(audit.forbidden.length)throw new Error(`Veraltete Begriffe im PDF: ${audit.forbidden.join(', ')}.`);
  if(audit.internal_codes.length)throw new Error(`Interne Statuscodes im PDF: ${audit.internal_codes.join(', ')}.`);
  if(audit.technical_snake_tokens.length)throw new Error(`Weitere technische Rohwerte im PDF: ${audit.technical_snake_tokens.join(', ')}.`);
  if(audit.unexpected_metadata.length||audit.unexpected_metadata_fields.length)throw new Error(`Unerwartete PDF-Metadaten: ${JSON.stringify({keys:audit.unexpected_metadata,fields:audit.unexpected_metadata_fields})}.`);
  if(audit.minimum_font_size<8.95)throw new Error(`Kleinste gemessene Schriftgröße ${audit.minimum_font_size.toFixed(2)} pt statt mindestens 9 pt.`);
  if(audit.short_last_page)throw new Error('Die Schlussseite ist nahezu leer und muss sinnvoll verdichtet werden.');
  if(audit.last_page_ink<0.055)throw new Error(`Die Schlussseite ist visuell zu schwach belegt (${(audit.last_page_ink*100).toFixed(1)} %).`);
  if(audit.headers!==pages||audit.footers!==pages)throw new Error(`Kopf-/Fußzeilen fehlen: ${audit.headers}/${audit.footers} bei ${pages} Seiten.`);
  if(JSON.stringify(audit.risk_pages)!==JSON.stringify(audit.risk_header_pages))throw new Error('Tabellenkopf fehlt auf einer Seite mit Risikoeinträgen.');
  if(!audit.stress_risks||!audit.stress_measures||!audit.tail)throw new Error('Belastungsdaten wurden nicht vollständig ausgegeben.');
  return{pages,size,audit};
}

(async()=>{
  fs.mkdirSync(outputDir,{recursive:true});fs.mkdirSync(tempRoot,{recursive:true});
  /* Lokaler Browserdruck und nachgelagerte Seitenanalyse prüfen reale PDFs statt nur HTML-Regeln. */
  const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
  const summaries=[];
  for(const target of outputs){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'networkidle'});
    await page.evaluate(mode=>{
      const api=window.__riskAppTest,s=api.exampleState();s.step=7;s.reportVisible=true;s.evaluated=Array(8).fill(true);
      if(mode==='stress'){
        s.form.assessmentId='KIR-STRESS-2026-001';s.form.assessmentVersion='2.0';s.form.overallReasoning+=' TAILFREETEXTX '.repeat(35);
        const original=s.risks[0];s.risks=Array.from({length:30},(_,index)=>({...original,riskId:'R-'+String(index+1).padStart(2,'0'),description:'Belastungsrisiko '+String(index+1).padStart(2,'0')+(index===29?' TAILRISK30X':''),event:'EVT'+String(index+1).padStart(2,'0')+'X – dokumentiertes Ereignis',consequence:'RISIKO-'+String(index+1).padStart(2,'0')+'-FOLGE – dokumentierte Folge',effectivenessEvidence:'EVD'+String(index+1).padStart(2,'0')+'X – Wirksamkeitsnachweis'}));
        s.registers.risk=s.risks.map((risk,index)=>({id:'MASSNAHME-'+String(index+1).padStart(2,'0'),sourceQuestionId:'RISK-12',riskId:risk.riskId,basis:'Kapitel 3 – 3×3-Risikomatrix',measure:'Kontrollmaßnahme '+(index+1),target:'Nachweisbare Risikominderung',linkedResult:risk.riskId+' · aktuelles Risiko Hoch',strategy:'reduce',priority:'medium',beforeRelease:'no',blocking:'no',owner:'Fachverantwortung',due:'2026-10-15',status:'verified',effectivenessCriterion:'Fehlerquote unter Grenzwert',effectivenessReview:'2026-09-15',reviewer:'Qualitätsmanagement',evidence:risk.effectivenessEvidence,residual:'low'}));
      }
      if(mode==='complete'){s.form.assessmentId='KIR-STATUS-01';s.form.approvalStatus='approved';s.registers.legal.forEach(item=>{item.status='resolved';item.blocking='no';item.result='Rechtsfrage abschließend geklärt.';});s.registers.organizational.forEach(item=>item.status='verified');}
      if(mode==='conditional'){s.form.assessmentId='KIR-STATUS-02';}
      if(mode==='not-concludable'){s.form.assessmentId='KIR-STATUS-03';s.form.manualBlockerActive='yes';s.form.manualBlockerReason='Zusätzliche Rechtsfrage mit noch nicht bestätigter Blockierungswirkung.';s.form.approvalStatus='pending';}
      if(mode==='stopped'){s.form.assessmentId='KIR-STATUS-04';Object.assign(s.form,{pManipulation:'confirmed',pManipulationUse:'Dokumentiert',pManipulationElementsResult:'met',pManipulationElements:'Tatbestand erfüllt',pManipulationException:'none',pManipulationReason:'Tatbestand belegt',pManipulationEvidence:'Rechtsprüfung',pManipulationAffected:'Betroffene Personen',pManipulationLegalOwner:'Rechtsstelle',pManipulationCritical:'yes',prohibitionConclusion:'confirmed',approvalStatus:'rejected'});}
      api.setStateForTest(s);
    },target.mode);
    const decision=await page.evaluate(()=>window.__riskAppTest.overallDecision(false,true).code);
    const expected={sample:'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES',stress:'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES',complete:'ASSESSMENT_COMPLETE',conditional:'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','not-concludable':'ASSESSMENT_NOT_CONCLUDABLE',stopped:'USE_NOT_CONTINUABLE'}[target.mode];
    if(decision!==expected)throw new Error(`${target.name}: Status ${decision} statt ${expected}.`);
    await page.emulateMedia({media:'print'});await page.evaluate(()=>document.body.classList.add('pdf-export'));
    const dom=await page.evaluate(()=>({chapters:document.querySelectorAll('.report-page').length,overflow:[...document.querySelectorAll('.report-page,.report-table-wrap,.report-table')].filter(el=>el.scrollWidth>el.clientWidth+2).length,text:document.querySelector('.report-area')?.innerText||''}));
    if(dom.chapters!==15||dom.overflow)throw new Error(`${target.name}: Druck-DOM unvollständig oder horizontal überlaufend.`);
    const pdfPath=path.join(outputDir,target.file);
    await page.pdf({path:pdfPath,format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:`<div style="width:100%;margin:0 10mm;padding-bottom:2px;font:9pt Arial;color:#005b89;border-bottom:1px solid #cfd7dc"><strong>KI-Risikobewertung</strong> · ${target.name}</div>`,footerTemplate:`<div style="width:100%;margin:0 10mm;padding-top:2px;font:9pt Arial;color:#5f666a;border-top:1px solid #cfd7dc;display:flex;justify-content:space-between"><span>${target.id}</span><strong><span class="pageNumber"></span> / <span class="totalPages"></span></strong></div>`,margin:{top:'17mm',right:'10mm',bottom:'17mm',left:'10mm'}});
    await page.close();
    const stress=target.mode==='stress',result=inspectPdf(pdfPath,path.join(tempRoot,`${target.mode}-render`),stress);summaries.push({name:target.name,file:pdfPath,...result});
  }
  await browser.close();
  if(summaries.find(item=>item.name==='Belastungstest').pages<=summaries.find(item=>item.name==='Musterbericht').pages)throw new Error('Der Belastungsbericht besitzt nicht mehr physische Seiten als der Musterbericht.');
  summaries.forEach(item=>{console.log(`✓ ${item.name}: ${item.pages} A4-Seiten vollständig gerendert, kleinste Schrift ${item.audit.minimum_font_size.toFixed(2)} pt`);console.log(`✓ ${item.name}: keine leeren Seiten, Randberührungen, alten Statusbegriffe, Erstellungsspuren oder fehlenden Pflichtinhalte`);console.log(item.file);});
  console.log('✓ Tabellenköpfe, Kopf-/Fußzeilen, acht Prüfschritte, 3×3-Matrix, Rollen, DUTY-47, REVIEW-30, historische Register, Metadaten und getrennte Ergebnisprofile geprüft');
})().catch(error=>{console.error(`✗ PDF-Test fehlgeschlagen: ${error.message}`);process.exitCode=1;});
