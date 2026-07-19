import { readFileSync, writeFileSync } from "node:fs";

const editorPath = "app/LessonAdminEditor.tsx";
const lessonRoutePath = "app/api/admin/lessons/[lessonId]/route.ts";
const cssPath = "app/LessonAdminEditor.module.css";
const marker = "admin-image-paste-v1";

let editor = readFileSync(editorPath, "utf8");
let route = readFileSync(lessonRoutePath, "utf8");
let css = readFileSync(cssPath, "utf8");

if (editor.includes(marker) && route.includes(marker) && css.includes(marker)) {
  console.log("Direct administrator image paste is already installed.");
  process.exit(0);
}

if (!editor.includes("admin-toolbar-selection-v1") || !editor.includes("admin-sanity-resilience-v1")) {
  throw new Error("Image paste must run after toolbar and Sanity resilience hardening.");
}

function replaceRequired(target, label, before, after) {
  if (!target.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return target.replace(before, after);
}

editor = replaceRequired(
  editor,
  "image paste imports",
  `import styles from "./LessonAdminEditor.module.css";`,
  `import styles from "./LessonAdminEditor.module.css";
import {
  clipboardImageFiles,
  insertImageUploadPlaceholders,
  pastedImagePortableNode,
  removeImageUploadPlaceholder,
  replaceImageUploadPlaceholder,
  type UploadedImageAsset,
} from "./admin-image-paste";

// ${marker}`,
);

editor = replaceRequired(
  editor,
  "image upload error messages",
  `  if (error === "EDITOR_TIMEOUT") return "Sanity nuk u përgjigj me kohë. Ndryshimet e tua janë ende në editor; provo përsëri.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri ose hape mësimin në Sanity Studio.";`,
  `  if (error === "EDITOR_TIMEOUT") return "Sanity nuk u përgjigj me kohë. Ndryshimet e tua janë ende në editor; provo përsëri.";
  if (error === "IMAGE_TOO_LARGE") return "Fotoja është më e madhe se 12 MB. Zvogëloje dhe bëje paste përsëri.";
  if (error === "IMAGE_TYPE_NOT_ALLOWED") return "Ky format fotografie nuk pranohet. Përdor PNG, JPG, WebP, GIF ose AVIF.";
  if (error === "IMAGE_UPLOAD_FAILED") return "Fotoja nuk u ngarkua në Sanity. Teksti yt është ende në editor; provo përsëri.";
  if (error === "IMAGE_REQUIRED" || error === "IMAGE_EMPTY") return "Clipboard-i nuk përmbante një fotografi të vlefshme.";
  return "Ndryshimet nuk u ruajtën. Provo përsëri ose hape mësimin në Sanity Studio.";`,
);

editor = replaceRequired(
  editor,
  "portable image serialization",
  `    if (child.dataset.portableImmutable === "true") {
      const original = child.dataset.portableKey ? immutableByKey.get(child.dataset.portableKey) : null;
      if (original) result.push(structuredClone(original));
      continue;
    }`,
  `    const pastedImage = pastedImagePortableNode(child);
    if (pastedImage) {
      result.push(pastedImage);
      continue;
    }

    if (child.dataset.portableImmutable === "true") {
      const original = child.dataset.portableKey ? immutableByKey.get(child.dataset.portableKey) : null;
      if (original) result.push(structuredClone(original));
      continue;
    }`,
);

editor = replaceRequired(
  editor,
  "image upload state",
  `  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);`,
  `  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(0);
  const [dirty, setDirty] = useState(false);`,
);

editor = replaceRequired(
  editor,
  "direct image paste handler",
  `  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const safeHtml = html ? sanitizePastedHtml(html) : plainTextToHtml(text);
    document.execCommand("insertHTML", false, safeHtml);
    setDirty(true);
    setNotice("");
    setError("");
  }`,
  `  async function uploadPastedImage(file: File, uploadKey: string) {
    const formData = new FormData();
    formData.set("image", file, file.name || "foto-nga-clipboard.png");
    const response = await adminFetch("/api/admin/assets/images", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
    const result = await responseJson<{ asset?: UploadedImageAsset; error?: string }>(response);
    if (!response.ok || !result.asset) throw new Error(result.error || "IMAGE_UPLOAD_FAILED");

    const editor = editorRef.current;
    if (!editor || !replaceImageUploadPlaceholder(editor, uploadKey, result.asset, {
      uploading: styles.imageUploading,
      uploaded: styles.pastedImage,
      spinner: styles.imageSpinner,
      copy: styles.imageUploadCopy,
      removeButton: styles.imageRemove,
    })) {
      throw new Error("IMAGE_UPLOAD_FAILED");
    }
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const imageFiles = clipboardImageFiles(event.clipboardData);
    if (imageFiles.length) {
      event.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      const pending = insertImageUploadPlaceholders(editor, imageFiles, {
        uploading: styles.imageUploading,
        uploaded: styles.pastedImage,
        spinner: styles.imageSpinner,
        copy: styles.imageUploadCopy,
        removeButton: styles.imageRemove,
      });
      setUploadingImages((count) => count + pending.length);
      setDirty(true);
      setError("");
      setNotice(pending.length === 1 ? "Duke ngarkuar fotografinë në Sanity…" : `Duke ngarkuar ${"${pending.length}"} fotografi në Sanity…`);

      void Promise.allSettled(pending.map(async ({ file, key }) => {
        try {
          await uploadPastedImage(file, key);
        } catch (uploadError) {
          removeImageUploadPlaceholder(editor, key);
          throw uploadError;
        } finally {
          setUploadingImages((count) => Math.max(0, count - 1));
        }
      })).then((results) => {
        const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
        if (failure) {
          const reason = failure.reason instanceof Error ? failure.reason.message : "IMAGE_UPLOAD_FAILED";
          setError(messageFor(reason));
          setNotice("");
          return;
        }
        setNotice(pending.length === 1 ? "Fotoja u ngarkua. Ruaje mësimin për ta publikuar." : "Fotografitë u ngarkuan. Ruaje mësimin për t’i publikuar.");
      });
      return;
    }

    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const safeHtml = html ? sanitizePastedHtml(html) : plainTextToHtml(text);
    document.execCommand("insertHTML", false, safeHtml);
    rememberEditorSelection();
    setDirty(true);
    setNotice("");
    setError("");
  }`,
);

editor = replaceRequired(
  editor,
  "prevent save during image upload",
  `  async function save() {
    if (!currentLesson._rev || !editorRef.current) {`,
  `  async function save() {
    if (uploadingImages > 0) {
      setError("Prit derisa fotografitë të ngarkohen në Sanity, pastaj ruaje mësimin.");
      return;
    }
    if (!currentLesson._rev || !editorRef.current) {`,
);

editor = editor.replaceAll(
  `disabled={saving || loadingEditor}`,
  `disabled={saving || loadingEditor || uploadingImages > 0}`,
);
editor = editor.replaceAll(
  `disabled={saving}>Anulo</button>`,
  `disabled={saving || uploadingImages > 0}>Anulo</button>`,
);
editor = editor.replaceAll(
  `disabled={saving || !dirty}`,
  `disabled={saving || uploadingImages > 0 || !dirty}`,
);

editor = replaceRequired(
  editor,
  "image paste guidance",
  `        <div
          key={editorVersion}`,
  `        <div className={styles.imagePasteHint} role="note">
          <strong>Paste fotografinë direkt</strong>
          <span>Kopjoje fotografinë ose screenshot-in dhe shtyp Ctrl/⌘ + V në vendin ku duhet të shfaqet.</span>
        </div>

        <div
          key={editorVersion}`,
);

editor = replaceRequired(
  editor,
  "remove unsaved pasted image",
  `          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault();
          }}`,
  `          onClick={(event) => {
            if (!(event.target instanceof Element)) return;
            const removeButton = event.target.closest("[data-remove-pasted-image]");
            if (removeButton) {
              event.preventDefault();
              removeButton.closest("figure[data-pasted-sanity-image=\"true\"]")?.remove();
              setDirty(true);
              setNotice("Fotoja u hoq nga mësimi i paruajtur.");
              setError("");
              return;
            }
            if (event.target.closest("a[href]")) event.preventDefault();
          }}`,
);

route = replaceRequired(
  route,
  "image paste route marker",
  `// admin-sanity-resilience-v1`,
  `// admin-sanity-resilience-v1
// ${marker}`,
);

route = replaceRequired(
  route,
  "image asset constants",
  `const INLINE_MARKS = new Set(["strong", "em", "underline", "code", "highlight"]);`,
  `const INLINE_MARKS = new Set(["strong", "em", "underline", "code", "highlight"]);
const SANITY_IMAGE_ASSET_PATTERN = /^image-[A-Za-z0-9]+-\\d+x\\d+-[A-Za-z0-9]+$/;`,
);

route = replaceRequired(
  route,
  "new image sanitizer",
  `function sanitizeBody(proposed: unknown, currentBody: PortableNode[]): PortableNode[] {`,
  `function sanitizeNewImage(node: PortableNode): PortableNode {
  const key = safeText(node._key, 80);
  if (!isRecord(node.asset)) throw new Error("INVALID_IMAGE_ASSET");
  const assetId = safeText(node.asset._ref, 200);
  if (node.asset._type !== "reference" || !SANITY_IMAGE_ASSET_PATTERN.test(assetId)) {
    throw new Error("INVALID_IMAGE_ASSET");
  }

  const alt = typeof node.alt === "string" ? safeText(node.alt, 500).trim() : "";
  const caption = typeof node.caption === "string" ? safeText(node.caption, 1000).trim() : "";
  return {
    _key: key,
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
    ...(alt ? { alt } : {}),
    ...(caption ? { caption } : {}),
  };
}

function sanitizeBody(proposed: unknown, currentBody: PortableNode[]): PortableNode[] {`,
);

route = replaceRequired(
  route,
  "allow newly pasted images",
  `    // Images and future custom blocks are immutable in the web editor. The API
    // restores the trusted version already stored in Sanity and requires every
    // protected element to remain present exactly once.
    if (!current || current._type !== value._type || current._type === "block") {
      throw new Error("INVALID_EMBEDDED_CONTENT");
    }
    preservedImmutableKeys.add(key);
    return current;`,
  `    if (value._type === "image" && !current) return sanitizeNewImage(value);

    // Existing images and future custom blocks remain immutable in the web editor.
    // Newly pasted images are accepted only as verified Sanity asset references.
    if (!current || current._type !== value._type || current._type === "block") {
      throw new Error("INVALID_EMBEDDED_CONTENT");
    }
    preservedImmutableKeys.add(key);
    return current;`,
);

route = replaceRequired(
  route,
  "verify pasted Sanity assets",
  `async function readLesson(lessonId: string) {`,
  `async function verifyImageAssets(client: ReturnType<typeof getSanityWriteClient>, body: PortableNode[]) {
  const assetIds = [...new Set(body.flatMap((node) => {
    if (node._type !== "image" || !isRecord(node.asset) || typeof node.asset._ref !== "string") return [];
    return [node.asset._ref];
  }))];
  if (!assetIds.length) return;
  if (assetIds.length > 200) throw new Error("INVALID_IMAGE_ASSET");

  const assetCount = await client.fetch<number>(
    `count(*[_type == "sanity.imageAsset" && _id in $assetIds])`,
    { assetIds },
  );
  if (assetCount !== assetIds.length) throw new Error("INVALID_IMAGE_ASSET");
}

async function readLesson(lessonId: string) {`,
);

route = replaceRequired(
  route,
  "verify images before lesson patch",
  `    const body = sanitizeBody(payload.body, Array.isArray(current.body) ? current.body : []);
    await client.patch(lessonId).ifRevisionId(revision).set({ body }).commit({ autoGenerateArrayKeys: true });`,
  `    const body = sanitizeBody(payload.body, Array.isArray(current.body) ? current.body : []);
    await verifyImageAssets(client, body);
    await client.patch(lessonId).ifRevisionId(revision).set({ body }).commit({ autoGenerateArrayKeys: true });`,
);

route = replaceRequired(
  route,
  "image asset validation error",
  `        "INVALID_EMBEDDED_CONTENT",
      ].includes(error.message)) {`,
  `        "INVALID_EMBEDDED_CONTENT",
        "INVALID_IMAGE_ASSET",
      ].includes(error.message)) {`,
);

if (!css.includes(marker)) {
  css += `

/* ${marker} */
.imagePasteHint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 10px 0 14px;
  padding: 11px 14px;
  border: 1px dashed color-mix(in srgb, var(--primary) 45%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 6%, white);
  color: var(--text);
}

.imagePasteHint strong {
  white-space: nowrap;
  font-size: 0.86rem;
}

.imagePasteHint span {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.imageUploading,
.pastedImage {
  position: relative;
  display: grid;
  place-items: center;
  gap: 10px;
  width: min(100%, 760px);
  min-height: 150px;
  margin: 24px auto;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--primary) 4%, white);
  text-align: center;
}

.imageUploading {
  border-style: dashed;
}

.imageSpinner {
  width: 30px;
  height: 30px;
  border: 3px solid color-mix(in srgb, var(--primary) 18%, transparent);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: admin-image-spin 0.8s linear infinite;
}

.pastedImage img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 560px;
  border-radius: 14px;
  object-fit: contain;
}

.imageUploadCopy {
  display: grid;
  gap: 3px;
}

.imageUploadCopy strong {
  font-size: 0.9rem;
}

.imageUploadCopy small {
  color: var(--muted);
  overflow-wrap: anywhere;
}

.imageRemove {
  position: absolute;
  top: 10px;
  right: 10px;
  min-height: 34px;
  padding: 7px 11px;
  border: 1px solid color-mix(in srgb, #b91c1c 30%, transparent);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #991b1b;
  font-weight: 750;
  cursor: pointer;
}

@keyframes admin-image-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .imagePasteHint {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .imagePasteHint strong {
    white-space: normal;
  }

  .imageUploading,
  .pastedImage {
    margin: 18px auto;
    padding: 12px;
    border-radius: 14px;
  }

  .pastedImage img {
    max-height: 420px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .imageSpinner { animation: none; }
}
`;
}

writeFileSync(editorPath, editor);
writeFileSync(lessonRoutePath, route);
writeFileSync(cssPath, css);
console.log("Installed direct clipboard image upload, Sanity asset verification and Portable Text image saving.");
