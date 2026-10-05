/*
 * Erstellt ein lokales Prüfpaket aus einer ausdrücklichen Positivliste.
 * Private Dokumente, beliebige Exporte, Zugangsdaten und Git-Daten werden nicht übernommen.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const outputDir=path.join(root,'output','konsistenzpruefung');
const staging=path.join(outputDir,'pruefpaket-staging');
const zipPath=path.join(outputDir,'KI-Risikobewertung-Pruefpaket-Prototyp-1.12.zip');
const externalManifestPath=path.join(outputDir,'Dateiliste-SHA256-Prototyp-1.12.txt');

const projectFiles=['index.html','styles.css','app.js','guide-reference.js','README.md','.gitignore','.nojekyll'];
const testFiles=fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.cjs')).map(name=>path.join('tests',name));
const fixtureFiles=['tests/fixtures/ki-risikobewertung-schema13-original.json','tests/fixtures/ki-risikobewertung-schema14-original.json','tests/fixtures/ki-risikobewertung-schema15-original.json','tests/fixtures/recruiting-golden.cjs'];
const artifactFiles=[
  'output/recruiting/ki-risikobewertung-TOOL-REC-001.json',
  'output/recruiting/KI-Risikobewertung-Kompaktbericht-TOOL-REC-001.html',
  'output/recruiting/KI-Risikobewertung-Nachweisbericht-TOOL-REC-001.html',
  'output/pdf/KI-Risikobewertung-Kompaktbericht-TOOL-REC-001.pdf',
  'output/pdf/KI-Risikobewertung-Nachweisbericht-TOOL-REC-001.pdf'
];
const whitelist=[...projectFiles,...testFiles,...fixtureFiles,...artifactFiles];

fs.rmSync(staging,{recursive:true,force:true});
fs.mkdirSync(staging,{recursive:true});
for(const relative of whitelist){
  const source=path.join(root,relative);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile())throw new Error(`Pflichtdatei fehlt: ${relative}`);
  const target=path.join(staging,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
}

const hashes=whitelist.map(relative=>{
  const data=fs.readFileSync(path.join(staging,relative));
  return`${crypto.createHash('sha256').update(data).digest('hex')}  ${relative}`;
});
const manifest=[
  '# KI-Risikobewertung – Prüfpaket Prototyp 1.12',
  '# Datenmodell: 17',
  '# Regelwerk: 2.11',
  '# Leitfaden: Version 2.0 – vorläufige Fassung',
  ...hashes
].join('\n')+'\n';
fs.writeFileSync(path.join(staging,'MANIFEST-SHA256.txt'),manifest,'utf8');

fs.rmSync(zipPath,{force:true});
execFileSync('/usr/bin/zip',['-q','-r',zipPath,'.'],{cwd:staging});
fs.rmSync(staging,{recursive:true,force:true});

const zipHash=crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
fs.writeFileSync(externalManifestPath,`${manifest}${zipHash}  ${path.relative(root,zipPath)}\n`,'utf8');

console.log(JSON.stringify({zip:zipPath,manifest:externalManifestPath,files:whitelist.length+1,bytes:fs.statSync(zipPath).size,sha256:zipHash},null,2));
