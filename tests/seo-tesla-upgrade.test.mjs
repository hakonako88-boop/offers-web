import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('Tesla schema describes real guides and never invents product ratings or availability',async()=>{
 const text=await source('app/tesla/TeslaSeo.tsx');
 for(const value of ['BreadcrumbList','CollectionPage','ItemList','description','isPartOf']) assert.ok(text.includes(value));
 assert.doesNotMatch(text,/aggregateRating|InStock|'Product'/);
});
test('Tesla metadata has canonical and specific social cards; search discovers the four guides',async()=>{
 for(const path of ['app/tesla/page.tsx','app/tesla/guias/[modelo]/page.tsx']){const text=await source(path);assert.match(text,/canonical:/);assert.match(text,/twitter:/);}
 assert.match(await source('app/buscar/page.tsx'),/Object.entries\(teslaGuides\)/);
});
test('sitemap uses actual Tesla observations and actual editorial revisions',async()=>{
 const text=await source('app/sitemap.ts');assert.match(text,/teslaLastModified\(\)/);assert.match(text,/post.modifiedAt \|\| post.publishedAt/);
 const posts=await source('app/lib/posts.ts');assert.match(posts,/reviewed <= Date.now\(\)/);assert.match(posts,/reviewed > timestamp/);
});
