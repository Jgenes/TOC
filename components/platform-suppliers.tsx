"use client";
import { useState } from "react";
import { useSite } from "./site-shell";
import { useWorkspaceCopy, WorkspaceText } from "./workspace-text";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  Notice,
  platformApi,
  readableDate,
} from "./platform-shared";
import type { SupplierRecord, WorkspaceData } from "./platform-types";
const blank = {
  name: "",
  department: "",
  category: "",
  contactName: "",
  email: "",
  phone: "",
  capabilityEvidence: "",
};
export function SuppliersWorkspace({
  data,
  refresh,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const { catalog, t } = useSite(),
    w = useWorkspaceCopy();
  const [form, setForm] = useState({
      ...blank,
      department: data.user.departments[0] || "event-management",
    }),
    [editing, setEditing] = useState<SupplierRecord | null>(null);
  const canEdit = !!data.capabilities?.["supplier.manage"];
  return (
    <>
      <Notice>
        <WorkspaceText text="Supplier contacts and due-diligence evidence are internal. Registration is not approval or a purchase order. A different delegated operations officer must approve a dated arrangement. Hired and partner resources require that approval before booking confirmation." />
      </Notice>
      <div className="platform-two-col">
        {canEdit && (
          <section className="platform-panel">
            <h2>
              {w(
                editing
                  ? "Edit supplier proposal"
                  : "Register supplier proposal",
              )}
            </h2>
            <ActionForm
              label="Save supplier proposal"
              onSubmit={async () => {
                await platformApi("admin/suppliers", {
                  id: editing?.id,
                  expectedVersion: editing?.version,
                  supplier: form,
                });
                setEditing(null);
                setForm({ ...blank, department: form.department });
                await refresh();
              }}
            >
              {[
                ["name", "Supplier name"],
                ["category", "Service / supply category"],
                ["contactName", "Contact name"],
                ["email", "Email"],
                ["phone", "Telephone"],
              ].map(([key, label]) => (
                <FormField key={key} label={label}>
                  <input
                    type={key === "email" ? "email" : "text"}
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    required={key === "name" || key === "category"}
                    minLength={
                      key === "name" || key === "category" ? 3 : undefined
                    }
                    maxLength={
                      key === "email" ? 254 : key === "phone" ? 30 : 150
                    }
                  />
                </FormField>
              ))}
              <FormField label="Department">
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                >
                  {catalog
                    .filter((s) => data.user.departments.includes(s.slug))
                    .map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {t(s.title)}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField label="Capability, rights & due-diligence evidence (internal)">
                <textarea
                  value={form.capabilityEvidence}
                  onChange={(e) =>
                    setForm({ ...form, capabilityEvidence: e.target.value })
                  }
                  minLength={10}
                  maxLength={3000}
                  required
                />
              </FormField>
              <p>
                <WorkspaceText text="Editing an arrangement removes its previous approval and requires independent reassessment." />
              </p>
            </ActionForm>
            {editing && (
              <button
                className="platform-small-button"
                onClick={() => {
                  setEditing(null);
                  setForm({ ...blank, department: form.department });
                }}
              >
                {w("Cancel editor")}
              </button>
            )}
          </section>
        )}
        <section className="platform-card-stack">
          {data.suppliers?.length ? (
            data.suppliers.map((s) => (
              <article className="platform-panel" key={`${s.id}:${s.version}`}>
                <h2>{s.name}</h2>
                <Badge value={s.state} />
                <p>
                  {t(
                    catalog.find((d) => d.slug === s.department)?.title || {
                      en: s.department,
                      sw: s.department,
                    },
                  )}{" "}
                  · {s.category}
                </p>
                <p>
                  {s.contact_name} · {s.email} · {s.phone}
                </p>
                <p>{s.capability_evidence}</p>
                {s.approved_until && (
                  <p>
                    {w("Approved until")} {readableDate(s.approved_until)} EAT
                  </p>
                )}
                {s.approval_evidence && <p>{s.approval_evidence}</p>}
                {canEdit && (
                  <button
                    className="platform-small-button"
                    onClick={() => {
                      setEditing(s);
                      setForm({
                        name: s.name,
                        department: s.department,
                        category: s.category,
                        contactName: s.contact_name,
                        email: s.email,
                        phone: s.phone,
                        capabilityEvidence: s.capability_evidence,
                      });
                    }}
                  >
                    {w("Edit supplier proposal")}
                  </button>
                )}
                {data.capabilities?.["supplier.approve"] && (
                  <SupplierReview
                    key={s.version}
                    supplier={s}
                    refresh={refresh}
                  />
                )}
              </article>
            ))
          ) : (
            <EmptyState title="No suppliers registered." />
          )}
        </section>
      </div>
    </>
  );
}
function SupplierReview({
  supplier,
  refresh,
}: {
  supplier: SupplierRecord;
  refresh: () => Promise<void>;
}) {
  const w = useWorkspaceCopy(),
    [action, setAction] = useState(
      supplier.state === "approved" ? "suspend" : "approve",
    ),
    [until, setUntil] = useState(""),
    [reason, setReason] = useState("");
  return (
    <ActionForm
      label="Record supplier decision"
      onSubmit={async () => {
        await platformApi("admin/suppliers/action", {
          id: supplier.id,
          expectedVersion: supplier.version,
          action,
          reason,
          ...(action === "approve"
            ? { approvedUntil: new Date(until).toISOString() }
            : {}),
        });
        await refresh();
      }}
    >
      <FormField label="Decision">
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="approve" disabled={supplier.state === "approved"}>
            {w("Approve arrangement")}
          </option>
          <option value="suspend">{w("Suspend arrangement")}</option>
        </select>
      </FormField>
      {action === "approve" && (
        <FormField label="Approval expiry (your local time)">
          <input
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            required
          />
        </FormField>
      )}
      <FormField label="Approval evidence">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={10}
          maxLength={3000}
          required
        />
      </FormField>
    </ActionForm>
  );
}
