import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { teslaGuides } from '../app/lib/tesla-guides.ts';

test('mat buying guide distinguishes generations and includes an illustrative basket comparison', () => {
  const sections = teslaGuides.alfombrillas.sections;
  assert.match(sections.find(s => s.id === 'juniper-original')?.title ?? '', /Juniper.*original/i);
  assert.match(sections.find(s => s.id === 'precio').text.join(' '), /ejemplo ilustrativo.*envío.*total/i);
});

test('blog provides a descriptive path to the Tesla hub', () => {
  const blog = readFileSync(new URL('../app/blog/page.tsx', import.meta.url), 'utf8');
  assert.match(blog, /href: "\/tesla\/"[^\n]+title: "Accesorios Tesla Model 3 y Model Y"/u);
});

test('model guides lead with their distinct generation without replacing the existing paths', () => {
  for (const [slug, phrase] of [['model-y', 'Model Y Juniper'], ['model-3', 'Model 3 Highland']]) {
    assert.ok(teslaGuides[slug].title.includes(phrase));
    assert.ok(teslaGuides[slug].description.includes(phrase));
    assert.match(teslaGuides[slug].description, /original/i);
  }
});
