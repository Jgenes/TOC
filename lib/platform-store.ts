// Server-only platform persistence. All public projections are explicit allowlists.
import { randomUUID } from "node:crypto";
import { database } from "./database";
import { company, services } from "./content";

let initialized = false;
export function platformDb() {
  const db = database();
  if (initialized) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, roles TEXT NOT NULL, departments TEXT NOT NULL,
      authority TEXT NOT NULL DEFAULT '{}', state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','suspended')),
      verified_at TEXT, totp_secret TEXT, last_totp_step INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS platform_profiles (user_id TEXT PRIMARY KEY REFERENCES platform_users(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS platform_sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES platform_users(id),
      mfa_verified INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON platform_sessions(user_id);
    CREATE TABLE IF NOT EXISTS platform_tokens (
      token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES platform_users(id),
      purpose TEXT NOT NULL, record_id TEXT, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS platform_audit (
      id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL,
      target_id TEXT NOT NULL, before_json TEXT, after_json TEXT, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_platform_audit_time ON platform_audit(created_at DESC);
    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, slug TEXT NOT NULL, department TEXT NOT NULL DEFAULT '',
      draft_revision_id TEXT, published_revision_id TEXT, state TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, UNIQUE(type,slug)
    );
    CREATE TABLE IF NOT EXISTS content_revisions (
      id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES content_items(id), version INTEGER NOT NULL,
      data TEXT NOT NULL, author_id TEXT NOT NULL, source_reference TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'draft', approved_by TEXT, approved_at TEXT,
      publish_at TEXT, expire_at TEXT, created_at TEXT NOT NULL, UNIQUE(item_id,version)
    );
    CREATE TABLE IF NOT EXISTS content_redirects (old_path TEXT PRIMARY KEY, new_path TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiry_work (
      inquiry_id TEXT PRIMARY KEY REFERENCES inquiries(id), customer_id TEXT REFERENCES platform_users(id),
      assigned_to TEXT REFERENCES platform_users(id), department TEXT NOT NULL,
      classification_json TEXT, priority TEXT NOT NULL DEFAULT 'normal', next_action TEXT NOT NULL DEFAULT '', due_at TEXT,
      version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_work_customer ON inquiry_work(customer_id);
    CREATE TABLE IF NOT EXISTS customer_messages (
      id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), author_id TEXT NOT NULL,
      body TEXT NOT NULL, visibility TEXT NOT NULL CHECK(visibility IN ('customer','internal')), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customer_feedback (
      id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), customer_id TEXT NOT NULL REFERENCES platform_users(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), body TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(inquiry_id,customer_id)
    );
    CREATE TABLE IF NOT EXISTS price_books (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL, rules_json TEXT NOT NULL,
      effective_from TEXT NOT NULL, effective_to TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft',
      author_id TEXT NOT NULL, approved_by TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS platform_sequences (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, inquiry_id TEXT NOT NULL REFERENCES inquiries(id),
      current_version INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quotation_versions (
      id TEXT PRIMARY KEY, quotation_id TEXT NOT NULL REFERENCES quotations(id), version INTEGER NOT NULL,
      snapshot TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', author_id TEXT NOT NULL,
      technical_by TEXT, finance_by TEXT, approved_by TEXT, issued_at TEXT,
      accepted_by TEXT REFERENCES platform_users(id), accepted_at TEXT, acceptance_terms TEXT,
      created_at TEXT NOT NULL, UNIQUE(quotation_id,version)
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE,
      quotation_version_id TEXT NOT NULL UNIQUE REFERENCES quotation_versions(id), inquiry_id TEXT NOT NULL REFERENCES inquiries(id),
      status TEXT NOT NULL DEFAULT 'pending', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
      supervisor_id TEXT REFERENCES platform_users(id), team TEXT NOT NULL DEFAULT '',
      conditions_json TEXT NOT NULL DEFAULT '{}', confirmed_by TEXT, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS platform_suppliers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL, category TEXT NOT NULL,
      contact_name TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',
      capability_evidence TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'proposed' CHECK(state IN ('proposed','approved','suspended')),
      author_id TEXT NOT NULL REFERENCES platform_users(id), approved_by TEXT REFERENCES platform_users(id),
      approval_evidence TEXT NOT NULL DEFAULT '',approved_until TEXT,version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_department ON platform_suppliers(department,state);
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL, category TEXT NOT NULL,
      ownership TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0), state TEXT NOT NULL DEFAULT 'available',
      maintenance_due TEXT, published INTEGER NOT NULL DEFAULT 0, location TEXT NOT NULL DEFAULT '',condition_note TEXT NOT NULL DEFAULT '',publication_evidence TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resource_allocations (
      booking_id TEXT NOT NULL REFERENCES bookings(id), resource_id TEXT NOT NULL REFERENCES resources(id),
      quantity INTEGER NOT NULL CHECK(quantity>0), PRIMARY KEY(booking_id,resource_id)
    );
    CREATE TABLE IF NOT EXISTS service_visits (
      id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES bookings(id), starts_at TEXT NOT NULL,
      supervisor_id TEXT REFERENCES platform_users(id), team TEXT NOT NULL DEFAULT '',
      checklist TEXT NOT NULL DEFAULT '[]', issues TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'scheduled',
      reviewed_by TEXT, completed_at TEXT, version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS delivery_projects (
      id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id), inquiry_id TEXT NOT NULL REFERENCES inquiries(id),
      title TEXT NOT NULL, department TEXT NOT NULL, milestones TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_documents (
      id TEXT PRIMARY KEY, inquiry_id TEXT REFERENCES inquiries(id), owner_id TEXT NOT NULL REFERENCES platform_users(id),
      storage_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, department TEXT NOT NULL DEFAULT '',
      sha256 TEXT NOT NULL, scan_state TEXT NOT NULL DEFAULT 'quarantined', visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility IN ('customer','internal')), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notification_outbox (
      id TEXT PRIMARY KEY, dedup_key TEXT NOT NULL UNIQUE, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0,
      last_error TEXT, created_at TEXT NOT NULL, sent_at TEXT
    );
    CREATE TABLE IF NOT EXISTS inquiry_submission_keys (key_hash TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), result_json TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS delivery_attempts (
      id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), channel TEXT NOT NULL,
      outcome TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inquiry_drafts (user_id TEXT PRIMARY KEY REFERENCES platform_users(id),data TEXT NOT NULL,step INTEGER NOT NULL,version INTEGER NOT NULL,updated_at TEXT NOT NULL,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS platform_configuration (id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS job_runs (id TEXT PRIMARY KEY,started_at TEXT NOT NULL,finished_at TEXT,state TEXT NOT NULL,summary TEXT);
    CREATE TABLE IF NOT EXISTS ai_usage (id TEXT PRIMARY KEY,module TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL,outcome TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(created_at);
    CREATE TABLE IF NOT EXISTS privacy_requests (id TEXT PRIMARY KEY,reference TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL REFERENCES platform_users(id),category TEXT NOT NULL,details TEXT NOT NULL,state TEXT NOT NULL,resolution TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_privacy_user ON privacy_requests(user_id);
    CREATE TABLE IF NOT EXISTS privacy_events (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  // Additive, idempotent migration for pre-expansion databases; never discards inquiry records.
  const documentColumns = db.pragma("table_info(private_documents)") as {
    name: string;
  }[];
  if (!documentColumns.some((column) => column.name === "department"))
    db.exec(
      "ALTER TABLE private_documents ADD COLUMN department TEXT NOT NULL DEFAULT ''",
    );
  const workColumns = db.pragma("table_info(inquiry_work)") as {
    name: string;
  }[];
  if (!workColumns.some((column) => column.name === "classification_json"))
    db.exec("ALTER TABLE inquiry_work ADD COLUMN classification_json TEXT");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_quotes_inquiry ON quotations(inquiry_id); CREATE INDEX IF NOT EXISTS idx_bookings_interval ON bookings(status,starts_at,ends_at); CREATE INDEX IF NOT EXISTS idx_visits_booking ON service_visits(booking_id); CREATE INDEX IF NOT EXISTS idx_documents_inquiry ON private_documents(inquiry_id); CREATE INDEX IF NOT EXISTS idx_outbox_due ON notification_outbox(state,next_attempt_at); CREATE INDEX IF NOT EXISTS idx_work_due ON inquiry_work(due_at); CREATE INDEX IF NOT EXISTS idx_job_time ON job_runs(started_at);",
  );
  if (!documentColumns.some((column) => column.name === "visibility")) {
    db.exec(
      "ALTER TABLE private_documents ADD COLUMN visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility IN ('customer','internal'))",
    );
    db.exec(
      "UPDATE private_documents SET visibility='customer' WHERE inquiry_id IS NOT NULL AND owner_id=(SELECT customer_id FROM inquiry_work WHERE inquiry_id=private_documents.inquiry_id)",
    );
  }
  const resourceColumns = db.pragma("table_info(resources)") as {
    name: string;
  }[];
  for (const [name, definition] of [
    ["location", "TEXT NOT NULL DEFAULT ''"],
    ["condition_note", "TEXT NOT NULL DEFAULT ''"],
    ["publication_evidence", "TEXT NOT NULL DEFAULT ''"],
    ["version", "INTEGER NOT NULL DEFAULT 1"],
  ])
    if (!resourceColumns.some((column) => column.name === name))
      db.exec(`ALTER TABLE resources ADD COLUMN ${name} ${definition}`);
  for (const [name, definition] of [
    ["qualification", "TEXT NOT NULL DEFAULT 'unreviewed'"],
    ["qualified_at", "TEXT"],
    ["assessment_json", "TEXT"],
    ["outcome", "TEXT NOT NULL DEFAULT 'open'"],
    ["outcome_at", "TEXT"],
  ])
    if (!workColumns.some((column) => column.name === name))
      db.exec(`ALTER TABLE inquiry_work ADD COLUMN ${name} ${definition}`);
  if (!resourceColumns.some((column) => column.name === "supplier_id"))
    db.exec(
      "ALTER TABLE resources ADD COLUMN supplier_id TEXT REFERENCES platform_suppliers(id)",
    );
  const outboxColumns = db.pragma("table_info(notification_outbox)") as {
    name: string;
  }[];
  if (!outboxColumns.some((column) => column.name === "reply_to"))
    db.exec("ALTER TABLE notification_outbox ADD COLUMN reply_to TEXT");
  db.pragma("user_version = 7");
  initialized = true;
  const now = new Date().toISOString();
  const seed = (type: string, slug: string, data: unknown, department = "") => {
    if (
      db
        .prepare("SELECT 1 FROM content_items WHERE type=? AND slug=?")
        .get(type, slug)
    )
      return;
    const id = randomUUID(),
      revision = randomUUID();
    db.prepare(
      "INSERT INTO content_items(id,type,slug,department,draft_revision_id,published_revision_id,state,created_at) VALUES(?,?,?,?,?,?,'published',?)",
    ).run(id, type, slug, department, revision, revision, now);
    db.prepare(
      "INSERT INTO content_revisions(id,item_id,version,data,author_id,source_reference,state,approved_by,approved_at,created_at) VALUES(?,?,1,?,'system','User-supplied blueprint; five divisions requested 2026-11-17','published','system',?,?)",
    ).run(revision, id, JSON.stringify(data), now, now);
  };
  db.transaction(() => {
    for (const service of services)
      seed("service", service.slug, service, service.slug);
    seed("company", "corporate", company);
    const nav = (href: string, en: string, sw: string) => ({
      href,
      label: { en, sw },
    });
    seed("navigation", "primary", {
      title: { en: "Website navigation", sw: "Urambazaji wa tovuti" },
      items: [
        nav("/", "Home", "Mwanzo"),
        nav("/about", "About TOC", "Kuhusu TOC"),
        nav("/services", "Our services", "Huduma zetu"),
        nav("/projects", "Projects", "Miradi"),
        nav("/clients", "Clients", "Wateja"),
        nav("/news", "News", "Habari"),
        nav("/contact", "Contact", "Mawasiliano"),
      ],
      footerItems: [
        nav("/about", "Our story & approach", "Hadithi na mbinu zetu"),
        nav("/about/leadership", "Leadership", "Uongozi"),
        nav("/gallery", "Visual inspiration", "Msukumo wa picha"),
        nav("/projects", "Projects & portfolio", "Miradi"),
        nav("/clients", "Clients & partners", "Wateja na washirika"),
        nav("/news", "News & insights", "Habari na maarifa"),
        nav("/careers", "Careers & opportunities", "Ajira na fursa"),
        nav("/opportunities", "Supplier opportunities", "Fursa za wasambazaji"),
        nav("/downloads", "Company documents", "Nyaraka za kampuni"),
        nav("/portal", "Customer portal", "Mlango wa mteja"),
      ],
    });
    seed("homepage", "home", {
      title: {
        en: "Exceptional experiences. Professional solutions.",
        sw: "Matukio bora. Suluhisho za kitaalamu.",
      },
      summary: {
        en: "Events, catering, cleaning, ICT and production. Five connected services, one considered touch.",
        sw: "Hafla, upishi, usafi, TEHAMA na uzalishaji. Huduma tano zilizounganishwa kwa umakini.",
      },
      sections: [
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
      ],
      heroImage: "/assets/hero.webp",
      heroAlt: {
        en: "Illustrative elegantly prepared gala ballroom",
        sw: "Picha ya mfano ya ukumbi wa sherehe ulioandaliwa",
      },
      heroPosition: "center",
      primaryCta: {
        label: { en: "Explore our services", sw: "Fahamu huduma zetu" },
        href: "/services",
      },
      secondaryCta: {
        label: { en: "Let’s plan together", sw: "Tupange pamoja" },
        href: "/request-quotation",
      },
    });
  })();
  return db;
}

export function audit(
  actor: string,
  action: string,
  type: string,
  id: string,
  before?: unknown,
  after?: unknown,
  reason = "",
) {
  platformDb()
    .prepare(
      "INSERT INTO platform_audit(id,actor_id,action,target_type,target_id,before_json,after_json,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
    )
    .run(
      randomUUID(),
      actor,
      action,
      type,
      id,
      before === undefined ? null : JSON.stringify(before),
      after === undefined ? null : JSON.stringify(after),
      reason,
      new Date().toISOString(),
    );
}
export function nextReference(name: "Q" | "B") {
  const db = platformDb();
  const year = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
  }).format(new Date());
  const row = db
    .prepare(
      "INSERT INTO platform_sequences(name,value) VALUES(?,1) ON CONFLICT(name) DO UPDATE SET value=value+1 RETURNING value",
    )
    .get(`${name}-${year}`) as { value: number };
  return `TOC-${name}-${year}-${String(row.value).padStart(6, "0")}`;
}
export class PlatformError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function demand(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new PlatformError(status, message);
}
