export type UploadedImageAsset = {
  _id: string;
  url: string;
  originalFilename?: string;
  mimeType?: string;
  size?: number;
  metadata?: {
    dimensions?: {
      width?: number;
      height?: number;
      aspectRatio?: number;
    };
  };
};

export type ImagePasteClasses = {
  uploading: string;
  uploaded: string;
  spinner: string;
  copy: string;
  removeButton: string;
};

export type PendingImagePaste = {
  key: string;
  file: File;
};

const TEXT_BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);
const MAX_IMAGES_PER_PASTE = 5;

function keyFor(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid.slice(0, 20)}`;
}

function containsNode(editor: HTMLElement, node: Node): boolean {
  const candidate = node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode;
  return Boolean(candidate && editor.contains(candidate));
}

function activeRange(editor: HTMLElement): Range {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (containsNode(editor, range.commonAncestorContainer)) return range.cloneRange();
  }

  const fallback = document.createRange();
  fallback.selectNodeContents(editor);
  fallback.collapse(false);
  return fallback;
}

function directEditorChild(editor: HTMLElement, node: Node): HTMLElement | null {
  let element = node.nodeType === Node.ELEMENT_NODE
    ? node as HTMLElement
    : node.parentElement;

  while (element && element.parentElement !== editor) element = element.parentElement;
  return element?.parentElement === editor ? element : null;
}

function ensureEditableContent(element: HTMLElement) {
  if (!element.textContent && !element.querySelector("img,br")) element.append(document.createElement("br"));
}

function focusAtStart(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function createPlaceholder(file: File, classes: ImagePasteClasses, key: string): HTMLElement {
  const figure = document.createElement("figure");
  figure.className = classes.uploading;
  figure.dataset.imageUploadKey = key;
  figure.contentEditable = "false";

  const spinner = document.createElement("span");
  spinner.className = classes.spinner;
  spinner.setAttribute("aria-hidden", "true");

  const copy = document.createElement("span");
  copy.className = classes.copy;
  const title = document.createElement("strong");
  title.textContent = "Duke ngarkuar fotografinë…";
  const detail = document.createElement("small");
  detail.textContent = file.name || "Foto nga clipboard";
  copy.append(title, detail);

  figure.append(spinner, copy);
  return figure;
}

function insertAfter(reference: Node, node: Node) {
  reference.parentNode?.insertBefore(node, reference.nextSibling);
}

export function clipboardImageFiles(data: DataTransfer): File[] {
  const files: File[] = [];
  const seen = new Set<string>();

  const add = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const signature = `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    files.push(file);
  };

  for (const item of Array.from(data.items || [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) add(item.getAsFile());
  }
  for (const file of Array.from(data.files || [])) add(file);

  return files.slice(0, MAX_IMAGES_PER_PASTE);
}

export function insertImageUploadPlaceholders(
  editor: HTMLElement,
  files: File[],
  classes: ImagePasteClasses,
): PendingImagePaste[] {
  const range = activeRange(editor);
  if (!range.collapsed) range.deleteContents();

  const pending = files.map((file) => ({ key: keyFor("upload"), file }));
  const placeholders = pending.map(({ file, key }) => createPlaceholder(file, classes, key));
  const directChild = directEditorChild(editor, range.startContainer);

  if (directChild && TEXT_BLOCK_TAGS.has(directChild.tagName)) {
    const trailingRange = range.cloneRange();
    trailingRange.setEnd(directChild, directChild.childNodes.length);
    const trailingContent = trailingRange.extractContents();
    const trailingBlock = directChild.cloneNode(false) as HTMLElement;
    trailingBlock.removeAttribute("data-portable-key");
    trailingBlock.append(trailingContent);
    ensureEditableContent(directChild);
    ensureEditableContent(trailingBlock);

    let anchor: Node = directChild;
    for (const placeholder of placeholders) {
      insertAfter(anchor, placeholder);
      anchor = placeholder;
    }
    insertAfter(anchor, trailingBlock);
    focusAtStart(trailingBlock);
    return pending;
  }

  if (directChild) {
    let anchor: Node = directChild;
    for (const placeholder of placeholders) {
      insertAfter(anchor, placeholder);
      anchor = placeholder;
    }
    const paragraph = document.createElement("p");
    paragraph.append(document.createElement("br"));
    insertAfter(anchor, paragraph);
    focusAtStart(paragraph);
    return pending;
  }

  const fragment = document.createDocumentFragment();
  for (const placeholder of placeholders) fragment.append(placeholder);
  const paragraph = document.createElement("p");
  paragraph.append(document.createElement("br"));
  fragment.append(paragraph);
  range.insertNode(fragment);
  focusAtStart(paragraph);
  return pending;
}

export function replaceImageUploadPlaceholder(
  editor: HTMLElement,
  uploadKey: string,
  asset: UploadedImageAsset,
  classes: ImagePasteClasses,
): HTMLElement | null {
  const placeholder = editor.querySelector<HTMLElement>(`[data-image-upload-key="${uploadKey}"]`);
  if (!placeholder) return null;

  const filename = asset.originalFilename || "Foto e mësimit";
  const alt = filename.replace(/\.[^.]+$/, "").trim() || "Foto e mësimit";
  const figure = document.createElement("figure");
  figure.className = classes.uploaded;
  figure.dataset.pastedSanityImage = "true";
  figure.dataset.portableKey = keyFor("image");
  figure.dataset.assetId = asset._id;
  figure.dataset.assetUrl = asset.url;
  figure.dataset.alt = alt;
  figure.contentEditable = "false";

  const image = document.createElement("img");
  image.src = asset.url;
  image.alt = alt;
  image.loading = "lazy";

  const copy = document.createElement("span");
  copy.className = classes.copy;
  const title = document.createElement("strong");
  title.textContent = "Fotoja u ngarkua në Sanity";
  const detail = document.createElement("small");
  detail.textContent = filename;
  copy.append(title, detail);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = classes.removeButton;
  remove.dataset.removePastedImage = "true";
  remove.textContent = "Hiqe";

  figure.append(image, copy, remove);
  placeholder.replaceWith(figure);
  return figure;
}

export function removeImageUploadPlaceholder(editor: HTMLElement, uploadKey: string) {
  editor.querySelector(`[data-image-upload-key="${uploadKey}"]`)?.remove();
}

export function pastedImagePortableNode(element: HTMLElement): Record<string, unknown> | null {
  if (element.dataset.pastedSanityImage !== "true") return null;
  const key = element.dataset.portableKey || keyFor("image");
  const assetId = element.dataset.assetId || "";
  const alt = (element.dataset.alt || "Foto e mësimit").slice(0, 500);
  const caption = (element.dataset.caption || "").slice(0, 1000);
  if (!/^image-[A-Za-z0-9]+-\d+x\d+-[A-Za-z0-9]+$/.test(assetId)) return null;

  return {
    _key: key,
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
    alt,
    ...(caption ? { caption } : {}),
  };
}
