import { L, type Localized } from "./content";

export type DivisionField = {
  key: string;
  label: Localized;
  type: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: Localized }[];
  required?: boolean;
  hint?: Localized;
  max?: number;
};
const options = (items: [string, string, string][]) =>
  items.map(([value, en, sw]) => ({ value, label: L(en, sw) }));

export const eventTypeOptions = options([
  ["Corporate event", "Corporate event", "Hafla ya kampuni"],
  ["Conference or workshop", "Conference or workshop", "Mkutano au warsha"],
  ["Institutional function", "Institutional function", "Shughuli ya taasisi"],
  ["Wedding or celebration", "Wedding or celebration", "Harusi au sherehe"],
  ["Private gathering", "Private gathering", "Mkusanyiko binafsi"],
  [
    "Recurring meal service",
    "Recurring meal service",
    "Chakula cha mara kwa mara",
  ],
  [
    "Other",
    "Other — describe your requirements",
    "Nyingine — eleza mahitaji yako",
  ],
]);
export const cateringStyleOptions = options([
  ["Buffet", "Buffet", "Bafe"],
  ["Plated service", "Plated service", "Huduma ya sahani"],
  ["Food stations", "Food stations", "Vituo vya chakula"],
  ["Packed meals", "Packed meals", "Chakula cha kufungashwa"],
  [
    "discuss",
    "Help me choose a serving style",
    "Nisaidie kuchagua mtindo wa huduma",
  ],
]);
export const regions = [
  "Arusha",
  "Dar es Salaam",
  "Dodoma",
  "Geita",
  "Iringa",
  "Kagera",
  "Katavi",
  "Kigoma",
  "Kilimanjaro",
  "Lindi",
  "Manyara",
  "Mara",
  "Mbeya",
  "Mjini Magharibi",
  "Morogoro",
  "Mtwara",
  "Mwanza",
  "Njombe",
  "Pemba North",
  "Pemba South",
  "Pwani",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Simiyu",
  "Singida",
  "Songwe",
  "Tabora",
  "Tanga",
  "Zanzibar North",
  "Zanzibar South",
  "remote",
  "other",
] as const;

