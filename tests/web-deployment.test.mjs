import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {webFingerprint,publishedFingerprint} from '../scripts/web-deployment-state.mjs';
const require=createRequire(import.meta.url);
const yaml=require('js-yaml');
const source=fs.readFileSync('.github/workflows/deploy.yml','utf8');
const web=fs.readFileSync('.github/workflows/web-deploy.yml','utf8');

test('workflow YAML parses and only the isolated web job publishes Pages',()=>{
  const config=yaml.load(web), old=yaml.load(source);
  assert.equal(config.concurrency,undefined);
  assert.equal(config.jobs.website.concurrency.group,'chollosaldia-web-only');
  assert.equal(config.jobs.website.concurrency['cancel-in-progress'],false);
  assert(!config.jobs.website.if.includes('conclusion'));
  assert(config.jobs.website.if.includes('head_repository.id == github.event.repository.id'));
  assert.equal(old.concurrency['cancel-in-progress'],false);
  assert(!source.includes('peaceiris/actions-gh-pages'));
  assert(!source.includes('npm run build:github'));
  assert(web.includes('peaceiris/actions-gh-pages@v4'));
  assert(!web.includes('TELEGRAM_BOT_TOKEN'));
  assert(!web.includes('ALIEXPRESS_APP_SECRET'));
  assert(!web.includes('npm run sync:'));
  assert(config.jobs.website.steps.find(s=>s.uses==='actions/checkout@v5').with.ref==='main');
  assert(web.includes("steps.guard.outputs.current == 'true'"));
});
test('editorial and bot completion can deploy GITHUB_TOKEN-authored content without push recursion',()=>{
  const config=yaml.load(web);
  for(const name of ['Publicar ChollosAlDía','Publicar resumen diario de ofertas','Publicar guía semanal de mejores productos','Publicar selección editorial de televisores','Publicar comparativa editorial de móviles','Publicar oferta seleccionada']) assert(config.on.workflow_run.workflows.includes(name));
  assert(!config.on.workflow_run.workflows.includes(config.name));
  assert.deepEqual(config.on.workflow_run.branches,['main']);
  assert(source.includes("github.event_name != 'push' || contains(github.event.head_commit.message, '[recheck-aliexpress]')"));
});
test('fingerprints ignore bot cursors but detect real public data and layout changes',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chollos-web-deploy-test-'));
  // Only this freshly-created test repository is removed.
  t.after(()=>{if(path.basename(dir).startsWith('chollos-web-deploy-test-')) fs.rmSync(dir,{recursive:true,force:true});});
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git('init');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  fs.mkdirSync(path.join(dir,'app'));fs.mkdirSync(path.join(dir,'data'));
  fs.writeFileSync(path.join(dir,'app','page.tsx'),'layout one');
  fs.writeFileSync(path.join(dir,'data','offers.json'),'[]');
  fs.writeFileSync(path.join(dir,'data','telegram-source-queue.json'),'[]');
  git('add','.');git('commit','-m','initial');
  const initial=webFingerprint('HEAD',dir);
  assert.equal(publishedFingerprint(dir),'');
  fs.writeFileSync(path.join(dir,'data','telegram-source-queue.json'),'[1]');git('add','.');git('commit','-m','cursor');
  assert.equal(webFingerprint('HEAD',dir),initial);
  fs.writeFileSync(path.join(dir,'data','offers.json'),'[{"id":1}]');git('add','.');git('commit','-m','offer');
  assert.notEqual(webFingerprint('HEAD',dir),initial);
  const content=webFingerprint('HEAD',dir);
  fs.writeFileSync(path.join(dir,'app','page.tsx'),'layout two');git('add','.');git('commit','-m','layout');
  assert.notEqual(webFingerprint('HEAD',dir),content);
  assert.equal(webFingerprint('HEAD~1',dir),content);
});
