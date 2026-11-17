import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { company, type Service } from "./content";
import { additionalServiceOptions } from "./service-fields";
import { authorize, hasPermission, type Principal } from "./platform-auth";
import { audit, demand, platformDb } from "./platform-store";

export const contentTypes = [
  "page",
  "service",
  "package",
  "menu",
  "project",
  "client",
  "testimonial",
  "article",
  "career",
  "team",
  "faq",
  "gallery",
  "document",
  "homepage",
  "navigation",
  "company",
  "knowledge",
] as const;
const localized = z
  .object({
    en: z.string().trim().min(1).max(12000),
    sw: z.string().trim().min(1).max(12000),
  })
  .strict();
const image = z
  .string()
  .regex(
    /^(?:\/assets\/[a-zA-Z0-9._-]+\.(?:webp|png|jpg|jpeg|svg)|\/api\/platform\/public-media\/[a-f0-9-]{36})$/,
  )
  .max(200);
const cta = z
  .object({
    label: localized,
    href: z
      .string()
      .regex(/^\/(?!\/)[a-zA-Z0-9/?=&._-]*$/)
      .max(300),
  })
  .strict();
const optionalLocalized = z
  .object({
    en: z.string().trim().max(12000),
    sw: z.string().trim().max(12000),
  })
  .strict()
  .refine(
    (value) => Boolean(value.en) === Boolean(value.sw),
    "Provide both language versions, or leave both blank.",
  );
const position = z.enum(["center", "left", "right", "top", "bottom"]);
const seoSchema = z
  .object({
    title: z.string().max(150),
    description: z.string().max(300),
    canonicalPath: z
      .string()
      .regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/)
      .or(z.literal(""))
      .optional(),
    socialTitle: z.string().max(150).optional(),
    socialDescription: z.string().max(300).optional(),
  })
  .strict();
const videoUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      [
        "www.youtube.com",
        "youtube.com",
        "youtu.be",
        "vimeo.com",
        "www.vimeo.com",
      ].includes(url.hostname)
    );
  }, "Use an approved HTTPS YouTube or Vimeo publication link; no tracking embeds are loaded automatically.");
const serviceSchema = z
  .object({
    slug: z.enum(additionalServiceOptions),
    number: z.string().max(3),
    title: localized,
    shortTitle: localized,
    eyebrow: localized,
    headline: localized,
    description: localized,
    intro: localized,
    image,
    imageAlt: z.string().min(5).max(500),
    imageAltLocalized: optionalLocalized.optional(),
    imagePosition: position.optional(),
    mobileImagePosition: position.optional(),
    caption: optionalLocalized.optional(),
    seo: seoSchema.optional(),
    mediaRights: z.boolean().optional(),
    permissionEvidence: z.string().max(2000).optional(),
    documentId: z.string().uuid().optional(),
    icon: z.enum(["calendar", "utensils", "audio", "sparkles", "monitor"]),
    tags: z.array(localized).min(1).max(8),
    capabilities: z
      .array(z.object({ title: localized, description: localized }).strict())
      .min(1)
      .max(15),
    faqs: z
      .array(z.object({ question: localized, answer: localized }).strict())
      .max(20),
    cta: localized.optional(),
    workflow: z
      .array(z.object({ title: localized, description: localized }).strict())
      .max(10)
      .optional(),
    safety: localized.optional(),
  })
  .strict();
const companySchema = z
  .object({
    name: z.string().min(3).max(150),
    brand: z.string().max(100),
    email: z.string().email(),
    phone: z.string().max(40),
    phoneHref: z.string().regex(/^\+\d{7,15}$/),
    secondaryPhone: z.string().max(40),
    location: z.string().max(250),
    source: z.string().max(1000),
    verified: z.boolean(),
    whatsapp: z
      .string()
      .regex(/^\+\d{7,15}$/)
      .optional(),
    social: z
      .array(
        z.object({
          label: z.string().max(40),
          url: z.string().url().startsWith("https://"),
        }),
      )
      .max(6)
      .optional(),
  })
  .strict();
