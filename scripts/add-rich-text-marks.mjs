import { readFileSync, writeFileSync } from "node:fs";

const portalPath = "app/SchoolLearningPortal.tsx";
let source = readFileSync(portalPath, "utf8");

if (source.includes('className="portable-highlight"')) {
  process.stdout.write("Rich text marks are already installed.\n");
  process.exit(0);
}

const marker = `const portableTextComponents: PortableTextComponents = {
  types: {`;

if (!source.includes(marker)) {
  throw new Error("Portable Text component marker was not found in SchoolLearningPortal.tsx");
}

const replacement = `function safePortableHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href || href.startsWith("//") || /[\\u0000-\\u001F\\u007F]/.test(href)) return null;
  if (href.startsWith("#")) return href;
  if (href.startsWith("/")) return href;

  try {
    const parsed = new URL(href);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? href : null;
  } catch {
    return null;
  }
}

const portableTextComponents: PortableTextComponents = {
  marks: {
    underline: ({ children }) => <span className="portable-underline">{children}</span>,
    highlight: ({ children }) => <mark className="portable-highlight">{children}</mark>,
    code: ({ children }) => <code className="portable-code">{children}</code>,
    link: ({ children, value }) => {
      const mark = value as { href?: unknown };
      const href = safePortableHref(mark?.href);
      if (!href) return <span>{children}</span>;
      const external = /^https?:\\/\\//i.test(href);
      return (
        <a
          className="portable-link"
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {children}
        </a>
      );
    },
  },
  types: {`;

source = source.replace(marker, replacement);
writeFileSync(portalPath, source);
process.stdout.write("Installed rich text rendering for Portable Text marks.\n");
