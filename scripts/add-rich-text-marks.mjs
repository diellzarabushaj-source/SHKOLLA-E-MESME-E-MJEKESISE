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

const replacement = `const portableTextComponents: PortableTextComponents = {
  marks: {
    underline: ({ children }) => <span className="portable-underline">{children}</span>,
    highlight: ({ children }) => <mark className="portable-highlight">{children}</mark>,
    code: ({ children }) => <code className="portable-code">{children}</code>,
    link: ({ children, value }) => {
      const mark = value as { href?: unknown };
      const href = typeof mark?.href === "string" ? mark.href : "#";
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