const homeSchema = z
  .object({
    title: localized,
    summary: localized,
    heroImage: image,
    heroAlt: localized.optional(),
    documentId: z.string().uuid().optional(),
    heroPosition: position.optional(),
    heroMobilePosition: position.optional(),
    caption: optionalLocalized.optional(),
    seo: seoSchema.optional(),
    mediaRights: z.boolean().optional(),
    permissionEvidence: z.string().max(2000).optional(),
    primaryCta: cta.optional(),
    secondaryCta: cta.optional(),
    sections: z
      .array(
        z.enum([
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
        ]),
      )
      .max(10),
  })
  .strict()
  .refine(
    (value) =>
      ["services", "contact"].every((section) =>
        value.sections.includes(section as "services" | "contact"),
      ),
    "Services and contact cannot be removed.",
  )
  .refine(
    (value) => new Set(value.sections).size === value.sections.length,
    "Each section may appear only once.",
  );
const navigationSchema = z
  .object({
    title: localized,
    items: z.array(cta).min(2).max(8),
    footerItems: z.array(cta).max(16),
  })
  .strict()
  .refine(
    (value) =>
      value.items.some((item) => item.href === "/services") &&
      value.items.some((item) => item.href === "/contact"),
    "Keep service discovery and contact in the main navigation.",
  );
const genericSchema = z
  .object({
    title: localized,
    summary: localized,
    body: localized.optional(),
    image: image.optional(),
    imageAlt: localized.optional(),
    imagePosition: position.optional(),
    mobileImagePosition: position.optional(),
    caption: optionalLocalized.optional(),
    videoUrl: videoUrl.or(z.literal("")).optional(),
    category: z.string().trim().max(80).optional(),
    service: z.enum(additionalServiceOptions).optional(),
    location: z.string().trim().max(150).optional(),
    year: z.number().int().min(1900).max(2200).optional(),
    author: z.string().trim().max(100).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    portionUnit: z.string().max(40).optional(),
    dietaryTags: z.array(z.string().max(80)).max(20).optional(),
    allergenInformation: localized.optional(),
    availability: z.enum(["available", "seasonal", "assessment"]).optional(),
    attribution: z.string().trim().max(200).optional(),
    permissionEvidence: z.string().trim().max(2000).optional(),
    clientApproved: z.boolean().optional(),
    mediaRights: z.boolean().optional(),
    seo: seoSchema.optional(),
    cta: cta.optional(),
    documentId: z.string().uuid().optional(),
    sections: z
      .array(
        z
          .object({
            kind: z.enum(["text", "features", "cta"]),
            title: localized,
            body: localized,
            items: z.array(localized).max(12),
          })
          .strict(),
      )
      .max(16)
      .optional(),
  })
  .strict();
export type PublicContent = {
  id: string;
  type: string;
  slug: string;
  data: Record<string, unknown>;
  publishedAt: string;
  revisionId: string;
  version: number;
};
type ContentRow = {
  id: string;
  type: string;
  slug: string;
  department: string;
  draft_revision_id: string;
  published_revision_id: string | null;
  state: string;
  version: number;
};
type Revision = {
  id: string;
  item_id: string;
  version: number;
  data: string;
  author_id: string;
  source_reference: string;
  state: string;
  approved_by: string | null;
  publish_at: string | null;
  expire_at: string | null;
  created_at: string;
};
const dataSchema = (type: string) =>
  type === "service"
    ? serviceSchema
    : type === "company"
      ? companySchema
      : type === "homepage"
        ? homeSchema
        : type === "navigation"
          ? navigationSchema
          : genericSchema;
