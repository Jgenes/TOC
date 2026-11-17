"use client";

import Link from "next/link";
import { EquipmentCatalogue } from "./public-content";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  company,
  galleryImages,
  isPreview,
  L,
  processSteps,
  services,
  values,
  type Localized,
  type Service,
} from "@/lib/content";
import {
  Breadcrumb,
  ButtonLink,
  ClosingCTA,
  Eyebrow,
  serviceIcons,
  useSite,
} from "./site-shell";
import { PublishedSection, ServiceCatalogue } from "./public-content";
import { ContactForm } from "./request-form";

function PhotoNote({ className = "" }: { className?: string }) {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <span className={`photo-note ${className}`}>
      {t(L("Illustrative photography", "Picha ya mfano"))}
    </span>
  );
}

export function ServiceCards() {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <div className="service-grid">
      {services.map((service) => {
        const Icon = serviceIcons[service.icon];
        return (
          <article className="service-card" key={service.slug}>
            <Link
              href={`/services/${service.slug}`}
              className="service-card-image"
              tabIndex={-1}
              aria-hidden="true"
            >
              <img
                src={service.image}
                alt=""
                width="600"
                height="400"
                loading="lazy"
              />
              <span className="service-number">{service.number}</span>
              <span className="service-image-icon">
                <Icon size={23} strokeWidth={1.5} />
              </span>
            </Link>
            <div className="service-card-copy">
              <h3>
                <Link href={`/services/${service.slug}`}>
                  {t(service.title)}
                  <ArrowUpRight size={22} strokeWidth={1.7} />
                </Link>
              </h3>
              <p>{t(service.description)}</p>
              <div className="service-tags">
                {service.tags.slice(0, 2).map((tag) => (
                  <span key={tag.en}>{t(tag)}</span>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function Process({ light = false }: { light?: boolean }) {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <section
      className={`process-section section-pad${light ? " process-light" : ""}`}
    >
      <div className="container">
        <div className="section-top">
          <div>
            <Eyebrow light={!light}>
              {t(
                L(
                  "FROM YOUR IDEA TO THE OCCASION",
                  "KUTOKA WAZO LAKO HADI TUKIO",
                ),
              )}
            </Eyebrow>
            <h2>
              {t(
                L(
                  "Good things start\nwith a simple conversation.",
                  "Mambo mazuri huanza\nna mazungumzo rahisi.",
                ),
              )}
            </h2>
          </div>
          <p>
            {t(
              L(
                "A clear plan. A coordinated team.\nA little less to worry about.",
                "Mpango wazi. Timu iliyoratibiwa.\nWasiwasi mchache zaidi.",
              ),
            )}
          </p>
        </div>
        <div className="process-grid">
          {processSteps.map((step, i) => (
            <article key={step.title.en}>
              <div className="process-step-number">
                <span>0{i + 1}</span>
                {i < 3 && <ArrowRight size={19} />}
              </div>
              <h3>{t(step.title)}</h3>
              <p>{t(step.text)}</p>
            </article>
          ))}
        </div>
        <Link href="/request-quotation" className="process-link">
          {t(L("Let’s start with your idea", "Tuanze na wazo lako"))}
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}

export function FAQ({
  items,
  title,
}: {
  items: { question: Localized; answer: Localized }[];
  title?: Localized;
}) {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <section className="faq-section section-pad">
      <div className="container faq-layout">
        <div>
          <Eyebrow>{t(L("A LITTLE CLARITY", "UFAFANUZI KIDOGO"))}</Eyebrow>
          <h2>
            {t(
              title ||
                L(
                  "Good questions.\nThoughtful answers.",
                  "Maswali mazuri.\nMajibu makini.",
                ),
            )}
          </h2>
          <p>
            {t(
              L(
                "Something else on your mind?\nWe’re happy to talk.",
                "Una swali lingine?\nTuko tayari kuzungumza.",
              ),
            )}
          </p>
          <Link href="/contact" className="text-link">
            {t(L("Talk to the team", "Zungumza na timu"))}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="faq-list">
          {items.map((item, i) => (
            <details key={i}>
              <summary>
                <span>{t(item.question)}</span>
                <Plus size={20} />
              </summary>
              <p>{t(item.answer)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { t, catalog: services, profile: company, content } = useSite();
  const promises = [
    {
      icon: CalendarDays,
      title: L("Thoughtfully planned", "Mipango makini"),
      sub: L("Your vision, carefully considered", "Maono yako, kwa umakini"),
    },
    {
      icon: ShieldCheck,
      title: L("Quality at every touchpoint", "Ubora katika kila hatua"),
      sub: L("Care in the details that matter", "Umakini katika mambo muhimu"),
    },
    {
      icon: HeartHandshake,
      title: L("One coordinated approach", "Uratibu wa pamoja"),
      sub: L("Services that work together", "Huduma zinazofanya kazi pamoja"),
    },
    {
      icon: Sparkles,
      title: L("A personal touch", "Mguso wa kipekee"),
      sub: L("An occasion that feels like you", "Tukio linaloakisi wewe"),
    },
  ];
  const homeRecord = content.find(
    (item) => item.type === "homepage" && item.slug === "home",
  );
  const home = (homeRecord?.data as {
    title: Localized;
    summary: Localized;
    heroImage: string;
    heroAlt?: Localized;
    heroPosition?: string;
    heroMobilePosition?: string;
    caption?: Localized;
    primaryCta?: { label: Localized; href: string };
    secondaryCta?: { label: Localized; href: string };
    sections: string[];
  }) || {
    title: L(
      "Exceptional experiences. Professional solutions.",
      "Matukio bora. Suluhisho za kitaalamu.",
    ),
    summary: L(
      "Events, catering, cleaning, ICT and production. Five connected services, one considered touch.",
      "Hafla, upishi, usafi, TEHAMA na uzalishaji. Huduma tano zilizounganishwa kwa umakini.",
    ),
    heroImage: "/assets/hero.webp",
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
  };
  const blocks: Record<string, ReactNode> = {
    services: (
      <section className="services-section section-pad" id="services">
        <div className="container">
          <div className="section-top">
            <div>
              <Eyebrow>{t(L("OUR EXPERTISE", "UTAALAMU WETU"))}</Eyebrow>
              <h2>
                {t(
                  L(
                    "Different services.\nOne touch of class.",
                    "Huduma tofauti.\nMguso mmoja wa ubora.",
                  ),
                )}
              </h2>
            </div>
            <div className="section-top-side">
              <p>
                {t(
                  L(
                    "From the first welcome to the final farewell,\nwe bring the details together.",
                    "Kuanzia ukaribisho wa kwanza hadi kuaga,\ntunaunganisha kila hatua.",
                  ),
                )}
              </p>
              <Link href="/services" className="text-link">
                {t(L("Find your service", "Tafuta huduma yako"))}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <ServiceCards />
          <div className="section-footnote">
            <span className="tiny-red-line" />
            {t(
              L(
                "For institutions, businesses and private occasions. Planned around your requirements.",
                "Kwa taasisi, biashara na sherehe binafsi. Kulingana na mahitaji yako.",
              ),
            )}
          </div>
        </div>
      </section>
    ),
    about: (
      <section className="about-preview section-pad">
        <div className="container about-preview-grid">
          <div className="about-visual">
            <img
              src="/assets/about-catering.webp"
              alt="Illustrative hospitality team arranging a catered buffet"
              width="668"
              height="581"
              loading="lazy"
            />
            <div className="about-signature">
              <Sparkles size={22} strokeWidth={1.2} />
              <span>
                A touch
                <br />
                <em>of class.</em>
              </span>
              <small>
                {t(L("IT’S IN THE DETAILS.", "NI KATIKA KILA HATUA."))}
              </small>
            </div>
            <PhotoNote />
          </div>
          <div className="about-copy">
            <Eyebrow>{t(L("HELLO, WE’RE TOC", "HABARI, SISI NI TOC"))}</Eyebrow>
            <h2>
              {t(
                L(
                  "Your occasion deserves\na considered approach.",
                  "Tukio lako linastahili\nmbinu makini.",
                ),
              )}
            </h2>
            <p>
              {t(
                L(
                  "We are TOC Investment Company Limited — Touch of Class. A Tanzanian company connecting event management, catering, cleaning, ICT and production for organizations, institutions and individuals.",
                  "Sisi ni TOC Investment Company Limited — Touch of Class. Kampuni ya Tanzania inayounganisha hafla, upishi, usafi, TEHAMA na uzalishaji kwa mashirika, taasisi na watu binafsi.",
                ),
              )}
            </p>
            <p>
              {t(
                L(
                  "We believe the difference is in how you feel: listened to, looked after, and free to focus on what matters.",
                  "Tunaamini tofauti iko katika unavyojisikia: kusikilizwa, kuhudumiwa na kuwa huru kuzingatia mambo muhimu.",
                ),
              )}
            </p>
            <ul className="check-list">
              {[
                L(
                  "Professional planning. Personal service.",
                  "Mipango ya kitaalamu. Huduma binafsi.",
                ),
                L(
                  "Menus and moments shaped around you.",
                  "Menyu na matukio kulingana na wewe.",
                ),
                L(
                  "Care, quality and integrity at the heart.",
                  "Uangalifu, ubora na uadilifu msingi wetu.",
                ),
              ].map((item) => (
                <li key={item.en}>
                  <span>
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                  {t(item)}
                </li>
              ))}
            </ul>
            <ButtonLink href="/about" variant="outline">
              {t(L("A little more about us", "Fahamu zaidi kutuhusu"))}
            </ButtonLink>
          </div>
        </div>
      </section>
    ),
    benefits: (
      <section className="promise-strip" aria-label="Our approach">
        <div className="container promise-grid">
          {promises.map(({ icon: Icon, title, sub }) => (
            <div key={title.en}>
              <Icon size={29} strokeWidth={1.4} />
              <span>
                <strong>{t(title)}</strong>
                <small>{t(sub)}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
    ),
    gallery: (
      <section className="home-gallery section-pad">
        <div className="container">
          <div className="section-top">
            <div>
              <Eyebrow>{t(L("THE POSSIBILITIES", "UWEZEKANO ULIOPO"))}</Eyebrow>
              <h2>
                {t(
                  L(
                    "Moments worth\ngathering for.",
                    "Matukio yanayostahili\nkukusanyika pamoja.",
                  ),
                )}
              </h2>
            </div>
            <div className="section-top-side">
              <p>
                {t(
                  L(
                    "A little inspiration for what comes next.\nImagine your occasion, your way.",
                    "Msukumo kidogo kwa kinachofuata.\nFikiria tukio lako, kwa namna yako.",
                  ),
                )}
              </p>
              <Link className="text-link" href="/gallery">
                {t(L("Explore the gallery", "Tazama picha"))}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <div className="home-gallery-grid">
            {[
              {
                src: "/assets/event-management.webp",
                title: L(
                  "An unforgettable setting",
                  "Mazingira yasiyosahaulika",
                ),
                cat: L("EVENTS & OCCASIONS", "HAFLA NA SHEREHE"),
              },
              {
                src: "/assets/about-detail.webp",
                title: L("Made with care", "Imeandaliwa kwa umakini"),
                cat: L("FOOD & HOSPITALITY", "CHAKULA NA UKARIMU"),
              },
              {
                src: "/assets/entertainment.webp",
                title: L("Bring it to life", "Leta uhai"),
                cat: L("SOUND & PRODUCTION", "SAUTI NA UZALISHAJI"),
              },
            ].map((image) => (
              <Link
                href="/gallery"
                className="home-gallery-card"
                key={image.src}
              >
                <img
                  src={image.src}
                  alt={`Illustrative ${image.title.en.toLowerCase()}`}
                  width="600"
                  height="500"
                  loading="lazy"
                />
                <div>
                  <small>{t(image.cat)}</small>
                  <h3>{t(image.title)}</h3>
                </div>
                <ArrowUpRight size={22} />
              </Link>
            ))}
          </div>
          <p className="gallery-disclaimer">
            {t(
              L(
                "Visual inspiration only. These images are not presented as completed TOC projects.",
                "Picha za msukumo pekee. Picha hizi si kazi zilizotekelezwa na TOC.",
              ),
            )}
          </p>
        </div>
      </section>
    ),
    process: <Process />,
    projects: <PublishedSection type="project" />,
    clients: <PublishedSection type="client" />,
    testimonials: <PublishedSection type="testimonial" />,
    news: <PublishedSection type="article" />,
    contact: <ClosingCTA />,
  };
  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src={home.heroImage}
          style={
            {
              "--media-position": home.heroPosition || "center",
              "--media-mobile-position":
                home.heroMobilePosition || home.heroPosition || "center",
            } as CSSProperties
          }
          alt={t(
            home.heroAlt ||
              L(
                "Illustrative elegantly prepared gala ballroom with chandeliers, red florals and dining tables",
                "Picha ya mfano ya ukumbi wa sherehe ulioandaliwa kwa taa na maua mekundu",
              ),
          )}
          width="1536"
          height="688"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <Eyebrow light>
              {t(
                L(
                  "TOC INVESTMENT COMPANY LIMITED",
                  "TOC INVESTMENT COMPANY LIMITED",
                ),
              )}
            </Eyebrow>
            <h1>
              {t(home.title)}
              <br />
              <em>{t(L("A touch of class.", "Mguso wa ubora."))}</em>
            </h1>
            <p>{t(home.summary)}</p>
            <div className="hero-buttons">
              <ButtonLink href={home.primaryCta?.href || "/services"}>
                {t(
                  home.primaryCta?.label ||
                    L("Explore our services", "Fahamu huduma zetu"),
                )}
              </ButtonLink>
              <Link
                href={home.secondaryCta?.href || "/request-quotation"}
                className="hero-secondary"
              >
                {t(
                  home.secondaryCta?.label ||
                    L("Let’s plan together", "Tupange pamoja"),
                )}
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <a className="hero-scroll" href="#services">
              <span>
                <ArrowDown size={15} />
              </span>
              {t(L("DISCOVER THE TOC DIFFERENCE", "FAHAMU TOFAUTI YA TOC"))}
            </a>
          </div>
          <div className="hero-location">
            <span className="location-line" />
            {t(
              L(
                "BASED IN DODOMA. CREATED AROUND YOU.",
                "DODOMA. KWA AJILI YAKO.",
              ),
            )}
          </div>
          <div className="hero-image-caption">
            <span>
              {t(
                L(
                  "Good company.\nGreat occasions.",
                  "Ushirika mzuri.\nMatukio bora.",
                ),
              )}
            </span>
            <Link
              href="/gallery"
              aria-label={t(
                L("Explore visual inspiration", "Tazama picha za msukumo"),
              )}
            >
              <ArrowUpRight size={25} />
            </Link>
          </div>
          <PhotoNote className="hero-photo-note" />
        </div>
      </section>
      {home.sections.map((key) => (
        <div key={key} className={`home-block home-block-${key}`}>
          {blocks[key]}
        </div>
      ))}
    </>
  );
}

export function ServicesPage() {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <>
      <section className="page-intro section-pad">
        <div className="container">
          <Breadcrumb current={t(L("Our services", "Huduma zetu"))} />
          <div className="page-intro-grid">
            <div>
              <Eyebrow>{t(L("OUR EXPERTISE", "UTAALAMU WETU"))}</Eyebrow>
              <h1>
                {t(
                  L(
                    "Your vision.\nOur considered touch.",
                    "Maono yako.\nMguso wetu makini.",
                  ),
                )}
              </h1>
            </div>
            <p>
              {t(
                L(
                  "Events, catering, cleaning, ICT and production. Five connected divisions, one thoughtful approach to your requirements.",
                  "Hafla, upishi, usafi, TEHAMA na uzalishaji. Idara tano zilizounganishwa, mbinu moja makini kwa mahitaji yako.",
                ),
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="services-section services-page-grid">
        <div className="container">
          <ServiceCards />
          <div className="bespoke-banner">
            <span className="bespoke-icon">
              <HeartHandshake size={31} strokeWidth={1.5} />
            </span>
            <div>
              <h3>
                {t(
                  L(
                    "A little of everything? Let’s bring it together.",
                    "Unahitaji huduma kadhaa? Tuziunganishe.",
                  ),
                )}
              </h3>
              <p>
                {t(
                  L(
                    "Combine requirements across our five divisions in a single inquiry. We’ll discuss the right scope with you.",
                    "Unganisha mipango ya hafla, upishi na uzalishaji katika ombi moja. Tutajadili huduma zinazokufaa.",
                  ),
                )}
              </p>
            </div>
            <ButtonLink href="/request-quotation" variant="outline">
              {t(L("Let’s talk", "Tuzungumze"))}
            </ButtonLink>
          </div>
        </div>
      </section>
      <Process light />
      <ClosingCTA />
    </>
  );
}

export function ServiceDetailPage({ service }: { service: Service }) {
  const { t, catalog: services, profile: company, content } = useSite();
  const Icon = serviceIcons[service.icon];
  return (
    <>
      <section className="service-hero">
        <img
          src={service.image}
          alt={
            service.imageAltLocalized
              ? t(service.imageAltLocalized)
              : service.imageAlt
          }
          style={
            {
              "--media-position": service.imagePosition || "center",
              "--media-mobile-position":
                service.mobileImagePosition ||
                service.imagePosition ||
                "center",
            } as CSSProperties
          }
          width="1500"
          height="750"
          fetchPriority="high"
        />
        <div className="service-hero-shade" />
        <div className="container">
          <Breadcrumb current={t(service.title)} />
          <div className="service-hero-content">
            <Eyebrow light>{t(service.eyebrow)}</Eyebrow>
            <h1>{t(service.headline)}</h1>
            <p>{t(service.description)}</p>
            <ButtonLink href={`/request-quotation?service=${service.slug}`}>
              {t(
                service.cta ||
                  L("Let’s plan your occasion", "Tupange tukio lako"),
              )}
            </ButtonLink>
          </div>
          <PhotoNote />
        </div>
      </section>
      <section className="service-introduction section-pad">
        <div className="container service-introduction-grid">
          <div>
            <Eyebrow>{t(service.title)}</Eyebrow>
            <h2>
              {t(
                L(
                  "Thoughtful service.\nFrom the very first detail.",
                  "Huduma makini.\nKuanzia hatua ya kwanza.",
                ),
              )}
            </h2>
          </div>
          <div>
            <p className="large-copy">{t(service.intro)}</p>
            <div className="service-detail-tags">
              {service.tags.map((tag) => (
                <span key={tag.en}>
                  <Check size={14} />
                  {t(tag)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="capabilities-section section-pad">
        <div className="container">
          <div className="section-top">
            <div>
              <Eyebrow>
                {t(L("MADE AROUND YOUR NEEDS", "KULINGANA NA MAHITAJI YAKO"))}
              </Eyebrow>
              <h2>{t(L("Where we can help.", "Tunapoweza kusaidia."))}</h2>
            </div>
            <span className="large-service-icon">
              <Icon size={48} strokeWidth={1} />
            </span>
          </div>
          <div className="capability-grid">
            {service.capabilities.map((cap, i) => (
              <article key={cap.title.en}>
                <span className="capability-number">0{i + 1}</span>
                <h3>{t(cap.title)}</h3>
                <p>{t(cap.description)}</p>
              </article>
            ))}
          </div>
          <p className="scope-note">
            {t(
              L(
                "Specific services, menus, suppliers and availability are reviewed by the TOC team and confirmed in your quotation.",
                "Huduma maalumu, menyu, watoa huduma na upatikanaji vinapitiwa na timu ya TOC na kuthibitishwa katika bei yako.",
              ),
            )}
          </p>
        </div>
      </section>
      <ServiceCatalogue slug={service.slug} />
      {service.slug === "entertainment" && (
        <EquipmentCatalogue service={service.slug} />
      )}
      {service.workflow ? (
        <section className="section-pad">
          <div className="container">
            <Eyebrow>{t(L("OUR APPROACH", "MBINU YETU"))}</Eyebrow>
            <h2>
              {t(
                L(
                  "From first conversation to handover.",
                  "Kuanzia mazungumzo hadi makabidhiano.",
                ),
              )}
            </h2>
            <div className="capability-grid">
              {service.workflow.map((item, i) => (
                <article key={item.title.en}>
                  <span className="capability-number">0{i + 1}</span>
                  <h3>{t(item.title)}</h3>
                  <p>{t(item.description)}</p>
                </article>
              ))}
            </div>
            {service.safety && (
              <p className="scope-note">{t(service.safety)}</p>
            )}
          </div>
        </section>
      ) : (
        <Process />
      )}
      <FAQ
        items={[
          ...service.faqs,
          ...content
            .filter(
              (item) =>
                item.type === "faq" && item.data.service === service.slug,
            )
            .map((item) => ({
              question: item.data.title as Localized,
              answer: (item.data.body || item.data.summary) as Localized,
            })),
        ]}
      />
      <section className="related-section section-pad">
        <div className="container">
          <div className="section-top">
            <div>
              <Eyebrow>{t(L("BETTER TOGETHER", "BORA PAMOJA"))}</Eyebrow>
              <h2>{t(L("The finishing touches.", "Miguso ya mwisho."))}</h2>
            </div>
          </div>
          <div className="related-grid">
            {services
              .filter((s) => s.slug !== service.slug)
              .map((s) => (
                <Link href={`/services/${s.slug}`} key={s.slug}>
                  <img
                    src={s.image}
                    alt=""
                    width="240"
                    height="160"
                    loading="lazy"
                  />
                  <span>
                    <small>{t(L("EXPLORE MORE", "FAHAMU ZAIDI"))}</small>
                    <strong>{t(s.title)}</strong>
                  </span>
                  <ArrowUpRight size={24} />
                </Link>
              ))}
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}

export function AboutPage() {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <>
      <section className="about-page-intro section-pad">
        <div className="container">
          <Breadcrumb current={t(L("About TOC", "Kuhusu TOC"))} />
          <div className="page-intro-grid">
            <div>
              <Eyebrow>
                {t(L("THE PEOPLE BEHIND THE OCCASION", "WATU NYUMA YA TUKIO"))}
              </Eyebrow>
              <h1>
                {t(
                  L(
                    "A little care.\nA lasting impression.",
                    "Uangalifu kidogo.\nKumbukumbu ya kudumu.",
                  ),
                )}
              </h1>
            </div>
            <p>
              {t(
                L(
                  "We bring people together through thoughtfully coordinated events, food and hospitality. With professionalism at our core, and a touch of class in the details.",
                  "Tunawaunganisha watu kupitia hafla zilizoratibiwa kwa makini, chakula na ukarimu. Utaalamu ni msingi wetu, na mguso wa ubora katika maelezo.",
                ),
              )}
            </p>
          </div>
          <div className="about-wide-image">
            <img
              src="/assets/hero.webp"
              alt="Illustrative beautifully arranged event dining room"
              width="1536"
              height="688"
              fetchPriority="high"
            />
            <div className="about-wide-caption">
              <span>TOC</span>
              <p>
                {t(
                  L(
                    "Thoughtfully planned.\nBeautifully delivered.",
                    "Mipango makini.\nUtekelezaji mzuri.",
                  ),
                )}
              </p>
            </div>
            <PhotoNote />
          </div>
        </div>
      </section>
      <section className="section-pad about-story">
        <div className="container story-grid">
          <div>
            <Eyebrow>
              {t(L("THIS IS TOUCH OF CLASS", "HII NI TOUCH OF CLASS"))}
            </Eyebrow>
            <h2>
              {t(
                L(
                  "Rooted in Tanzania.\nFocused on you.",
                  "Kutoka Tanzania.\nKwa ajili yako.",
                ),
              )}
            </h2>
          </div>
          <div>
            <p className="large-copy">
              {t(
                L(
                  "TOC Investment Company Limited is a Tanzanian business connecting event management, catering, cleaning, ICT and production services for institutions, organizations and private clients.",
                  "TOC Investment Company Limited ni kampuni ya Tanzania inayounganisha huduma za hafla, upishi, usafi, TEHAMA na uzalishaji kwa taasisi, mashirika na wateja binafsi.",
                ),
              )}
            </p>
            <p>
              {t(
                L(
                  "Based in Kisasa, Dodoma, our approach is simple: understand what matters to you, plan with intention, and coordinate the details with care. From a corporate meeting to a personal milestone, every occasion deserves to feel considered.",
                  "Tukiwa Kisasa, Dodoma, mbinu yetu ni rahisi: kuelewa yaliyo muhimu kwako, kupanga kwa makusudi na kuratibu maelezo kwa uangalifu. Kuanzia mkutano wa kampuni hadi hatua maalumu ya maisha, kila tukio linastahili umakini.",
                ),
              )}
            </p>
            <p>
              {t(
                L(
                  "Our company profiles place quality, hygiene, integrity, professionalism, innovation, accountability and customer service at the heart of the business. Those principles guide the experience we aim to create.",
                  "Wasifu wetu unaweka ubora, usafi, uadilifu, utaalamu, ubunifu, uwajibikaji na huduma kwa wateja kuwa msingi wa biashara. Kanuni hizo zinaongoza uzoefu tunaolenga kuunda.",
                ),
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="values-section section-pad">
        <div className="container">
          <div className="section-top">
            <div>
              <Eyebrow>
                {t(L("WHAT MATTERS TO US", "YALIYO MUHIMU KWETU"))}
              </Eyebrow>
              <h2>
                {t(
                  L(
                    "Not just what we do.\nHow we do it.",
                    "Si tunachofanya tu.\nBali tunavyofanya.",
                  ),
                )}
              </h2>
            </div>
          </div>
          <div className="values-grid">
            {values.map((value, i) => {
              const Icon = [
                ShieldCheck,
                ClipboardCheck,
                HeartHandshake,
                CheckCheck,
              ][i];
              return (
                <article key={value.title.en}>
                  <Icon size={30} strokeWidth={1.4} />
                  <h3>{t(value.title)}</h3>
                  <p>{t(value.text)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <Process />
      <ClosingCTA />
    </>
  );
}

export function GalleryPage() {
  const { t, catalog: services, profile: company, content } = useSite();
  const approvedImages = content
    .filter(
      (item) => item.type === "gallery" && typeof item.data.image === "string",
    )
    .map((item) => ({
      id: item.id,
      src: String(item.data.image),
      category:
        (
          {
            "event-management": "events",
            catering: "catering",
            entertainment: "production",
            "general-cleaning": "cleaning",
            "ict-solutions": "ict",
          } as Record<string, string>
        )[String(item.data.service)] || "events",
      title: item.data.title as Localized,
      subtitle: item.data.summary as Localized,
      illustrative: false,
    }));
  const allImages = [
    ...approvedImages,
    ...galleryImages.map((image) => ({ ...image, illustrative: true })),
  ];
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const filtered =
    category === "all"
      ? allImages
      : allImages.filter((image) => image.category === category);
  useEffect(() => {
    if (active === null) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
    // Only open and close should move focus, not switching between photos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active === null]);
  const move = (dir: number) =>
    setActive((i) =>
      i === null ? null : (i + dir + filtered.length) % filtered.length,
    );
  return (
    <>
      <section className="page-intro section-pad">
        <div className="container">
          <Breadcrumb current={t(L("Gallery", "Picha"))} />
          <div className="page-intro-grid">
            <div>
              <Eyebrow>
                {t(L("A LITTLE INSPIRATION", "MSUKUMO KIDOGO"))}
              </Eyebrow>
              <h1>
                {t(L("Imagine the\npossibilities.", "Fikiria\nuwezekano."))}
              </h1>
            </div>
            <div>
              <p>
                {t(
                  L(
                    "Beautiful settings. Thoughtful food. Memorable atmospheres. A visual starting point for your next occasion.",
                    "Mazingira mazuri. Chakula kilichoandaliwa kwa makini. Hali za kukumbukwa. Mwanzo wa picha kwa tukio lako lijalo.",
                  ),
                )}
              </p>
              <div className="gallery-notice">
                <Sparkles size={17} />
                <span>
                  {t(
                    L(
                      "Images marked illustrative come from the planning blueprint or generated design imagery, not completed TOC projects. Approved company media is separately identified.",
                      "Picha zilizoandikwa za mfano ni za mpango wa tovuti au zilizozalishwa, si kazi za TOC. Picha za kampuni zilizoidhinishwa zinatambulishwa tofauti.",
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="gallery-main">
        <div className="container">
          <div className="gallery-toolbar">
            <div className="filter-tabs" aria-label="Filter gallery">
              {[
                { id: "all", label: L("All inspiration", "Picha zote") },
                { id: "events", label: L("Events", "Hafla") },
                { id: "catering", label: L("Catering", "Upishi") },
                { id: "production", label: L("Production", "Uzalishaji") },
                { id: "cleaning", label: L("Cleaning", "Usafi") },
                { id: "ict", label: L("ICT", "TEHAMA") },
              ].map((filter) => (
                <button
                  key={filter.id}
                  aria-pressed={category === filter.id}
                  onClick={() => {
                    setCategory(filter.id);
                    setActive(null);
                  }}
                >
                  {t(filter.label)}
                  {category === filter.id && (
                    <span>{String(filtered.length).padStart(2, "0")}</span>
                  )}
                </button>
              ))}
            </div>
            <span className="gallery-view-label">
              {t(L("A TOUCH OF INSPIRATION", "MGUSO WA MSUKUMO"))}
            </span>
          </div>
          <div className="gallery-grid">
            {filtered.map((image, i) => (
              <button
                key={image.id}
                className="gallery-item"
                onClick={() => setActive(i)}
                aria-label={`${t(L("Open image:", "Fungua picha:"))} ${t(image.title)}`}
              >
                <div className="gallery-item-image">
                  <img
                    src={image.src}
                    alt={`${image.illustrative ? "Illustrative " : ""}${t(image.title)}`}
                    width="700"
                    height="520"
                    loading="lazy"
                  />
                  <span>
                    <ArrowUpRight size={24} />
                  </span>
                </div>
                <div className="gallery-item-copy">
                  <span>
                    <small>{t(image.subtitle)}</small>
                    <strong>{t(image.title)}</strong>
                  </span>
                  <Plus size={20} />
                </div>
              </button>
            ))}
          </div>
          <p className="gallery-disclaimer">
            {t(
              L(
                "Photography is illustrative. Verified TOC projects and authorized client references can be added after management approval.",
                "Picha ni za mfano. Kazi halisi za TOC na marejeo ya wateja yataongezwa baada ya idhini ya uongozi.",
              ),
            )}
          </p>
        </div>
      </section>
      {active !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t(filtered[active].title)}
          ref={dialogRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActive(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setActive(null);
            if (e.key === "ArrowRight") move(1);
            if (e.key === "ArrowLeft") move(-1);
            if (e.key === "Tab") {
              const buttons =
                dialogRef.current?.querySelectorAll<HTMLButtonElement>(
                  "button",
                );
              if (buttons?.length) {
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }
          }}
        >
          <div className="lightbox-top">
            <span>
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(filtered.length).padStart(2, "0")}
            </span>
            <span>{t(L("VISUAL INSPIRATION", "PICHA ZA MSUKUMO"))}</span>
            <button
              ref={closeRef}
              aria-label="Close image"
              onClick={() => setActive(null)}
            >
              <X size={25} />
            </button>
          </div>
          <button
            className="lightbox-prev"
            aria-label="Previous image"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={28} />
          </button>
          <figure>
            <img
              src={filtered[active].src}
              alt={`${filtered[active].illustrative ? "Illustrative " : ""}${t(filtered[active].title)}`}
            />
            <figcaption>
              <strong>{t(filtered[active].title)}</strong>
              <span>
                {t(
                  L(
                    filtered[active].illustrative
                      ? "Illustrative image · Not a completed TOC project"
                      : "Approved TOC media · Publication permissions recorded",
                    filtered[active].illustrative
                      ? "Picha ya mfano · Si kazi ya TOC"
                      : "Picha ya TOC iliyoidhinishwa · Ruhusa zimerekodiwa",
                  ),
                )}
              </span>
            </figcaption>
          </figure>
          <button
            className="lightbox-next"
            aria-label="Next image"
            onClick={() => move(1)}
          >
            <ChevronRight size={28} />
          </button>
        </div>
      )}
      <ClosingCTA />
    </>
  );
}

export function ContactPage() {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <>
      <section className="page-intro section-pad">
        <div className="container">
          <Breadcrumb current={t(L("Contact", "Mawasiliano"))} />
          <div className="page-intro-grid">
            <div>
              <Eyebrow>
                {t(L("LET’S START A CONVERSATION", "TUANZE MAZUNGUMZO"))}
              </Eyebrow>
              <h1>
                {t(
                  L(
                    "Good things\nstart with hello.",
                    "Mambo mazuri\nhuanza na habari.",
                  ),
                )}
              </h1>
            </div>
            <p>
              {t(
                L(
                  "Have a date in mind? An idea taking shape? Or a few questions before you start? We’d love to hear about it.",
                  "Una tarehe unayofikiria? Wazo linaloanza? Au maswali kabla ya kuanza? Tungependa kusikia kutoka kwako.",
                ),
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="contact-main">
        <div className="container contact-grid">
          <div className="contact-information">
            <h2>{t(L("The human touch.", "Mguso wa kibinadamu."))}</h2>
            <p>
              {t(
                L(
                  "For ideas, questions and the practical details, here’s how to reach the team.",
                  "Kwa mawazo, maswali na maelezo ya msingi, hivi ndivyo utakavyowasiliana na timu.",
                ),
              )}
            </p>
            <a className="contact-method" href={`tel:${company.phoneHref}`}>
              <span>
                <Phone size={23} strokeWidth={1.5} />
              </span>
              <div>
                <small>{t(L("GIVE US A CALL", "TUPIGIE SIMU"))}</small>
                <strong>{company.phone}</strong>
                <span>{company.secondaryPhone}</span>
              </div>
              <ArrowUpRight size={19} />
            </a>
            <a className="contact-method" href={`mailto:${company.email}`}>
              <span>
                <Mail size={23} strokeWidth={1.5} />
              </span>
              <div>
                <small>{t(L("DROP US A NOTE", "TUTUMIE BARUA PEPE"))}</small>
                <strong className="contact-email">{company.email}</strong>
              </div>
              <ArrowUpRight size={19} />
            </a>
            <div className="location-card">
              <MapPin size={27} strokeWidth={1.4} />
              <div>
                <small>
                  {t(L("BASED IN TANZANIA", "TUNAPATIKANA TANZANIA"))}
                </small>
                <h3>
                  Kisasa,
                  <br />
                  Dodoma.
                </h3>
                <p>
                  {t(
                    L(
                      "Please call ahead to confirm office directions and service coverage for your location.",
                      "Tafadhali piga simu kuthibitisha maelekezo ya ofisi na maeneo yanayohudumiwa.",
                    ),
                  )}
                </p>
              </div>
              <span className="location-decoration" aria-hidden="true">
                DODOMA
              </span>
            </div>
            {isPreview && (
              <p className="source-note">
                {t(
                  L(
                    "Contact details are taken from the newer profile in the blueprint and require TOC’s confirmation before launch.",
                    "Mawasiliano yametolewa katika wasifu mpya kwenye mpango na yanahitaji kuthibitishwa na TOC kabla ya uzinduzi.",
                  ),
                )}
              </p>
            )}
          </div>
          <div className="contact-form-card">
            <Eyebrow>{t(L("OVER TO YOU", "ZAMU YAKO"))}</Eyebrow>
            <h2>{t(L("What’s on your mind?", "Unafikiria nini?"))}</h2>
            <p>
              {t(
                L(
                  "For a detailed service request,",
                  "Kwa ombi la huduma lenye maelezo,",
                ),
              )}{" "}
              <Link href="/request-quotation">
                {t(L("use our quotation form", "tumia fomu yetu ya bei"))}
                <ArrowUpRight size={13} />
              </Link>
              .
            </p>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}

const legalCopy = {
  privacy: {
    eyebrow: L("YOUR INFORMATION, WITH CARE", "TAARIFA ZAKO, KWA UANGALIFU"),
    title: L("Privacy & your information", "Faragha na taarifa zako"),
    intro: L(
      "This notice describes the current website preview. A management-approved privacy notice and retention schedule are required before a public launch.",
      "Taarifa hii inaelezea hakikisho la tovuti la sasa. Sera ya faragha na ratiba ya kuhifadhi taarifa zilizoidhinishwa zinahitajika kabla ya uzinduzi.",
    ),
    sections: [
      {
        title: L("What the forms collect", "Taarifa zinazokusanywa na fomu"),
        text: L(
          "The contact and quotation forms collect the information you enter: name, organization where supplied, email, telephone, service requirements, location, preferred date, preferences and message. Do not submit payment-card details, identity documents, medical records or other sensitive information.",
          "Fomu zinakusanya taarifa unazoweka: jina, shirika, barua pepe, simu, mahitaji ya huduma, eneo, tarehe na ujumbe. Usitume taarifa za kadi za malipo, vitambulisho, rekodi za afya au taarifa nyingine nyeti.",
        ),
      },
      {
        title: L("How inquiries are used", "Matumizi ya taarifa za maombi"),
        text: L(
          `Submissions are saved in the application database for staff review. In preview mode, they are not automatically emailed or forwarded to TOC; please use fictional test data. When preview mode is off and SMTP is configured, form details are also emailed to ${company.email} for follow-up. No WhatsApp messages are sent. Only authorized staff with the configured password can access the website staff inbox. The approved retention and deletion policy must cover both database and mailbox copies.`,
          `Maombi yanahifadhiwa katika hifadhidata kwa mapitio ya timu. Katika hali ya hakikisho, hayatumwi moja kwa moja kwa barua pepe au TOC; tumia taarifa za mfano. Hali ya hakikisho ikizimwa na SMTP ikiwekwa, taarifa za fomu pia hutumwa kwa ${company.email} kwa ufuatiliaji. Hakuna ujumbe wa WhatsApp unaotumwa. Wafanyakazi wenye nenosiri lililowekwa pekee wanaweza kuona kikasha cha tovuti. Sera iliyoidhinishwa ya kuhifadhi na kufuta taarifa lazima ihusishe hifadhidata na nakala za barua pepe.`,
        ),
      },
      {
        title: L("Cookies and local storage", "Vidakuzi na uhifadhi wa ndani"),
        text: L(
          "The site remembers your language choice and, if you choose to save it, a quotation draft in this browser. You can clear the saved draft in the form. Staff access uses an essential, signed, HTTP-only session cookie. No advertising trackers or analytics are installed. The service guide uses preset information; it does not send messages to an AI provider.",
          "Tovuti inakumbuka lugha na, ukichagua kuhifadhi, rasimu ya ombi katika kivinjari hiki. Unaweza kufuta rasimu kwenye fomu. Wafanyakazi hutumia kidakuzi muhimu cha kikao kilichosainiwa. Hakuna vifuatiliaji vya matangazo. Mwongozo wa huduma hautumi ujumbe kwa mtoa AI.",
        ),
      },
      {
        title: L("Control and questions", "Udhibiti na maswali"),
        text: L(
          "For questions about TOC’s future production data practices, contact the company at the email below. For removal of a preview submission, contact the website operator and quote your reference number. Production deployment must define the data controller, lawful basis, retention, deletion, hosting, processors, access safeguards and applicable Tanzanian personal data protection obligations.",
          "Kwa maswali kuhusu matumizi ya taarifa ya TOC, wasiliana kwa barua pepe hapa chini. Kufuta ombi la hakikisho, wasiliana na msimamizi wa tovuti ukitaja namba ya ombi. Uzinduzi unahitaji kufafanua msimamizi wa taarifa, msingi wa kisheria, muda wa kuhifadhi, kufuta na masharti ya ulinzi wa taarifa Tanzania.",
        ),
      },
    ],
  },
  terms: {
    eyebrow: L("A CLEAR UNDERSTANDING", "UELEWA WA PAMOJA"),
    title: L("Website terms of use", "Masharti ya matumizi"),
    intro: L(
      "This website is an initial design and working inquiry preview, based on TOC’s supplied website blueprint. These draft terms need management and legal approval before launch.",
      "Tovuti hii ni muundo wa awali na hakikisho la maombi kulingana na mpango wa TOC. Masharti haya yanahitaji idhini ya uongozi na mapitio ya kisheria kabla ya uzinduzi.",
    ),
    sections: [
      {
        title: L(
          "Information, not a booking",
          "Taarifa, si uhifadhi wa nafasi",
        ),
        text: L(
          "Website information and inquiry acknowledgements are not offers, contracts or booking confirmations. Dates, service scope, menus, equipment, suppliers, availability, prices, taxes and payment terms must be confirmed in a formal quotation and agreed directly with authorized TOC staff.",
          "Taarifa za tovuti na uthibitisho wa kupokea ombi si ofa, mikataba wala uthibitisho wa nafasi. Tarehe, huduma, menyu, vifaa, watoa huduma, bei, kodi na malipo lazima vithibitishwe rasmi na wafanyakazi walioidhinishwa.",
        ),
      },
      {
        title: L("Illustrative imagery", "Picha za mfano"),
        text: L(
          "Photography in this preview includes visual inspiration extracted from the supplied blueprint and an AI-generated ballroom image. It is not evidence of completed TOC projects, owned venues or equipment. Replace it with authorized company media or appropriately licensed assets before public deployment.",
          "Picha katika hakikisho hili zinajumuisha mifano kutoka mpango na picha ya ukumbi iliyozalishwa na AI. Si ushahidi wa kazi za TOC, kumbi au vifaa vinavyomilikiwa. Badilisha kwa picha zilizoidhinishwa kabla ya uzinduzi.",
        ),
      },
      {
        title: L("Service scope", "Wigo wa huduma"),
        text: L(
          "The site emphasizes event management, catering and related event production described in the source material. Proposed ICT and standalone commercial cleaning divisions remain unpublished. Specific production and entertainment arrangements are subject to staff confirmation.",
          "Tovuti inazingatia usimamizi wa hafla, upishi na uzalishaji wa hafla kama ilivyo kwenye nyaraka. Huduma mpya za ICT na usafi wa biashara hazijachapishwa. Mipango maalumu ya burudani inahitaji kuthibitishwa na timu.",
        ),
      },
      {
        title: L("Responsible use", "Matumizi yanayowajibika"),
        text: L(
          "Do not submit unlawful content, impersonate others, attempt unauthorized access or interfere with the site. Do not include confidential or sensitive documents in free-text fields. No online payments are collected.",
          "Usitume maudhui yasiyo halali, kujifanya mtu mwingine, kujaribu kuingia bila ruhusa au kuharibu tovuti. Usijumuishe nyaraka za siri au nyeti katika ujumbe. Hakuna malipo yanayokusanywa mtandaoni.",
        ),
      },
    ],
  },
};

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t, catalog: services, profile: company, content } = useSite();
  const copy = legalCopy[kind];
  return (
    <section className="legal-page section-pad">
      <div className="container">
        <Breadcrumb current={t(copy.title)} />
        <div className="legal-layout">
          <aside>
            <Eyebrow>{t(copy.eyebrow)}</Eyebrow>
            <h1>{t(copy.title)}</h1>
            <span className="draft-label">
              {t(
                L(
                  "Preview notice · November 2026",
                  "Taarifa ya hakikisho · Novemba 2026",
                ),
              )}
            </span>
          </aside>
          <div>
            <p className="large-copy">{t(copy.intro)}</p>
            {copy.sections.map((s, i) => (
              <section key={i}>
                <h2>
                  <span>0{i + 1}</span>
                  {t(s.title)}
                </h2>
                <p>{t(s.text)}</p>
              </section>
            ))}
            <div className="legal-contact">
              <Mail size={20} />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function QualityPage() {
  const { t, catalog: services, profile: company, content } = useSite();
  return (
    <>
      <section className="page-intro section-pad">
        <div className="container">
          <Breadcrumb current={t(L("Quality & care", "Ubora na uangalizi"))} />
          <div className="page-intro-grid">
            <div>
              <Eyebrow>
                {t(L("THE DETAILS THAT MATTER", "MAELEZO YALIYO MUHIMU"))}
              </Eyebrow>
              <h1>
                {t(
                  L(
                    "Care is part\nof the service.",
                    "Uangalizi ni sehemu\nya huduma.",
                  ),
                )}
              </h1>
            </div>
            <p>
              {t(
                L(
                  "Our company values emphasize quality, hygiene, professionalism and accountability. Here is how those priorities shape the conversation about your service.",
                  "Maadili yetu yanasisitiza ubora, usafi, utaalamu na uwajibikaji. Hivi ndivyo vipaumbele hivyo vinavyoongoza mazungumzo ya huduma yako.",
                ),
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="quality-main section-pad">
        <div className="container quality-grid">
          <img
            src="/assets/about-detail.webp"
            alt="Illustrative food preparation in a professional kitchen"
            width="584"
            height="412"
            loading="lazy"
          />
          <div>
            {[
              {
                title: L(
                  "Food hygiene & dietary needs",
                  "Usafi wa chakula na mahitaji maalumu",
                ),
                text: L(
                  "Discuss food handling, menu preparation, serving arrangements and allergen requirements directly with the catering team. Specific dietary needs must be confirmed, not assumed.",
                  "Jadili utunzaji wa chakula, maandalizi ya menyu, utoaji na mahitaji ya mzio na timu ya upishi. Mahitaji maalumu lazima yathibitishwe.",
                ),
              },
              {
                title: L(
                  "Clear scope & coordination",
                  "Huduma wazi na uratibu",
                ),
                text: L(
                  "The quotation should make clear what is included, what needs to be arranged separately, and who is responsible. Equipment and suppliers are subject to confirmation.",
                  "Bei rasmi inapaswa kueleza kilichojumuishwa, kinachohitaji kupangwa kando na nani anawajibika. Vifaa na watoa huduma wanahitaji kuthibitishwa.",
                ),
              },
              {
                title: L(
                  "Responsible service planning",
                  "Mipango ya huduma inayowajibika",
                ),
                text: L(
                  "Venue requirements, timings, site conditions and practical safety arrangements should be reviewed during planning. Share accessibility requirements early so the team can discuss appropriate arrangements.",
                  "Mahitaji ya ukumbi, ratiba, hali ya eneo na usalama vinapaswa kupitiwa wakati wa mipango. Eleza mahitaji ya ufikivu mapema ili timu ijadili maandalizi yanayofaa.",
                ),
              },
            ].map((item) => (
              <article key={item.title.en}>
                <h2>
                  <Check size={18} />
                  {t(item.title)}
                </h2>
                <p>{t(item.text)}</p>
              </article>
            ))}
            <p className="scope-note">
              {t(
                L(
                  "These are service principles, not certification claims or guarantees. Ask the team for relevant current documentation before confirming your engagement.",
                  "Hizi ni kanuni za huduma, si madai ya vyeti wala dhamana. Omba nyaraka husika za sasa kabla ya makubaliano.",
                ),
              )}
            </p>
          </div>
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
