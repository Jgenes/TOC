try {
  process.loadEnvFile(".env.local");
} catch {
  /* Use injected hosting environment. */
}
const { runBackgroundJobs } = await import("../lib/platform-jobs");
const { platformDb } = await import("../lib/platform-store");
try {
  console.log(JSON.stringify(await runBackgroundJobs()));
} finally {
  platformDb().close();
}
