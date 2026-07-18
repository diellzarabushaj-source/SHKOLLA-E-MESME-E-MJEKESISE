"use client";

import { useState } from "react";
import LessonAdminEditor, { type AdminEditableLesson } from "@/app/LessonAdminEditor";

const initialLesson: AdminEditableLesson = {
  _id: "admin-audit-lesson",
  _rev: "audit-revision-1",
  title: "Mësimi provues i administratorit",
  body: [
    {
      _key: "audit-heading",
      _type: "block",
      style: "h2",
      markDefs: [],
      children: [
        {
          _key: "audit-heading-span",
          _type: "span",
          text: "Titulli provues",
          marks: [],
        },
      ],
    },
    {
      _key: "audit-paragraph",
      _type: "block",
      style: "normal",
      markDefs: [],
      children: [
        {
          _key: "audit-paragraph-span",
          _type: "span",
          text: "Teksti fillestar i mësimit.",
          marks: [],
        },
      ],
    },
  ],
};

export default function AdminEditorAuditHarness() {
  const [lesson, setLesson] = useState<AdminEditableLesson>(initialLesson);

  return (
    <main style={{ margin: "0 auto", maxWidth: 1180, padding: "32px 20px 80px" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ fontWeight: 700, margin: 0 }}>Vetëm për auditim CI</p>
        <h1 style={{ margin: "8px 0" }}>Auditimi i editorit të administratorit</h1>
        <p style={{ margin: 0 }}>
          Ky ekran aktivizohet vetëm kur E2E_ADMIN_AUDIT=1 dhe nuk përdor të dhëna reale të Sanity.
        </p>
        <output data-admin-audit-revision style={{ display: "block", marginTop: 8 }}>
          {lesson._rev}
        </output>
      </header>

      <LessonAdminEditor lesson={lesson} onSaved={setLesson} />
    </main>
  );
}
