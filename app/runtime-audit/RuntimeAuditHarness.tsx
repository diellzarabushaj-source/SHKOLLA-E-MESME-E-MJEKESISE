"use client";

import { useState } from "react";
import {
  clearProgressUserCache,
  getSignedInUser,
  sendActivityHeartbeat,
} from "@/lib/progress/client";

export default function RuntimeAuditHarness() {
  const [status, setStatus] = useState("Gati");

  async function primeGuestIdentity() {
    clearProgressUserCache();
    const user = await getSignedInUser();
    setStatus(user ? `Identitet i papritur: ${user.id}` : "Cache-i bosh u përgatit");
  }

  async function sendHeartbeat() {
    try {
      const sessionId = await sendActivityHeartbeat({
        activityType: "app",
        activeSeconds: 1,
      });
      setStatus(`Heartbeat u ruajt: ${sessionId}`);
    } catch (error) {
      setStatus(`Gabim: ${error instanceof Error ? error.message : "UNKNOWN"}`);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px" }}>
      <h1>Auditimi i sesionit dhe PWA-së</h1>
      <p>Ky ekran është aktiv vetëm gjatë auditimit automatik.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void primeGuestIdentity()}>Përgatit cache-in bosh</button>
        <button type="button" onClick={() => void sendHeartbeat()}>Dërgo heartbeat</button>
      </div>
      <output aria-live="polite" style={{ display: "block", marginTop: 24 }}>
        {status}
      </output>
    </main>
  );
}
