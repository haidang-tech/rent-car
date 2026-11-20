import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImage, MAX_IMAGE_BYTES } from '../client/js/pages/upload-validation.js';

test('Image inputs reject empty, unsupported and oversized files', () => {
  assert.equal(validateImage(null), '');
  assert.ok(validateImage({ type: 'image/png', size: 0 }));
  assert.ok(validateImage({ type: 'image/svg+xml', size: 100 }));
  assert.ok(validateImage({ type: 'application/pdf', size: 100 }));
  assert.ok(validateImage({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 }));
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validateImage({ type, size: MAX_IMAGE_BYTES }), '');
  }
});
