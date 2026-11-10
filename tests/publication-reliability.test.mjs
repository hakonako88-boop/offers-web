import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const YAML=createRequire(import.meta.url)('js-yaml');
import {publicationAllowance,publicationReasonLabel} from '../scripts/publication-policy.mjs';
import {dashboardSnapshot,formatDashboard} from '../scripts/telegram-admin-dashboard.mjs';
const now=new Date('2026-11-10T16:35:00Z');
const offer=(store,index=0,source='auto')=>({store,source,date:Date.parse('2026-11-10T10:00:00Z')/1000+index*600});
const full=[...Array.from({length:10},(_,i)=>offer('AliExpress',i)),...Array.from({length:4},(_,i)=>offer('MediaMarkt',i))];
test('publisher, inbox and every shared producer preserve multiple pending runs',()=>{
 for(const file of ['deploy','telegram-source-poll','publish-selected-source','requested-gta']){
  const workflow=YAML.load(fs.readFileSync(`.github/workflows/${file}.yml`,'utf8'));
  assert.equal(workflow.concurrency.queue,'max');
  assert.equal(workflow.concurrency['cancel-in-progress'],false);
 }
});

test('an old one-off GTA reservation never runs just because its configuration changes',()=>{
 const workflow=YAML.load(fs.readFileSync('.github/workflows/requested-gta.yml','utf8'));
 assert.ok('workflow_dispatch' in workflow.on);
 assert.ok(!('push' in workflow.on));
 const script=fs.readFileSync('scripts/publish-requested-gta.mjs','utf8');
 assert.match(script,/offers.some/);
 assert.match(script,/Revisar de nuevo precio y cupón/);
});
test('a full normal slot does not starve an underrepresented shop',()=>{
 for(const store of ['Amazon','Miravia','PcComponentes']){
  const p=publicationAllowance({store,offers:full,now});
  assert.equal(p.allowed,true);assert.equal(p.reason,'reserved-store-slot');
 }
 const dominant=publicationAllowance({store:'AliExpress',offers:full,now});
 assert.equal(dominant.allowed,false);assert.equal(dominant.reason,'time-slot-full');
});
test('reserve is bounded globally and per shop, not an unlimited bypass',()=>{
 const used=[...full,...Array.from({length:2},(_,i)=>offer('Amazon',i)),...Array.from({length:2},(_,i)=>offer('Miravia',i)),...Array.from({length:2},(_,i)=>offer('Xiaomi',i))];
 const p=publicationAllowance({store:'PcComponentes',offers:used,now});
 assert.equal(p.allowed,false);assert.equal(p.reservedUsed,6);
 assert.equal(publicationAllowance({store:'Amazon',offers:[...full,offer('Amazon'),offer('Amazon',1)],now}).allowed,false);
 assert.equal(publicationAllowance({store:'Unregistered shop',offers:full,now}).allowed,false);
});
test('reserves do not bypass store caps, quiet hours, cadence or NoLo policy',()=>{
 assert.equal(publicationAllowance({store:'Miravia',offers:[...full,...[0,1,2].map(i=>offer('Miravia',i))],now}).reason,'store-daily-limit');
 assert.equal(publicationAllowance({store:'Amazon',offers:full,now:new Date('2026-11-10T23:00:00Z')}).reason,'quiet-hours');
 const p=publicationAllowance({store:'Amazon',offers:[...full,{store:'AliExpress',date:now.getTime()/1000-60}],now});
 assert.equal(p.reason,'global-cadence');assert.match(publicationReasonLabel(p),/7 min/);
 const usedNoLo=Array.from({length:100},(_,i)=>offer('AliExpress',i%10,'nolodejesescapar'));
 assert.equal(publicationAllowance({store:'AliExpress',offers:usedNoLo,source:'nolodejesescapar',now}).storeLimit,null);
});
test('private panel separates retry waits, scheduling blocks, stale items and incomplete data',()=>{
 const queue={items:[
  {status:'pending',store:'AliExpress',publishedAt:'2026-11-10T10:00:00Z'},
  {status:'pending',store:'Amazon',publishedAt:'2026-11-10T10:00:00Z'},
  {status:'pending',store:'Miravia',publishedAt:'2026-11-10T10:00:00Z',nextAttemptAt:'2026-11-10T20:00:00Z'},
  {status:'pending',store:'AliExpress',publishedAt:'2026-08-01T10:00:00Z'},
  {status:'needs_review',store:'Amazon',reason:'No se pudo preparar la vista previa: falta precio'},
  {status:'needs_review',store:'Amazon',reason:'Falta ASIN'},
 ]};
 const s=dashboardSnapshot({offers:full,queue,now});
 assert.equal(s.ready,1);assert.equal(s.blocked,1);assert.equal(s.waiting,1);assert.equal(s.stalePending,1);assert.equal(s.needsReview,2);
 const text=formatDashboard(s,'queue',now);
 assert.match(text,/Cuota de esta franja completa/);assert.match(text,/Precio pendiente de verificar/);assert.match(text,/Producto exacto pendiente de verificar/);
 assert.match(formatDashboard(s,'stores',now),/Turno reservado/);
 assert.doesNotMatch(formatDashboard(s,'home',now),/Rocky está activo/);
});

test('missing or stale retailer health is not advertised as a working connection',()=>{
 const s=dashboardSnapshot({now,states:{amazon:{},miravia:{lastRunAt:'2026-11-01T12:00:00Z'},mediamarkt:{lastRunAt:now.toISOString(),lastError:'HTTP failure'}}});
 assert.equal(s.storeHealth.Amazon,'sin datos');
 assert.equal(s.storeHealth.Miravia,'sin comprobación reciente');
 assert.equal(s.storeHealth.MediaMarkt,'con incidencias');
});
