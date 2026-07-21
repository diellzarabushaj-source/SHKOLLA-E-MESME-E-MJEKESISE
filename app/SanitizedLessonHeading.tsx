import { type ReactNode } from "react";
import { sanitizedPortableHeadingLevel } from "./LessonHeadingPolicy";

type PortableSpan = {
  text?: string;
};

type PortableBlockValue = {
  children?: PortableSpan[];
};

type Props = {
  style: string;
  value?: PortableBlockValue;
  children: ReactNode;
};

function sourceText(value?: PortableBlockValue): string {
  return (value?.children || []).map((child) => child.text || "").join("").replace(/\s+/g, " ").trim();
}

export default function SanitizedLessonHeading({ style, value, children }: Props) {
  const text = sourceText(value);
  const level = sanitizedPortableHeadingLevel(style, text);

  if (!level) {
    return (
      <p
        data-learning-paragraph="true"
        data-learning-rejected-heading="true"
        data-rejected-sanity-style={style}
        data-source-preserved="true"
      >
        {children}
      </p>
    );
  }

  const Tag = level === 2 ? "h2" : level === 3 ? "h3" : "h4";
  return (
    <Tag
      data-learning-heading="true"
      data-learning-level={level}
      data-heading-source="sanity"
      data-source-preserved="true"
    >
      {children}
    </Tag>
  );
}
