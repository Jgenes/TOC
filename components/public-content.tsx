"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowUpRight, FileDown, Search, ShieldCheck } from "lucide-react";
import { L, type Localized } from "@/lib/content";
import {
  Breadcrumb,
  ButtonLink,
  ClosingCTA,
  Eyebrow,
  useSite,
  type PublicRecord,
} from "./site-shell";

type DisplayData = {
  title: Localized;
  summary: Localized;
  body?: Localized;
  image?: string;
  imageAlt?: Localized;
  imagePosition?: string;
  mobileImagePosition?: string;
  caption?: Localized;
  videoUrl?: string;
  service?: string;
  category?: string;
  year?: number;
  location?: string;
  date?: string;
  author?: string;
  attribution?: string;
  documentId?: string;
  cta?: { label: Localized; href: string };
  sections?: {
    kind: "text" | "features" | "cta";
    title: Localized;
    body: Localized;
    items: Localized[];
  }[];
  dietaryTags?: string[];
  allergenInformation?: Localized;
  portionUnit?: string;
  availability?: string;
};
export const listingConfig: Record<
  string,
  {
    title: Localized;
    eyebrow: Localized;
    intro: Localized;
    empty: Localized;
    href: string;
  }
> = {
  project: {
    title: L("Work, with a story.", "Kazi zenye simulizi."),
    eyebrow: L("PROJECTS & PORTFOLIO", "MIRADI NA KAZI ZETU"),
    intro: L(
      "Explore approved case studies, the scope delivered and the details behind the work. Only verified records and permission-cleared media are published here.",
      "Fahamu miradi iliyoidhinishwa, huduma zilizotolewa na maelezo ya kazi. Rekodi zilizothibitishwa na picha zenye ruhusa pekee ndizo huchapishwa hapa.",
    ),
    empty: L(
      "Case studies will appear here after project details and publication permissions have been approved. In the meantime, explore our services or discuss your requirements with the team.",
      "Miradi itaonekana hapa baada ya maelezo na ruhusa kuidhinishwa. Kwa sasa, fahamu huduma zetu au jadili mahitaji yako na timu.",
    ),
    href: "/projects",
  },
  client: {
    title: L("Relationships built on trust.", "Mahusiano ya kuaminiana."),
    eyebrow: L("CLIENTS & PARTNERS", "WATEJA NA WASHIRIKA"),
    intro: L(
      "Approved customer references and service experience. A published reference describes a working relationship, not an endorsement or an exclusive partnership.",
      "Marejeo ya wateja na uzoefu wa huduma vilivyoidhinishwa. Rejeo linaeleza uhusiano wa kazi, si udhamini au ushirika wa kipekee.",
    ),
    empty: L(
      "Client names, logos and testimonials are withheld until verification and publication permissions are recorded. We do not invent endorsements or display institutional crests without approval.",
      "Majina, nembo na maoni ya wateja huchapishwa tu baada ya uthibitisho na ruhusa. Hatutungi ushuhuda au kuonesha nembo za taasisi bila idhini.",
    ),
    href: "/clients",
  },
  article: {
    title: L("Ideas worth sharing.", "Mawazo ya kushiriki."),
    eyebrow: L("NEWS & INSIGHTS", "HABARI NA MAARIFA"),
    intro: L(
      "Company updates, practical guidance and perspectives from our service teams, published after editorial review.",
      "Habari za kampuni, mwongozo na mitazamo ya timu zetu, baada ya mapitio ya uhariri.",
    ),
    empty: L(
      "There are no published articles yet. Approved updates and insights will appear here when available.",
      "Hakuna makala zilizochapishwa bado. Habari na maarifa yaliyoidhinishwa yataonekana hapa yakipatikana.",
    ),
    href: "/news",
  },
  career: {
    title: L("Be part of what comes next.", "Kuwa sehemu ya kinachofuata."),
    eyebrow: L("CAREERS & OPPORTUNITIES", "AJIRA NA FURSA"),
    intro: L(
      "Explore approved roles and internships. Follow the instructions for each opportunity. Recruitment applications and supplier enquiries are handled separately.",
      "Fahamu nafasi za kazi na mafunzo zilizoidhinishwa. Fuata maelekezo ya kila fursa. Maombi ya ajira na ya wasambazaji hushughulikiwa tofauti.",
    ),
    empty: L(
      "There are no published vacancies at the moment. We do not advertise unapproved jobs or ask you to pay an application fee through this website.",
      "Hakuna nafasi za kazi zilizochapishwa kwa sasa. Hatutangazi ajira zisizoidhinishwa wala kukuomba ada ya maombi kupitia tovuti hii.",
    ),
    href: "/careers",
  },
  team: {
    title: L("The people behind the work.", "Watu nyuma ya kazi."),
    eyebrow: L("LEADERSHIP & RESPONSIBILITY", "UONGOZI NA MAJUKUMU"),
    intro: L(
      "Meet approved leadership profiles and the responsibilities that support our service teams.",
      "Fahamu wasifu wa viongozi na majukumu yanayosaidia timu zetu.",
    ),
    empty: L(
      "Management profiles will be published after names, roles, biographies and image permissions are approved. Contact the team for the appropriate departmental contact.",
      "Wasifu wa uongozi utachapishwa baada ya majina, majukumu, historia na ruhusa za picha kuidhinishwa. Wasiliana na timu kupata mhusika wa idara.",
    ),
    href: "/about/leadership",
  },
  document: {
    title: L("The details, in one place.", "Taarifa, mahali pamoja."),
    eyebrow: L("COMPANY DOCUMENTS", "NYARAKA ZA KAMPUNI"),
    intro: L(
      "Download approved company information and current public documents. Private customer quotations and contracts remain in the protected customer portal.",
      "Pakua taarifa za kampuni na nyaraka za umma zilizoidhinishwa. Bei na mikataba binafsi hubaki kwenye mlango wa mteja uliolindwa.",
    ),
    empty: L(
      "A current approved company-profile PDF has not yet been published. Contact TOC to request the latest approved document.",
      "PDF ya sasa ya wasifu wa kampuni haijachapishwa bado. Wasiliana na TOC kuomba nyaraka zilizoidhinishwa.",
    ),
    href: "/downloads",
  },
};
function RecordCard({ item }: { item: PublicRecord }) {
  const { t } = useSite(),
    data = item.data as DisplayData;
  const href =
    item.type === "project"
      ? `/projects/${item.slug}`
      : item.type === "article"
        ? `/news/${item.slug}`
        : data.cta?.href;
  return (
    <article className="published-card">
      {data.image && (
        <img
          src={data.image}
          style={
            {
              "--media-position": data.imagePosition || "center",
              "--media-mobile-position":
                data.mobileImagePosition || data.imagePosition || "center",
            } as CSSProperties
          }
          alt={data.imageAlt ? t(data.imageAlt) : t(data.title)}
          width={600}
          height={400}
          loading="lazy"
        />
      )}
      <div className="published-card-copy">
        <small>{data.category || data.service || data.date || "TOC"}</small>
        <h3>
          {href ? (
            <Link href={href}>
              {t(data.title)}
              <ArrowUpRight size={18} />
            </Link>
          ) : (
            t(data.title)
          )}
        </h3>
        <p>{t(data.summary)}</p>
        {(data.location || data.year) && (
          <small>
            {[data.location, data.year].filter(Boolean).join(" · ")}
          </small>
        )}
        {data.attribution && <p>— {data.attribution}</p>}
        {data.portionUnit && (
          <small>
            {data.portionUnit} · {data.availability || "assessment"}
          </small>
        )}
        {data.dietaryTags?.length ? (
          <p>{data.dietaryTags.join(" · ")}</p>
        ) : null}
        {data.allergenInformation && (
          <p className="scope-note">{t(data.allergenInformation)}</p>
        )}
        {item.type === "document" && data.documentId && (
          <a
            className="text-link"
            href={`/api/platform/public-documents/${data.documentId}`}
          >
            <FileDown size={17} />
            {t(L("Download approved PDF", "Pakua PDF iliyoidhinishwa"))}
          </a>
        )}
        {data.cta && (
          <Link className="text-link" href={data.cta.href}>
            {t(data.cta.label)}
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
    </article>
  );
}
export function ContentListing({
  type,
  items: supplied,
}: {
  type: string;
  items?: PublicRecord[];
}) {
  const { t, content } = useSite(),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [year, setYear] = useState("all");
  const config = listingConfig[type];
  const all =
    supplied ||
    content.filter(
      (item) =>
        item.type === type &&
        (type !== "career" || item.data.category !== "supplier"),
    );
  const categories = [
    ...new Set(
      all
        .map((item) => String(item.data.service || item.data.category || ""))
        .filter(Boolean),
    ),
  ];
  const years = [
    ...new Set(all.map((item) => String(item.data.year || "")).filter(Boolean)),
  ]
    .sort()
    .reverse();
  const filtered = useMemo(
    () =>
      all.filter((item) => {
        const data = item.data as DisplayData;
        return (
          (category === "all" ||
            category === (data.service || data.category)) &&
          (year === "all" || year === String(data.year)) &&
          `${t(data.title)} ${t(data.summary)} ${data.location || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      }),
    [all, category, year, query, t],
  );
  return (
    <>
      <section className="page-intro section-pad">
        <div className="container">
          <Breadcrumb current={t(config.eyebrow)} />
          <div className="page-intro-grid">
            <div>
              <Eyebrow>{t(config.eyebrow)}</Eyebrow>
              <h1>{t(config.title)}</h1>
            </div>
            <p>{t(config.intro)}</p>
          </div>
        </div>
      </section>
      <section className="section-pad published-list">
        <div className="container">
          {all.length > 0 && (
            <div className="content-filters">
              <label>
                <Search size={18} />
                <span className="sr-only">
                  {t(
                    L(
                      "Search published records",
                      "Tafuta rekodi zilizochapishwa",
                    ),
                  )}
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t(
                    L("Search by title or location", "Tafuta kwa jina au eneo"),
                  )}
                />
              </label>
              {categories.length > 0 && (
                <label>
                  {t(L("Category", "Aina"))}
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="all">
                      {t(L("All categories", "Aina zote"))}
                    </option>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll("-", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {years.length > 0 && (
                <label>
                  {t(L("Year", "Mwaka"))}
                  <select
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                  >
                    <option value="all">
                      {t(L("All years", "Miaka yote"))}
                    </option>
                    {years.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {filtered.length ? (
            <div className="published-grid">
              {filtered.map((item) => (
                <RecordCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="content-empty">
              <ShieldCheck size={30} strokeWidth={1.4} />
              <h2>
                {t(
                  all.length
                    ? L("No matching records.", "Hakuna rekodi zinazolingana.")
                    : L("Published with care.", "Kuchapisha kwa umakini."),
                )}
              </h2>
              <p>
                {t(
                  all.length
                    ? L(
                        "Try another search or category.",
                        "Jaribu utafutaji au aina nyingine.",
                      )
                    : config.empty,
                )}
              </p>
              <ButtonLink
                href={type === "career" ? "/opportunities" : "/contact"}
                variant="outline"
              >
                {t(
                  type === "career"
                    ? L("Supplier opportunities", "Fursa za wasambazaji")
                    : L("Talk to TOC", "Zungumza na TOC"),
                )}
              </ButtonLink>
            </div>
          )}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
export function ContentDetail({ item }: { item: PublicRecord }) {
  const { t } = useSite(),
    data = item.data as DisplayData;
  return (
    <>
      <article className="section-pad editorial-detail">
        <div className="container narrow">
          <Breadcrumb current={t(data.title)} />
          <Eyebrow>{data.category || data.service || "TOC"}</Eyebrow>
          <h1>{t(data.title)}</h1>
          <p className="large-copy">{t(data.summary)}</p>
          <p className="editorial-meta">
            {[data.author, data.date, data.location, data.year]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {data.image && (
            <img
              src={data.image}
              style={
                {
                  "--media-position": data.imagePosition || "center",
                  "--media-mobile-position":
                    data.mobileImagePosition || data.imagePosition || "center",
                } as CSSProperties
              }
              alt={data.imageAlt ? t(data.imageAlt) : t(data.title)}
              width={1000}
              height={650}
            />
          )}
          {data.caption && <p className="editorial-meta">{t(data.caption)}</p>}
          {data.videoUrl && (
            <p>
              <a
                className="text-link"
                href={data.videoUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {t(
                  L(
                    "Watch approved video · external provider",
                    "Tazama video iliyoidhinishwa · mtoa huduma wa nje",
                  ),
                )}{" "}
                ↗
              </a>
            </p>
          )}
          <ShareRecord title={t(data.title)} />
          <div className="editorial-body">
            {data.body &&
              t(data.body)
                .split(/\n\n+/)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          {data.sections?.map((section, index) => (
            <section
              className={`editorial-section editorial-${section.kind}`}
              key={index}
            >
              <h2>{t(section.title)}</h2>
              <p>{t(section.body)}</p>
              {section.items.length > 0 && (
                <ul>
                  {section.items.map((item, i) => (
                    <li key={i}>{t(item)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {data.cta && (
            <ButtonLink href={data.cta.href}>{t(data.cta.label)}</ButtonLink>
          )}
          <Link
            className="text-link"
            href={
              item.type === "project"
                ? "/projects"
                : item.type === "article"
                  ? "/news"
                  : "/"
            }
          >
            {t(L("Back to all records", "Rudi kwenye rekodi zote"))}
          </Link>
        </div>
      </article>
      <ClosingCTA />
    </>
  );
}
export function PublishedSection({ type }: { type: string }) {
  const { t, content } = useSite(),
    items = content.filter((item) => item.type === type).slice(0, 3);
  if (!items.length) return null;
  const config = listingConfig[type] || {
    eyebrow: L("CUSTOMER FEEDBACK", "MAONI YA WATEJA"),
    title: L("In their words.", "Kwa maneno yao."),
    href: "/clients",
  };
  return (
    <section className="section-pad">
      <div className="container">
        <div className="section-top">
          <div>
            <Eyebrow>{t(config.eyebrow)}</Eyebrow>
            <h2>{t(config.title)}</h2>
          </div>
          <Link className="text-link" href={config.href}>
            {t(L("Explore more", "Fahamu zaidi"))}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="published-grid">
          {items.map((item) => (
            <RecordCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
export function ServiceCatalogue({ slug }: { slug: string }) {
  const { t, content } = useSite(),
    items = content.filter(
      (item) =>
        ["package", "menu"].includes(item.type) && item.data.service === slug,
    );
  if (!items.length) return null;
  return (
    <section className="section-pad">
      <div className="container">
        <Eyebrow>{t(L("EXPLORE THE OPTIONS", "FAHAMU CHAGUZI"))}</Eyebrow>
        <h2>
          {t(L("Packages & catalogue.", "Vifurushi na orodha ya huduma."))}
        </h2>
        <div className="published-grid">
          {items.map((item) => (
            <RecordCard key={item.id} item={item} />
          ))}
        </div>
        <p className="scope-note">
          {t(
            L(
              "Catalogue options do not guarantee stock, dietary safety, availability or a price. The team must review the full scope and issue a formal quotation.",
              "Chaguzi hazihakikishi bidhaa, usalama wa chakula, upatikanaji au bei. Timu lazima ipitie mahitaji na kutoa bei rasmi.",
            ),
          )}
        </p>
      </div>
    </section>
  );
}
export function SupplierPage() {
  const { t, content, profile } = useSite(),
    items = content.filter(
      (item) => item.type === "career" && item.data.category === "supplier",
    );
  return (
    <>
      <section className="page-intro section-pad">
        <div className="container">
          <Breadcrumb
            current={t(L("Supplier opportunities", "Fursa za wasambazaji"))}
          />
          <Eyebrow>{t(L("WORKING WITH TOC", "FANYA KAZI NA TOC"))}</Eyebrow>
          <h1>{t(L("Supply, with purpose.", "Ugavi wenye kusudi."))}</h1>
          <p>
            {t(
              L(
                "Supplier and procurement notices are separate from employment applications. Only approved opportunities are advertised.",
                "Matangazo ya ugavi na manunuzi ni tofauti na maombi ya ajira. Fursa zilizoidhinishwa pekee hutangazwa.",
              ),
            )}
          </p>
          {items.length ? (
            <div className="published-grid">
              {items.map((item) => (
                <RecordCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="scope-note">
              {t(
                L(
                  "There are no published supplier notices at present. Contact the company to discuss the appropriate procurement process. Do not send bank details or sensitive documents through a general enquiry.",
                  "Hakuna matangazo ya wasambazaji kwa sasa. Wasiliana na kampuni kuhusu mchakato wa manunuzi. Usitume taarifa za benki au nyaraka za siri kupitia ombi la jumla.",
                ),
              )}
            </p>
          )}
          <a
            className="button button-primary"
            href={`mailto:${profile.email}?subject=Supplier%20enquiry`}
          >
            {t(L("Supplier enquiry by email", "Ombi la ugavi kwa barua pepe"))}
            <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}

function ShareRecord({ title }: { title: string }) {
  const { t } = useSite(),
    [copied, setCopied] = useState(false);
  return (
    <div className="record-sharing">
      <button
        className="platform-small-button"
        type="button"
        onClick={async () => {
          try {
            if (navigator.share)
              await navigator.share({ title, url: location.href });
            else {
              await navigator.clipboard.writeText(location.href);
              setCopied(true);
            }
          } catch {
            /* A cancelled native share is not a website error. */
          }
        }}
      >
        {t(
          copied
            ? L("Link copied", "Kiungo kimenakiliwa")
            : L("Share this page", "Shiriki ukurasa huu"),
        )}
      </button>
    </div>
  );
}

export function EquipmentCatalogue({ service }: { service: string }) {
  const { t } = useSite(),
    [items, setItems] = useState<
      | {
          id: string;
          name: string;
          department: string;
          category: string;
          ownership: string;
        }[]
      | null
    >(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/platform/equipment", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((result) => {
        if (active)
          setItems(
            (result.items || []).filter(
              (item: { department: string }) => item.department === service,
            ),
          );
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [service]);
  return (
    <section className="section-pad equipment-catalogue">
      <div className="container">
        <Eyebrow>{t(L("RESOURCE CATALOGUE", "ORODHA YA RASILIMALI"))}</Eyebrow>
        <h2>{t(L("The technical details.", "Maelezo ya kiufundi."))}</h2>
        <p className="scope-note">
          {t(
            L(
              "Only approved resource descriptions are listed. A catalogue entry is not proof of ownership or date-specific availability. The team must verify reservations, maintenance, supplier arrangements, safe power, rigging and competent crew before confirming delivery.",
              "Maelezo ya rasilimali yaliyoidhinishwa pekee yanaorodheshwa. Orodha si uthibitisho wa umiliki au upatikanaji wa tarehe fulani. Timu lazima ihakiki uhifadhi, matengenezo, wasambazaji, umeme salama, ufungaji na wahudumu wenye uwezo kabla ya kuthibitisha huduma.",
            ),
          )}
        </p>
        {failed ? (
          <p>
            {t(
              L(
                "The register is temporarily unavailable. Contact the team to discuss technical requirements.",
                "Rejesta haipatikani kwa sasa. Wasiliana na timu kujadili mahitaji ya kiufundi.",
              ),
            )}
          </p>
        ) : items === null ? (
          <p role="status">
            {t(
              L(
                "Checking approved catalogue…",
                "Tunahakiki orodha iliyoidhinishwa…",
              ),
            )}
          </p>
        ) : items.length ? (
          <div className="capability-grid">
            {items.map((item) => (
              <article key={item.id}>
                <small>
                  {item.category} ·{" "}
                  {t(
                    item.ownership === "owned"
                      ? L("Owned", "Mali ya kampuni")
                      : item.ownership === "hired"
                        ? L("Hired", "Ya kukodi")
                        : L("Partner supplied", "Ya mshirika"),
                  )}
                </small>
                <h3>{item.name}</h3>
                <ButtonLink
                  href={`/request-quotation?service=${service}`}
                  variant="outline"
                >
                  {t(L("Discuss requirements", "Jadili mahitaji"))}
                </ButtonLink>
              </article>
            ))}
          </div>
        ) : (
          <p>
            {t(
              L(
                "No permission-cleared equipment records have been published yet. We do not substitute example inventory or make availability promises. Send your requirements for staff assessment.",
                "Hakuna rekodi za vifaa zenye ruhusa zilizochapishwa bado. Hatuweki vifaa vya mfano au kuahidi upatikanaji. Tuma mahitaji yako kwa tathmini ya timu.",
              ),
            )}
          </p>
        )}
      </div>
    </section>
  );
}
