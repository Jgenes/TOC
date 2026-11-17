"use client";
import { useEffect, useState } from "react";
import {
  ActionForm,
  Badge,
  EmptyState,
  FormField,
  Notice,
  platformApi,
  readableDate,
} from "./platform-shared";
import { useWorkspaceCopy, WorkspaceText } from "./workspace-text";
import type { WorkspaceData } from "./platform-types";
type AuditPage = {
  items: NonNullable<WorkspaceData["audit"]>;
  offset: number;
  limit: number;
  total: number;
};
export function AuditWorkspace({ data }: { data: WorkspaceData }) {
  const w = useWorkspaceCopy(),
    [filters, setFilters] = useState({
      from: "",
      to: "",
      actor: "",
      action: "",
      target: "",
      search: "",
    }),
    [result, setResult] = useState<AuditPage>({
      items: data.audit || [],
      offset: 0,
      limit: 50,
      total: 0,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async (offset = 0) => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        offset: String(offset),
        limit: "50",
      });
      setResult(await platformApi<AuditPage>(`audit?${params}`));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load audit evidence.",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <ActionForm label="Apply audit filters" onSubmit={() => load()}>
        <div className="platform-two-col">
          {[
            ["from", "From (UTC date)"],
            ["to", "Until (UTC date)"],
            ["actor", "Actor name or identifier"],
            ["action", "Action"],
            ["target", "Target type or identifier"],
            ["search", "Search audit events"],
          ].map(([key, label]) => (
            <FormField key={key} label={label}>
              <input
                type={key === "from" || key === "to" ? "date" : "text"}
                value={filters[key as keyof typeof filters]}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
                maxLength={200}
              />
            </FormField>
          ))}
        </div>
      </ActionForm>
      <p>
        <WorkspaceText text="Filters apply to all authorized audit evidence, not only the latest page. The application provides no edit or delete operation for audit records." />
      </p>
      {error && <Notice error>{error}</Notice>}
      <div className="platform-toolbar">
        <span>
          {result.total} {w("authorized events")} ·{" "}
          {result.total ? result.offset + 1 : 0}–
          {Math.min(result.offset + result.limit, result.total)}
        </span>
        <button
          className="platform-small-button"
          disabled={busy || result.offset === 0}
          onClick={() => void load(Math.max(0, result.offset - result.limit))}
        >
          {w("Previous page")}
        </button>
        <button
          className="platform-small-button"
          disabled={busy || result.offset + result.limit >= result.total}
          onClick={() => void load(result.offset + result.limit)}
        >
          {w("Next page")}
        </button>
      </div>
      <div className="audit-events">
        {result.items.length ? (
          result.items.map((row) => (
            <details className="platform-panel" key={row.id}>
              <summary>
                <span>
                  <strong>{row.action}</strong>
                  <small>
                    {row.actor_name || row.actor_id} ·{" "}
                    {readableDate(row.created_at)}
                  </small>
                </span>
                <Badge value={row.target_type} />
              </summary>
              <p>{row.target_id}</p>
              <p>{row.reason}</p>
              <div className="platform-two-col">
                <pre>{row.before_json || w("No before snapshot")}</pre>
                <pre>{row.after_json || w("No after snapshot")}</pre>
              </div>
            </details>
          ))
        ) : (
          <EmptyState title="No matching audit events." />
        )}
      </div>
    </>
  );
}
