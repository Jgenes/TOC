"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  HelpCircle,
  Info,
  LoaderCircle,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { company, isPreview, L, services } from "@/lib/content";
import { todayInTanzania } from "@/lib/inquiry";
import {
  Breadcrumb,
  ButtonLink,
  Eyebrow,
  serviceIcons,
  useSite,
} from "./site-shell";

const DRAFT_KEY = "toc-inquiry-draft-v1";
type RequestData = {
  service: string;
  name: string;
  organization: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  dateFlexible: boolean;
  location: string;
  guestCount: string;
  preferences: string[];
  serviceStyle: string;
  dietary: string;
  budget: string;
  message: string;
  consent: boolean;
  website: string;
};
const empty: RequestData = {
  service: "",
  name: "",
  organization: "",
  email: "",
  phone: "",
  eventType: "",
  eventDate: "",
  dateFlexible: true,
  location: "",
  guestCount: "",
  preferences: [],
  serviceStyle: "",
  dietary: "",
  budget: "",
  message: "",
  consent: false,
  website: "",
};
type Errors = Partial<Record<keyof RequestData, string>>;
function payload(data: RequestData, origin: "quotation" | "contact") {
  return {
    ...data,
    origin,
    guestCount: data.guestCount ? Number(data.guestCount) : undefined,
    eventDate: data.dateFlexible ? "" : data.eventDate,
  };
}

