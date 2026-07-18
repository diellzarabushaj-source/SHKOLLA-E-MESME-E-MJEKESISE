"use client";

import { useState } from "react";
import LessonAdminEditor, { type AdminEditableLesson } from "../LessonAdminEditor";

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
};

export default function AdminEditorAuditHarness() {
  const [lesson, setLesson] = useState(initialLesson);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "110px 20px 160px" }}>
      <h1>Auditimi i editorit të administratorit</h1>
      <p>Ky ekran përdoret vetëm nga browser audit-i dhe nuk lidhet me Sanity.</p>
      <LessonAdminEditor lesson={lesson} onSaved={setLesson} />
      <output data-admin-audit-revision>{lesson._rev}</output>
    </main>
  );
}
