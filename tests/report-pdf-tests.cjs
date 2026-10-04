/*
 * Zweck und Abdeckung: Erzeugt acht verbindliche Kurz- und Nachweisberichte und
 * prüft Dateinamen, Statusvarianten, Seitenumfang, Mindestschrift und Werkzeugspuren.
 * Jede PDF-Variante wird aus einem fachlich definierten Szenario reproduzierbar aufgebaut.
 * Abgrenzung: Prüft fertige PDF-Artefakte, nicht die isolierte HTML-Snapshotlogik.
 */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const runtimeRoot=path.resolve(path.dirname(process.execPath),'..','..');
const resolveRuntimePackage=name=>{try{return require.resolve(name);}catch{return require.resolve(path.join(runtimeRoot,'node','node_modules',name));}};
const {chromium}=require(resolveRuntimePackage('playwright'));
const root=path.join(__dirname,'..'),outputDir=path.join(root,'output','pdf'),tempRoot=path.join(root,'tmp','report-pdfs');
const pdfInfo=path.join(runtimeRoot,'bin','override','pdfinfo'),pdfToPpm=path.join(runtimeRoot,'bin','override','pdftoppm'),python=path.join(runtimeRoot,'python','bin','python3'),chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputs=[
  {type:'compact',mode:'sample',id:'TOOL-DOK-001',file:'KI-Risikobewertung-Kurzbericht-TOOL-DOK-001.pdf',name:'Kompakter Musterbericht'},
  {type:'compact',mode:'stress',id:'TOOL-STRESS-001',file:'KI-Risikobewertung-Kurzbericht-TOOL-STRESS-001.pdf',name:'Kompakter Belastungsbericht'},
  {type:'compact',mode:'complete',id:'TOOL-STATUS-01',file:'KI-Risikobewertung-Kurzbericht-TOOL-STATUS-01.pdf',name:'Kompakt – Bewertung abgeschlossen'},
  {type:'compact',mode:'conditional',id:'TOOL-STATUS-02',file:'KI-Risikobewertung-Kurzbericht-TOOL-STATUS-02.pdf',name:'Kompakt – offene Maßnahmen'},
  {type:'compact',mode:'not-concludable',id:'TOOL-STATUS-03',file:'KI-Risikobewertung-Kurzbericht-TOOL-STATUS-03.pdf',name:'Kompakt – nicht abschließbar'},
  {type:'compact',mode:'stopped',id:'TOOL-STATUS-04',file:'KI-Risikobewertung-Kurzbericht-TOOL-STATUS-04.pdf',name:'Kompakt – nicht fortführbar'},
  {type:'evidence',mode:'sample',id:'TOOL-DOK-001',file:'KI-Risikobewertung-Nachweisbericht-TOOL-DOK-001.pdf',name:'Vollständiger Musternachweisbericht'},
  {type:'evidence',mode:'stress',id:'TOOL-STRESS-001',file:'KI-Risikobewertung-Nachweisbericht-TOOL-STRESS-001.pdf',name:'Vollständiger Belastungsnachweisbericht'}
];

