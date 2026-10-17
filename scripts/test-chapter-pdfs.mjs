import assert from 'node:assert/strict';
import { chapterPdfs, pdfDownloadUrl } from '../lib/chapter-pdfs.ts';

// Sanity returns null for the new field on chapters created before this change.
assert.equal(chapterPdfs(null).length, 0);
assert.equal(chapterPdfs().length, 0);

const uploaded = {
  _key: 'uploaded', title: 'Material i ri',
  url: 'https://cdn.sanity.io/files/u5d5zn7n/schoolv2/material.pdf',
  originalFilename: 'Material i ri.pdf',
};
assert.deepEqual(chapterPdfs([uploaded]), [uploaded]);
assert.equal(chapterPdfs([uploaded, uploaded]).length, 1);
assert.equal(new URL(pdfDownloadUrl(uploaded)).searchParams.get('dl'), uploaded.originalFilename);
for (const url of ['javascript:alert(1)', '//example.com/file.pdf', '/pdfs/../../file.pdf', 'https://cdn.sanity.io.evil.test/file.pdf']) {
  assert.equal(chapterPdfs([{...uploaded, url}]).length, 0);
}
console.log('PASS: existing chapters, chapter isolation, additional CMS files, duplicates and safe download links.');
