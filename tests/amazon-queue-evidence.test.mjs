import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
test('Amazon only consumes a new failed check for the same queue item', t => {
  const cwd=mkdtempSync(path.join(tmpdir(),'rocky-queue-'));
  t.after(()=>rmSync(cwd,{recursive:true,force:true}));
  mkdirSync(path.join(cwd,'data'));
  const file=n=>path.join(cwd,'data',n+'.json');
  const now=new Date().toISOString();
  const rows=['waiting','failed','candidate','duplicate','reopen'].map(id=>({id,store:'Amazon',publishedAt:now,status:'pending',attempts:2}));
  Object.assign(rows[4],{status:'rejected',reason:'No se pudo verificar el producto exacto, el precio'});
  writeFileSync(file('telegram-source-queue'),JSON.stringify({items:rows}));
  writeFileSync(file('amazon-community-signal-state'),JSON.stringify({queueChecks:Object.fromEntries(
    [['failed','unmatched'],['candidate','candidate'],['duplicate','duplicate']].map(([id,status])=>[id,{status,checkedAt:now,reason:'Consulta sin coincidencia'}]))}));
  const script=fileURLToPath(new URL('../scripts/reconcile-telegram-source-queue.mjs',import.meta.url));
  for(let i=0;i<2;i++) execFileSync(process.execPath,[script],{cwd});
  const result=JSON.parse(readFileSync(file('telegram-source-queue'))).items;
  assert.deepEqual(result.map(i=>[i.status,i.attempts]),[['pending',2],['rejected',3],['pending',2],['duplicate',2],['pending',0]]);
  assert.match(result[1].reason,/Consulta sin coincidencia/);
});
