import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(new URL('./firebase-blueprint.json', import.meta.url), 'utf8'));

test('Firestore rules enforce default deny and all 9 blueprint collections', () => {
  assert.match(rulesContent, /rules_version = '2';/);
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);

  const requiredCollections = [
    'profiles',
    'conversations',
    'messages',
    'agent_tasks',
    'task_steps',
    'uploaded_files',
    'search_history',
    'usage_records',
    'audit_logs'
  ];

  for (const col of requiredCollections) {
    assert.ok(rulesContent.includes(`match /${col}/`), `Missing collection match block for ${col}`);
  }
});

test('Dirty Dozen security invariants are enforced in firestore.rules', () => {
  // 1. Shadow field guard via keys().hasOnly()
  assert.match(rulesContent, /\.keys\(\)\.hasOnly\(/);
  // 2. Identity spoofing guard
  assert.match(rulesContent, /data\.userId == request\.auth\.uid/);
  // 3. Verified email guard
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  // 4 & 5. Relational sync for messages and task_steps
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/conversations\/\$\(incoming\(\)\.conversationId\)\)/);
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/agent_tasks\/\$\(incoming\(\)\.taskId\)\)/);
  // 6. ID poisoning regex guard
  assert.match(rulesContent, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  // 7. Size bounds on strings
  assert.match(rulesContent, /data\.content\.size\(\) <= 20000/);
  // 8. Server timestamp enforcement
  assert.match(rulesContent, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
  // 9. Immutability of userId and createdAt
  assert.match(rulesContent, /incoming\(\)\.userId == existing\(\)\.userId/);
  assert.match(rulesContent, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  // 10. Terminal state locking on agent_tasks
  assert.match(rulesContent, /existing\(\)\.status != 'completed'/);
  // 11. PII isolation on profiles
  assert.match(rulesContent, /isOwner\(profileId\) \|\| isAdmin\(\)/);
  // 12. Query Enforcer on list
  assert.match(rulesContent, /allow list: if isSignedIn\(\) && \(existing\(\)\.userId == request\.auth\.uid \|\| isAdmin\(\)\)/);
  // Blueprint synchronicity
  assert.equal(Object.keys(blueprint.firestore).length, 9);
});