export const divisionFields: Record<string, DivisionField[]> = {
  "event-management": [
    {
      key: "cateringRequired",
      label: L(
        "Include catering coordination?",
        "Ujumuishe uratibu wa upishi?",
      ),
      type: "select",
      required: true,
      options: options([
        [
          "yes",
          "Yes — discuss meals with the team",
          "Ndiyo — jadili milo na timu",
        ],
        ["no", "No catering needed", "Hakuna haja ya upishi"],
      ]),
    },
    {
      key: "eventDuration",
      label: L(
        "Event duration / number of days",
        "Muda wa hafla / idadi ya siku",
      ),
      type: "text",
    },
    {
      key: "venueStatus",
      label: L("Venue arrangements", "Mipango ya ukumbi"),
      type: "select",
      options: options([
        ["confirmed", "Venue already arranged", "Ukumbi umepangwa"],
        ["support", "Request venue coordination", "Omba uratibu wa ukumbi"],
        ["discuss", "To be discussed", "Tutajadili"],
      ]),
    },
    {
      key: "eventLogistics",
      label: L(
        "Programme, guest logistics & coordination",
        "Ratiba, usafiri wa wageni na uratibu",
      ),
      type: "textarea",
    },
  ],
  catering: [
    {
      key: "mealTimes",
      label: L(
        "Meals, service times & number of days",
        "Milo, muda wa huduma na idadi ya siku",
      ),
      type: "text",
    },
    {
      key: "kitchenAccess",
      label: L(
        "Kitchen, water & preparation access",
        "Ufikiaji wa jiko, maji na maandalizi",
      ),
      type: "select",
      options: options([
        [
          "available",
          "Facilities available — details to confirm",
          "Vifaa vipo — maelezo yatathibitishwa",
        ],
        [
          "none",
          "No preparation facilities on-site",
          "Hakuna vifaa vya maandalizi eneo hilo",
        ],
        ["discuss", "Site assessment needed", "Tathmini ya eneo inahitajika"],
      ]),
    },
    {
      key: "cateringLogistics",
      label: L(
        "Serving staff, transport & equipment",
        "Wahudumu, usafiri na vifaa",
      ),
      type: "textarea",
    },
  ],
  entertainment: [
    {
      key: "productionDuration",
      label: L(
        "Setup, performance & removal times",
        "Muda wa maandalizi, tukio na kuondoa vifaa",
      ),
      type: "text",
    },
    {
      key: "powerAvailability",
      label: L("Venue power arrangements", "Mpangilio wa umeme wa ukumbi"),
      type: "select",
      options: options([
        [
          "available",
          "Power available — inspection required",
          "Umeme upo — ukaguzi unahitajika",
        ],
        [
          "support",
          "Power / backup assessment needed",
          "Tathmini ya umeme / akiba inahitajika",
        ],
        ["unknown", "Not yet known", "Bado haijulikani"],
      ]),
    },
    {
      key: "productionSafety",
      label: L(
        "Rigging, permissions & technical restrictions",
        "Ufungaji, ruhusa na masharti ya kiufundi",
      ),
      type: "textarea",
      hint: L(
        "The team must verify venue permissions, performance/music rights, electrical safety, inspection and competent crew before delivery.",
        "Timu lazima ihakikishe ruhusa za ukumbi, haki za muziki, usalama wa umeme, ukaguzi na wahudumu wenye uwezo kabla ya huduma.",
      ),
    },
  ],
  "general-cleaning": [
    {
      key: "propertyType",
      label: L("Property type", "Aina ya jengo"),
      type: "select",
      required: true,
      options: options([
        ["office", "Office", "Ofisi"],
        ["institution", "School / institution", "Shule / taasisi"],
        ["venue", "Event venue", "Ukumbi wa hafla"],
        ["commercial", "Commercial premises", "Jengo la biashara"],
        ["other", "Other — describe below", "Nyingine — eleza hapa chini"],
      ]),
    },
    {
      key: "area",
      label: L("Approximate area (m²)", "Ukubwa wa takribani (m²)"),
      type: "number",
      max: 10000000,
      hint: L(
        "Leave blank if unknown; the team can assess the site.",
        "Acha wazi kama hujui; timu inaweza kutathmini eneo.",
      ),
    },
    {
      key: "floors",
      label: L("Number of floors", "Idadi ya ghorofa"),
      type: "number",
      max: 300,
    },
    {
      key: "frequency",
      label: L("Service frequency", "Marudio ya huduma"),
      type: "select",
      required: true,
      options: options([
        ["once", "One-time visit", "Ziara moja"],
        ["daily", "Daily", "Kila siku"],
        ["weekly", "Weekly", "Kila wiki"],
        ["monthly", "Monthly", "Kila mwezi"],
        [
          "periodic",
          "Other recurring plan",
          "Mpango mwingine wa mara kwa mara",
        ],
      ]),
    },
    {
      key: "inspectionDate",
      label: L(
        "Suggested inspection date",
        "Tarehe ya ukaguzi inayopendekezwa",
      ),
      type: "date",
      hint: L(
        "A suggestion only; staff must confirm the appointment.",
        "Pendekezo tu; timu lazima ithibitishe miadi.",
      ),
    },
    {
      key: "supplies",
      label: L("Cleaning materials & equipment", "Bidhaa na vifaa vya usafi"),
      type: "select",
      options: options([
        ["discuss", "To be discussed", "Tutajadili"],
        ["toc", "Request TOC supply", "Omba vifaa vya TOC"],
        ["client", "Client supplied", "Vifaa vya mteja"],
      ]),
    },
    {
      key: "accessRestrictions",
      label: L(
        "Access restrictions & safety considerations",
        "Masharti ya ufikiaji na usalama",
      ),
      type: "textarea",
      hint: L(
        "Mention restricted areas or special activities. Do not include door codes or security credentials.",
        "Taja maeneo yenye masharti au kazi maalumu. Usijumuishe misimbo ya milango au taarifa za siri.",
      ),
    },
  ],
  "ict-solutions": [
    {
      key: "ictCategory",
      label: L("ICT service category", "Aina ya huduma ya TEHAMA"),
      type: "select",
      required: true,
      options: options([
        ["website", "Website / CMS / portal", "Tovuti / CMS / mlango"],
        [
          "software",
          "Software / business system",
          "Programu / mfumo wa biashara",
        ],
        ["network", "Network / Wi-Fi", "Mtandao / Wi-Fi"],
        ["support", "IT support", "Msaada wa TEHAMA"],
        ["equipment", "Equipment & configuration", "Vifaa na usanidi"],
        [
          "security",
          "Authorized security assessment",
          "Tathmini ya usalama iliyoidhinishwa",
        ],
        [
          "automation",
          "Digital transformation / automation",
          "Mabadiliko ya kidijitali / otomatiki",
        ],
        ["ai", "AI workflow discovery", "Tathmini ya mifumo ya AI"],
        [
          "discovery",
          "Help me define the solution",
          "Nisaidie kubaini suluhisho",
        ],
      ]),
    },
    {
      key: "existingSystem",
      label: L(
        "Existing systems or environment",
        "Mifumo au mazingira yaliyopo",
      ),
      type: "text",
      hint: L(
        "For example: office Wi-Fi, Windows devices or an existing website. No passwords or keys.",
        "Mfano: Wi-Fi ya ofisi, vifaa vya Windows au tovuti iliyopo. Hakuna nywila au funguo.",
      ),
    },
    {
      key: "affectedUsers",
      label: L(
        "Approximate affected users",
        "Watumiaji walioathirika takribani",
      ),
      type: "number",
      max: 1000000,
    },
    {
      key: "urgency",
      label: L("Priority for assessment", "Kipaumbele cha tathmini"),
      type: "select",
      required: true,
      options: options([
        ["planning", "Planning a future project", "Kupanga mradi wa baadaye"],
        ["normal", "Normal", "Kawaida"],
        ["high", "High — business impact", "Juu — athari kwa biashara"],
        [
          "critical",
          "Critical — describe the impact",
          "Dharura — eleza athari",
        ],
      ]),
      hint: L(
        "Not an emergency channel or a guaranteed response time.",
        "Si njia ya dharura wala ahadi ya muda wa kujibu.",
      ),
    },
    {
      key: "deliveryMode",
      label: L(
        "Preferred delivery arrangement",
        "Mpangilio wa huduma unaopendekezwa",
      ),
      type: "select",
      options: options([
        ["discuss", "To be discussed", "Tutajadili"],
        ["remote", "Remote", "Kwa mbali"],
        ["onsite", "On-site", "Katika eneo"],
        ["hybrid", "Hybrid", "Mchanganyiko"],
      ]),
    },
    {
      key: "consultation",
      label: L(
        "Preferred consultation date / time",
        "Tarehe / muda wa mazungumzo",
      ),
      type: "text",
      hint: L(
        "A preference, not a confirmed appointment. State your timezone if outside Tanzania.",
        "Pendekezo, si miadi iliyothibitishwa. Taja saa za eneo kama uko nje ya Tanzania.",
      ),
    },
  ],
};
export const additionalServiceOptions = [
  "event-management",
  "catering",
  "general-cleaning",
  "ict-solutions",
  "entertainment",
] as const;
export const divisionPreferenceOptions: Record<string, Localized[]> = {
  "event-management": [
    L("Venue coordination", "Uratibu wa ukumbi"),
    L("Catering", "Upishi"),
    L("Decoration & styling", "Mapambo"),
    L("Sound & lighting", "Sauti na mwanga"),
    L("Photography & video", "Picha na video"),
    L("Guest coordination", "Uratibu wa wageni"),
  ],
  catering: [
    L("Tea & refreshments", "Chai na viburudisho"),
    L("Breakfast", "Kifungua kinywa"),
    L("Lunch or dinner buffet", "Bafe ya mchana au jioni"),
    L("Grilled food", "Chakula cha kuchoma"),
    L("Service staff", "Wahudumu"),
    L("Tableware & setup", "Vyombo na maandalizi"),
    L("Menu guidance requested", "Naomba mwongozo wa menyu"),
  ],
  entertainment: [
    L("Sound & microphones", "Sauti na vipaza sauti"),
    L("Stage & lighting", "Jukwaa na mwanga"),
    L("Photography", "Picha"),
    L("Videography", "Video"),
    L("Live entertainment", "Burudani ya moja kwa moja"),
    L("Event hosting", "Uongozaji wa hafla"),
    L("LED / presentation displays", "Skrini za LED / mawasilisho"),
    L("Livestreaming", "Matangazo ya moja kwa moja"),
    L("Technical guidance requested", "Naomba mwongozo wa kiufundi"),
  ],
  "general-cleaning": [
    L("Office cleaning", "Usafi wa ofisi"),
    L("Institutional cleaning", "Usafi wa taasisi"),
    L("Post-event cleaning", "Usafi baada ya hafla"),
    L("Deep cleaning", "Usafi wa kina"),
    L("Floor care", "Huduma za sakafu"),
    L("Washroom sanitation", "Usafi wa vyoo"),
    L("Facility support", "Msaada wa majengo"),
  ],
  "ict-solutions": [
    L("Requirements & discovery", "Mahitaji na tathmini"),
    L("Design & implementation", "Ubunifu na utekelezaji"),
    L("Testing & handover", "Majaribio na makabidhiano"),
    L("Documentation & training", "Nyaraka na mafunzo"),
    L("Ongoing support", "Msaada endelevu"),
  ],
};

// Shared display projection for the customer receipt, staff inbox, CSV and SMTP.
export function serviceDetailRows(
  data: Record<string, unknown>,
  language: "en" | "sw" = "en",
): [string, string][] {
  const fields = inquiryDivisionFields(
    String(data.service),
    String(data.cateringRequired || ""),
  );
  return fields.flatMap((field) => {
    const value = data[field.key];
    if (value === undefined || value === null || value === "") return [];
    const display =
      field.options?.find((option) => option.value === value)?.label[
        language
      ] || String(value);
    return [[field.label[language], display] as [string, string]];
  });
}

export function inquiryDivisionFields(
  service: string,
  cateringRequired = "",
): DivisionField[] {
  return [
    ...(divisionFields[service] || []),
    ...(service === "event-management" && cateringRequired === "yes"
      ? divisionFields.catering
      : []),
  ];
}