function Field({
  label,
  id,
  error,
  optional = false,
  children,
  hint,
}: {
  label: string;
  id: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  const { t } = useSite();
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional ? (
          <span>{t(L("Optional", "Si lazima"))}</span>
        ) : (
          <span aria-hidden="true" className="required-star">
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <small className="field-hint" id={`${id}-hint`}>
          {hint}
        </small>
      )}
      {error && (
        <small className="field-error" id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
function PreviewNotice() {
  const { t } = useSite();
  return isPreview ? (
    <div className="form-preview-notice">
      <Info size={16} />
      <span>
        {t(
          L(
            "Preview only. Use test details. Requests are saved in this preview, not sent to TOC.",
            "Hakikisho pekee. Tumia taarifa za majaribio. Maombi yanahifadhiwa hapa, hayatumwi kwa TOC.",
          ),
        )}
      </span>
    </div>
  ) : null;
}
function HoneyPot({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="honeypot" aria-hidden="true">
      <label htmlFor="business-website">Leave this field empty</label>
      <input
        id="business-website"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SuccessPanel({
  reference,
  data,
  compact = false,
}: {
  reference: string;
  data: RequestData;
  compact?: boolean;
}) {
  const { t } = useSite();
  const [copied, setCopied] = useState(false);
  const service = services.find((s) => s.slug === data.service);
  const summary = `${company.name}\nInquiry reference: ${reference}\nService: ${service?.title.en || (data.service === "contact" ? "General inquiry" : "Help choosing a service")}\nName: ${data.name}\nOrganization: ${data.organization || "Not specified"}\nEmail: ${data.email}\nPhone: ${data.phone || "Not specified"}\nLocation: ${data.location || "Not specified"}\nPreferred date: ${data.dateFlexible ? "To be confirmed" : data.eventDate}\nGuests: ${data.guestCount || "To be discussed"}\nPreferences: ${data.preferences.join(", ") || "None specified"}\nServing style: ${data.serviceStyle || "To be discussed"}\nDietary requirements: ${data.dietary || "None specified"}\nBudget: ${data.budget || "To be discussed"}\nMessage: ${data.message || "None supplied"}\n\nThis is an inquiry, not a booking or a formal quotation.${isPreview ? "\nPreview submission: stored locally; not automatically delivered to TOC." : ""}`;
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([summary], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reference}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className={`success-panel${compact ? " compact" : ""}`} role="status">
      <span className="success-icon">
        <CheckCircle2 size={37} strokeWidth={1.4} />
      </span>
      <Eyebrow>
        {t(L("THE FIRST STEP, TAKEN", "HATUA YA KWANZA IMECHUKULIWA"))}
      </Eyebrow>
      <h2>
        {isPreview
          ? t(
              L(
                "Your preview request\nis saved.",
                "Ombi lako la majaribio\nlimehifadhiwa.",
              ),
            )
          : t(
              L("Your request\nhas been received.", "Ombi lako\nlimepokelewa."),
            )}
      </h2>
      <p>
        {isPreview
          ? t(
              L(
                "Thank you for trying the website. Your inquiry is stored in this preview’s staff inbox. No email has been sent and no booking has been made.",
                "Asante kwa kujaribu tovuti. Ombi limehifadhiwa katika kikasha cha majaribio. Hakuna barua pepe iliyotumwa wala nafasi iliyohifadhiwa.",
              ),
            )
          : t(
              L(
                "Your inquiry has been saved for staff review. Service availability, a formal quotation and any booking must be confirmed by TOC.",
                "Ombi limehifadhiwa kwa mapitio ya timu. Upatikanaji, bei rasmi na nafasi lazima vithibitishwe na TOC.",
              ),
            )}
      </p>
      <div className="reference-box">
        <small>{t(L("YOUR REFERENCE", "NAMBA YA OMBI"))}</small>
        <div>
          <strong>{reference}</strong>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reference);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch {
                setCopied(false);
              }
            }}
            aria-label="Copy request reference"
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
          </button>
        </div>
      </div>
      <div className="success-actions">
        <button className="button button-outline" onClick={download}>
          <Download size={17} />
          {t(L("Download summary", "Pakua muhtasari"))}
        </button>
        <a
          className="button button-primary"
          href={`mailto:${company.email}?subject=${encodeURIComponent(`Service inquiry ${reference}`)}&body=${encodeURIComponent(summary)}`}
        >
          <Mail size={17} />
          {t(L("Email this to TOC", "Tuma kwa TOC"))}
        </a>
      </div>
      <p className="success-email-note">
        {t(
          L(
            "“Email this to TOC” opens your email app. Review and send the message yourself.",
            "“Tuma kwa TOC” inafungua programu ya barua pepe. Pitia na utume ujumbe mwenyewe.",
          ),
        )}
      </p>
      <Link className="text-link" href="/">
        {t(L("Back to the homepage", "Rudi mwanzo"))}
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}

export function QuotationPage({
  initialService = "",
}: {
  initialService?: string;
}) {
  const { t } = useSite();
  const [data, setData] = useState<RequestData>({
    ...empty,
    service: [...services.map((s) => s.slug), "not-sure"].includes(
      initialService,
    )
      ? initialService
      : "",
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const steps = [
    L("Service", "Huduma"),
    L("Your occasion", "Tukio lako"),
    L("The details", "Maelezo"),
    L("About you", "Kukuhusu"),
    L("Review", "Hakiki"),
  ];
  useEffect(() => {
    setDraftAvailable(!!localStorage.getItem(DRAFT_KEY));
  }, []);
  const set = <K extends keyof RequestData>(key: K, value: RequestData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setError("");
    setSaved(false);
  };
  const inputProps = (name: keyof RequestData) => ({
    id: `quote-${name}`,
    name,
    value: String(data[name]),
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => set(name, e.target.value as never),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `quote-${name}-error` : undefined,
  });
  const validate = (s: number) => {
    const e: Errors = {};
    if (s === 0 && !data.service)
      e.service = t(
        L("Choose a service to continue.", "Chagua huduma ili kuendelea."),
      );
    if (s === 1) {
      if (data.location.trim().length < 2)
        e.location = t(
          L(
            "Please tell us the planned town or venue.",
            "Tafadhali taja mji au ukumbi.",
          ),
        );
      if (!data.dateFlexible && !data.eventDate)
        e.eventDate = t(
          L(
            "Choose a date, or select “To be confirmed”.",
            "Chagua tarehe au weka “Itathibitishwa”.",
          ),
        );
      if (
        !data.dateFlexible &&
        data.eventDate &&
        data.eventDate < todayInTanzania()
      )
        e.eventDate = t(
          L(
            "Please choose today or a future date.",
            "Chagua leo au tarehe ijayo.",
          ),
        );
      if (
        data.guestCount &&
        (!Number.isInteger(Number(data.guestCount)) ||
          Number(data.guestCount) < 1 ||
          Number(data.guestCount) > 100000)
      )
        e.guestCount = t(
          L(
            "Enter a guest count between 1 and 100,000.",
            "Weka idadi kati ya 1 na 100,000.",
          ),
        );
    }
    if (s === 3) {
      if (data.name.trim().length < 2)
        e.name = t(L("Please enter your full name.", "Weka jina lako kamili."));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
        e.email = t(
          L("Please enter a valid email address.", "Weka barua pepe sahihi."),
        );
      if (
        data.phone.replace(/\D/g, "").length < 7 ||
        !/^[+()\d\s.\-]+$/.test(data.phone)
      )
        e.phone = t(
          L(
            "Please enter a valid telephone number.",
            "Weka namba sahihi ya simu.",
          ),
        );
    }
    if (s === 4 && !data.consent)
      e.consent = t(
        L(
          "Please read and agree to the privacy notice.",
          "Tafadhali soma na ukubali taarifa ya faragha.",
        ),
      );
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => {
        const field = document.getElementById(`quote-${Object.keys(e)[0]}`);
        field?.focus();
      });
      return false;
    }
    return true;
  };
  const go = (s: number) => {
    setStep(s);
    setErrors({});
    setError("");
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const next = () => {
    if (validate(step)) go(step + 1);
  };
  const saveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        data: { ...data, consent: false, website: "" },
        step,
        savedAt: new Date().toISOString(),
      }),
    );
    setDraftAvailable(true);
    setSaved(true);
  };
  const resume = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      if (draft.data && typeof draft.data === "object") {
        const restored = { ...empty };
        for (const key of Object.keys(empty) as (keyof RequestData)[]) {
          if (typeof draft.data[key] === typeof empty[key])
            (restored as Record<string, unknown>)[key] = draft.data[key];
        }
        restored.consent = false;
        restored.website = "";
        setData(restored);
        setStep(Math.min(4, Math.max(0, Number(draft.step) || 0)));
        setDraftAvailable(false);
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
      setDraftAvailable(false);
    }
  };
  const removeDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftAvailable(false);
    setSaved(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < 4) {
      next();
      return;
    }
    if (!validate(4) || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(data, "quotation")),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(
          body.error ||
            t(
              L(
                "Please check your details and try again.",
                "Hakiki taarifa na ujaribu tena.",
              ),
            ),
        );
        if (body.fields) setErrors(body.fields);
        return;
      }
      setReference(body.reference);
      localStorage.removeItem(DRAFT_KEY);
      window.scrollTo({ top: 150, behavior: "smooth" });
    } catch {
      setError(
        t(
          L(
            "We couldn’t connect. Your entries are still here. Please try again.",
            "Hatukuweza kuunganishwa. Taarifa zako bado zipo. Jaribu tena.",
          ),
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const chosenService = services.find((s) => s.slug === data.service);
  const requirements =
    data.service === "catering"
      ? [
          L("Tea & refreshments", "Chai na viburudisho"),
          L("Breakfast", "Kifungua kinywa"),
          L("Lunch or dinner buffet", "Bafe ya mchana au jioni"),
          L("Grilled food", "Chakula cha kuchoma"),
          L("Service staff", "Wahudumu"),
          L("Tableware & setup", "Vyombo na maandalizi"),
        ]
      : data.service === "entertainment"
        ? [
            L("Sound & microphones", "Sauti na vipaza sauti"),
            L("Stage & lighting", "Jukwaa na mwanga"),
            L("Photography", "Picha"),
            L("Videography", "Video"),
            L("Live entertainment", "Burudani ya moja kwa moja"),
            L("Event hosting", "Uongozaji wa hafla"),
          ]
        : [
            L("Venue coordination", "Uratibu wa ukumbi"),
            L("Catering", "Upishi"),
            L("Decoration & styling", "Mapambo"),
            L("Sound & lighting", "Sauti na mwanga"),
            L("Photography & video", "Picha na video"),
            L("Guest coordination", "Uratibu wa wageni"),
          ];
  const titles = [
    L("What can we help you with?", "Tukusaidie kwa huduma gani?"),
    L("Tell us about your occasion.", "Tueleze kuhusu tukio lako."),
    L("Let’s add the thoughtful details.", "Tuongeze maelezo muhimu."),
    L("And a little about you.", "Na kidogo kukuhusu."),
    L("Everything looking right?", "Kila kitu kiko sawa?"),
  ];
  const subtitles = [
    L(
      "Choose your main service. You can add more requirements as we go.",
      "Chagua huduma kuu. Unaweza kuongeza mahitaji mengine baadaye.",
    ),
    L(
      "A few starting points help us understand what you have in mind.",
      "Taarifa chache zinatusaidia kuelewa mawazo yako.",
    ),
    L(
      "Nothing needs to be final. Share what matters and we’ll discuss the rest.",
      "Hakuna kinachohitaji kuwa cha mwisho. Shiriki muhimu na tutajadili mengine.",
    ),
    L(
      "So the team knows who to speak with about your request.",
      "Ili timu ijue wa kuwasiliana naye kuhusu ombi lako.",
    ),
    L(
      "Review your details before saving your inquiry. This does not confirm a booking.",
      "Hakiki taarifa kabla ya kuhifadhi ombi. Hii haithibitishi nafasi.",
    ),
  ];
  return (
    <section className="quotation-page">
      <div className="container">
        <Breadcrumb current={t(L("Request a quotation", "Omba bei"))} />
        {reference ? (
          <div className="quotation-success-wrap">
            <SuccessPanel reference={reference} data={data} />
          </div>
        ) : (
          <>
            <div className="quotation-page-heading">
              <Eyebrow>{t(L("LET’S MAKE A PLAN", "TUANDAE MPANGO"))}</Eyebrow>
              <h1>
                {t(
                  L(
                    "Something special\nstarts here.",
                    "Kitu cha kipekee\nkinaanza hapa.",
                  ),
                )}
              </h1>
              <p>
                {t(
                  L(
                    "Tell us a little about your occasion. We’ll take it from there.",
                    "Tueleze kidogo kuhusu tukio lako. Tutaendelea kutoka hapo.",
                  ),
                )}
              </p>
            </div>
            <div className="quotation-layout">
              <div className="quotation-form-card">
                <ol
                  className="wizard-steps"
                  aria-label="Quotation request progress"
                >
                  {steps.map((label, i) => (
                    <li
                      key={i}
                      className={`${i === step ? "current" : ""} ${i < step ? "complete" : ""}`}
                      aria-current={i === step ? "step" : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (i < step) go(i);
                        }}
                        disabled={i > step}
                        aria-label={`${i + 1}. ${t(label)}`}
                      >
                        <span>{i < step ? <Check size={15} /> : i + 1}</span>
                        <small>{t(label)}</small>
                      </button>
                    </li>
                  ))}
                </ol>
                <PreviewNotice />
                {draftAvailable && !saved && step === 0 && (
                  <div className="draft-notice">
                    <span>
                      {t(
                        L(
                          "A saved draft is available on this device.",
                          "Rasimu iliyohifadhiwa ipo kwenye kifaa hiki.",
                        ),
                      )}
                    </span>
                    <button onClick={resume}>
                      {t(L("Resume draft", "Endelea na rasimu"))}
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={removeDraft}
                      aria-label="Delete saved draft"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
                <form onSubmit={submit} noValidate>
                  <div className="wizard-content">
                    <span className="step-counter">
                      {t(L("STEP", "HATUA"))}{" "}
                      {String(step + 1).padStart(2, "0")} / 05
                    </span>
                    <h2 ref={headingRef} tabIndex={-1}>
                      {t(titles[step])}
                    </h2>
                    <p className="wizard-subtitle">{t(subtitles[step])}</p>
                    <HoneyPot
                      value={data.website}
                      onChange={(v) => set("website", v)}
                    />
                    {step === 0 && (
                      <fieldset className="service-selector">
                        <legend className="sr-only">
                          {t(L("Select a service", "Chagua huduma"))}
                        </legend>
                        {services.map((service) => {
                          const Icon = serviceIcons[service.icon];
                          return (
                            <label
                              key={service.slug}
                              className={
                                data.service === service.slug ? "selected" : ""
                              }
                            >
                              <input
                                type="radio"
                                id={`quote-${service.slug}`}
                                name="service"
                                value={service.slug}
                                checked={data.service === service.slug}
                                onChange={() => {
                                  set("service", service.slug);
                                  set("preferences", []);
                                }}
                              />
                              <span className="service-select-icon">
                                <Icon size={25} strokeWidth={1.4} />
                              </span>
                              <span>
                                <strong>{t(service.title)}</strong>
                                <small>
                                  {t(service.tags[0])} · {t(service.tags[1])}
                                </small>
                              </span>
                              <span className="radio-circle">
                                {data.service === service.slug && <span />}
                              </span>
                            </label>
                          );
                        })}
                        <label
                          className={
                            data.service === "not-sure" ? "selected" : ""
                          }
                        >
                          <input
                            type="radio"
                            name="service"
                            value="not-sure"
                            checked={data.service === "not-sure"}
                            onChange={() => set("service", "not-sure")}
                          />
                          <span className="service-select-icon">
                            <HelpCircle size={25} strokeWidth={1.4} />
                          </span>
                          <span>
                            <strong>
                              {t(
                                L(
                                  "A little guidance, please",
                                  "Naomba mwongozo kidogo",
                                ),
                              )}
                            </strong>
                            <small>
                              {t(
                                L(
                                  "I have an idea, but I’m not sure where to start.",
                                  "Nina wazo, lakini sijui nianzie wapi.",
                                ),
                              )}
                            </small>
                          </span>
                          <span className="radio-circle">
                            {data.service === "not-sure" && <span />}
                          </span>
                        </label>
                        {errors.service && (
                          <p className="field-error" role="alert">
                            {errors.service}
                          </p>
                        )}
                      </fieldset>
                    )}
                    {step === 1 && (
                      <div className="form-fields">
                        <Field
                          id="quote-eventType"
                          label={t(
                            L("What are you planning?", "Unapanga nini?"),
                          )}
                          optional
                        >
                          <select {...inputProps("eventType")}>
                            <option value="">
                              {t(L("Select an occasion", "Chagua tukio"))}
                            </option>
                            {[
                              "Corporate event",
                              "Conference or workshop",
                              "Institutional function",
                              "Wedding or celebration",
                              "Private gathering",
                              "Recurring meal service",
                              "Other",
                            ].map((v, i) => (
                              <option key={v} value={v}>
                                {t(
                                  L(
                                    v,
                                    [
                                      "Hafla ya kampuni",
                                      "Mkutano au warsha",
                                      "Shughuli ya taasisi",
                                      "Harusi au sherehe",
                                      "Mkusanyiko binafsi",
                                      "Chakula cha mara kwa mara",
                                      "Nyingine",
                                    ][i],
                                  ),
                                )}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <div className="field-row">
                          <Field
                            id="quote-eventDate"
                            label={t(
                              L("Preferred date", "Tarehe unayopendelea"),
                            )}
                            error={errors.eventDate}
                            optional={data.dateFlexible}
                          >
                            <input
                              {...inputProps("eventDate")}
                              type="date"
                              min={todayInTanzania()}
                              disabled={data.dateFlexible}
                            />
                            <label className="checkbox-label date-flexible">
                              <input
                                type="checkbox"
                                checked={data.dateFlexible}
                                onChange={(e) =>
                                  set("dateFlexible", e.target.checked)
                                }
                              />
                              {t(
                                L(
                                  "Date to be confirmed",
                                  "Tarehe itathibitishwa",
                                ),
                              )}
                            </label>
                          </Field>
                          <Field
                            id="quote-guestCount"
                            label={t(
                              L("Approximate guests", "Idadi ya wageni"),
                            )}
                            error={errors.guestCount}
                            optional
                          >
                            <input
                              {...inputProps("guestCount")}
                              type="number"
                              min="1"
                              max="100000"
                              step="1"
                              placeholder={t(L("e.g. 150", "Mf. 150"))}
                            />
                          </Field>
                        </div>
                        <Field
                          id="quote-location"
                          label={t(L("Town or planned venue", "Mji au ukumbi"))}
                          error={errors.location}
                        >
                          <input
                            {...inputProps("location")}
                            maxLength={200}
                            autoComplete="address-level2"
                            placeholder={t(
                              L("e.g. Kisasa, Dodoma", "Mf. Kisasa, Dodoma"),
                            )}
                          />
                        </Field>
                      </div>
                    )}
                    {step === 2 && (
                      <div className="form-fields">
                        <fieldset className="preferences-field">
                          <legend>
                            {t(
                              L(
                                "What would you like us to consider?",
                                "Ungependa tuzingatie nini?",
                              ),
                            )}
                            <span>
                              {t(
                                L(
                                  "Optional · Select all that apply",
                                  "Si lazima · Chagua zinazofaa",
                                ),
                              )}
                            </span>
                          </legend>
                          <div className="preference-grid">
                            {requirements.map((item) => (
                              <label
                                key={item.en}
                                className={
                                  data.preferences.includes(item.en)
                                    ? "checked"
                                    : ""
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={data.preferences.includes(item.en)}
                                  onChange={(e) =>
                                    set(
                                      "preferences",
                                      e.target.checked
                                        ? [...data.preferences, item.en]
                                        : data.preferences.filter(
                                            (v) => v !== item.en,
                                          ),
                                    )
                                  }
                                />
                                <span>{t(item)}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        {data.service === "catering" && (
                          <>
                            <Field
                              id="quote-serviceStyle"
                              label={t(
                                L(
                                  "Preferred serving style",
                                  "Mtindo wa utoaji wa chakula",
                                ),
                              )}
                              optional
                            >
                              <select {...inputProps("serviceStyle")}>
                                <option value="">
                                  {t(L("Let’s discuss", "Tujadiliane"))}
                                </option>
                                <option value="Buffet">
                                  {t(L("Buffet", "Bafe"))}
                                </option>
                                <option value="Plated service">
                                  {t(L("Plated service", "Huduma ya sahani"))}
                                </option>
                                <option value="Food stations">
                                  {t(L("Food stations", "Vituo vya chakula"))}
                                </option>
                                <option value="Packed meals">
                                  {t(
                                    L(
                                      "Packed meals",
                                      "Chakula cha kufungashwa",
                                    ),
                                  )}
                                </option>
                              </select>
                            </Field>
                            <Field
                              id="quote-dietary"
                              label={t(
                                L(
                                  "Dietary preferences",
                                  "Mapendeleo ya chakula",
                                ),
                              )}
                              hint={t(
                                L(
                                  "Do not include medical records. Confirm allergens directly with the team.",
                                  "Usijumuishe rekodi za afya. Thibitisha mzio na timu moja kwa moja.",
                                ),
                              )}
                              optional
                            >
                              <input
                                {...inputProps("dietary")}
                                maxLength={500}
                                placeholder={t(
                                  L(
                                    "e.g. Vegetarian options required",
                                    "Mf. Chakula cha mboga kinahitajika",
                                  ),
                                )}
                              />
                            </Field>
                          </>
                        )}
                        <Field
                          id="quote-budget"
                          label={t(
                            L(
                              "Budget guidance (TZS)",
                              "Mwongozo wa bajeti (TZS)",
                            ),
                          )}
                          optional
                        >
                          <select {...inputProps("budget")}>
                            <option value="">
                              {t(L("Prefer to discuss", "Napendelea kujadili"))}
                            </option>
                            {[
                              "Under TZS 1,000,000",
                              "TZS 1,000,000–5,000,000",
                              "TZS 5,000,000–15,000,000",
                              "Over TZS 15,000,000",
                            ].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          id="quote-message"
                          label={t(
                            L(
                              "Anything else we should know?",
                              "Kuna kingine tunachopaswa kujua?",
                            ),
                          )}
                          optional
                        >
                          <textarea
                            {...inputProps("message")}
                            rows={4}
                            maxLength={3000}
                            placeholder={t(
                              L(
                                "Your ideas, priorities or questions…",
                                "Mawazo, vipaumbele au maswali yako…",
                              ),
                            )}
                          />
                          <span className="character-count">
                            {data.message.length}/3000
                          </span>
                        </Field>
                      </div>
                    )}
                    {step === 3 && (
                      <div className="form-fields">
                        <Field
                          id="quote-name"
                          label={t(L("Your full name", "Jina lako kamili"))}
                          error={errors.name}
                        >
                          <input
                            {...inputProps("name")}
                            autoComplete="name"
                            maxLength={100}
                            placeholder={t(L("Full name", "Jina kamili"))}
                          />
                        </Field>
                        <Field
                          id="quote-organization"
                          label={t(L("Organization", "Shirika"))}
                          optional
                        >
                          <input
                            {...inputProps("organization")}
                            autoComplete="organization"
                            maxLength={150}
                            placeholder={t(
                              L(
                                "Company or institution, if applicable",
                                "Kampuni au taasisi, kama ipo",
                              ),
                            )}
                          />
                        </Field>
                        <Field
                          id="quote-email"
                          label={t(L("Email address", "Barua pepe"))}
                          error={errors.email}
                        >
                          <input
                            {...inputProps("email")}
                            type="email"
                            autoComplete="email"
                            maxLength={254}
                            placeholder="you@example.com"
                          />
                        </Field>
                        <Field
                          id="quote-phone"
                          label={t(L("Phone number", "Namba ya simu"))}
                          error={errors.phone}
                        >
                          <input
                            {...inputProps("phone")}
                            type="tel"
                            autoComplete="tel"
                            maxLength={30}
                            placeholder="+255 …"
                          />
                        </Field>
                        <div className="privacy-reassurance">
                          <ShieldCheck size={20} />
                          <p>
                            {t(
                              L(
                                "Your details are for this service inquiry, not marketing subscriptions.",
                                "Taarifa zako ni kwa ombi hili la huduma, si matangazo.",
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    {step === 4 && (
                      <div className="review-step">
                        <div className="review-block">
                          <div>
                            <h3>{t(L("Your service", "Huduma yako"))}</h3>
                            <button type="button" onClick={() => go(0)}>
                              <Pencil size={13} />
                              {t(L("Edit", "Badilisha"))}
                            </button>
                          </div>
                          <strong>
                            {chosenService
                              ? t(chosenService.title)
                              : t(
                                  L(
                                    "Help choosing a service",
                                    "Msaada wa kuchagua huduma",
                                  ),
                                )}
                          </strong>
                        </div>
                        <div className="review-block">
                          <div>
                            <h3>{t(L("The occasion", "Tukio"))}</h3>
                            <button type="button" onClick={() => go(1)}>
                              <Pencil size={13} />
                              {t(L("Edit", "Badilisha"))}
                            </button>
                          </div>
                          <dl>
                            <div>
                              <dt>{t(L("Location", "Eneo"))}</dt>
                              <dd>{data.location}</dd>
                            </div>
                            <div>
                              <dt>{t(L("Preferred date", "Tarehe"))}</dt>
                              <dd>
                                {data.dateFlexible
                                  ? t(L("To be confirmed", "Itathibitishwa"))
                                  : data.eventDate}
                              </dd>
                            </div>
                            <div>
                              <dt>{t(L("Guests", "Wageni"))}</dt>
                              <dd>
                                {data.guestCount ||
                                  t(L("To be discussed", "Kujadiliwa"))}
                              </dd>
                            </div>
                            {data.eventType && (
                              <div>
                                <dt>{t(L("Occasion", "Aina ya tukio"))}</dt>
                                <dd>{data.eventType}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                        <div className="review-block">
                          <div>
                            <h3>
                              {t(L("Your preferences", "Mapendeleo yako"))}
                            </h3>
                            <button type="button" onClick={() => go(2)}>
                              <Pencil size={13} />
                              {t(L("Edit", "Badilisha"))}
                            </button>
                          </div>
                          <p>
                            {data.preferences.length
                              ? data.preferences.join(" · ")
                              : t(
                                  L(
                                    "We’ll talk through the details together.",
                                    "Tutajadili maelezo pamoja.",
                                  ),
                                )}
                          </p>
                          {data.serviceStyle && <p>{data.serviceStyle}</p>}
                          {data.dietary && <p>{data.dietary}</p>}
                          {data.budget && <p>{data.budget}</p>}
                          {data.message && (
                            <p className="review-message">{data.message}</p>
                          )}
                        </div>
                        <div className="review-block">
                          <div>
                            <h3>
                              {t(L("Your contact details", "Mawasiliano yako"))}
                            </h3>
                            <button type="button" onClick={() => go(3)}>
                              <Pencil size={13} />
                              {t(L("Edit", "Badilisha"))}
                            </button>
                          </div>
                          <p>
                            <strong>{data.name}</strong>
                            {data.organization && ` · ${data.organization}`}
                          </p>
                          <p>
                            {data.email}
                            <br />
                            {data.phone}
                          </p>
                        </div>
                        <label className="checkbox-label consent-label">
                          <input
                            id="quote-consent"
                            type="checkbox"
                            checked={data.consent}
                            onChange={(e) => set("consent", e.target.checked)}
                            aria-invalid={!!errors.consent}
                            aria-describedby={
                              errors.consent ? "quote-consent-error" : undefined
                            }
                          />
                          <span>
                            {t(L("I have read the", "Nimesoma"))}{" "}
                            <Link href="/privacy" target="_blank">
                              {t(L("privacy notice", "taarifa ya faragha"))}
                            </Link>{" "}
                            {t(
                              L(
                                "and agree to the use of these details for this inquiry. I understand this is not a confirmed booking.",
                                "na nakubali matumizi ya taarifa hizi kwa ombi hili. Ninaelewa hii si nafasi iliyothibitishwa.",
                              ),
                            )}
                          </span>
                        </label>
                        {errors.consent && (
                          <p
                            id="quote-consent-error"
                            className="field-error"
                            role="alert"
                          >
                            {errors.consent}
                          </p>
                        )}
                      </div>
                    )}
                    {error && (
                      <div className="form-error" role="alert">
                        {error}
                      </div>
                    )}
                  </div>
                  <div className="wizard-footer">
                    <button
                      type="button"
                      className="wizard-back"
                      onClick={() => go(step - 1)}
                      disabled={step === 0 || busy}
                    >
                      <ArrowLeft size={17} />
                      {t(L("Back", "Rudi"))}
                    </button>
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={busy}
                    >
                      {busy ? (
                        <>
                          <LoaderCircle size={17} className="spin" />
                          {t(L("Saving request…", "Inahifadhi…"))}
                        </>
                      ) : (
                        <>
                          {step === 4
                            ? t(L("Send my request", "Tuma ombi langu"))
                            : t(L("Continue", "Endelea"))}
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
                <div className="draft-actions">
                  <button onClick={saveDraft}>
                    <Save size={14} />
                    {saved
                      ? t(
                          L(
                            "Draft saved on this device",
                            "Rasimu imehifadhiwa kwenye kifaa hiki",
                          ),
                        )
                      : t(
                          L(
                            "Save a draft on this device",
                            "Hifadhi rasimu kwenye kifaa hiki",
                          ),
                        )}
                  </button>
                  {draftAvailable && (
                    <button onClick={removeDraft}>
                      <Trash2 size={13} />
                      {t(L("Clear saved draft", "Futa rasimu"))}
                    </button>
                  )}
                </div>
                <p className="local-draft-note">
                  {t(
                    L(
                      "Only save a draft on a device you trust. Your entries stay here until you submit or save them.",
                      "Hifadhi rasimu kwenye kifaa unachokiamini pekee. Taarifa hubaki hapa hadi utume au kuzihifadhi.",
                    ),
                  )}
                </p>
              </div>
              <aside className="quotation-sidebar">
                <div className="sidebar-image">
                  <img
                    src="/assets/gallery-gala.webp"
                    alt="Illustrative elegant dining-table setting"
                    width="520"
                    height="430"
                  />
                  <span>A touch of class.</span>
                </div>
                <div className="sidebar-body">
                  <Eyebrow>
                    {t(
                      L(
                        "PERSONAL FROM THE START",
                        "HUDUMA BINAFSI KUANZIA MWANZO",
                      ),
                    )}
                  </Eyebrow>
                  <h3>
                    {t(
                      L(
                        "Your vision.\nOur thoughtful details.",
                        "Maono yako.\nMaelezo yetu makini.",
                      ),
                    )}
                  </h3>
                  <ul>
                    <li>
                      <Check size={15} />
                      {t(
                        L(
                          "One inquiry for connected services",
                          "Ombi moja kwa huduma zinazohusiana",
                        ),
                      )}
                    </li>
                    <li>
                      <Check size={15} />
                      {t(
                        L(
                          "A quotation shaped around your needs",
                          "Bei kulingana na mahitaji yako",
                        ),
                      )}
                    </li>
                    <li>
                      <Check size={15} />
                      {t(
                        L(
                          "No payment or booking at this stage",
                          "Hakuna malipo wala nafasi hatua hii",
                        ),
                      )}
                    </li>
                  </ul>
                  <div className="sidebar-help">
                    <span>
                      {t(
                        L("Prefer a conversation?", "Unapendelea mazungumzo?"),
                      )}
                    </span>
                    <a href={`tel:${company.phoneHref}`}>
                      {company.phone}
                      <ArrowUpRight size={16} />
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function ContactForm() {
  const { t } = useSite();
  const [data, setData] = useState<RequestData>({
    ...empty,
    service: "contact",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const set = (key: keyof RequestData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Errors = {};
    if (data.name.trim().length < 2)
      err.name = t(L("Please enter your full name.", "Weka jina lako kamili."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
      err.email = t(
        L("Please enter a valid email address.", "Weka barua pepe sahihi."),
      );
    if (data.message.trim().length < 10)
      err.message = t(
        L("Please share at least 10 characters.", "Andika angalau herufi 10."),
      );
    if (!data.consent)
      err.consent = t(
        L("Please agree to the privacy notice.", "Kubali taarifa ya faragha."),
      );
    setErrors(err);
    if (Object.keys(err).length) {
      document.getElementById(`contact-${Object.keys(err)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(data, "contact")),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Please check your details and try again.");
        return;
      }
      setReference(body.reference);
    } catch {
      setError(
        t(
          L(
            "We couldn’t connect. Your entries are still here. Please try again.",
            "Hatukuweza kuunganishwa. Taarifa bado zipo. Jaribu tena.",
          ),
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  if (reference)
    return <SuccessPanel reference={reference} data={data} compact />;
  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <PreviewNotice />
      <HoneyPot value={data.website} onChange={(v) => set("website", v)} />
      <div className="field-row">
        <Field
          id="contact-name"
          label={t(L("Your name", "Jina lako"))}
          error={errors.name}
        >
          <input
            id="contact-name"
            name="name"
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={100}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
          />
        </Field>
        <Field
          id="contact-organization"
          label={t(L("Organization", "Shirika"))}
          optional
        >
          <input
            id="contact-organization"
            name="organization"
            value={data.organization}
            onChange={(e) => set("organization", e.target.value)}
            maxLength={150}
            autoComplete="organization"
          />
        </Field>
      </div>
      <Field
        id="contact-email"
        label={t(L("Email address", "Barua pepe"))}
        error={errors.email}
      >
        <input
          id="contact-email"
          name="email"
          type="email"
          value={data.email}
          onChange={(e) => set("email", e.target.value)}
          maxLength={254}
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
        />
      </Field>
      <Field
        id="contact-phone"
        label={t(L("Phone number", "Namba ya simu"))}
        optional
      >
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => set("phone", e.target.value)}
          maxLength={30}
          autoComplete="tel"
        />
      </Field>
      <Field
        id="contact-message"
        label={t(L("Your message", "Ujumbe wako"))}
        error={errors.message}
      >
        <textarea
          id="contact-message"
          name="message"
          value={data.message}
          onChange={(e) => set("message", e.target.value)}
          rows={5}
          maxLength={3000}
          placeholder={t(
            L(
              "A little about your idea, question or occasion…",
              "Kidogo kuhusu wazo, swali au tukio lako…",
            ),
          )}
          aria-invalid={!!errors.message}
          aria-describedby={
            errors.message ? "contact-message-error" : undefined
          }
        />
      </Field>
      <label className="checkbox-label consent-label">
        <input
          id="contact-consent"
          type="checkbox"
          checked={data.consent}
          onChange={(e) => set("consent", e.target.checked)}
          aria-invalid={!!errors.consent}
          aria-describedby={
            errors.consent ? "contact-consent-error" : undefined
          }
        />
        <span>
          {t(L("I have read the", "Nimesoma"))}{" "}
          <Link href="/privacy" target="_blank">
            {t(L("privacy notice", "taarifa ya faragha"))}
          </Link>{" "}
          {t(
            L(
              "and agree to the use of my details for this inquiry.",
              "na nakubali matumizi ya taarifa zangu kwa ombi hili.",
            ),
          )}
        </span>
      </label>
      {errors.consent && (
        <p id="contact-consent-error" className="field-error" role="alert">
          {errors.consent}
        </p>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button className="button button-primary" type="submit" disabled={busy}>
        {busy ? (
          <>
            <LoaderCircle className="spin" size={17} />
            {t(L("Saving…", "Inahifadhi…"))}
          </>
        ) : (
          <>
            {t(L("Send your message", "Tuma ujumbe wako"))}
            <ArrowUpRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
