"use client";
import { useWorkspaceCopy, WorkspaceText } from "./workspace-text";
import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useSite } from "./site-shell";
import { L } from "@/lib/content";

export async function platformApi<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `/api/platform/${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      [
        result.error,
        ...(Array.isArray(result.fields)
          ? result.fields.map(
              (field: { path: string; message: string }) =>
                `${field.path}: ${field.message}`,
            )
          : []),
      ]
        .filter(Boolean)
        .join(" "),
    );
  return result as T;
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`platform-notice ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <div>
        {typeof children === "string" ? (
          <WorkspaceText text={children} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const w = useWorkspaceCopy();
  const generatedId = useId();
  const control = isValidElement(children)
    ? (children as ReactElement<{ id?: string; "aria-describedby"?: string }>)
    : null;
  const id = control?.props.id || generatedId;
  const hintId = `${id}-hint`;
  return (
    <div className="platform-field">
      <label htmlFor={id}>{w(label)}</label>
      {control
        ? cloneElement(control, {
            id,
            "aria-describedby":
              [control.props["aria-describedby"], hint ? hintId : undefined]
                .filter(Boolean)
                .join(" ") || undefined,
          })
        : children}
      {hint && <small id={hintId}>{w(hint)}</small>}
    </div>
  );
}
export function ActionForm({
  onSubmit,
  children,
  label = "Save",
  disabled = false,
  className = "",
}: {
  onSubmit: () => Promise<void>;
  children?: ReactNode;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const w = useWorkspaceCopy();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className={`platform-form ${className}`}
      onSubmit={async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await onSubmit();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "The action could not be completed.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && <Notice error>{error}</Notice>}
      <button
        className="button button-primary"
        type="submit"
        disabled={busy || disabled}
      >
        {busy ? <LoaderCircle size={17} className="spin" /> : null}
        {w(busy ? "Working…" : label)}
      </button>
    </form>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="platform-empty">
      <h3>
        <WorkspaceText text={title} />
      </h3>
      <p>
        {typeof children === "string" ? (
          <WorkspaceText text={children} />
        ) : (
          children || (
            <WorkspaceText text="Records will appear here when authorized users create them. No example business data has been added." />
          )
        )}
      </p>
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`platform-badge badge-${value.replace(/[^a-z_]/g, "")}`}>
      <WorkspaceText text={value} />
    </span>
  );
}
export const money = (minor: number) =>
  new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 2,
  }).format(minor / 100);
export const readableDate = (date: string | null | undefined) =>
  date
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: date.includes("T") ? "short" : undefined,
        timeZone: "Africa/Dar_es_Salaam",
      }).format(new Date(date))
    : "Not specified";
