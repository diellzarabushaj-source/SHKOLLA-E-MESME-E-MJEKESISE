// Final isolated browser audit for the current branch head.
// This child PR exists only to force a fresh GitHub Actions event.
// Synchronized after the PR was opened.
await import("./e2e-admin-editor.mjs");
await import("./e2e-runtime-resilience.mjs");
