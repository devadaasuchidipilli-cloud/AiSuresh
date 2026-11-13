import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectIndianLanguage,
  buildAgentWorkflowSteps,
  calculateTaskProgress,
  evaluateSearchConfidence,
  sanitizeId,
  truncateString,
} from './agentLogic';

test('detectIndianLanguage identifies Telugu, Hindi, Tamil, and English scripts', () => {
  const te = detectIndianLanguage('నమస్కారం, సూపర్ AI ఏజెంట్ ఎలా పనిచేస్తుంది?');
  assert.equal(te.code, 'te');
  assert.equal(te.bcp47, 'te-IN');

  const hi = detectIndianLanguage('नमस्ते, आज का मौसम कैसा है?');
  assert.equal(hi.code, 'hi');
  assert.equal(hi.bcp47, 'hi-IN');

  const ta = detectIndianLanguage('வணக்கம், எப்படி இருக்கிறீர்கள்?');
  assert.equal(ta.code, 'ta');

  const en = detectIndianLanguage('Explain quantum computing with examples');
  assert.equal(en.code, 'en');
});

test('buildAgentWorkflowSteps creates multi-step plan with sensitive approval gate', () => {
  const steps = buildAgentWorkflowSteps('Research EV market in India and send email report');
  assert.equal(steps.length, 4);
  assert.equal(steps[0].status, 'completed');
  const sensitiveStep = steps.find((s) => s.isSensitive);
  assert.ok(sensitiveStep, 'Must include a sensitive step requiring user confirmation');
  assert.equal(sensitiveStep.status, 'awaiting_approval');
});

test('calculateTaskProgress computes accurate completion percentage and status', () => {
  const initial = calculateTaskProgress([
    { status: 'completed', isSensitive: false },
    { status: 'pending', isSensitive: false },
    { status: 'pending', isSensitive: false },
    { status: 'awaiting_approval', isSensitive: true },
  ]);
  assert.equal(initial.progress, 25);
  assert.equal(initial.status, 'awaiting_approval');

  const done = calculateTaskProgress([
    { status: 'completed', isSensitive: false },
    { status: 'completed', isSensitive: false },
    { status: 'completed', isSensitive: false },
    { status: 'completed', isSensitive: true },
  ]);
  assert.equal(done.progress, 100);
  assert.equal(done.status, 'completed');
});

test('evaluateSearchConfidence reports uncertainty levels accurately', () => {
  assert.equal(evaluateSearchConfidence(4, 20).level, 'High Confidence');
  assert.equal(evaluateSearchConfidence(1, 20).level, 'Moderate Confidence');
  assert.equal(evaluateSearchConfidence(0, 20).level, 'Low / Verify Independently');
});

test('sanitizeId and truncateString enforce blueprint constraints', () => {
  assert.equal(sanitizeId('bad/id$123'), 'bad-id-123');
  assert.equal(truncateString('abcdefghij', 5), 'abcde');
});
