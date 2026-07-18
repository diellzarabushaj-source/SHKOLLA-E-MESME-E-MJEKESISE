import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const outputDir = "artifacts/admin-editor-audit";
mkdirSync(outputDir, { recursive: true });

let revision = "audit-revision-1";
let patchCount = 0;
let savedPayload = null;
const consoleErrors = [];

const lesson = () => ({
  _id: "admin-audit-lesson",
  _rev: revision,
  title: "Mësimi provues i administratorit",
  body: [
    {
      _key: "audit-heading",
      _type: "block",
      style: "h2",
      markDefs: [],
      children: [{ _key: "audit-heading-span", _type: "span", text: "Titulli provues", marks: [] }],
    },
    {
      _key: "audit-paragraph",
      _type: "block",
      style: "normal",
      markDefs: [],
      children: [{ _key: "audit-paragraph-span", _type: "span", text: "Teksti fillestar i mësimit.", marks: [] }],
    },
  ],
});

function assert(value, message) {
  if (!value) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1365, height: 960 }, serviceWorkers: "block" });
  await context.route("**/api/admin/lessons/admin-audit-lesson", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ lesson: lesson() }) });
      return;
    }
    if (request.method() === "PATCH") {
      patchCount += 1;
      savedPayload = request.postDataJSON();
      if (patchCount === 2) {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "LESSON_CHANGED_RELOAD" }) });
        return;
      }
      revision = "audit-revision-2";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lesson: { ...lesson(), body: savedPayload.body } }),
      });
      return;
    }
    await route.abort();
  });

  const page = await context.newPage();
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${baseURL}/admin-audit`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.getByRole("heading", { name: "Auditimi i editorit të administratorit" }).waitFor();
  await page.getByRole("button", { name: "Edito mësimin" }).click();

  const editor = page.getByRole("textbox", { name: "Përmbajtja e Mësimi provues i administratorit" });
  await editor.waitFor({ state: "visible", timeout: 10_000 });
  assert(await page.getByRole("button", { name: "Ruaj në Sanity" }).first().isDisabled(), "Save should be disabled before changes");

  await editor.focus();
  await page.evaluate(() => {
    const target = document.querySelector('[contenteditable="true"]');
    if (!(target instanceof HTMLElement)) throw new Error("Editor missing");
    const transfer = new DataTransfer();
    transfer.setData("text/html", '<h1>Paste i sigurt</h1><p>Tekst <strong>trashë</strong> <em>italik</em>.</p><script>window.__unsafe=1</script><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">Lidhje e keqe</a>');
    transfer.setData("text/plain", "Paste i sigurt Tekst trashë italik. Lidhje e keqe");
    target.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
  });

  const htmlAfterPaste = await editor.evaluate((element) => element.innerHTML);
  assert(!/<script|<iframe|javascript:/i.test(htmlAfterPaste), `Unsafe pasted content survived: ${htmlAfterPaste}`);
  assert(/Paste i sigurt/.test(htmlAfterPaste), "Safe pasted heading was lost");
  assert(/<strong>trashë<\/strong>/.test(htmlAfterPaste), "Bold pasted formatting was lost");
  assert(await page.getByRole("button", { name: "Ruaj në Sanity" }).first().isEnabled(), "Save did not enable after paste");

  await page.getByRole("button", { name: "Ruaj në Sanity" }).first().click();
  await page.getByText("Teksti u ruajt dhe u publikua në Sanity.").waitFor({ state: "visible", timeout: 10_000 });
  assert(savedPayload?.revision === "audit-revision-1", "Editor did not send the loaded Sanity revision");
  const serialized = JSON.stringify(savedPayload?.body || []);
  assert(serialized.includes("Paste i sigurt"), "Portable Text payload lost pasted content");
  assert(!/script|iframe|javascript:/i.test(serialized), `Unsafe content reached Portable Text: ${serialized}`);
  assert((await page.locator("[data-admin-audit-revision]").textContent()) === "audit-revision-2", "Saved revision was not applied to the parent view");

  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Ndryshim me konflikt.");
  await page.getByRole("button", { name: "Ruaj në Sanity" }).first().click();
  await page.getByText("Mësimi është ndryshuar në Sanity. Rifreskoje përmbajtjen dhe provo përsëri.").waitFor({ state: "visible", timeout: 10_000 });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Rifresko nga Sanity" }).click();
  await page.getByText("U ngarkua versioni më i ri nga Sanity.").waitFor({ state: "visible", timeout: 10_000 });
  assert(await page.getByRole("button", { name: "Ruaj në Sanity" }).first().isDisabled(), "Refresh did not clear dirty state");

  await page.screenshot({ path: `${outputDir}/admin-editor-audit.png`, fullPage: true });
  assert(consoleErrors.length === 0, `Admin editor emitted browser errors: ${consoleErrors.join(" | ")}`);
  writeFileSync(`${outputDir}/report.json`, JSON.stringify({ patchCount, revision, savedPayload, consoleErrors }, null, 2));

  await context.close();
} finally {
  await browser.close();
}

console.log("Administrator editor passed paste sanitization, Portable Text save, revision conflict and refresh audits.");
