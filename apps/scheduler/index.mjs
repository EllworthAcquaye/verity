const url = process.env.SCHEDULE_TICK_URL ?? 'http://control:3000/api/internal/schedules/tick';
const token = process.env.SCHEDULER_TOKEN ?? '';

async function tick() {
  try {
    const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) console.error(`schedule tick rejected: ${response.status}`);
  } catch (error) {
    console.error(`schedule tick failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

await tick();
setInterval(tick, 30_000);
