/*
 * Reale Persistenzprüfung über einen lokalen HTTP-Server. Verwendet ausschließlich
 * die produktiven Dateien und den nativen localStorage zweier Browserkontexte.
 */
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const runtimeRoot=path.resolve(path.dirname(process.execPath),'..','..');
const resolveRuntimePackage=name=>{try{return require.resolve(name);}catch{return require.resolve(path.join(runtimeRoot,'node','node_modules',name));}};
const {chromium}=require(resolveRuntimePackage('playwright'));
const root=path.join(__dirname,'..'),tmp=path.join(root,'tmp','persistence-browser');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};

function startServer(){return new Promise(resolve=>{const server=http.createServer((request,response)=>{const requested=request.url==='/'?'index.html':decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/,''),file=path.join(root,requested);if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){response.writeHead(404);response.end('Nicht gefunden');return;}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(file).pipe(response);});server.listen(0,'127.0.0.1',()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/`}));});}

(async()=>{
  fs.rmSync(tmp,{recursive:true,force:true});fs.mkdirSync(tmp,{recursive:true});
  const {server,url}=await startServer(),chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})}),results=[];
  const test=async(id,name,fn)=>{try{await fn();results.push({id,name,pass:true});console.log(`✓ ${id} ${name}`);}catch(error){results.push({id,name,pass:false,detail:error.message});console.log(`✗ ${id} ${name} – ${error.message}`);}};
  const contextA=await browser.newContext({acceptDownloads:true}),pageA=await contextA.newPage();await pageA.goto(url,{waitUntil:'networkidle'});

  await test('B-F01-01','CRA-Rollen werden über die sichtbare Oberfläche gespeichert, neu geladen und exportiert',async()=>{
    await pageA.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();s.form.toolName='Browserfall A';s.guideAnswers['TOOL-01']={value:s.form.toolName,sourceField:'toolName'};s.form.internalToolId='BROWSER-A';s.step=3;api.setStateForTest(s);});
    await pageA.locator('#stepNavigation [data-step="3"]').click();
    const fields=['craRoleManufacturer','craRoleRepresentative','craRoleImporter','craRoleDistributor','craRoleSteward'];
    for(const field of fields){const input=pageA.locator(`[data-field="${field}"]`);await input.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await input.selectOption(field==='craRoleManufacturer'?'yes':'no');}
    let current=await pageA.evaluate(()=>window.__riskAppTest.getState());
    if(current.form.craRole!=='manufacturer'||current.guideAnswers['CRA-08'].value!=='manufacturer'||current.guideAnswers['CRA-08'].sourceField!=='craRole')throw new Error('Herstellerrolle ist nicht kanonisch gespeichert.');
    await pageA.reload({waitUntil:'networkidle'});current=await pageA.evaluate(()=>window.__riskAppTest.getState());
    if(current.form.craRole!=='manufacturer'||current.guideAnswers['CRA-08'].value!=='manufacturer')throw new Error('Rolle ging beim Neuladen verloren.');
    const downloadPromise=pageA.waitForEvent('download');await pageA.locator('#exportButton').click();const download=await downloadPromise,exportPath=path.join(tmp,'browser-a.json');await download.saveAs(exportPath);
    const exported=JSON.parse(fs.readFileSync(exportPath,'utf8'));if(exported.assessment.form.craRole!=='manufacturer'||exported.assessment.guideAnswers['CRA-08'].value!=='manufacturer')throw new Error('Export enthält keinen konsistenten Rollencode.');
  });

  await test('B-F01-02','Keine, jede Einzelrolle, Mehrfachrolle, Prüfbedarf und Abwahl funktionieren sichtbar',async()=>{
    const fields=['craRoleManufacturer','craRoleRepresentative','craRoleImporter','craRoleDistributor','craRoleSteward'],cases=[
      {values:['no','no','no','no','no'],code:'none'},
      ...['manufacturer','representative','importer','distributor','steward'].map((code,index)=>({values:Array.from({length:5},(_,i)=>i===index?'yes':'no'),code})),
      {values:['yes','yes','no','no','no'],code:'multiple'},{values:['review','no','no','no','no'],code:'review'},{values:['','','','',''],code:''}
    ];
    for(let caseIndex=0;caseIndex<cases.length;caseIndex++){
      const sample=cases[caseIndex];for(let i=0;i<fields.length;i++){const input=pageA.locator(`[data-field="${fields[i]}"]`);await input.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await input.selectOption(sample.values[i]);}
      let state=await pageA.evaluate(()=>window.__riskAppTest.getState());if(state.form.craRole!==sample.code||state.guideAnswers['CRA-08'].value!==sample.code)throw new Error(`Erwartet ${sample.code}, erhalten ${state.form.craRole}/${state.guideAnswers['CRA-08'].value}.`);
      const expectedAssessmentId=state.form.assessmentId;await pageA.reload({waitUntil:'networkidle'});state=await pageA.evaluate(()=>window.__riskAppTest.getState());if(state.form.craRole!==sample.code||state.guideAnswers['CRA-08'].value!==sample.code)throw new Error(`Neuladen verlor den Fall ${sample.code}.`);
      const downloadPromise=pageA.waitForEvent('download');await pageA.locator('#exportButton').click();const download=await downloadPromise,exportPath=path.join(tmp,`cra-role-${caseIndex}.json`);await download.saveAs(exportPath);
      pageA.once('dialog',dialog=>dialog.accept());await pageA.locator('#resetButton').click();await pageA.locator('#importFile').setInputFiles(exportPath);await pageA.waitForFunction(id=>window.__riskAppTest.getState().form.assessmentId===id,expectedAssessmentId);state=await pageA.evaluate(()=>window.__riskAppTest.getState());if(state.form.craRole!==sample.code||state.guideAnswers['CRA-08'].value!==sample.code)throw new Error(`Wiederimport verlor den Fall ${sample.code}.`);
    }
  });

  await test('B-F01-03','Vollständig unbeantwortete CRA-Rollen bleiben ohne erfundenen Sammelwert erhalten',async()=>{
    await pageA.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();['craRoleManufacturer','craRoleRepresentative','craRoleImporter','craRoleDistributor','craRoleSteward','craRole'].forEach(field=>delete s.form[field]);delete s.guideAnswers['CRA-08'];s.step=3;api.setStateForTest(s);});
    let state=await pageA.evaluate(()=>window.__riskAppTest.getState());if(Object.prototype.hasOwnProperty.call(state.form,'craRole')||Object.prototype.hasOwnProperty.call(state.guideAnswers,'CRA-08'))throw new Error('Unbeantworteter Zustand erhielt voreilig einen Sammelwert.');
    await pageA.reload({waitUntil:'networkidle'});state=await pageA.evaluate(()=>window.__riskAppTest.getState());if(Object.prototype.hasOwnProperty.call(state.form,'craRole')||Object.prototype.hasOwnProperty.call(state.guideAnswers,'CRA-08'))throw new Error('Neuladen veränderte den unbeantworteten Zustand.');
    const downloadPromise=pageA.waitForEvent('download');await pageA.locator('#exportButton').click();const download=await downloadPromise,exportPath=path.join(tmp,'cra-role-unanswered.json');await download.saveAs(exportPath);pageA.once('dialog',dialog=>dialog.accept());await pageA.locator('#resetButton').click();await pageA.locator('#importFile').setInputFiles(exportPath);await pageA.waitForFunction(()=>window.__riskAppTest.getState().form.internalToolId==='TOOL-DOK-001');state=await pageA.evaluate(()=>window.__riskAppTest.getState());if(Object.prototype.hasOwnProperty.call(state.form,'craRole')||Object.prototype.hasOwnProperty.call(state.guideAnswers,'CRA-08'))throw new Error('Wiederimport veränderte den unbeantworteten Zustand.');
  });

  await test('B-F02-01','ORG-22 wechselt erfüllt – teilweise – erfüllt – teilweise ohne Datenverlust',async()=>{
    await pageA.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();s.step=5;const area=Object.values(s.org).find(item=>item.criteria?.org22);area.criteria.org22.answer='fulfilled';area.criteria.org22.reason='';api.setStateForTest(s);});
    await pageA.locator('#stepNavigation [data-step="5"]').click();let criterion=pageA.locator('[data-org-criterion="org22"][data-org-criterion-field="answer"]');await criterion.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});
    await criterion.selectOption('partial');criterion=pageA.locator('[data-org-criterion="org22"][data-org-criterion-field="answer"]');await criterion.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await pageA.locator('[data-org-criterion="org22"][data-org-criterion-field="reason"]').fill('Teilweise erfüllt; Nachweis offen.');
    const derivedBeforeNavigation=await pageA.evaluate(()=>window.__riskAppTest.getState().registers.organizational.filter(item=>item.id==='OM-ORG-22'));if(!derivedBeforeNavigation.some(item=>item.sourceActive!==false))throw new Error(`ORG-22 wurde nach sichtbarer Teilbewertung nicht erzeugt: ${JSON.stringify(derivedBeforeNavigation)}`);
    await pageA.locator('#stepNavigation [data-step="6"]').dispatchEvent('click');const registerIndex=await pageA.evaluate(()=>window.__riskAppTest.getState().registers.organizational.findIndex(item=>item.id==='OM-ORG-22'&&item.sourceActive!==false)),ownerField=pageA.locator(`[data-register="organizational"][data-register-index="${registerIndex}"][data-register-field="owner"]`);if(registerIndex<0||await ownerField.count()!==1)throw new Error(`ORG-22 ist im sichtbaren Register nicht eindeutig vorhanden; Diagnose: ${JSON.stringify(await pageA.evaluate(()=>({step:window.__riskAppTest.getState().step,title:document.querySelector('#stepTitle')?.textContent,fields:document.querySelectorAll('[data-register="organizational"]').length,ids:window.__riskAppTest.getState().registers.organizational.filter(item=>item.sourceActive!==false).map(item=>item.id)})))}`);await ownerField.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await ownerField.fill('Fachstelle Browsertest');await pageA.locator(`[data-register="organizational"][data-register-index="${registerIndex}"][data-register-field="evidence"]`).fill('Nachweis Browsertest');
    await pageA.locator('#stepNavigation [data-step="5"]').dispatchEvent('click');criterion=pageA.locator('[data-org-criterion="org22"][data-org-criterion-field="answer"]');await criterion.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await criterion.selectOption('fulfilled');
    let inactive=await pageA.evaluate(()=>window.__riskAppTest.getState().registers.organizational.find(item=>item.id==='OM-ORG-22'));
    if(inactive?.sourceActive!==false)throw new Error('Erfülltes Kriterium wurde nicht historisch inaktiv gesetzt.');
    criterion=pageA.locator('[data-org-criterion="org22"][data-org-criterion-field="answer"]');await criterion.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await criterion.selectOption('partial');criterion=pageA.locator('[data-org-criterion="org22"][data-org-criterion-field="answer"]');await criterion.evaluate(element=>{const details=element.closest('details');if(details)details.open=true;});await pageA.locator('[data-org-criterion="org22"][data-org-criterion-field="reason"]').fill('Erneut teilweise erfüllt.');
    await pageA.locator('#stepNavigation [data-step="6"]').dispatchEvent('click');const state=await pageA.evaluate(()=>window.__riskAppTest.getState()),matches=state.registers.organizational.filter(item=>item.id==='OM-ORG-22'),active=matches.filter(item=>item.sourceActive!==false);
    if(matches.length!==1||active.length!==1||active[0].owner!=='Fachstelle Browsertest'||active[0].evidence!=='Nachweis Browsertest'||active[0].blocking!=='review')throw new Error(`Verlauf inkonsistent: ${JSON.stringify(matches)}`);
    await pageA.reload({waitUntil:'networkidle'});const reloaded=await pageA.evaluate(()=>window.__riskAppTest.getState().registers.organizational.filter(item=>item.id==='OM-ORG-22'));if(reloaded.length!==1||reloaded[0].owner!=='Fachstelle Browsertest')throw new Error('Manuelle Registerangaben gingen beim Neuladen verloren.');
  });

  await test('B-E2E-01','Export aus Kontext A ersetzt in Kontext B Zustand und Berichtssnapshot transaktional',async()=>{
    await pageA.evaluate(()=>{const api=window.__riskAppTest,s=api.getState();s.form.toolName='Browserfall A endgültig';s.guideAnswers['TOOL-01']={value:s.form.toolName,sourceField:'toolName'};s.form.internalToolId='BROWSER-A-END';api.setStateForTest(s);});
    const downloadPromise=pageA.waitForEvent('download');await pageA.locator('#exportButton').click();const download=await downloadPromise,exportPath=path.join(tmp,'browser-a-final.json');await download.saveAs(exportPath);
    const contextB=await browser.newContext(),pageB=await contextB.newPage();await pageB.goto(url,{waitUntil:'networkidle'});await pageB.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();s.form.toolName='Veralteter Browserfall B';s.guideAnswers['TOOL-01']={value:s.form.toolName,sourceField:'toolName'};s.step=7;api.setStateForTest(s);});await pageB.locator('#stepNavigation [data-step="7"]').click();await pageB.locator('#showCompactReportButton').click();if(!await pageB.locator('.report-area').getByText('Veralteter Browserfall B',{exact:false}).first().isVisible())throw new Error('Vorbedingung Bericht B fehlt.');
    await pageB.locator('#importFile').setInputFiles(exportPath);await pageB.waitForFunction(()=>window.__riskAppTest.getState().form.internalToolId==='BROWSER-A-END');const imported=await pageB.evaluate(()=>window.__riskAppTest.getState());if(imported.reportVisible||imported.form.toolName!=='Browserfall A endgültig')throw new Error('Import ersetzte Fall oder Berichtsansicht nicht korrekt.');
    await pageB.locator('#stepNavigation [data-step="7"]').click();await pageB.locator('#showCompactReportButton').click();let report=pageB.locator('.report-area');if(!(await report.innerText()).includes('Browserfall A endgültig')||(await report.innerText()).includes('Veralteter Browserfall B'))throw new Error('Kompaktbericht enthält einen veralteten Snapshot.');await pageB.locator('#showEvidenceReportButton').click();report=pageB.locator('.report-area');if(!(await report.innerText()).includes('Browserfall A endgültig')||(await report.innerText()).includes('Veralteter Browserfall B'))throw new Error('Nachweisbericht enthält einen veralteten Snapshot.');
    const stored=await pageB.evaluate(()=>JSON.parse(localStorage.getItem('ki-risikobewertung-masterarbeit-v17')));if(stored.form.internalToolId!=='BROWSER-A-END')throw new Error('Nativer localStorage in Kontext B enthält nicht den importierten Fall.');await contextB.close();
  });

  await contextA.close();await browser.close();await new Promise(resolve=>server.close(resolve));
  const failed=results.filter(item=>!item.pass);console.log(`\n${results.length-failed.length}/${results.length} reale Browser-Persistenzprüfungen bestanden`);if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(`✗ Browser-Persistenzprüfung abgebrochen: ${error.stack||error.message}`);process.exitCode=1;});
