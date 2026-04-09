/**
 * NejoExamPrep — Concurrent submission stress test
 *
 * Simulates N students submitting answers simultaneously.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   TEST_EXAM_ID=<uuid> \
 *   node tests/load/concurrent-submit.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EXAM_ID = process.env.TEST_EXAM_ID;
const NUM_STUDENTS = Number(process.env.NUM_STUDENTS || 100);

if (!SUPABASE_URL || !ANON_KEY || !EXAM_ID) {
  console.error("Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EXAM_ID");
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function createAndSubmitSession(i) {
  const start = performance.now();
  try {
    // 1. Create session
    const res1 = await fetch(`${SUPABASE_URL}/rest/v1/exam_sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        exam_id: EXAM_ID,
        student_name: `Load Student ${i}`,
        student_email: `load${i}@test.com`,
        status: "in_progress",
      }),
    });

    if (!res1.ok) return { i, ok: false, step: "create", status: res1.status, ms: performance.now() - start };

    const [session] = await res1.json();

    // 2. Submit
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/exam_sessions?id=eq.${session.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score: Math.floor(Math.random() * 100),
        total_marks: 100,
      }),
    });

    return { i, ok: res2.ok, step: "submit", status: res2.status, ms: Math.round(performance.now() - start) };
  } catch (err) {
    return { i, ok: false, step: "error", error: err.message, ms: Math.round(performance.now() - start) };
  }
}

console.log(`\n🚀 Starting ${NUM_STUDENTS} concurrent submissions...\n`);
const startAll = performance.now();

const results = await Promise.all(
  Array.from({ length: NUM_STUDENTS }, (_, i) => createAndSubmitSession(i))
);

const totalMs = Math.round(performance.now() - startAll);
const succeeded = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
const maxMs = Math.max(...results.map((r) => r.ms));

console.log(`✅ Succeeded: ${succeeded}/${NUM_STUDENTS}`);
console.log(`❌ Failed: ${failed.length}`);
console.log(`⏱  Avg response: ${avgMs}ms | Max: ${maxMs}ms | Total: ${totalMs}ms`);

if (failed.length > 0) {
  console.log("\nFailed details:");
  failed.slice(0, 10).forEach((f) => console.log(`  Student ${f.i}: ${f.step} → ${f.status || f.error}`));
}

process.exit(failed.length > 0 ? 1 : 0);
