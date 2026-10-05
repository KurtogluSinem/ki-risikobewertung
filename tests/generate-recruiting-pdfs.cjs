/*
 * Erzeugt die beiden freigegebenen PDF-Berichte des vollständig fiktiven
 * Recruiting-Demonstrationsfalls direkt aus der Berichtsausgabe der Anwendung.
 * Die fachlichen Ergebnisse werden vor dem Druck gegen den erwarteten Stand
 * geprüft; dieses Skript verändert weder Anwendungszustand noch Regelwerk.
 */
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const runtimeRoot=path.resolve(path.dirname(process.execPath),'..','..');
const resolveRuntimePackage=name=>{try{return require.resolve(name);}catch{return require.resolve(path.join(runtimeRoot,'node','node_modules',name));}};
const {chromium}=require(resolveRuntimePackage('playwright'));

const root=path.join(__dirname,'..');
const outputDir=path.join(root,'output','pdf');
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const targets=[
  {type:'compact',file:'KI-Risikobewertung-Kompaktbericht-TOOL-REC-001.pdf',label:'Kompaktbericht'},
  {type:'evidence',file:'KI-Risikobewertung-Nachweisbericht-TOOL-REC-001.pdf',label:'Nachweisbericht'}
];

(async()=>{
  fs.mkdirSync(outputDir,{recursive:true});
  const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
  const results=[];
  try{
    for(const target of targets){
      const page=await browser.newPage({viewport:{width:1440,height:1000}});
      await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'networkidle'});
      const prepared=await page.evaluate(type=>{
        const api=window.__riskAppTest;
        const state=api.recruitingExampleState();
        state.step=7;
        state.reportVisible=true;
        state.evaluated=Array(8).fill(true);
        api.setStateForTest(state);
        api.setReportTypeForTest(type);
        const data=api.buildReportData();
        const text=document.querySelector('.report-area')?.innerText||'';
        return{
          decision:data.decision.code,
          resultSignature:data.resultSignature,
          toolId:data.form.internalToolId,
          chapters:document.querySelectorAll('.report-page').length,
          text,
          versions:data.reference.knowledgeBase
        };
      },target.type);
      const expectedChapters=target.type==='compact'?10:15;
      if(prepared.decision!=='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES')throw new Error(`${target.label}: unerwarteter Gesamtstatus ${prepared.decision}.`);
      if(prepared.toolId!=='TOOL-REC-001')throw new Error(`${target.label}: falsche Tool-ID ${prepared.toolId}.`);
      if(prepared.chapters!==expectedChapters)throw new Error(`${target.label}: ${prepared.chapters} statt ${expectedChapters} Berichtskapitel.`);
      if(!['Art. 26 Abs. 11','02.12.2027','Bewertung abgeschlossen mit offenen Maßnahmen'].every(value=>prepared.text.includes(value)))throw new Error(`${target.label}: erwartete fachliche Kernaussage fehlt.`);
      if(prepared.versions.prototypeVersion!=='1.12'||String(prepared.versions.dataModelVersion)!=='17'||prepared.versions.ruleSetVersion!=='2.11')throw new Error(`${target.label}: Versionsstand ist nicht 1.12 / 17 / 2.11.`);

      await page.emulateMedia({media:'print'});
      await page.evaluate(()=>document.body.classList.add('pdf-export'));
      const pdfPath=path.join(outputDir,target.file);
      await page.pdf({
        path:pdfPath,
        format:'A4',
        printBackground:true,
        displayHeaderFooter:true,
        headerTemplate:`<div style="width:100%;margin:0 10mm;padding-bottom:2px;font:9pt Arial;color:#005b89;border-bottom:1px solid #cfd7dc"><strong>${target.label}</strong> · KI-Risikobewertung</div>`,
        footerTemplate:`<div style="width:100%;margin:0 10mm;padding-top:2px;font:9pt Arial;color:#5f666a;border-top:1px solid #cfd7dc;display:flex;justify-content:space-between"><span>TOOL-REC-001 · Prototyp 1.12</span><strong><span class="pageNumber"></span> / <span class="totalPages"></span></strong></div>`,
        margin:{top:'17mm',right:'10mm',bottom:'17mm',left:'10mm'}
      });
      results.push({type:target.type,file:pdfPath,bytes:fs.statSync(pdfPath).size,resultSignature:prepared.resultSignature});
      await page.close();
    }
  }finally{
    await browser.close();
  }
  console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
