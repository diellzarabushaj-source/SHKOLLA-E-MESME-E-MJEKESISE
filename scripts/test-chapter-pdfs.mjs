import assert from 'node:assert/strict';
import { chapterPdfs, pdfCoverUrl, pdfDownloadUrl } from '../lib/chapter-pdfs.ts';

// Sanity returns null for the new field on chapters created before this change.
assert.equal(chapterPdfs(null).length, 0);
assert.equal(chapterPdfs().length, 0);
assert.equal(chapterPdfs([null, undefined, {}, {url: 123}]).length, 0);

const uploaded = {
  _key: 'uploaded', title: 'Material i ri',
  url: 'https://cdn.sanity.io/files/u5d5zn7n/schoolv2/material.pdf',
  originalFilename: 'Material i ri.pdf',
};
assert.deepEqual(chapterPdfs([uploaded]), [uploaded]);
assert.deepEqual(chapterPdfs([null, uploaded, undefined]), [uploaded]);
assert.equal(chapterPdfs([uploaded, uploaded]).length, 1);
assert.equal(new URL(pdfDownloadUrl(uploaded)).searchParams.get('dl'), uploaded.originalFilename);
for (const url of ['javascript:alert(1)', '//example.com/file.pdf', '/pdfs/../../file.pdf', 'https://cdn.sanity.io.evil.test/file.pdf']) {
  assert.equal(chapterPdfs([{...uploaded, url}]).length, 0);
}
assert.equal(pdfCoverUrl('javascript:alert(1)'), undefined);
assert.equal(pdfCoverUrl('https://cdn.sanity.io.evil.test/images/cover.png'), undefined);
assert.equal(pdfCoverUrl(undefined), undefined);
assert.equal(new URL(pdfCoverUrl('https://cdn.sanity.io/images/u5d5zn7n/schoolv2/cover.webp')).searchParams.get('w'), '360');
console.log('PASS: existing chapters, CMS files, duplicates, safe cover URLs and download links.');
