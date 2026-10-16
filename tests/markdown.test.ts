import test from 'node:test';
import assert from 'node:assert/strict';
import { contentImages } from '../scripts/content-markdown';

test('image validation recognizes references and ignores code examples', () => {
  const markdown = [
    '![실제 이미지](../../assets/image.png)',
    '![참조 이미지][screenshot]',
    '[screenshot]: ../../assets/screenshot.png',
    '`![코드 예제](not-a-real-file.png)`',
    '```md',
    '![](also-not-a-real-file.png)',
    '```',
  ].join('\n\n');
  assert.deepEqual(contentImages(markdown), [
    { alt: '실제 이미지', url: '../../assets/image.png' },
    { alt: '참조 이미지', url: '../../assets/screenshot.png' },
  ]);
});

test('HTML cannot bypass the Markdown content and image boundary', () => {
  assert.throws(() => contentImages('<img src="missing.png">'), /원시 HTML/);
  assert.throws(() => contentImages('![](missing.png)'), /대체 텍스트/);
  assert.deepEqual(
    contentImages('<!-- 작성자 메모 -->\n\n```html\n<img src="example.png">\n```'),
    [],
  );
});
