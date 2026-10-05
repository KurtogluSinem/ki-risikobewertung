/* Durchgängige Browserabnahme des vollständig fiktiven Recruiting-Musterfalls. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const runtimeRoot=path.resolve(path.dirname(process.execPath),'..','..');
const resolveRuntimePackage=name=>{try{return require.resolve(name);}catch{return require.resolve(path.join(runtimeRoot,'node','node_modules',name));}};
const {chromium}=require(resolveRuntimePackage('playwright'));

(async()=>{
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'recruiting-browser-'));
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage(),problems=[],results=[];
  const watch=p=>{p.on('console',m=>{if(['warning','error'].includes(m.type()))problems.push(`${m.type()}: ${m.text()}`);});p.on('pageerror',e=>problems.push(`pageerror: ${e.message}`));};
  const test=async(name,fn)=>{try{await fn();results.push({name,pass:true});console.log(`✓ ${name}`);}catch(error){results.push({name,pass:false});console.log(`✗ ${name} – ${error.message}`);}};
  const step=index=>page.locator(`#stepNavigation [data-step="${index}"]`).click();
  const answer=async(field,value)=>{const button=page.locator(`[data-question="${field}"] [data-answer="${value}"]`);await button.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await button.click();};
  const hasDecember2027=value=>/0?2\.12\.2027|2\. Dezember 2027|2027-12-02/.test(value);
  watch(page);
  try{
    await page.goto(pathToFileURL(path.join(__dirname,'..','index.html')).href);
    await test('Musterfall über die Oberfläche laden und acht Prüfschritte durchlaufen',async()=>{
      page.once('dialog',dialog=>dialog.accept());await page.locator('#exampleButton').click();
      for(let index=0;index<8;index++){await step(index);assert.ok((await page.locator('#stepContent').innerText()).length>350,`Schritt ${index+1} ist leer`);}
      const state=await page.evaluate(()=>window.__riskAppTest.getState());
      assert.equal(state.form.internalToolId,'TOOL-REC-001');
      assert.equal(state.form.assessmentId,'KIR-REC-2026-001');
      assert.equal(state.risks.length,3);
      assert.ok(state.risks.every(r=>r.source.includes('Fiktive Demonstrationsannahme')));
    });

    await test('Abhängiges HR-03-Feld erscheint und verschwindet mit dem Produktpfad',async()=>{
      await step(3);
      assert.equal(await page.locator('[data-field="annexISection"]').count(),0);
      await answer('productCovered','yes');
      assert.equal(await page.locator('[data-field="annexISection"]').count(),1);
      await answer('productCovered','no');
      assert.equal(await page.locator('[data-field="annexISection"]').count(),0);
      const state=await page.evaluate(()=>window.__riskAppTest.getState());
      assert.equal(state.form.annexISection,'');
    });

    await test('Anhang III, TR-07, Stichtag, CRA und Gesamtstatus bleiben konsistent',async()=>{
      await step(3);
      const result=await page.evaluate(()=>{const a=window.__riskAppTest;return{form:a.getState().form,annex:a.evaluateArt63Decision(),tr07:a.evaluateTR07(),cra:a.evaluateCRA(),decision:a.overallDecision(false,true)};});
      assert.equal(result.form.annexEmployment,'yes');
      assert.equal(result.form.materialInfluenceControl,'yes');
      assert.equal(result.form.profiling,'yes');
      assert.equal(result.annex.status,'HIGH_RISK');
      assert.equal(result.tr07.status,'APPLICABLE');
      assert.equal(result.tr07.primaryLegalBasis,'Art. 26 Abs. 11 EU AI Act');
      assert.equal(result.tr07.applicableDate,'2027-12-02');
      assert.equal(result.cra.code,'no');
      assert.equal(result.form.craSaasOnly,'yes');
      assert.equal(result.form.craSeparateSoftwareComponent,'no');
      assert.equal(result.decision.code,'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES');
      const shown=await page.locator('#stepContent').textContent();
      assert.ok(shown.includes('TR-07')&&shown.includes('02.12.2027')&&shown.includes('Art. 26 Abs. 11'));
    });

    await test('Register zeigen offene Maßnahmen und der Abschluss zeigt den abgeleiteten Status',async()=>{
      await step(6);
      const register=await page.locator('#stepContent').textContent();
      assert.ok(register.includes('R-REC-01')&&register.includes('R-REC-02')&&register.includes('R-REC-03'));
      assert.ok(register.includes('DUTY-20'));
      await step(7);
      assert.ok((await page.locator('#stepContent').innerText()).includes('Bewertung abgeschlossen mit offenen Maßnahmen'));
    });

    await test('JSON-Export, Zurücksetzen und Wiederimport erhalten Fachresultate',async()=>{
      const downloadPromise=page.waitForEvent('download');await page.locator('#exportButton').click();
      const download=await downloadPromise,file=path.join(output,'recruiting.json');await download.saveAs(file);
      const exported=JSON.parse(fs.readFileSync(file,'utf8'));
      assert.equal(exported.assessment.form.internalToolId,'TOOL-REC-001');
      assert.equal(exported.assessmentSummary.article6Paragraph3.status,'HIGH_RISK');
      assert.equal(exported.assessmentSummary.tr07.applicableDate,'2027-12-02');
      assert.equal(exported.assessmentSummary.cra.product.code,'no');
      assert.equal(exported.assessmentSummary.overallStatus.code,'ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES');
      const signature=exported.assessmentSummary.resultSignature;
      page.once('dialog',dialog=>dialog.accept());await page.locator('#resetButton').click();
      assert.notEqual((await page.evaluate(()=>window.__riskAppTest.getState())).form.internalToolId,'TOOL-REC-001');
      await page.locator('#importFile').setInputFiles(file);
      await page.waitForFunction(()=>window.__riskAppTest.getState().form.internalToolId==='TOOL-REC-001');
      const reimported=await page.evaluate(()=>window.__riskAppTest.assessmentExportObject());
      assert.equal(reimported.assessmentSummary.resultSignature,signature);
      await page.reload();
      assert.equal((await page.evaluate(()=>window.__riskAppTest.getState())).form.internalToolId,'TOOL-REC-001');
    });

    await test('Kompakt- und Nachweisbericht enthalten den Recruiting-Fall und die Einordnung',async()=>{
      await step(7);
      await page.locator('#showCompactReportButton').click();
      let report=await page.locator('.report-area').textContent();
      assert.ok(report.includes('KI-gestütztes Bewerberranking')&&report.includes('Bewertung abgeschlossen mit offenen Maßnahmen'));
      assert.ok(hasDecember2027(report)&&report.includes('Art. 26 Abs. 11'),`Kompaktbericht: Datum=${hasDecember2027(report)}, Rechtsgrundlage=${report.includes('Art. 26 Abs. 11')}`);
      await page.locator('#showEvidenceReportButton').click();
      report=await page.locator('.report-area').textContent();
      assert.ok(report.includes('TOOL-REC-001')&&report.includes('TR-07')&&report.includes('DUTY-20'));
      assert.ok(report.includes('R-REC-01')&&report.includes('R-REC-02')&&report.includes('R-REC-03'));
      assert.ok(hasDecember2027(report)&&report.includes('Art. 26 Abs. 11'));
    });

    await test('Browserkonsole und Seitenlauf bleiben fehlerfrei',async()=>assert.deepEqual(problems,[]));
  }finally{await context.close();await browser.close();}
  const failed=results.filter(result=>!result.pass).length;
  console.log(`\n${results.length-failed}/${results.length} Recruiting-Browserprüfungen bestanden`);
  console.log(`Temporärer JSON-Nachweis: ${output}`);
  if(failed)process.exitCode=1;
})().catch(error=>{console.error(`✗ Recruiting-Browserprüfung abgebrochen: ${error.stack||error.message}`);process.exitCode=1;});
