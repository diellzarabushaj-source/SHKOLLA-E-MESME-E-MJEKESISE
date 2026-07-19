import { readFileSync, writeFileSync } from "node:fs";

const editorPath = "app/LessonAdminEditor.tsx";
const routePath = "app/api/admin/lessons/[lessonId]/route.ts";
const marker = "admin-paste-images-v1";

function replaceRequired(source, label, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`${label}: source pattern was not found`);
  return source.replace(before, after);
}

let editor = readFileSync(editorPath, "utf8");
if (!editor.includes(marker)) {
  editor = replaceRequired(
    editor,
    "Sanity image asset reference type",
    `  asset?: { url?: string };`,
    `  asset?: { url?: string; _type?: string; _ref?: string };`,
  );

  editor = replaceRequired(
    editor,
    "image upload error messages",
    `  if (error === "LESSON_NOT_FOUND") return "Mësimi nuk u gjet në Sanity.";`,
    `  if (error === "LESSON_NOT_FOUND") return "Mësimi nuk u gjet në Sanity.";\n  if (error === "IMAGE_TOO_LARGE") return "Fotografia është më e madhe se 10 MB.";\n  if (error === "UNSUPPORTED_IMAGE_TYPE") return "Ky format fotografie nuk mbështetet.";\n  if (error === "IMAGE_UPLOAD_FAILED") return "Fotografia nuk u ngarkua në Sanity. Provo përsëri.";`,
  );

  editor = replaceRequired(
    editor,
    "uploading image state",
    `  const [saving, setSaving] = useState(false);`,
    `  const [saving, setSaving] = useState(false);\n  const [uploadingImages, setUploadingImages] = useState(0);`,
  );

  editor = replaceRequired(
    editor,
    "new pasted image serialization",
    `    if (child.dataset.portableImmutable === "true") {\n      const original = child.dataset.portableKey ? immutableByKey.get(child.dataset.portableKey) : null;\n      if (original) result.push(structuredClone(original));\n      continue;\n    }`,
    `    if (child.dataset.portableImmutable === "true") {\n      const original = child.dataset.portableKey ? immutableByKey.get(child.dataset.portableKey) : null;\n      if (original) {\n        result.push(structuredClone(original));\n        continue;\n      }\n\n      const assetRef = child.dataset.sanityAssetRef || "";\n      const assetUrl = child.dataset.assetUrl || "";\n      if (/^image-[a-f0-9]+-\\d+x\\d+-[a-z0-9]+$/i.test(assetRef) && assetUrl) {\n        const image = child.querySelector("img");\n        result.push({\n          _key: child.dataset.portableKey || keyFor("image"),\n          _type: "image",\n          asset: { _type: "reference", _ref: assetRef },\n          assetUrl,\n          alt: image?.getAttribute("alt") || "Fotografi e mësimit",\n          caption: child.dataset.caption || "",\n        });\n      }\n      continue;\n    }`,
  );

  editor = replaceRequired(
    editor,
    "direct paste image handler",
    `  function onPaste(event: ClipboardEvent<HTMLDivElement>) {\n    event.preventDefault();\n    const html = event.clipboardData.getData("text/html");\n    const text = event.clipboardData.getData("text/plain");\n    const safeHtml = html ? sanitizePastedHtml(html) : plainTextToHtml(text);\n    document.execCommand("insertHTML", false, safeHtml);\n    setDirty(true);\n    setNotice("");\n    setError("");\n  }`,
    `  // ${marker}: copied screenshots and images upload directly to Sanity on paste.\n  async function uploadPastedImage(file: File, insertionRange: Range | null) {\n    const formData = new FormData();\n    formData.set("image", file, file.name || \`paste-\${Date.now()}.png\`);\n    const response = await fetch("/api/admin/assets/images", {\n      method: "POST",\n      body: formData,\n      credentials: "same-origin",\n    });\n    const result = await response.json() as { assetRef?: string; url?: string; originalFilename?: string; error?: string };\n    if (!response.ok || !result.assetRef || !result.url) throw new Error(result.error || "IMAGE_UPLOAD_FAILED");\n\n    const editor = editorRef.current;\n    if (!editor) return;\n    editor.focus({ preventScroll: true });\n\n    const figure = document.createElement("figure");\n    figure.dataset.portableImmutable = "true";\n    figure.dataset.portableKey = keyFor("image");\n    figure.dataset.sanityAssetRef = result.assetRef;\n    figure.dataset.assetUrl = result.url;\n    figure.contentEditable = "false";\n\n    const image = document.createElement("img");\n    image.src = result.url;\n    image.alt = result.originalFilename || "Fotografi e mësimit";\n    image.loading = "lazy";\n    figure.appendChild(image);\n\n    const caption = document.createElement("figcaption");\n    const label = document.createElement("strong");\n    label.textContent = "Fotografi nga Sanity";\n    const filename = document.createElement("span");\n    filename.textContent = result.originalFilename || "Fotografi e ngjitur";\n    caption.append(label, filename);\n    figure.appendChild(caption);\n\n    const paragraph = document.createElement("p");\n    paragraph.appendChild(document.createElement("br"));\n    const range = insertionRange?.cloneRange() || document.createRange();\n    if (!insertionRange) {\n      range.selectNodeContents(editor);\n      range.collapse(false);\n    }\n    range.deleteContents();\n    range.insertNode(paragraph);\n    range.insertNode(figure);\n\n    const caret = document.createRange();\n    caret.selectNodeContents(paragraph);\n    caret.collapse(true);\n    const selection = window.getSelection();\n    selection?.removeAllRanges();\n    selection?.addRange(caret);\n    setDirty(true);\n    setNotice("Fotografia u ngarkua në Sanity dhe u vendos në mësim.");\n  }\n\n  async function onPaste(event: ClipboardEvent<HTMLDivElement>) {\n    const images = Array.from(event.clipboardData.items)\n      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))\n      .map((item) => item.getAsFile())\n      .filter((file): file is File => Boolean(file));\n\n    if (images.length) {\n      event.preventDefault();\n      const selection = window.getSelection();\n      const currentRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;\n      const insertionRange = currentRange && editorRef.current?.contains(currentRange.commonAncestorContainer)\n        ? currentRange.cloneRange()\n        : null;\n      setUploadingImages((count) => count + images.length);\n      setError("");\n      setNotice("Duke ngarkuar fotografinë në Sanity…");\n      try {\n        let range = insertionRange;\n        for (const image of images) {\n          await uploadPastedImage(image, range);\n          range = null;\n        }\n      } catch (uploadError) {\n        setError(messageFor(uploadError instanceof Error ? uploadError.message : "IMAGE_UPLOAD_FAILED"));\n      } finally {\n        setUploadingImages((count) => Math.max(0, count - images.length));\n      }\n      return;\n    }\n\n    event.preventDefault();\n    const html = event.clipboardData.getData("text/html");\n    const text = event.clipboardData.getData("text/plain");\n    const safeHtml = html ? sanitizePastedHtml(html) : plainTextToHtml(text);\n    document.execCommand("insertHTML", false, safeHtml);\n    setDirty(true);\n    setNotice("");\n    setError("");\n  }`,
  );

  editor = replaceRequired(
    editor,
    "editor paste guidance",
    `<p>Shkruaj ose bëj paste me formatim. Përmbajtja ruhet si Portable Text në Sanity.</p>`,
    `<p>Shkruaj ose bëj paste me formatim. Fotot mund t’i ngjitësh direkt me Ctrl+V dhe ngarkohen automatikisht në Sanity.</p>`,
  );

  editor = editor.replaceAll(
    `disabled={saving || !dirty}`,
    `disabled={saving || uploadingImages > 0 || !dirty}`,
  );
  editor = editor.replaceAll(
    `{saving ? "Duke ruajtur…" : "Ruaj në Sanity"}`,
    `{uploadingImages > 0 ? "Duke ngarkuar foto…" : saving ? "Duke ruajtur…" : "Ruaj në Sanity"}`,
  );

  writeFileSync(editorPath, editor);
}

