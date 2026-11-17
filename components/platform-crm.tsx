"use client";
import { useState } from "react";
import {
  ActionForm,
  Badge,
  FormField,
  Notice,
  platformApi,
} from "./platform-shared";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import type { InquiryRecord } from "./platform-types";
export function AssessmentEditor({
  record,
  onSaved,
}: {
  record: InquiryRecord;
  onSaved: () => Promise<void>;
}) {
  const w = useWorkspaceCopy(),
    old = record.work.assessment_json
      ? JSON.parse(record.work.assessment_json)
      : {};
  const [qualification, setQualification] = useState(
      record.work.qualification || "unreviewed",
    ),
    [outcome, setOutcome] = useState(record.work.outcome || "open"),
    [reason, setReason] = useState(old.reason || ""),
    [checks, setChecks] = useState<Record<string, boolean>>({
      serviceFit: !!old.serviceFit,
      requirementsReviewed: !!old.requirementsReviewed,
      contactable: !!old.contactable,
    });
  return (
    <details className="platform-panel">
      <summary>
        <WorkspaceText text="Qualification & opportunity outcome" />
        <Badge value={qualification} />
      </summary>
      <Notice>
        <WorkspaceText text="A person must review service fit, minimum requirements and a usable follow-up contact. This assessment never issues an offer, rejects a request or confirms work. Won requires a confirmed booking; a loss needs a reason." />
      </Notice>
      <ActionForm
        label="Save reviewed assessment"
        onSubmit={async () => {
          await platformApi("admin/inquiries/assessment", {
            id: record.id,
            expectedVersion: record.work.version,
            qualification,
            outcome,
            reason,
            ...checks,
          });
          await onSaved();
        }}
      >
        <FormField label="Qualification">
          <select
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
          >
            {["unreviewed", "qualified", "not_qualified"].map((v) => (
              <option key={v} value={v}>
                {w(v.replaceAll("_", " "))}
              </option>
            ))}
          </select>
        </FormField>
        {[
          ["serviceFit", "Service fit reviewed"],
          ["requirementsReviewed", "Minimum requirements reviewed"],
          ["contactable", "Follow-up contact reviewed"],
        ].map(([key, label]) => (
          <label className="platform-check" key={key}>
            <input
              type="checkbox"
              checked={checks[key]}
              onChange={(e) =>
                setChecks({ ...checks, [key]: e.target.checked })
              }
            />
            {w(label)}
          </label>
        ))}
        <FormField label="Opportunity outcome">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            {["open", "won", "lost"].map((v) => (
              <option key={v} value={v}>
                {w(v)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Assessment / loss reason (internal)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={10}
            maxLength={3000}
            required
          />
        </FormField>
      </ActionForm>
    </details>
  );
}