export function runPublishingJobs() {
  const db = platformDb(),
    now = new Date().toISOString();
  db.transaction(() => {
    const scheduled = db
      .prepare(
        "SELECT r.*,i.draft_revision_id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE r.state='approved' AND r.publish_at IS NOT NULL AND r.publish_at<=?",
      )
      .all(now) as (Revision & { draft_revision_id: string })[];
    for (const revision of scheduled) {
      if (revision.draft_revision_id !== revision.id) continue;
      if (revision.expire_at && revision.expire_at <= now) continue;
      db.prepare(
        "UPDATE content_items SET published_revision_id=?,state='published' WHERE id=?",
      ).run(revision.id, revision.item_id);
      db.prepare(
        "UPDATE content_revisions SET state='published' WHERE id=?",
      ).run(revision.id);
      audit(
        "scheduler",
        "content.published",
        "content",
        revision.item_id,
        undefined,
        { revisionId: revision.id },
      );
    }
    const expired = db
      .prepare(
        "SELECT i.id,r.id AS revision_id FROM content_items i JOIN content_revisions r ON r.id=i.published_revision_id WHERE r.expire_at IS NOT NULL AND r.expire_at<=?",
      )
      .all(now) as { id: string; revision_id: string }[];
    for (const item of expired) {
      db.prepare(
        "UPDATE content_items SET published_revision_id=NULL,state='archived' WHERE id=?",
      ).run(item.id);
      audit("scheduler", "content.expired", "content", item.id, undefined, {
        revisionId: item.revision_id,
      });
    }
  })();
}
export function publishedContent(type?: string): PublicContent[] {
  runPublishingJobs();
  const rows = platformDb()
    .prepare(
      `SELECT i.id,i.type,i.slug,r.data,r.approved_at,r.created_at,r.id AS revision_id,r.version FROM content_items i JOIN content_revisions r ON r.id=i.published_revision_id WHERE r.state='published' ${type ? "AND i.type=?" : ""} ORDER BY COALESCE(json_extract(r.data,'$.date'),r.created_at) DESC`,
    )
    .all(...(type ? [type] : [])) as {
    id: string;
    type: string;
    slug: string;
    data: string;
    approved_at: string | null;
    created_at: string;
    revision_id: string;
    version: number;
  }[];
  const publishedServices = new Set(
    (
      platformDb()
        .prepare(
          "SELECT slug FROM content_items WHERE type='service' AND published_revision_id IS NOT NULL",
        )
        .all() as { slug: string }[]
    ).map((row) => row.slug),
  );
  return rows
    .filter((row) => {
      const service = JSON.parse(row.data).service;
      return !service || publishedServices.has(service);
    })
    .map((row) => {
      const raw = JSON.parse(row.data) as Record<string, unknown>;
      const {
        permissionEvidence: _permission,
        clientApproved: _client,
        mediaRights: _rights,
        source: _source,
        ...safe
      } = raw;
      return {
        id: row.id,
        type: row.type,
        slug: row.slug,
        data: safe,
        publishedAt: row.approved_at || row.created_at,
        revisionId: row.revision_id,
        version: row.version,
      };
    });
}
export function publicBundle() {
  const content = publishedContent();
  return {
    catalog: content
      .filter((item) => item.type === "service")
      .map((item) => item.data as unknown as Service)
      .sort((a, b) => a.number.localeCompare(b.number)),
    profile: {
      ...company,
      ...content.find((item) => item.type === "company")?.data,
    },
    content: content.filter(
      (item) => !["service", "company"].includes(item.type),
    ),
  };
}
export function listContent(user: Principal) {
  authorize(user, "content.edit");
  runPublishingJobs();
  const rows = platformDb()
    .prepare(
      "SELECT i.*,r.data,r.source_reference,r.state AS revision_state,r.approved_by,r.publish_at,r.expire_at FROM content_items i JOIN content_revisions r ON r.id=i.draft_revision_id ORDER BY i.type,i.slug",
    )
    .all() as (ContentRow & { data: string })[];
  return rows
    .filter((row) =>
      row.department
        ? hasPermission(user, "content.edit", row.department)
        : user.roles.some((role) =>
            ["administrator", "publisher", "editor", "marketing"].includes(
              role,
            ),
          ),
    )
    .map((row) => ({ ...row, data: JSON.parse(row.data) }));
}
export const saveContentSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(contentTypes),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  department: z.enum(additionalServiceOptions).or(z.literal("")).default(""),
  expectedVersion: z.number().int().positive().optional(),
  data: z.unknown(),
  sourceReference: z.string().trim().min(10).max(2000),
  restoreRevisionId: z.string().uuid().optional(),
});
export function saveContent(
  user: Principal,
  input: z.infer<typeof saveContentSchema>,
) {
  authorize(user, "content.edit", input.department || undefined);
  const db = platformDb();
  return db.transaction(() => {
    let item: ContentRow | undefined = input.id
      ? (db.prepare("SELECT * FROM content_items WHERE id=?").get(input.id) as
          ContentRow | undefined)
      : undefined;
    if (input.type === "page")
      demand(
        ![
          "admin",
          "portal",
          "api",
          "staff",
          "services",
          "contact",
          "request-quotation",
          "projects",
          "clients",
          "news",
          "careers",
          "gallery",
          "downloads",
          "opportunities",
          "privacy-policy",
        ].includes(input.slug),
        422,
        "That route is reserved for a functional module. Choose a new editorial URL.",
      );
    const singletons: Record<string, string> = {
      company: "corporate",
      homepage: "home",
      navigation: "primary",
      configuration: "operations",
    };
    if (singletons[input.type])
      demand(
        input.slug === singletons[input.type] && input.department === "",
        422,
        "This corporate controller has one immutable shared record.",
      );
    if (input.type === "service")
      demand(
        input.department === input.slug,
        422,
        "Service content must retain its own departmental scope.",
      );
    if (!input.department)
      demand(
        user.roles.some((role) =>
          ["administrator", "publisher", "editor", "marketing"].includes(role),
        ),
        403,
        "Departmental managers may edit their own departmental content only.",
      );
    if (input.id) {
      demand(item, 404, "Content not found.");
      authorize(user, "content.edit", item.department || undefined);
      demand(
        item.version === input.expectedVersion,
        409,
        "This content changed. Reload before saving.",
      );
      demand(
        item.type === input.type &&
          item.slug === input.slug &&
          item.department === input.department,
        409,
        "Content type, route and department are immutable. Use an approved redirect for URL changes.",
      );
    } else
      demand(
        !db
          .prepare("SELECT 1 FROM content_items WHERE type=? AND slug=?")
          .get(input.type, input.slug),
        409,
        "That content URL already exists.",
      );
    let data = input.data;
    if (input.restoreRevisionId) {
      const old = db
        .prepare("SELECT data FROM content_revisions WHERE id=? AND item_id=?")
        .get(input.restoreRevisionId, input.id) as { data: string } | undefined;
      demand(old, 404, "Revision not found.");
      data = JSON.parse(old.data);
    }
    const parsed = dataSchema(input.type).parse(data);
    if (input.type === "service")
      demand(
        (parsed as Service).slug === input.slug,
        422,
        "The service slug must match its route.",
      );
    const id = item?.id || randomUUID(),
      revision = randomUUID(),
      version = (item?.version || 0) + 1,
      now = new Date().toISOString();
    if (!item)
      db.prepare(
        "INSERT INTO content_items(id,type,slug,department,created_at) VALUES(?,?,?,?,?)",
      ).run(id, input.type, input.slug, input.department, now);
    db.prepare(
      "INSERT INTO content_revisions(id,item_id,version,data,author_id,source_reference,created_at) VALUES(?,?,?,?,?,?,?)",
    ).run(
      revision,
      id,
      version,
      JSON.stringify(parsed),
      user.id,
      input.sourceReference,
      now,
    );
    db.prepare(
      "UPDATE content_items SET draft_revision_id=?,version=?,state='draft' WHERE id=?",
    ).run(revision, version, id);
    audit(
      user.id,
      input.restoreRevisionId
        ? "content.restored_as_draft"
        : "content.draft_saved",
      "content",
      id,
      item ? { revisionId: item.draft_revision_id } : undefined,
      { revisionId: revision, version },
    );
    return { id, revisionId: revision, version };
  })();
}
export const publishSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["submit", "approve", "publish", "unpublish", "archive"]),
  expectedVersion: z.number().int().positive(),
  publishAt: z.string().datetime().optional(),
  expireAt: z.string().datetime().optional(),
  reason: z.string().trim().min(10).max(2000),
});
export function changePublication(
  user: Principal,
  input: z.infer<typeof publishSchema>,
) {
  const db = platformDb();
  return db.transaction(() => {
    const item = db
      .prepare("SELECT * FROM content_items WHERE id=?")
      .get(input.id) as ContentRow | undefined;
    demand(item, 404, "Content not found.");
    authorize(
      user,
      input.action === "submit" ? "content.edit" : "content.publish",
      item.department || undefined,
    );
    demand(
      item.version === input.expectedVersion,
      409,
      "This content changed. Reload before acting.",
    );
    if (!item.department && input.action === "submit")
      demand(
        user.roles.some((role) =>
          ["administrator", "publisher", "editor", "marketing"].includes(role),
        ),
        403,
        "Corporate content requires a corporate editorial role.",
      );
    const revision = db
      .prepare("SELECT * FROM content_revisions WHERE id=?")
      .get(item.draft_revision_id) as Revision;
    if (input.action === "submit") {
      demand(revision.state === "draft", 409, "Only a draft may be submitted.");
      db.prepare("UPDATE content_revisions SET state='review' WHERE id=?").run(
        revision.id,
      );
    }
    if (input.action === "approve") {
      demand(
        revision.state === "review",
        409,
        "Submit this revision for review first.",
      );
      demand(
        revision.author_id !== user.id,
        403,
        "A different authorized publisher must review this revision.",
      );
      const data = JSON.parse(revision.data);
      if (
        ["project", "client", "testimonial", "team", "gallery"].includes(
          item.type,
        )
      )
        demand(
          data.clientApproved === true &&
            (data.mediaRights === true || !data.image) &&
            typeof data.permissionEvidence === "string" &&
            data.permissionEvidence.length >= 10,
          422,
          "Record verification, permission evidence and media rights before approval.",
        );
      if (item.type === "document")
        demand(
          data.documentId,
          422,
          "Attach a scanned company PDF before approving a public document.",
        );
      if (data.videoUrl)
        demand(
          data.mediaRights === true &&
            typeof data.permissionEvidence === "string" &&
            data.permissionEvidence.length >= 10,
          422,
          "Record video publication rights and permission evidence before approval.",
        );
      const assetPath = data.image || data.heroImage;
      if (assetPath) {
        demand(
          data.mediaRights === true &&
            typeof data.permissionEvidence === "string" &&
            data.permissionEvidence.length >= 10,
          422,
          "Record publication rights and permission evidence for the selected media before approval.",
        );
        if (item.type === "service")
          demand(
            data.imageAltLocalized?.en && data.imageAltLocalized?.sw,
            422,
            "Add approved English and Kiswahili alternative text for the service image.",
          );
        if (item.type === "homepage")
          demand(
            data.heroAlt?.en && data.heroAlt?.sw,
            422,
            "Add approved English and Kiswahili alternative text for the hero image.",
          );
        if (assetPath.startsWith("/assets/"))
          demand(
            existsSync(
              resolve(
                /* turbopackIgnore: true */ process.cwd(),
                "public",
                assetPath.slice(1),
              ),
            ),
            422,
            "The selected static media asset does not exist.",
          );
        else
          demand(
            data.documentId === assetPath.split("/").pop(),
            422,
            "The uploaded image reference must match its scanned company asset.",
          );
      }
      if (data.documentId) {
        const doc = db
          .prepare(
            "SELECT scan_state,inquiry_id,mime,department FROM private_documents WHERE id=?",
          )
          .get(data.documentId) as
          | {
              scan_state: string;
              inquiry_id: string | null;
              mime: string;
              department: string;
            }
          | undefined;
        demand(
          doc?.scan_state === "clean" &&
            doc.inquiry_id === null &&
            (!doc.department || doc.department === item.department) &&
            (item.type === "document"
              ? doc.mime === "application/pdf"
              : doc.mime.startsWith("image/")),
          422,
          "Publication requires a clean scanned company-owned document or image. Customer documents cannot become public CMS assets.",
        );
      }
      if (item.type === "article")
        demand(
          data.author &&
            data.date &&
            data.body &&
            data.date <= new Date().toISOString().slice(0, 10),
          422,
          "An article needs an actual publication date, author and reviewed body.",
        );
      if (data.image && item.type !== "service" && item.type !== "homepage")
        demand(
          data.imageAlt,
          422,
          "Add descriptive English and Kiswahili alternative text for the image.",
        );
      if (input.expireAt)
        demand(
          input.expireAt > (input.publishAt || new Date().toISOString()),
          422,
          "Expiration must be after publication.",
        );
      if (input.publishAt)
        demand(
          input.publishAt > new Date().toISOString(),
          422,
          "Schedule publication in the future, or leave it blank to publish manually.",
        );
      db.prepare(
        "UPDATE content_revisions SET state='approved',approved_by=?,approved_at=?,publish_at=?,expire_at=? WHERE id=?",
      ).run(
        user.id,
        new Date().toISOString(),
        input.publishAt || null,
        input.expireAt || null,
        revision.id,
      );
    }
    if (input.action === "publish") {
      demand(
        revision.state === "approved",
        409,
        "Only an approved revision can be published.",
      );
      demand(
        !revision.publish_at || revision.publish_at <= new Date().toISOString(),
        409,
        "This revision is scheduled for a later time.",
      );
      demand(
        !revision.expire_at || revision.expire_at > new Date().toISOString(),
        409,
        "This revision has expired.",
      );
      db.prepare(
        "UPDATE content_revisions SET state='published' WHERE id=?",
      ).run(revision.id);
      db.prepare(
        "UPDATE content_items SET published_revision_id=?,state='published' WHERE id=?",
      ).run(revision.id, item.id);
    }
    if (input.action === "unpublish" || input.action === "archive") {
      db.prepare(
        "UPDATE content_revisions SET publish_at=NULL,state=CASE WHEN state='approved' THEN 'draft' ELSE state END WHERE item_id=? AND state='approved'",
      ).run(item.id);
      db.prepare(
        "UPDATE content_items SET published_revision_id=NULL,state='archived' WHERE id=?",
      ).run(item.id);
    }
    db.prepare("UPDATE content_items SET version=version+1 WHERE id=?").run(
      item.id,
    );
    audit(
      user.id,
      `content.${input.action}`,
      "content",
      item.id,
      { draft: revision.id, published: item.published_revision_id },
      undefined,
      input.reason,
    );
    return { ok: true };
  })();
}
export function contentHistory(user: Principal, id: string) {
  const item = platformDb()
    .prepare("SELECT department FROM content_items WHERE id=?")
    .get(id) as { department: string } | undefined;
  demand(item, 404, "Content not found.");
  authorize(user, "content.edit", item.department || undefined);
  if (!item.department)
    demand(
      user.roles.some((role) =>
        ["administrator", "publisher", "editor", "marketing"].includes(role),
      ),
      403,
      "Corporate draft history requires a corporate editorial role.",
    );
  return (
    platformDb()
      .prepare(
        "SELECT * FROM content_revisions WHERE item_id=? ORDER BY version DESC",
      )
      .all(id) as Revision[]
  ).map((row) => ({ ...row, data: JSON.parse(row.data) }));
}
