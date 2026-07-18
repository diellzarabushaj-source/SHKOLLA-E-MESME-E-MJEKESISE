�r�^�f��ئ{~ly�'vî���"use client";

import {
  EditorProvider,
  PortableTextEditable,
  defineSchema,
  type BlockRenderProps,
  type PortableTextBlock,
  type RenderAnnotationFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderStyleFunction,
  useEditor,
} from "@portabletext/editor";
import { EventListenerPlugin } from "@portabletext/editor/plugins";
import {
  blockquote,
  bold,
  code,
  h2,
  h3,
  h4,
  italic,
  normal,
  underline,
} from "@portabletext/keyboard-shortcuts";
import {
  type ExtendDecoratorSchemaType,
  type ExtendStyleSchemaType,
  type ToolbarBlockObjectSchemaType,
  type ToolbarDecoratorSchemaType,
  type ToolbarListSchemaType,
  useBlockObjectButton,
  useDecoratorButton,
  useHistoryButtons,
  useListButton,
  useStyleSelector,
  useToolbarSchema,
} from "@portabletext/toolbar";
import { useEffect, useRef, useState } from "react";
import styles from "../LessonAdminEditor.module.css";
import { uploadAdminImage, validateAdminImage } from "./image-upload";
import type { AdminImage, PortableNode } from "./types";

type Props = {
  initialValue: PortableNode[];
  revision: string;
  onChange: (value: PortableNode[]) => void;
};

const schemaDefinition = defineSchema({
  decorators: [
    { name: "strong", title: "Bold" },
    { name: "em", title: "Italic" },
    { name: "underline", title: "Nënvizim" },
    { name: "code", title: "Kod" },
  ],
  styles: [
    { name: "normal", title: "Paragraf" },
    { name: "h2", title: "Heading H2" },
    { name: "h3", title: "Subheading H3" },
    { name: "h4", title: "Heading H4" },
    { name: "blockquote", title: "Citim" },
  ],
  lists: [
    { name: "bullet", title: "Listë me pika" },
    { name: "number", title: "Listë me numra" },
  ],
  annotations: [
    {
      name: "link",
      title: "Link",
      fields: [
        { name: "href", title: "Adresa", type: "string" },
        { name: "title", title: "Titulli", type: "string" },
      ],
    },
  ],
  inlineObjects: [],
  blockObjects: [
    {
      name: "image",
      title: "Fotografi",
      fields: [
        { name: "asset", title: "Sanity asset", type: "object" },
        { name: "assetUrl", title: "Preview URL", type: "string" },
        { name: "alt", title: "Përshkrimi alternativ", type: "string" },
        { name: "caption", title: "Përshkrimi poshtë fotos", type: "string" },
      ],
    },
  ],
});

const extendDecorator: ExtendDecoratorSchemaType = (decorator) => ({
  ...decorator,
  shortcut: decorator.name === "strong"
    ? bold
    : decorator.name === "em"
      ? italic
      : decorator.name === "underline"
        ? underline
        : decorator.name === "code"
          ? code
          : undefined,
});

const extendStyle: ExtendStyleSchemaType = (style) => ({
  ...style,
  shortcut: style.name === "normal"
    ? normal
    : style.name === "h2"
      ? h2
      : style.name === "h3"
        ? h3
        : style.name === "h4"
          ? h4
          : style.name === "blockquote"
            ? blockquote
            : undefined,
});

const decoratorLabels: Record<string, React.ReactNode> = {
  strong: <strong>B</strong>,
  em: <em>I</em>,
  underline: <u>U</u>,
  code: <span className={styles.codeLabel}>&lt;/&gt;</span>,
};

const renderDecorator: RenderDecoratorFunction = ({ children, value }) => {
  if (value === "strong") return <strong>{children}</strong>;
  if (value === "em") return <em>{children}</em>;
  if (value === "underline") return <u>{children}</u>;
  if (value === "code") return <code>{children}</code>;
  return <>{children}</>;
};

const renderStyle: RenderStyleFunction = ({ children, value }) => {
  if (value === "h2") return <h2>{children}</h2>;
  if (value === "h3") return <h3>{children}</h3>;
  if (value === "h4") return <h4>{children}</h4>;
  if (value === "blockquote") return <blockquote>{children}</blockquote>;
  return <p>{children}</p>;
};

const renderListItem: RenderListItemFunction = ({ children }) => <>{children}</>;

const renderAnnotation: RenderAnnotationFunction = ({ children, value }) => (
  <span className={styles.editorLink} title={typeof value.href === "string" ? value.href : undefined}>
    {children}
  </span>
);

function DecoratorButton({ schemaType }: { schemaType: ToolbarDecoratorSchemaType }) {
  const button = useDecoratorButton({ schemaType });
  const active = button.snapshot.matches({ enabled: "active" });
  const disabled = button.snapshot.matches("disabled");

  return (
    <button
      type="button"
      className={active ? styles.toolActive : undefined}
      disabled={disabled}
      aria-label={schemaType.title || schemaType.name}
      aria-pressed={active}
      title={schemaType.shortcut ? `${schemaType.title || schemaType.name} (${schemaType.shortcut.keys.join("+")})` : schemaType.title || schemaType.name}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => button.send({ type: "toggle" })}
    >
      {decoratorLabels[schemaType.name] || schemaType.title || schemaType.name}
    </button>
  );
}

