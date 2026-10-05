/*
 * Zweck und Abdeckung: Prüft die reale Bedienoberfläche, Navigation, Berichtsaktionen,
 * responsive Darstellung und sichtbare Fachtexte in einem isolierten Browserlauf.
 * Abgrenzung: Keine vollständige Regelmatrix und keine Analyse erzeugter PDF-Dateien.
 */
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const runtimeRoot = path.resolve(path.dirname(process.execPath), '..', '..');
const resolveRuntimePackage=name=>{try{return require.resolve(name);}catch{return require.resolve(path.join(runtimeRoot,'node','node_modules',name));}};
const { chromium } = require(resolveRuntimePackage('playwright'));
const fs = require('node:fs');
const root=path.join(__dirname,'..');
const qaDir=path.join(root,'tmp','ui-qa');

(async()=>{
  fs.rmSync(qaDir,{recursive:true,force:true});fs.mkdirSync(qaDir,{recursive:true});
  /* Reale Browserprüfung mit protokollierten Konsolen- und Seitenfehlern; der Lauf bleibt lokal und ohne Netzwerkzugriff. */
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const results=[];
  const browserProblems=[];
  page.on('console',message=>{if(['warning','error'].includes(message.type()))browserProblems.push(`${message.type()}: ${message.text()}`);});
  page.on('pageerror',error=>browserProblems.push(`pageerror: ${error.message}`));
  const test=async(name,fn)=>{try{await fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,detail:error.message});}};
  await page.goto(pathToFileURL(path.join(__dirname,'..','index.html')).href);

  await test('Oberfläche startet mit acht neutralen Prüfschritten',async()=>{
    if(await page.locator('#stepNavigation .nav-step').count()!==8)throw new Error('Es wurden nicht acht Prüfschritte gerendert.');
    if(await page.locator('#stepNavigation .status-neutral').count()!==8)throw new Error('Nicht alle Prüfschritte starten neutral.');
  });

  await test('Sichtbare Versionsangaben entsprechen dem aktiven Daten- und Regelmodell',async()=>{
    const text=await page.locator('.method-basis').textContent();
    if(!text.includes('Prototyp 1.12 · Datenmodell 17')||!text.includes('Regelwerk 2.11'))throw new Error('Die sichtbaren Versionsangaben sind veraltet.');
  });

  await test('Bloßes Öffnen verändert keinen Status',async()=>{
    await page.locator('#stepNavigation [data-step="0"]').click();
    if(await page.locator('#stepNavigation .status-neutral').count()!==8)throw new Error('Das Öffnen hat einen Status verändert.');
  });

  await test('Verlassen eines leeren Schritts markiert nur den Ausgangsschritt rot',async()=>{
    await page.locator('#stepNavigation [data-step="1"]').click();
    if(!(await page.locator('#stepNavigation [data-step="0"]').getAttribute('class')).includes('status-red'))throw new Error('Der verlassene leere Schritt ist nicht rot.');
    if(!(await page.locator('#stepNavigation [data-step="1"]').getAttribute('class')).includes('status-neutral'))throw new Error('Der geöffnete Schritt wurde voreilig bewertet.');
  });

  await test('Musterfall lädt den fiktiven Recruiting-Fall mit korrekter Hochrisiko- und TR-07-Einordnung',async()=>{
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#exampleButton').click();
    await page.locator('#stepNavigation [data-step="3"]').click();
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,s=api.getState();return{id:s.form.internalToolId,hr18:s.form.materialInfluenceControl,hr19:s.form.profiling,hr03:s.form.annexISection,annex:api.evaluateAnnexHighRisk(),tr07:api.evaluateTR07(),decision:api.overallDecision(false,true)};});
    if(result.id!=='TOOL-REC-001'||result.hr18!=='yes'||result.hr19!=='yes'||result.hr03!=='')throw new Error('Die verbindlichen Recruiting-Eingaben wurden nicht vollständig geladen.');
    if(result.annex.code!=='yes'||result.annex.art63Status!=='HIGH_RISK'||result.tr07.status!=='APPLICABLE'||result.decision.code!=='ASSESSMENT_COMPLETE_WITH_OPEN_MEASURES')throw new Error('Recruiting-Hochrisiko-, TR-07- oder Gesamtstatus ist fachlich abweichend.');
    const text=await page.locator('#stepContent').textContent();
    if(!text.includes('Art. 26 Abs. 11')||!text.includes('02.12.2027'))throw new Error('Rechtsgrundlage oder Anwendungsdatum von TR-07 fehlt in der Oberfläche.');
  });

  await test('Stabile Prüffragen-IDs sind sichtbar',async()=>{
    if(await page.locator('.question-id').count()===0)throw new Error('Im aktuellen Prüfschritt ist keine Prüffragen-ID sichtbar.');
    const text=await page.locator('#stepContent').textContent();
    if(!text.includes('ART5-01')||!text.includes('TR-01')||!text.includes('CRA-01'))throw new Error('Erwartete IDs fehlen in der regulatorischen Prüfung.');
  });

  await test('Alle acht Prüfschritte, lange Inhalte, Register und Ergebnisprofile werden vollständig gerendert',async()=>{
    const expected=['Toolprofil','KI-System','Rolle','ART5-01','Risikoregister','ORG-01','DUTY-47','REVIEW-42'];
    for(let index=0;index<8;index++){
      await page.locator(`#stepNavigation [data-step="${index}"]`).click();
      const content=page.locator('#stepContent');
      const text=(await content.textContent())||'';
      if(text.length<350||!text.includes(expected[index]))throw new Error(`Prüfschritt ${index+1} ist inhaltlich unvollständig.`);
      const geometry=await content.evaluate(root=>{const width=document.documentElement.clientWidth;return[...root.querySelectorAll('label,.question,.assessment-path,.risk-card,.register-card,.report-table-wrap')].filter(el=>{const r=el.getBoundingClientRect();return r.width<2||r.height<2||(!el.closest('.report-table-wrap')&&r.right>width+3);}).slice(0,8).map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,60)}));});
      if(geometry.length)throw new Error(`Prüfschritt ${index+1} enthält unsichtbare oder überlaufende Kernelemente: ${JSON.stringify(geometry)}`);
      await page.screenshot({path:path.join(qaDir,`step-${index+1}.png`),fullPage:true});
    }
  });

  await test('Prüfschritt 7 zeigt die strukturierte DUTY-47-Prüfung mit Pflichtnachweis',async()=>{
    await page.evaluate(()=>window.__riskAppTest.setStateForTest(window.__riskAppTest.exampleState()));
    await page.locator('#stepNavigation [data-step="6"]').click();
    const select=page.locator('[data-field="legalRegimeFulfilment"]'),evidence=page.locator('[data-field="legalRegimeFulfilmentEvidence"]');
    if(!await select.isVisible()||!await evidence.isVisible())throw new Error('Strukturierte DUTY-47-Felder sind nicht sichtbar.');
    const options=await select.locator('option').allTextContents();
    for(const expected of ['Ja – eindeutig geklärt','Nein – ungeklärte oder widersprüchliche Pflichterfüllung','Weiterer Prüfbedarf'])if(!options.includes(expected))throw new Error('DUTY-47-Antwortoption fehlt: '+expected);
    const text=await page.locator('#stepContent').textContent();
    if(!text.includes('Datenschutzrecht')||!text.includes('sektorales Recht'))throw new Error('Weitere Rechtsregime werden nicht sichtbar berücksichtigt.');
    await page.screenshot({path:path.join(qaDir,'step-7-duty-47.png'),fullPage:true});
  });

  await test('DUTY-45 und DUTY-47 erscheinen mit den strukturierten Ergebnissen',async()=>{
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();s.step=6;s.form.purposeAlignment='partial';s.guideAnswers['CTX-02']={value:'partial',sourceField:'purposeAlignment'};s.form.legalRegimeFulfilment='unresolved';s.form.legalRegimeFulfilmentEvidence='EU AI Act, CRA und Datenschutzrecht widersprechen sich in der dokumentierten Umsetzung.';api.setStateForTest(s);const duties=api.dutyOperationalResults();return{d45:duties.find(item=>item.id==='DUTY-45'),d47:duties.find(item=>item.id==='DUTY-47')};});
    if(result.d45.value!=='yes'||!result.d45.reason.includes('teilweise Abweichung'))throw new Error('DUTY-45 zeigt die teilweise Zweckabweichung nicht korrekt.');
    if(result.d47.value!=='yes'||!result.d47.reason.includes('juristischer Prüfbedarf'))throw new Error('DUTY-47 zeigt die ungeklärte Pflichterfüllung nicht korrekt.');
    const text=await page.locator('#stepContent').textContent();
    if(!text.includes('DUTY-45')||!text.includes('DUTY-47')||!text.includes('teilweise Abweichung'))throw new Error('Die DUTY-Ergebnisse sind in der Tabelle nicht nachvollziehbar sichtbar.');
    await page.locator('summary').filter({hasText:'Operationalisierte Pflichten und Prüfbedarfe'}).click();
    await page.screenshot({path:path.join(qaDir,'duty-45-47-results.png'),fullPage:true});
    await page.evaluate(()=>window.__riskAppTest.setStateForTest(window.__riskAppTest.exampleState()));
  });

  await test('Normaler Benutzerablauf synchronisiert Prüfbedarf ohne Klick auf den Synchronisierungsbutton',async()=>{
    await page.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();s.step=2;s.form.tGeneralRequirements='yes';s.guideAnswers['TR-06']={value:'yes',sourceField:'tGeneralRequirements'};s.form.overallReasoning='Pilotbetrieb ist mit den dokumentierten Kontrollen zulässig; die CRA-Abgrenzung wurde für diesen Vergleichsfall geklärt.';s.registers.legal.forEach(item=>{item.status='resolved';item.result='Rechtsfrage für den Vergleichsfall geklärt.';item.blocking='no';item.ruleBlocking='no';});api.setStateForTest(s);});
    await page.locator('#stepNavigation [data-step="2"]').click();
    await page.locator('[data-field="purposeAlignment"]').selectOption('partial');
    const derived=await page.evaluate(()=>{const api=window.__riskAppTest,decision=api.overallDecision(false,true),state=api.getState(),pb=state.registers.legal.find(item=>item.id==='PB-DUTY-45'&&item.sourceActive!==false);return{decision:decision.code,pb,report:api.buildReport(api.buildReportData())};});
    if(!derived.pb||derived.decision==='ASSESSMENT_COMPLETE'||!derived.report.includes('PB-DUTY-45'))throw new Error('Prüfbedarf, Status oder Bericht wurden ohne manuellen Sync nicht aktualisiert.');
    if(await page.locator('#deriveRegistersButton').count())throw new Error('Der Synchronisierungsbutton wurde im normalen Ablauf unerwartet benötigt.');
    await page.locator('#stepNavigation [data-step="7"]').click();
    const text=await page.locator('#stepContent').textContent();
    if(!text.includes('Bewertung abgeschlossen mit offenen Maßnahmen'))throw new Error('Der automatisch synchronisierte, nicht blockierende Prüfbedarf ist im Abschlussstatus nicht sichtbar. Abgeleiteter Status: '+derived.decision);
    await page.screenshot({path:path.join(qaDir,'normal-flow-auto-sync.png'),fullPage:true});
    await page.evaluate(()=>window.__riskAppTest.setStateForTest(window.__riskAppTest.exampleState()));
  });

  await test('Inaktive Registereinträge werden historisch getrennt und statusneutral angezeigt',async()=>{
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();s.form.tGeneralRequirements='yes';s.guideAnswers['TR-06']={value:'yes',sourceField:'tGeneralRequirements'};s.form.overallReasoning='Pilotbetrieb ist mit den dokumentierten Kontrollen zulässig; die CRA-Abgrenzung wurde für diesen Vergleichsfall geklärt.';s.registers.legal.forEach(item=>{item.status='resolved';item.result='Rechtsfrage für den Vergleichsfall geklärt.';item.blocking='no';item.ruleBlocking='no';});api.setStateForTest(s);const before=api.overallDecision(false,true).code;s.registers.legal.push({id:'PB-HISTORISCH',derived:true,sourceStep:'7',sourceId:'alt',sourceActive:false,status:'open',blocking:'yes'});s.step=6;api.setStateForTest(s);return{before,after:api.overallDecision(false,true).code,review11:api.reviewOperationalResults().find(item=>item.id==='REVIEW-11').value};});
    if(result.before!==result.after||result.review11!=='no')throw new Error('Inaktiver Registereintrag beeinflusst weiterhin den aktuellen Status.');
    const text=await page.locator('#stepContent').textContent();
    if(!text.includes('Historische beziehungsweise nicht mehr aktive Einträge')||!text.includes('PB-HISTORISCH'))throw new Error('Historischer Registereintrag wird nicht getrennt angezeigt.');
    await page.locator('summary').filter({hasText:'Juristischer Prüfbedarf'}).click();
    await page.screenshot({path:path.join(qaDir,'register-active-historical.png'),fullPage:true});
    await page.evaluate(()=>window.__riskAppTest.setStateForTest(window.__riskAppTest.exampleState()));
  });

  await test('REVIEW-30 zeigt die fachliche Kategorie statt einer pauschalen Ja-Antwort',async()=>{
    await page.locator('#stepNavigation [data-step="7"]').click();
    const result=await page.evaluate(()=>window.__riskAppTest.reviewOperationalResults().find(item=>item.id==='REVIEW-30'));
    if(result.value!=='ai_system_in_scope'||!result.reason.includes('KI-System-Definition:')||!result.reason.includes('Anwendungsbereichsprüfung:'))throw new Error('REVIEW-30 ist fachlich oder in der Begründung nicht korrekt.');
    const text=await page.locator('#stepContent').textContent();
    if(!text.includes('REVIEW-30')||!text.includes('KI-System im Anwendungsbereich'))throw new Error('Die REVIEW-30-Kategorie ist in Prüfschritt 8 nicht sichtbar.');
    await page.locator('summary').filter({hasText:'Operationalisierte Zusammenführung und Dokumentation'}).click();
    await page.screenshot({path:path.join(qaDir,'review-30.png'),fullPage:true});
  });

  await test('Bedingtes REVIEW-10-Feld und die drei Behandlungsergebnisse sind sichtbar und statuswirksam',async()=>{
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();Object.assign(s.risks[0],{verifiedResidual:'high',acceptance:'notAccepted',treatmentNeeded:'review',suitableTreatmentAvailability:'unavailable',treatmentAvailabilityReason:'Keine geeignete Behandlung bestimmbar.'});s.step=4;api.setStateForTest(s);return{review:api.evaluateReview10().value,status:api.overallDecision(false,true).code};});
    if(result.review!=='yes'||result.status!=='USE_NOT_CONTINUABLE')throw new Error('REVIEW-10 wurde nicht korrekt abgeleitet.');
    const select=page.locator('[data-risk-field="suitableTreatmentAvailability"]');
    if(!await select.isVisible()||await select.locator('option').count()!==4)throw new Error('Das strukturierte Feld zur Behandlungsmöglichkeit fehlt.');
    await page.screenshot({path:path.join(qaDir,'conditional-review-10.png'),fullPage:true});
    await page.evaluate(()=>window.__riskAppTest.setStateForTest(window.__riskAppTest.exampleState()));
  });

  await test('Abweichende gesonderte Entscheidung bleibt auswählbar und verändert den Regelstatus nicht',async()=>{
    await page.locator('#stepNavigation [data-step="7"]').click();
    const before=await page.evaluate(()=>window.__riskAppTest.overallDecision(false,true).code);
    await page.locator('[data-field="approvalStatus"]').selectOption('approved');
    const after=await page.evaluate(()=>window.__riskAppTest.overallDecision(true,true).code);
    if(before!==after)throw new Error('Die gesonderte Entscheidung hat den regelbasierten Status verändert.');
    if(await page.locator('[data-field="approvalStatus"] option:disabled').count())throw new Error('Eine Entscheidungsoption wurde technisch ausgeblendet.');
    if(!await page.locator('.warning-only').isVisible())throw new Error('Der nicht statusverändernde Konsistenzhinweis fehlt.');
    await page.screenshot({path:path.join(qaDir,'decision-warning.png'),fullPage:true});
    await page.evaluate(()=>window.__riskAppTest.setStateForTest(window.__riskAppTest.exampleState()));
  });

  await test('Import B verwirft den geöffneten Kurzbericht A und erzeugt Titel sowie PDF nur aus Fall B',async()=>{
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,a=api.exampleState(),b=api.exampleState();a.form.toolName='Fall A Kurzbericht';a.guideAnswers['TOOL-01']={value:a.form.toolName,sourceField:'toolName'};a.form.internalToolId='FALL-A-KURZ';b.form.toolName='Fall B Kurzbericht';b.form.internalToolId='FALL-B-KURZ';b.step=7;b.guideAnswers['TOOL-01']={value:b.form.toolName,sourceField:'toolName'};api.setStateForTest(b);const json=JSON.stringify(api.assessmentExportObject());api.setStateForTest(a);api.setReportTypeForTest('compact');const before=api.getActiveReportInfo();api.importAssessmentJson(json);const afterImport=api.getActiveReportInfo();api.showReportForTest('compact');const afterReport=api.getActiveReportInfo();window.__printedTitle='';const originalPrint=window.print;window.print=()=>{window.__printedTitle=document.title;};api.printReportForTest('compact');window.print=originalPrint;return{before,afterImport,afterReport,printedTitle:window.__printedTitle,text:document.querySelector('.report-area')?.textContent||''};});
    if(result.before.toolName!=='Fall A Kurzbericht'||result.afterImport.visible||result.afterImport.hasSnapshot)throw new Error('Der Bericht A wurde nach dem Import nicht vollständig verworfen.');
    if(result.afterReport.toolName!=='Fall B Kurzbericht'||!result.afterReport.title.includes('Fall B Kurzbericht')||result.text.includes('Fall A Kurzbericht')||!result.text.includes('Fall B Kurzbericht'))throw new Error(`Der neu erzeugte Kurzbericht oder Titel gehört nicht eindeutig zu Fall B: ${JSON.stringify({afterReport:result.afterReport,hasA:result.text.includes('Fall A Kurzbericht'),hasB:result.text.includes('Fall B Kurzbericht')})}`);
    if(!result.printedTitle.includes('FALL-B-KURZ'))throw new Error('Der PDF-Drucktitel enthält nicht die Fallkennung B.');
    await page.emulateMedia({media:'print'});const pdfPath=path.join(qaDir,'import-fall-b-kurzbericht.pdf');await page.pdf({path:pdfPath,format:'A4',printBackground:true});if(fs.statSync(pdfPath).size<50000)throw new Error('Der PDF-Nachweis für Fall B wurde nicht vollständig erzeugt.');await page.emulateMedia({media:'screen'});
  });

  await test('Import B verwirft den geöffneten Nachweisbericht A',async()=>{
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,a=api.exampleState(),b=api.exampleState();a.form.toolName='Fall A Nachweis';a.guideAnswers['TOOL-01']={value:a.form.toolName,sourceField:'toolName'};a.form.internalToolId='FALL-A-NACHWEIS';b.form.toolName='Fall B Nachweis';b.form.internalToolId='FALL-B-NACHWEIS';b.step=7;b.guideAnswers['TOOL-01']={value:b.form.toolName,sourceField:'toolName'};api.setStateForTest(b);const json=JSON.stringify(api.assessmentExportObject());api.setStateForTest(a);api.setReportTypeForTest('evidence');api.importAssessmentJson(json);const afterImport=api.getActiveReportInfo();api.showReportForTest('evidence');return{afterImport,afterReport:api.getActiveReportInfo(),text:document.querySelector('.report-area')?.textContent||''};});
    if(result.afterImport.visible||result.afterImport.hasSnapshot)throw new Error('Der alte Nachweisbericht blieb nach dem Import aktiv.');
    if(result.afterReport.type!=='evidence'||result.afterReport.toolName!=='Fall B Nachweis'||result.text.includes('Fall A Nachweis')||!result.text.includes('Fall B Nachweis'))throw new Error(`Der neue Nachweisbericht gehört nicht eindeutig zu Fall B: ${JSON.stringify({afterReport:result.afterReport,hasA:result.text.includes('Fall A Nachweis'),hasB:result.text.includes('Fall B Nachweis')})}`);
  });

  await test('Fehlerhafter Import erhält Arbeitsstand, Bericht, Titel und Speicherung von Fall A',async()=>{
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,a=api.exampleState();a.form.toolName='Gültiger Fall A';a.guideAnswers['TOOL-01']={value:a.form.toolName,sourceField:'toolName'};a.form.internalToolId='GUELTIG-A';api.setStateForTest(a);api.setReportTypeForTest('compact');const bad=api.assessmentExportObject();bad.assessment.step=100;const storageSnapshot=()=>Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)]);const before={state:api.getState(),report:api.getActiveReportInfo(),storage:storageSnapshot()};let message='';try{api.importAssessmentJson(JSON.stringify(bad));}catch(error){message=error.message;}return{before,after:{state:api.getState(),report:api.getActiveReportInfo(),storage:storageSnapshot()},message};});
    if(!result.message.includes('Navigationsschritt')||JSON.stringify(result.before)!==JSON.stringify(result.after))throw new Error('Der fehlgeschlagene Import hat den gültigen Fall oder seine Anzeige verändert.');
  });

  await test('Neu beginnen und Musterfall laden verwerfen jeweils einen geöffneten Bericht',async()=>{
    const result=await page.evaluate(()=>{const api=window.__riskAppTest,s=api.exampleState();s.form.toolName='Alter Bericht';s.guideAnswers['TOOL-01']={value:s.form.toolName,sourceField:'toolName'};api.setStateForTest(s);api.setReportTypeForTest('evidence');api.reset();const afterReset=api.getActiveReportInfo();api.setStateForTest(s);api.setReportTypeForTest('compact');api.loadExample();return{afterReset,afterExample:api.getActiveReportInfo()};});
    if(result.afterReset.visible||result.afterReset.hasSnapshot||result.afterExample.visible||result.afterExample.hasSnapshot)throw new Error('Ein Fallwechsel ließ einen alten Berichtssnapshot aktiv.');
  });

  await test('Bericht enthält alle Pflichtabschnitte und ausschließlich zulässige Statusbegriffe',async()=>{
    await page.locator('#stepNavigation [data-step="7"]').click();
    await page.locator('#buildReportButton').click();
    if(await page.locator('.report-page').count()!==10||!await page.locator('.compact-report').count())throw new Error('Der kompakte Standardbericht besitzt nicht die geforderten zehn Kapitel.');
    await page.locator('#showEvidenceReportButton').click();
    if(await page.locator('.report-page').count()<14||!await page.locator('.evidence-report').count())throw new Error('Der vollständige Nachweisbericht enthält nicht alle erforderlichen Berichtsabschnitte.');
    const text=await page.locator('.report-area').textContent();
    if(!text.includes('Bewertung abgeschlossen mit offenen Maßnahmen'))throw new Error('Der für den Recruiting-Musterfall abgeleitete Bewertungsstatus fehlt.');
    const forbidden=[['RELEASE','ABLE'].join(''),['Freigabe','fähig'].join(''),['Freigabe','empfehlung'].join(''),['Bericht mit',' Auflagen'].join('')];
    if(forbidden.some(term=>text.includes(term)))throw new Error('Eine alte automatische Freigabebezeichnung ist sichtbar.');
    if(!text.includes('Prototypversion')||!text.includes('Datenmodellversion')||!text.includes('Vollständige Quellenprüfung')||!text.includes('Letzte Aktualitätsprüfung'))throw new Error('Versions- oder Quellenmetadaten fehlen.');
    if(!text.includes('Operationalisierte Pflichten DUTY-01 bis DUTY-47')||!text.includes('Operationalisierte Review-Ergebnisse REVIEW-01 bis REVIEW-42')||!text.includes('Gesonderte menschliche beziehungsweise organisatorische Entscheidung'))throw new Error('Operationalisierte DUTY-/REVIEW-Ausgaben oder die getrennte Entscheidung fehlen.');
    if(!text.includes('Strukturierte Prüfung DUTY-47')||!text.includes('Historische beziehungsweise nicht mehr aktive Einträge')||!text.includes('KI-System im Anwendungsbereich'))throw new Error('DUTY-47, historische Registertrennung oder REVIEW-30 fehlen im Bericht.');
    if(/REVIEW-30\s+Ja\s+KI-System-Definition:/.test(text))throw new Error('REVIEW-30 enthält weiterhin eine widersprüchliche pauschale Ja-Ausgabe.');
    const integrity=await page.evaluate(()=>window.__riskAppTest.validateGuideImplementation());
    if(!integrity.valid||integrity.referenceCount!==294||integrity.implementedCount!==294)throw new Error('Die Leitfaden-ID-Referenz ist nicht vollständig oder nicht eindeutig.');
    await page.screenshot({path:path.join(qaDir,'report.png'),fullPage:true});
  });

  await test('Mobile Ansicht besitzt keinen horizontalen Seitenüberlauf',async()=>{
    await page.setViewportSize({width:390,height:844});
    const overflow=await page.evaluate(()=>{const width=document.documentElement.clientWidth;const uncontained=[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>width+2&&!el.closest('.report-table-wrap')&&!el.closest('#stepNavigation')).map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,80)})).slice(0,12);return{document:document.documentElement.scrollWidth>width+2,uncontained};});
    if(overflow.document||overflow.uncontained.length)throw new Error('Die mobile Ansicht läuft außerhalb vorgesehener Scrollbereiche über: '+JSON.stringify(overflow));
    await page.screenshot({path:path.join(qaDir,'mobile.png'),fullPage:false});
  });

  await test('Browser meldet keine JavaScript-Fehler oder Warnungen',async()=>{
    if(browserProblems.length)throw new Error(browserProblems.join(' | '));
  });

  await browser.close();
  for(const result of results)console.log(`${result.pass?'✓':'✗'} ${result.name}${result.pass?'':` – ${result.detail}`}`);
  const failed=results.filter(result=>!result.pass).length;
  console.log(`\n${results.length-failed} UI-Tests bestanden, ${failed} fehlgeschlagen`);
  console.log(`Visuelle Prüfbilder: ${qaDir}`);
  process.exitCode=failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