function inspectPdf(pdfPath,renderDir,type,stress){
  const info=execFileSync(pdfInfo,[pdfPath],{encoding:'utf8'}),pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]||0),size=info.match(/^Page size:\s+(.+)$/m)?.[1]||'';
  if(!/A4/i.test(size))throw new Error(`Kein A4-Format: ${size}`);
  fs.rmSync(renderDir,{recursive:true,force:true});fs.mkdirSync(renderDir,{recursive:true});execFileSync(pdfToPpm,['-png','-r','105',pdfPath,path.join(renderDir,'page')],{stdio:'pipe'});
  const auditScript=String.raw`
import json, os, re, sys
from PIL import Image, ImageChops
from pypdf import PdfReader
import pdfplumber
pdf_path,render_dir,kind,stress=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4]=='1'
reader=PdfReader(pdf_path);texts=[p.extract_text() or '' for p in reader.pages];joined='\n'.join(texts);normalized=' '.join(joined.split());lower=normalized.lower();document_metadata=reader.metadata or {}
font_sizes=[]
with pdfplumber.open(pdf_path) as document:
  for page in document.pages: font_sizes.extend(float(c.get('size') or 0) for c in page.chars if c.get('text','').strip())
images=sorted((n for n in os.listdir(render_dir) if re.match(r'page-\d+\.png$',n)),key=lambda n:int(re.search(r'\d+',n).group()))
blank=[];edge=[];underfilled=[];ink=[]
for i,name in enumerate(images,1):
  image=Image.open(os.path.join(render_dir,name)).convert('RGB');white=Image.new('RGB',image.size,'white');hist=image.convert('L').histogram();coverage=sum(hist[:245])/float(image.width*image.height);ink.append(coverage)
  if ImageChops.difference(image,white).getbbox() is None: blank.append(i)
  bands=[image.crop((0,0,image.width,3)),image.crop((0,image.height-3,image.width,image.height)),image.crop((0,0,3,image.height)),image.crop((image.width-3,0,image.width,image.height))]
  if any(ImageChops.difference(b,Image.new('RGB',b.size,'white')).getbbox() is not None for b in bands): edge.append(i)
  if len(texts[i-1].split())<45 and coverage<0.018: underfilled.append(i)
allowed_metadata={'/Title','/Author','/Subject','/Keywords','/Creator','/Producer','/CreationDate','/ModDate','/Trapped'}
unexpected_metadata=sorted(str(key) for key in document_metadata.keys() if str(key) not in allowed_metadata)
unexpected_metadata_fields=sorted(str(key) for key in document_metadata.keys() if re.search(r'comment|generator|custom',str(key),re.I))
raw=['ASSESSMENT_COMPLETE','ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','ASSESSMENT_NOT_CONCLUDABLE','USE_NOT_CONTINUABLE','not_applicable','not_assessable','notFulfilled','inReview','requiredHighRiskDuties','evaluateDutyOperationalResult','reviewOperationalResult']
chapters=['Dokumentinformationen und Bewertungsstatus','Zusammenfassung der Bewertung','Bewertungsgegenstand und Einsatzkontext','Regulatorische Einordnung','Technische Risikobewertung','Organisatorische Bewertung','Einschlaegige Pflichten und Massnahmen','Offener fachlicher und juristischer Pruefbedarf','Bewertungsstatus und weitere Schritte','Quellen- und Versionsuebersicht']
fold=lambda s:s.replace('ä','ae').replace('ö','oe').replace('ü','ue').replace('ß','ss').replace('Ä','Ae').replace('Ö','Oe').replace('Ü','Ue')
result={'pages':len(reader.pages),'images':len(images),'minimum_font_size':min(font_sizes) if font_sizes else 0,'blank':blank,'edge':edge,'underfilled':underfilled,'ink':ink,'unexpected_metadata':unexpected_metadata,'unexpected_metadata_fields':unexpected_metadata_fields,'raw':[t for t in raw if re.search(r'(?<![A-Za-z0-9_])'+re.escape(t)+r'(?![A-Za-z0-9_])',joined)],'compact_chapters':all(c in fold(normalized) for c in chapters),'compact_exclusions':not any(t in normalized for t in ['Operationalisierte Pflichten DUTY-01 bis DUTY-47','Operationalisierte Review-Ergebnisse REVIEW-01 bis REVIEW-42','Einzelkriterien ORG-01 bis ORG-36','Historische beziehungsweise nicht mehr aktive Eintraege']),'evidence_content':all(t in normalized for t in ['DUTY-01','DUTY-47','REVIEW-01','REVIEW-42','ORG-01','ORG-36','Vollstaendige Dokumentations- und Reviewangaben'.replace('stae','stä')]),'header_type':(('Kompakter Bewertungsbericht' if kind=='compact' else 'Vollständiger Nachweisbericht').lower() in lower),'stress_tail':(re.search(r'TAILRISK30\s*X',joined) is not None and 'R-30' in normalized) if stress else True}
print(json.dumps(result))`;
  const audit=JSON.parse(execFileSync(python,['-c',auditScript,pdfPath,renderDir,type,stress?'1':'0'],{encoding:'utf8'}));
  if(audit.images!==pages||audit.blank.length||audit.edge.length||audit.underfilled.length)throw new Error(`Seitenprüfung fehlgeschlagen: ${JSON.stringify({images:audit.images,blank:audit.blank,edge:audit.edge,underfilled:audit.underfilled})}`);
  if(audit.minimum_font_size<8.95)throw new Error(`Kleinste Schrift ${audit.minimum_font_size.toFixed(2)} pt.`);
  if(audit.unexpected_metadata.length||audit.unexpected_metadata_fields.length||audit.raw.length)throw new Error(`Unzulässige Text- oder Metadatenspur: ${JSON.stringify({metadata:audit.unexpected_metadata,fields:audit.unexpected_metadata_fields,raw:audit.raw})}`);
  if(!audit.header_type||!audit.stress_tail)throw new Error('Berichtstyp oder Belastungsende fehlt.');
  if(type==='compact'&&(!audit.compact_chapters||!audit.compact_exclusions))throw new Error('Kompaktbericht enthält nicht die geforderte Kapitelstruktur oder ungekürzte Detailtabellen.');
  if(type==='evidence'&&!audit.evidence_content)throw new Error('Nachweisbericht ist inhaltlich unvollständig.');
  return{pages,size,audit};
}