function ListButton({ schemaType }: { schemaType: ToolbarListSchemaType }) {
  const button = useListButton({ schemaType });
  const active = button.snapshot.matches({ enabled: "active" });
  const disabled = button.snapshot.matches("disabled");
  return (
    <button
      type="button"
      className={active ? styles.toolActive : undefined}
      disabled={disabled}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => button.send({ type: "toggle" })}
    >
      {schemaType.name === "number" ? "1. 2. 3." : "• Lista"}
    </button>
  );
}

function HistoryButtons() {
  const history = useHistoryButtons();
  const disabled = history.snapshot.matches("disabled");
  return (
    <div className={styles.toolGroup} aria-label="Historia e ndryshimeve">
      <button type="button" disabled={disabled} aria-label="Ktheje ndryshimin" onMouseDown={(event) => event.preventDefault()} onClick={() => history.send({ type: "history.undo" })}>↶</button>
      <button type="button" disabled={disabled} aria-label="Ribëje ndryshimin" onMouseDown={(event) => event.preventDefault()} onClick={() => history.send({ type: "history.redo" })}>↷</button>
    </div>
  );
}

function ImageInsertButton({ schemaType }: { schemaType: ToolbarBlockObjectSchemaType }) {
  const button = useBlockObjectButton({ schemaType });
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function closeDialog() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setAlt("");
    setCaption("");
    setError("");
    button.send({ type: "close dialog" });
  }

  function chooseFile(selected: File | undefined) {
    if (!selected) {
      button.send({ type: "close dialog" });
      return;
    }
    const validationError = validateAdminImage(selected);
    if (validationError) {
      setError(validationError);
      button.send({ type: "close dialog" });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setAlt(selected.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]+/g, " "));
    setError("");
  }

  async function insertImage() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadAdminImage(file);
      button.send({
        type: "insert",
        placement: "auto",
        value: {
          asset: uploaded.asset,
          assetUrl: uploaded.url,
          alt: alt.trim(),
          caption: caption.trim(),
        },
      });
      closeDialog();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Fotografia nuk u ngarkua.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        className={styles.visuallyHidden}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => {
          chooseFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        disabled={button.snapshot.matches("disabled")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          button.send({ type: "open dialog" });
          inputRef.current?.click();
        }}
      >
        ＋ Foto
      </button>

      {file && (
        <div className={styles.imageDialogBackdrop} role="presentation">
          <section className={styles.imageDialog} role="dialog" aria-modal="true" aria-label="Shto fotografinë në mësim">
            <header>
              <div><strong>Shto fotografinë</strong><small>Fotografia ngarkohet në Sanity.</small></div>
              <button type="button" onClick={closeDialog} disabled={uploading} aria-label="Mbylle">×</button>
            </header>
            <img src={preview} alt="Pamja paraprake" />
            <label>
              Përshkrimi i fotos (alt)
              <input value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={300} />
            </label>
            <label>
              Teksti poshtë fotos (opsional)
              <input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} />
            </label>
            {error && <p className={styles.inlineError} role="alert">{error}</p>}
            <footer>
              <button type="button" className={styles.cancel} onClick={closeDialog} disabled={uploading}>Anulo</button>
              <button type="button" className={styles.save} onClick={() => void insertImage()} disabled={uploading}>
                {uploading ? "Duke ngarkuar…" : "Ngarko dhe shto"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function EditorToolbar() {
  const toolbar = useToolbarSchema({ extendDecorator, extendStyle });
  const styleSelector = useStyleSelector({ schemaTypes: toolbar.styles });
  const imageType = toolbar.blockObjects.find((item) => item.name === "image");

  return (
    <div className={styles.richToolbar} role="toolbar" aria-label="Formatimi i tekstit">
      <HistoryButtons />
      <label className={styles.styleSelector}>
        <span className={styles.visuallyHidden}>Lloji i paragrafit</span>
        <select
          value={styleSelector.snapshot.context.activeStyle || "normal"}
          disabled={styleSelector.snapshot.matches("disabled")}
          onChange={(event) => styleSelector.send({ type: "toggle", style: event.target.value })}
        >
          {toolbar.styles.map((style) => <option key={style.name} value={style.name}>{style.title || style.name}</option>)}
        </select>
      </label>
      <div className={styles.toolGroup} aria-label="Stili i tekstit">
        {toolbar.decorators.map((decorator) => <DecoratorButton key={decorator.name} schemaType={decorator} />)}
      </div>
      <div className={styles.toolGroup} aria-label="Listat">
        {toolbar.lists.map((list) => <ListButton key={list.name} schemaType={list} />)}
      </div>
      {imageType && <ImageInsertButton schemaType={imageType} />}
    </div>
  );
}

function EditableImageBlock(props: BlockRenderProps) {
  const editor = useEditor();
  const image = props.value as unknown as AdminImage;
  const url = image.assetUrl || (image.asset && "url" in image.asset ? image.asset.url : undefined);

  return (
    <figure className={styles.editableImage} contentEditable={false} data-selected={props.selected || undefined}>
      {url ? <img src={url} alt={image.alt || "Fotografi e mësimit"} /> : <div className={styles.imageMissing}>Fotografia nuk ka preview.</div>}
      <div className={styles.imageFields}>
        <label>
          Alt
          <input
            value={image.alt || ""}
            maxLength={300}
            onChange={(event) => editor.send({ type: "block.set", at: props.path, props: { alt: event.target.value } })}
          />
        </label>
        <label>
          Përshkrimi
          <input
            value={image.caption || ""}
            maxLength={500}
            onChange={(event) => editor.send({ type: "block.set", at: props.path, props: { caption: event.target.value } })}
          />
        </label>
        <button type="button" className={styles.removeImage} onClick={() => editor.send({ type: "delete.block", at: props.path })}>Hiqe foton</button>
      </div>
    </figure>
  );
}

function renderBlock(props: BlockRenderProps) {
  if (props.value._type === "image") return <EditableImageBlock {...props} />;
  return <div>{props.children}</div>;
}

export default function AdminRichTextEditor({ initialValue, revision, onChange }: Props) {
  return (
    <EditorProvider
      key={revision}
      initialConfig={{
        schemaDefinition,
        initialValue: initialValue as PortableTextBlock[],
      }}
    >
      <EventListenerPlugin
        on={(event) => {
          if (event.type === "mutation") onChange((event.value || []) as PortableNode[]);
        }}
      />
      <EditorToolbar />
      <PortableTextEditable
        className={styles.richEditable}
        aria-label="Teksti i mësimit"
        spellCheck
        renderAnnotation={renderAnnotation}
        renderBlock={renderBlock}
        renderDecorator={renderDecorator}
        renderListItem={renderListItem}
        renderStyle={renderStyle}
        renderPlaceholder={() => <span>Shkruaj ose bëj paste këtu…</span>}
      />
      <p className={styles.pasteHint}>Paste nga Word, Google Docs ose Sanity ruan heading, bold, italic dhe listat.</p>
    </EditorProvider>
  );
}