let route = readFileSync(routePath, "utf8");
if (!route.includes(marker)) {
  route = replaceRequired(
    route,
    "image asset reference pattern",
    `const INLINE_MARKS = new Set(["strong", "em", "underline", "code", "highlight"]);`,
    `const INLINE_MARKS = new Set(["strong", "em", "underline", "code", "highlight"]);\nconst IMAGE_ASSET_REF_PATTERN = /^image-[a-f0-9]+-\\d+x\\d+-[a-z0-9]+$/i;\n// ${marker}`,
  );

  route = replaceRequired(
    route,
    "allow newly pasted Sanity images",
    `    if (!current || current._type !== value._type || current._type === "block") {\n      throw new Error("INVALID_EMBEDDED_CONTENT");\n    }\n    preservedImmutableKeys.add(key);\n    return current;`,
    `    if (!current && value._type === "image") {\n      const asset = isRecord(value.asset) ? value.asset : null;\n      const assetRef = asset ? safeText(asset._ref, 200) : "";\n      if (!IMAGE_ASSET_REF_PATTERN.test(assetRef)) throw new Error("INVALID_EMBEDDED_CONTENT");\n      return {\n        _key: key,\n        _type: "image",\n        asset: { _type: "reference", _ref: assetRef },\n        alt: typeof value.alt === "string" ? safeText(value.alt, 500) : "Fotografi e mësimit",\n        caption: typeof value.caption === "string" ? safeText(value.caption, 1000) : "",\n      };\n    }\n    if (!current || current._type !== value._type || current._type === "block") {\n      throw new Error("INVALID_EMBEDDED_CONTENT");\n    }\n    preservedImmutableKeys.add(key);\n    return current;`,
  );

  writeFileSync(routePath, route);
}

console.log("Installed secure direct image paste for the live Sanity lesson editor.");