(async()=>{
  fs.mkdirSync(outputDir,{recursive:true});fs.mkdirSync(tempRoot,{recursive:true});
  /* Jede Variante wird im Browser aufgebaut, als PDF gedruckt und anschließend textlich sowie geometrisch geprüft. */
  const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})}),summaries=[];
  for(const target of outputs){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'networkidle'});
    await page.evaluate(target=>{const api=window.__riskAppTest,s=api.exampleState();s.step=7;s.reportVisible=true;s.evaluated=Array(8).fill(true);s.form.internalToolId=target.id;
      if(target.mode==='stress'){s.form.assessmentId='KIR-STRESS-2026-001';s.form.overallReasoning+=' TAILFREETEXTX '.repeat(30);const original=s.risks[0];s.risks=Array.from({length:30},(_,index)=>({...original,riskId:'R-'+String(index+1).padStart(2,'0'),description:'Belastungsrisiko '+String(index+1).padStart(2,'0')+(index===29?' TAILRISK30X':''),event:'Dokumentiertes Ereignis '+(index+1),consequence:'Dokumentierte Folge '+(index+1),effectivenessEvidence:'Wirksamkeitsnachweis '+(index+1)}));s.registers.risk=s.risks.map((risk,index)=>({id:'MASSNAHME-'+String(index+1).padStart(2,'0'),sourceQuestionId:'RISK-12',riskId:risk.riskId,basis:'Kapitel 3 – 3×3-Risikomatrix',measure:'Kontrollmaßnahme '+(index+1),target:'Nachweisbare Risikominderung',linkedResult:risk.riskId+' · aktuelles Risiko Hoch',strategy:'reduce',priority:'medium',beforeRelease:'no',blocking:'no',owner:'Fachverantwortung',due:'2026-10-15',status:'verified',effectivenessCriterion:'Fehlerquote unter Grenzwert',effectivenessReview:'2026-09-15',reviewer:'Qualitätsmanagement',evidence:risk.effectivenessEvidence,residual:'low'}));}
      if(target.mode==='complete'){s.form.assessmentId='KIR-STATUS-01';s.form.approvalStatus='approved';s.registers.legal.forEach(item=>{item.status='resolved';item.blocking='no';item.result='Rechtsfrage abschließend geklärt.';});s.registers.organizational.forEach(item=>item.status='verified');}
      if(target.mode==='conditional')s.form.assessmentId='KIR-STATUS-02';
      if(target.mode==='not-concludable'){s.form.assessmentId='KIR-STATUS-03';s.form.manualBlockerActive='yes';s.form.manualBlockerReason='Zusätzliche Rechtsfrage mit noch nicht bestätigter Blockierungswirkung.';s.form.approvalStatus='pending';}
      if(target.mode==='stopped'){s.form.assessmentId='KIR-STATUS-04';Object.assign(s.form,{pManipulation:'confirmed',pManipulationUse:'Dokumentiert',pManipulationElementsResult:'met',pManipulationElements:'Tatbestand erfüllt',pManipulationException:'none',pManipulationReason:'Tatbestand belegt',pManipulationEvidence:'Rechtsprüfung',pManipulationAffected:'Betroffene Personen',pManipulationLegalOwner:'Rechtsstelle',pManipulationCritical:'yes',prohibitionConclusion:'confirmed',approvalStatus:'rejected'});}
      api.setStateForTest(s);api.setReportTypeForTest(target.type);
    },target);
    const expected={sample:'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES',stress:'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES',complete:'ASSESSMENT_COMPLETE',conditional:'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES','not-concludable':'ASSESSMENT_NOT_CONCLUDABLE',stopped:'USE_NOT_CONTINUABLE'}[target.mode];
    const dom=await page.evaluate(()=>{const api=window.__riskAppTest,data=api.buildReportData(),area=document.querySelector('.report-area');return{decision:data.decision.code,signature:data.resultSignature,domSignature:area?.dataset.resultSignature,chapters:document.querySelectorAll('.report-page').length,overflow:[...document.querySelectorAll('.report-page,.report-table-wrap,.report-table')].filter(el=>el.scrollWidth>el.clientWidth+2).length,text:area?.innerText||'',title:document.title};});
    if(dom.decision!==expected)throw new Error(`${target.name}: Status ${dom.decision} statt ${expected}.`);if(dom.signature!==dom.domSignature)throw new Error(`${target.name}: Ergebnisdatensatz nicht identisch.`);if(dom.chapters!==(target.type==='compact'?10:15)||dom.overflow)throw new Error(`${target.name}: Kapitelzahl oder horizontaler Überlauf fehlerhaft.`);
    await page.emulateMedia({media:'print'});await page.evaluate(()=>document.body.classList.add('pdf-export'));
    const pdfPath=path.join(outputDir,target.file),typeLabel=target.type==='compact'?'Kompakter Bewertungsbericht':'Vollständiger Nachweisbericht';
    await page.pdf({path:pdfPath,format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:`<div style="width:100%;margin:0 10mm;padding-bottom:2px;font:9pt Arial;color:#005b89;border-bottom:1px solid #cfd7dc"><strong>${typeLabel}</strong> · KI-Risikobewertung</div>`,footerTemplate:`<div style="width:100%;margin:0 10mm;padding-top:2px;font:9pt Arial;color:#5f666a;border-top:1px solid #cfd7dc;display:flex;justify-content:space-between"><span>${target.id}</span><strong><span class="pageNumber"></span> / <span class="totalPages"></span></strong></div>`,margin:{top:'17mm',right:'10mm',bottom:'17mm',left:'10mm'}});
    await page.close();const result=inspectPdf(pdfPath,path.join(tempRoot,`${target.type}-${target.mode}`),target.type,target.mode==='stress');summaries.push({...target,file:path.resolve(pdfPath),...result});
  }
  await browser.close();
  const compact=summaries.filter(item=>item.type==='compact'),sample=compact.find(item=>item.mode==='sample'),stress=compact.find(item=>item.mode==='stress');
  if(sample.pages<15||sample.pages>25)throw new Error(`Kompakter Musterbericht hat ${sample.pages} statt ungefähr 15–25 Seiten.`);if(stress.pages>35)throw new Error(`Kompakter Belastungsbericht hat ${stress.pages} statt höchstens 35 Seiten.`);
  summaries.forEach(item=>{console.log(`✓ ${item.name}: ${item.pages} A4-Seiten, kleinste Schrift ${item.audit.minimum_font_size.toFixed(2)} pt, keine leeren/unterfüllten/abgeschnittenen Seiten`);console.log(item.file);});
  console.log(`\n8/8 PDF-Varianten technisch und visuell gerendert; kompakter Musterbericht ${sample.pages} Seiten, Belastungsbericht ${stress.pages} Seiten.`);
})().catch(error=>{console.error(`✗ PDF-Berichtstest fehlgeschlagen: ${error.message}`);process.exitCode=1;});
