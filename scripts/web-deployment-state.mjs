import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Public/rendered inputs only. Bot polling cursors and publication attempt
// counters must not invalidate a completed website build.
export const WEB_INPUTS=['app','public','scripts','build','package.json','package-lock.json','tsconfig.json','next.config.ts','next.config.mjs','vite.config.ts','vinext.config.ts','postcss.config.mjs','.github/workflows/web-deploy.yml','data/offers.json','data/posts.json','data/price-history.json','data/editor-recommendations.json','data/mobile-comparison.json','data/tv-selection.json','data/tesla-catalogue.json','data/tesla-import-details.json','data/tesla-price-observations.json','data/tesla-amazon-observations.json','data/tesla-discovery-config.json'];
export function webFingerprint(ref='HEAD',cwd=process.cwd()) {
  const tree=execFileSync('git',['ls-tree','-r',ref,'--',...WEB_INPUTS],{cwd,encoding:'utf8'});
  return createHash('sha256').update(tree).digest('hex');
}
export function publishedFingerprint(cwd=process.cwd()) {
  try {return JSON.parse(execFileSync('git',['show','refs/remotes/origin/gh-pages:web-build.json'],{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']})).fingerprint||'';} catch {return '';}
}
function output(values) {
  const lines=Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')+'\n';
  if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,lines);
  console.log(lines.trim());
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2]||'prepare';
  const fingerprint=webFingerprint();
  if(mode==='prepare') output({needed:process.env.FORCE_WEB_DEPLOY==='true'||fingerprint!==publishedFingerprint(),fingerprint,source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
  else if(mode==='guard') output({current:fingerprint===webFingerprint('origin/main')});
  else if(mode==='manifest') {
    if(fingerprint!==webFingerprint('origin/main')) throw new Error('El contenido público cambió durante la compilación. No se publica una versión antigua.');
    fs.writeFileSync('out-github/web-build.json',JSON.stringify({schema:1,fingerprint,source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),built_at:new Date().toISOString()},null,2)+'\n');
  } else throw new Error(`Modo desconocido: ${mode}`);
}