export function PreviewLinks({ links }: { links: (string | undefined)[] }) {
  const { t } = useSite();
  const valid = links.filter(Boolean) as string[];
  if (!valid.length) return null;
  return (
    <Notice>
      <strong>
        {t(
          L(
            "Preview-only local account delivery",
            "Uwasilishaji wa akaunti wa hakikisho pekee",
          ),
        )}
      </strong>
      <p>
        {t(
          L(
            "No email was sent. These links appear only because preview mode is enabled. Do not use real personal details.",
            "Hakuna barua pepe iliyotumwa. Viungo hivi vinaonekana kwa sababu hali ya hakikisho imewashwa. Usitumie taarifa halisi.",
          ),
        )}
      </p>
      {valid.map((link) => {
        const url = new URL(link, "https://preview.invalid");
        return (
          <Link key={link} href={`${url.pathname}${url.search}`}>
            <WorkspaceText
              text={
                url.pathname.includes("verify")
                  ? "Verify email"
                  : url.pathname.includes("reset")
                    ? "Set / reset password"
                    : "Link inquiry"
              }
            />{" "}
            <WorkspaceText text="→" />
          </Link>
        );
      })}
    </Notice>
  );
}
function fieldLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}
export function StructuredFields({
  value,
  onChange,
  path = "Content",
  depth = 0,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
  path?: string;
  depth?: number;
}) {
  const w = useWorkspaceCopy();
  if (typeof value === "boolean")
    return (
      <label className="platform-check">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
        {w(fieldLabel(path.split(".").pop() || path))}
      </label>
    );
  if (typeof value === "string" || typeof value === "number") {
    const enumFields: Record<string, string[]> = {
      kind: ["text", "features", "cta"],
      availability: ["available", "seasonal", "assessment"],
      heroPosition: ["center", "left", "right", "top", "bottom"],
      heroMobilePosition: ["center", "left", "right", "top", "bottom"],
      imagePosition: ["center", "left", "right", "top", "bottom"],
      mobileImagePosition: ["center", "left", "right", "top", "bottom"],
      icon: ["calendar", "utensils", "audio", "sparkles", "monitor"],
      service: [
        "event-management",
        "catering",
        "general-cleaning",
        "ict-solutions",
        "entertainment",
      ],
    };
    const field = path.split(".").pop() || path;
    const options =
      enumFields[field] ||
      (/Content\.sections\.\d+$/.test(path) && typeof value === "string"
        ? [
            "services",
            "about",
            "benefits",
            "projects",
            "process",
            "gallery",
            "clients",
            "testimonials",
            "news",
            "contact",
          ]
        : undefined);
    if (options)
      return (
        <FormField label={fieldLabel(field)}>
          <select
            value={String(value)}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">
              <WorkspaceText text="Select an option" />
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                {w(option)}
              </option>
            ))}
          </select>
        </FormField>
      );
    const label = fieldLabel(path.split(".").pop() || path),
      long =
        typeof value === "string" &&
        (value.length > 120 ||
          /body|description|intro|answer|summary|safety|evidence/i.test(path));
    return (
      <FormField label={label}>
        {long ? (
          <textarea
            rows={4}
            value={String(value)}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            type={typeof value === "number" ? "number" : "text"}
            value={String(value)}
            onChange={(event) =>
              onChange(
                typeof value === "number"
                  ? Number(event.target.value)
                  : event.target.value,
              )
            }
          />
        )}
      </FormField>
    );
  }
  if (Array.isArray(value))
    return (
      <details className="structured-group" open={depth < 1}>
        <summary>
          {w(fieldLabel(path.split(".").pop() || path))}{" "}
          <small>
            {value.length} <WorkspaceText text=" items" />
          </small>
        </summary>
        <div>
          {value.map((item, index) => (
            <div className="structured-array-item" key={index}>
              <div className="structured-array-tools">
                <strong>{index + 1}</strong>
                <button
                  type="button"
                  aria-label={`${w("Move item up")}: ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...value];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    onChange(next);
                  }}
                >
                  <WorkspaceText text="↑" />
                </button>
                <button
                  type="button"
                  aria-label={`${w("Move item down")}: ${index + 1}`}
                  disabled={index === value.length - 1}
                  onClick={() => {
                    const next = [...value];
                    [next[index], next[index + 1]] = [
                      next[index + 1],
                      next[index],
                    ];
                    onChange(next);
                  }}
                >
                  <WorkspaceText text="↓" />
                </button>
                <button
                  type="button"
                  aria-label={`${w("Remove item")}: ${index + 1}`}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <StructuredFields
                value={item}
                onChange={(next) =>
                  onChange(
                    value.map((entry, i) => (i === index ? next : entry)),
                  )
                }
                path={`${path}.${index + 1}`}
                depth={depth + 1}
              />
            </div>
          ))}
          <button
            className="platform-small-button"
            type="button"
            onClick={() => {
              const template = value[0];
              const blank = (item: unknown): unknown =>
                Array.isArray(item)
                  ? []
                  : typeof item === "object" && item !== null
                    ? Object.fromEntries(
                        Object.entries(item).map(([key, val]) => [
                          key,
                          blank(val),
                        ]),
                      )
                    : typeof item === "boolean"
                      ? false
                      : typeof item === "number"
                        ? 0
                        : "";
              onChange([
                ...value,
                template === undefined
                  ? /\.sections$/.test(path)
                    ? {
                        kind: "text",
                        title: { en: "", sw: "" },
                        body: { en: "", sw: "" },
                        items: [],
                      }
                    : /\.(?:capabilities|workflow)$/.test(path)
                      ? {
                          title: { en: "", sw: "" },
                          description: { en: "", sw: "" },
                        }
                      : /\.faqs$/.test(path)
                        ? {
                            question: { en: "", sw: "" },
                            answer: { en: "", sw: "" },
                          }
                        : /\.(?:tags|items)$/.test(path)
                          ? { en: "", sw: "" }
                          : " "
                  : blank(template),
              ]);
            }}
          >
            <Plus size={15} />
            <WorkspaceText text=" Add item " />
          </button>
        </div>
      </details>
    );
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    const content = (
      <div
        className={
          entries.every(([key]) => ["en", "sw"].includes(key))
            ? "platform-two-col"
            : "structured-object"
        }
      >
        {entries.map(([key, item]) => (
          <StructuredFields
            key={key}
            value={item}
            path={`${path}.${key}`}
            depth={depth + 1}
            onChange={(next) => onChange({ ...value, [key]: next })}
          />
        ))}
      </div>
    );
    return depth === 0 ? (
      <>{content}</>
    ) : (
      <details className="structured-group" open={depth <= 1}>
        <summary>{w(fieldLabel(path.split(".").pop() || path))}</summary>
        {content}
      </details>
    );
  }
  return null;
}
