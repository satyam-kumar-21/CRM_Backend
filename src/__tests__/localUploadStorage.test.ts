import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const uploadRoot = path.resolve(process.cwd(), 'uploads');

const filePath = path.join(uploadRoot, 'company-123', 'conversation-456', 'images', 'sample.txt');

(async () => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, 'hello-local-upload');

  const exists = fs.existsSync(filePath);
  const text = fs.readFileSync(filePath, 'utf8');

  assert.equal(exists, true);
  assert.equal(text, 'hello-local-upload');
  console.log('local upload storage ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
