"use client";
import { WorkspaceText, useWorkspaceCopy } from "./workspace-text";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { L } from "@/lib/content";
import { Logo, useSite } from "./site-shell";
import {
  ActionForm,
  FormField,
  Notice,
  platformApi,
  PreviewLinks,
} from "./platform-shared";

type AccountResult = {
  message?: string;
  previewLink?: string;
  mfaRequired?: boolean;
  setupRequired?: boolean;
};
export function AccountEntry({
  screen = "login",
  staff = false,
  onSignedIn,
}: {
  screen?: string;
  staff?: boolean;
  onSignedIn?: () => void;
}) {
  const w = useWorkspaceCopy();
  const { t, language, setLanguage } = useSite(),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [result, setResult] = useState<AccountResult | null>(null),
    [token, setToken] = useState(""),
    [mfa, setMfa] = useState(false),
    [setup, setSetup] = useState(false),
    [secret, setSecret] = useState(""),
    [code, setCode] = useState("");
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);
  const title =
    screen === "register"
      ? L("Make room for better service.", "Karibu kwenye huduma bora.")
      : screen === "verify"
        ? L("Verify your email.", "Thibitisha barua pepe.")
        : screen === "reset"
          ? L("Choose a new password.", "Chagua nywila mpya.")
          : screen === "forgot"
            ? L("Let’s get you back in.", "Turudishe kwenye akaunti.")
            : screen === "claim"
              ? L("Your inquiry, connected.", "Ombi lako limeunganishwa.")
              : mfa
                ? L(
                    "One more security check.",
                    "Ukaguzi mmoja zaidi wa usalama.",
                  )
                : staff
                  ? L("The work behind the details.", "Kazi nyuma ya maelezo.")
                  : L(
                      "A clearer view of what’s next.",
                      "Mtazamo wazi wa kinachofuata.",
                    );
  const run = async () => {
    if (mfa) {
      await platformApi("auth/mfa-verify", { code });
      setPassword("");
      onSignedIn
        ? onSignedIn()
        : window.location.assign(staff ? "/admin" : "/portal");
      return;
    }
    if (screen === "claim") {
      const response = await platformApi<{ reference: string }>(
        "inquiries/claim",
        { token },
      );
      setResult({
        message: `${response.reference} linked to your verified account. Open your dashboard to see the request.`,
      });
      return;
    }
    if (screen === "verify") {
      const response = await platformApi<AccountResult>("auth/verify", {
        token,
      });
      setResult(response);
      return;
    }
    if (screen === "reset") {
      setResult(
        await platformApi<AccountResult>("auth/reset", { token, password }),
      );
      setPassword("");
      return;
    }
    if (screen === "register") {
      setResult(
        await platformApi<AccountResult>("auth/register", {
          name,
          email,
          password,
        }),
      );
      setPassword("");
      return;
    }
    if (screen === "forgot") {
      setResult(
        await platformApi<AccountResult>("auth/reset-request", { email }),
      );
      return;
    }
    const response = await platformApi<AccountResult>("auth/login", {
      email,
      password,
    });
    setPassword("");
    if (response.mfaRequired) {
      setMfa(true);
      setSetup(!!response.setupRequired);
      return;
    }
    onSignedIn
      ? onSignedIn()
      : window.location.assign(staff ? "/admin" : "/portal");
  };
  return (
    <section className="account-page">
      <div className="account-story">
        <Link href="/" aria-label="TOC homepage">
          <Logo light />
        </Link>
        <div>
          <span className="platform-kicker">
            {staff ? w("TOC STAFF WORKSPACE") : w("TOC CUSTOMER PORTAL")}
          </span>
          <h2>
            {t(
              L(
                "One conversation.\nEverything connected.",
                "Mazungumzo moja.\nKila kitu kimeunganishwa.",
              ),
            )}
          </h2>
          <p>
            {t(
              L(
                "Requests, reviewed quotations and the details that keep your services moving. In one protected place.",
                "Maombi, bei zilizopitiwa na maelezo yanayoendeleza huduma zako. Mahali pamoja palipolindwa.",
              ),
            )}
          </p>
          <div className="account-security">
            <ShieldCheck size={24} />
            <span>
              {t(
                L(
                  "Private records. Human decisions. No automatic booking promises.",
                  "Rekodi binafsi. Maamuzi ya binadamu. Hakuna ahadi za nafasi za moja kwa moja.",
                ),
              )}
            </span>
          </div>
        </div>
        <Link href="/request-quotation">
          {t(
            L(
              "Just making an inquiry? No account needed.",
              "Unatuma ombi tu? Huhitaji akaunti.",
            ),
          )}{" "}
          <WorkspaceText text="→" />
        </Link>
      </div>
      <div className="account-main">
        <div className="account-top">
          <Link href="/">
            <ArrowLeft size={16} />
            {t(L("Back to TOC", "Rudi TOC"))}
          </Link>
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "sw" : "en")}
          >
            {language === "en" ? w("Kiswahili") : w("English")}
          </button>
        </div>
        <div className="account-form-wrap">
          <span className="platform-icon">
            <KeyRound size={24} />
          </span>
          <p className="platform-kicker">
            {t(
              staff
                ? L("AUTHORIZED STAFF ONLY", "WAFANYAKAZI WALIOIDHINISHWA")
                : L("YOUR TOC ACCOUNT", "AKAUNTI YAKO YA TOC"),
            )}
          </p>
          <h1>{t(title)}</h1>
          <p>
            {t(
              mfa
                ? L(
                    "Staff access requires a time-based authenticator. Codes cannot be reused.",
                    "Ufikiaji wa wafanyakazi unahitaji kihalalishi cha muda. Misimbo haitumiki tena.",
                  )
                : L(
                    "Use your verified email. Your records are never linked just because an email address matches.",
                    "Tumia barua pepe iliyothibitishwa. Rekodi haziunganishwi kwa kufanana kwa anwani pekee.",
                  ),
            )}
          </p>
          {result?.message && <Notice>{result.message}</Notice>}
          <PreviewLinks links={[result?.previewLink]} />
          <ActionForm
            onSubmit={run}
            label={t(
              mfa
                ? L("Verify & sign in", "Thibitisha na ingia")
                : screen === "register"
                  ? L("Create account", "Fungua akaunti")
                  : screen === "verify"
                    ? L("Verify email", "Thibitisha barua pepe")
                    : screen === "reset"
                      ? L("Reset password", "Weka nywila mpya")
                      : screen === "forgot"
                        ? L("Send reset instructions", "Tuma maelekezo")
                        : screen === "claim"
                          ? L(
                              "Link to my verified account",
                              "Unganisha kwenye akaunti yangu",
                            )
                          : L("Sign in", "Ingia"),
            )}
          >
            {mfa ? (
              <>
                {setup && !secret && (
                  <button
                    type="button"
                    className="platform-small-button"
                    onClick={async () => {
                      try {
                        const response = await platformApi<{ secret: string }>(
                          "auth/mfa-setup",
                          {},
                        );
                        setSecret(response.secret);
                      } catch (error) {
                        setResult({
                          message:
                            error instanceof Error
                              ? error.message
                              : "Could not set up an authenticator.",
                        });
                      }
                    }}
                  >
                    <WorkspaceText text=" Set up authenticator " />
                  </button>
                )}
                {secret && (
                  <div className="mfa-secret">
                    <strong>
                      <WorkspaceText text="Add this secret to your authenticator app" />
                    </strong>
                    <code>{secret}</code>
                    <p>
                      <WorkspaceText text=" Account: " />
                      {email}
                      <WorkspaceText text=". Issuer: TOC. Time-based, 6 digits, 30 seconds. Keep this secret private. " />
                    </p>
                  </div>
                )}
                <FormField
                  label={t(L("Authenticator code", "Msimbo wa kihalalishi"))}
                >
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </FormField>
              </>
            ) : (
              <>
                {screen === "register" && (
                  <FormField label={t(L("Your name", "Jina lako"))}>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </FormField>
                )}
                {!["verify", "reset", "claim"].includes(screen) && (
                  <FormField label={t(L("Email address", "Barua pepe"))}>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      maxLength={254}
                      required
                    />
                  </FormField>
                )}
                {!["verify", "claim", "forgot"].includes(screen) && (
                  <FormField
                    label={t(L("Password", "Nywila"))}
                    hint={
                      screen === "register" || screen === "reset"
                        ? t(
                            L(
                              "At least 12 characters. Password managers and paste are supported.",
                              "Angalau herufi 12. Unaweza kutumia kihifadhi nywila na kubandika.",
                            ),
                          )
                        : undefined
                    }
                  >
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={
                        screen === "login" ? "current-password" : "new-password"
                      }
                      minLength={screen === "login" ? undefined : 12}
                      maxLength={128}
                      required
                    />
                  </FormField>
                )}
                {["verify", "claim", "reset"].includes(screen) && !token && (
                  <Notice error>
                    {t(
                      L(
                        "This page needs the one-time token from your account email.",
                        "Ukurasa huu unahitaji kiungo cha mara moja kutoka kwenye barua pepe.",
                      ),
                    )}
                  </Notice>
                )}
                {screen === "claim" && (
                  <p>
                    {t(
                      L(
                        "First sign in with the verified email used for the inquiry, then confirm this link. Claim links expire after seven days.",
                        "Kwanza ingia kwa barua pepe iliyotumika kwenye ombi, kisha thibitisha kiungo. Kiungo kinaisha baada ya siku saba.",
                      ),
                    )}
                  </p>
                )}
              </>
            )}
          </ActionForm>
          <div className="account-links">
            <Link href={staff ? "/admin/login" : "/portal/login"}>
              {t(L("Sign in", "Ingia"))}
            </Link>
            {!staff && (
              <Link href="/portal/register">
                {t(L("Create account", "Fungua akaunti"))}
              </Link>
            )}
            <Link href="/portal/forgot">
              {t(L("Forgot password?", "Umesahau nywila?"))}
            </Link>
            <Link href={staff ? "/admin" : "/portal"}>
              {t(L("Open dashboard", "Fungua dashibodi"))}
            </Link>
          </div>
          <p className="account-legal">
            {t(
              L(
                "By continuing you acknowledge how TOC processes account and service information.",
                "Kwa kuendelea unatambua jinsi TOC inavyoshughulikia taarifa za akaunti na huduma.",
              ),
            )}{" "}
            <Link href="/privacy">
              {t(L("Privacy notice", "Taarifa ya faragha"))}
            </Link>
            <WorkspaceText text="." />
          </p>
        </div>
      </div>
    </section>
  );
}
