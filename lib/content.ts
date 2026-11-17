export type Language = "en" | "sw";
export type Localized = { en: string; sw: string };
export type ContentSeo = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  socialTitle?: string;
  socialDescription?: string;
};
export type ImagePosition = "center" | "left" | "right" | "top" | "bottom";
export const L = (en: string, sw: string): Localized => ({ en, sw });

export type Company = {
  name: string;
  brand: string;
  email: string;
  phone: string;
  phoneHref: string;
  secondaryPhone: string;
  location: string;
  source: string;
  verified: boolean;
  social?: { label: string; url: string }[];
  whatsapp?: string;
};
export const company: Company = {
  name: "TOC Investment Company Limited",
  brand: "Touch of Class",
  email: "info@tocinvestment.co.tz",
  phone: "+255 677 677 703",
  phoneHref: "+255677677703",
  secondaryPhone: "+255 755 439 072",
  location: "Kisasa, Dodoma, Tanzania",
  source:
    "Email supplied by TOC for the SMTP integration; other contacts from TOC Website Blue Print.docx, section 2.2",
  verified: false,
};
export const isPreview = process.env.NEXT_PUBLIC_PREVIEW_MODE !== "false";

export type Service = {
  slug:
    | "event-management"
    | "catering"
    | "general-cleaning"
    | "ict-solutions"
    | "entertainment";
  number: string;
  title: Localized;
  shortTitle: Localized;
  eyebrow: Localized;
  headline: Localized;
  description: Localized;
  intro: Localized;
  image: string;
  imageAlt: string;
  imageAltLocalized?: Localized;
  imagePosition?: ImagePosition;
  mobileImagePosition?: ImagePosition;
  caption?: Localized;
  seo?: ContentSeo;
  mediaRights?: boolean;
  permissionEvidence?: string;
  icon: "calendar" | "utensils" | "sparkles" | "monitor" | "audio";
  cta?: Localized;
  workflow?: { title: Localized; description: Localized }[];
  safety?: Localized;
  tags: Localized[];
  capabilities: { title: Localized; description: Localized }[];
  faqs: { question: Localized; answer: Localized }[];
};

export const services: Service[] = [
  {
    slug: "event-management",
    number: "01",
    title: L("Event management", "Usimamizi wa hafla"),
    shortTitle: L("Events", "Hafla"),
    eyebrow: L("Every occasion, considered", "Kila tukio, kwa umakini"),
    headline: L(
      "Your occasion.\nOur attention to detail.",
      "Tukio lako.\nUmakini wetu.",
    ),
    description: L(
      "From the first idea to the final detail. Thoughtfully planned corporate, institutional and private events.",
      "Kuanzia wazo la kwanza hadi hatua ya mwisho. Mipango makini ya hafla za kampuni, taasisi na binafsi.",
    ),
    intro: L(
      "A successful event is more than a beautiful venue. It is a hundred details working together. We help you shape the plan, coordinate the moving parts and create a welcoming experience for your guests.",
      "Hafla bora ni zaidi ya ukumbi mzuri. Ni mambo mengi madogo yanayofanya kazi pamoja. Tunakusaidia kuandaa mpango, kuratibu shughuli na kuleta mazingira mazuri kwa wageni wako.",
    ),
    image: "/assets/event-management.webp",
    imageAlt:
      "Illustrative corporate banquet with warm lighting and elegantly arranged dining tables",
    icon: "calendar",
    tags: [
      L("Conferences & meetings", "Mikutano"),
      L("Corporate functions", "Hafla za kampuni"),
      L("Private celebrations", "Sherehe binafsi"),
    ],
    capabilities: [
      {
        title: L(
          "Conferences & institutional events",
          "Mikutano na hafla za taasisi",
        ),
        description: L(
          "Seminars, workshops, meetings and official functions, coordinated around your programme and guests.",
          "Semina, warsha, mikutano na shughuli rasmi zinazopangwa kulingana na ratiba na wageni wako.",
        ),
      },
      {
        title: L("Launches & exhibitions", "Uzinduzi na maonesho"),
        description: L(
          "Planning, venue presentation and supplier coordination for product launches and exhibitions.",
          "Mipango, maandalizi ya ukumbi na uratibu wa watoa huduma kwa uzinduzi na maonesho.",
        ),
      },
      {
        title: L("Celebrations & ceremonies", "Sherehe na hafla maalumu"),
        description: L(
          "Weddings, anniversaries, award ceremonies and personal milestones, shaped around your vision.",
          "Harusi, maadhimisho, hafla za tuzo na matukio maalumu kulingana na maono yako.",
        ),
      },
      {
        title: L("Planning & event logistics", "Mipango na uratibu wa hafla"),
        description: L(
          "Timelines, venue coordination, guest arrangements and production requirements brought into one plan.",
          "Ratiba, uratibu wa ukumbi, maandalizi ya wageni na mahitaji ya kiufundi katika mpango mmoja.",
        ),
      },
    ],
    faqs: [
      {
        question: L(
          "What information do you need to start planning?",
          "Mnahitaji taarifa gani kuanza mipango?",
        ),
        answer: L(
          "Share your event type, preferred date, location, approximate guest count and what you would like us to coordinate. If you are still exploring ideas, tell us what you know and we can discuss the rest.",
          "Tueleze aina ya hafla, tarehe unayopendelea, eneo, idadi ya wageni na huduma unazohitaji. Kama bado unaandaa mawazo, tueleze ulipofikia.",
        ),
      },
      {
        question: L(
          "Can you coordinate catering and production too?",
          "Mnaweza kuratibu upishi na huduma za kiufundi pia?",
        ),
        answer: L(
          "You can include catering, sound, lighting, photography and other event requirements in one inquiry. The team will confirm the scope, suppliers and availability before preparing a quotation.",
          "Unaweza kujumuisha upishi, sauti, mwanga, picha na mahitaji mengine katika ombi moja. Timu itathibitisha wigo wa huduma, watoa huduma na upatikanaji kabla ya bei rasmi.",
        ),
      },
      {
        question: L(
          "Does submitting a request reserve my date?",
          "Je, kutuma ombi kunahifadhi tarehe yangu?",
        ),
        answer: L(
          "No. A request starts a conversation. Event availability, the final quotation and booking terms must be confirmed directly by TOC.",
          "Hapana. Ombi linaanzisha mazungumzo. Upatikanaji, bei ya mwisho na masharti ya kuweka nafasi lazima vithibitishwe na TOC.",
        ),
      },
    ],
  },
  {
    slug: "catering",
    number: "02",
    title: L("Catering & food services", "Upishi na huduma za chakula"),
    shortTitle: L("Catering", "Upishi"),
    eyebrow: L(
      "Good food. Genuine hospitality.",
      "Chakula bora. Ukarimu wa dhati.",
    ),
    headline: L(
      "A memorable occasion\nstarts at the table.",
      "Tukio la kukumbukwa\nlinaanza mezani.",
    ),
    description: L(
      "Considered menus, welcoming service and food that brings people together. For business and life’s celebrations.",
      "Menyu makini, huduma ya ukarimu na chakula kinachowaunganisha watu. Kwa biashara na sherehe za maisha.",
    ),
    intro: L(
      "Whether it is a working lunch, an institutional meal programme or a special celebration, food sets the tone. Our catering approach brings menu planning, presentation and attentive service together around your occasion.",
      "Iwe ni chakula cha mchana kazini, mpango wa chakula wa taasisi au sherehe maalumu, chakula kinaweka hali ya tukio. Tunajumuisha mipango ya menyu, uwasilishaji na huduma makini kulingana na mahitaji yako.",
    ),
    image: "/assets/catering.webp",
    imageAlt:
      "Illustrative elegant buffet display in a contemporary dining room",
    icon: "utensils",
    tags: [
      L("Corporate catering", "Upishi wa kampuni"),
      L("Bespoke menus", "Menyu maalumu"),
      L("Institutional dining", "Chakula cha taasisi"),
    ],
    capabilities: [
      {
        title: L(
          "Corporate & conference catering",
          "Upishi wa kampuni na mikutano",
        ),
        description: L(
          "Tea breaks, refreshments, working lunches and buffets that fit naturally into your programme.",
          "Chai, viburudisho, chakula cha mchana na bafe vinavyoendana na ratiba yako.",
        ),
      },
      {
        title: L("Weddings & private occasions", "Harusi na sherehe binafsi"),
        description: L(
          "Menu planning and food service for wedding receptions, family gatherings and celebrations.",
          "Mipango ya menyu na huduma za chakula kwa harusi, mikusanyiko ya familia na sherehe.",
        ),
      },
      {
        title: L(
          "Institutional & canteen services",
          "Huduma za taasisi na kantini",
        ),
        description: L(
          "Discuss recurring meal-service arrangements for offices, institutions and organizational settings.",
          "Jadili mipango ya chakula ya mara kwa mara kwa ofisi, taasisi na mashirika.",
        ),
      },
      {
        title: L("Menus made around you", "Menyu kulingana na mahitaji yako"),
        description: L(
          "Buffets, grilled food, snacks and beverages. Dietary needs and allergens are reviewed with the catering team.",
          "Bafe, vyakula vya kuchoma, vitafunwa na vinywaji. Mahitaji ya chakula na mzio yanajadiliwa na timu ya upishi.",
        ),
      },
    ],
    faqs: [
      {
        question: L(
          "Can we customize the menu?",
          "Tunaweza kubadilisha menyu?",
        ),
        answer: L(
          "Yes, menu planning begins with your occasion, guest count, preferences and budget. The catering team will confirm the menu, portions, serving style and availability in a formal quotation.",
          "Ndiyo, mipango ya menyu inaanza na hafla yako, idadi ya wageni, mapendeleo na bajeti. Timu itathibitisha menyu, kiasi, mtindo wa huduma na upatikanaji katika bei rasmi.",
        ),
      },
      {
        question: L(
          "How do I share dietary requirements?",
          "Ninaelezaje mahitaji maalumu ya chakula?",
        ),
        answer: L(
          "Use the dietary requirements field in the catering request. Please avoid including medical records or personal health information. Discuss allergens and any critical requirements directly with the team before confirming.",
          "Tumia sehemu ya mahitaji maalumu katika ombi la upishi. Tafadhali usitume rekodi za afya. Jadili mzio na mahitaji muhimu moja kwa moja na timu kabla ya kuthibitisha.",
        ),
      },
      {
        question: L(
          "Are catering prices available online?",
          "Bei za upishi zinapatikana mtandaoni?",
        ),
        answer: L(
          "Every occasion has different requirements. TOC prepares a tailored quotation after reviewing your menu, guest count, location and service arrangements. No online estimate is a binding offer.",
          "Kila hafla ina mahitaji tofauti. TOC huandaa bei maalumu baada ya kupitia menyu, idadi ya wageni, eneo na huduma. Hakuna makadirio ya mtandaoni yaliyo bei ya mwisho.",
        ),
      },
    ],
  },
  {
    slug: "general-cleaning",
    number: "03",
    title: L(
      "General cleaning & facility services",
      "Usafi na huduma za majengo",
    ),
    shortTitle: L("Cleaning", "Usafi"),
    eyebrow: L(
      "Cleaner spaces. Considered care.",
      "Mazingira safi. Uangalifu makini.",
    ),
    headline: L(
      "A fresh start.\nA space that works.",
      "Mwanzo mpya.\nMazingira yanayofaa.",
    ),
    description: L(
      "Office, institutional and post-event cleaning. Start with a site assessment and a scope shaped around your premises.",
      "Usafi wa ofisi, taasisi na baada ya hafla. Anza na tathmini ya eneo na huduma zinazofaa jengo lako.",
    ),
    intro: L(
      "One visit or an ongoing plan: tell us about your premises, the areas that need attention and your preferred schedule. The team reviews access, supplies, staffing and safety before confirming the work. Specialist or hazardous cleaning is not assumed to be included.",
      "Ziara moja au mpango endelevu: tueleze kuhusu jengo, maeneo yanayohitaji huduma na ratiba unayopendelea. Timu hupitia ufikiaji, vifaa, wafanyakazi na usalama kabla ya kuthibitisha. Usafi hatarishi haujumuishwi moja kwa moja.",
    ),
    image: "/assets/general-cleaning.webp",
    imageAlt:
      "AI-generated illustration of a clean contemporary office with professional cleaning equipment; not a TOC project",
    icon: "sparkles",
    cta: L("Request a site assessment", "Omba tathmini ya eneo"),
    tags: [
      L("Workplaces & institutions", "Ofisi na taasisi"),
      L("One-time & recurring", "Mara moja na mara kwa mara"),
      L("Post-event cleaning", "Usafi baada ya hafla"),
    ],
    capabilities: [
      {
        title: L(
          "Office & institutional cleaning",
          "Usafi wa ofisi na taasisi",
        ),
        description: L(
          "Discuss cleaning for workspaces, shared areas, schools and institutional premises, with agreed access and supervision.",
          "Jadili usafi wa sehemu za kazi, maeneo ya pamoja, shule na taasisi kwa ufikiaji na usimamizi uliokubaliwa.",
        ),
      },
      {
        title: L(
          "Post-event & deep cleaning",
          "Usafi baada ya hafla na wa kina",
        ),
        description: L(
          "Define the venue handover, detailed cleaning areas and waste arrangements before the job is agreed.",
          "Eleza makabidhiano ya ukumbi, maeneo ya usafi wa kina na mpango wa taka kabla ya makubaliano.",
        ),
      },
      {
        title: L("Floor care & washroom sanitation", "Sakafu na usafi wa vyoo"),
        description: L(
          "An assessment identifies floor finishes, washroom requirements and suitable materials; methods and equipment are confirmed by staff.",
          "Tathmini hubaini aina ya sakafu, mahitaji ya vyoo na vifaa vinavyofaa; mbinu na vifaa huthibitishwa na timu.",
        ),
      },
      {
        title: L(
          "Scheduled facility support",
          "Huduma za majengo zenye ratiba",
        ),
        description: L(
          "Request daily, weekly or monthly visits with an agreed checklist, supervisor review and a record for each visit.",
          "Omba ziara za kila siku, wiki au mwezi zenye orodha ya kazi, mapitio ya msimamizi na rekodi ya kila ziara.",
        ),
      },
    ],
    workflow: [
      {
        title: L("Assess the site", "Tathmini eneo"),
        description: L(
          "Review premises, access and any inspection needs.",
          "Pitia jengo, ufikiaji na hitaji la ukaguzi.",
        ),
      },
      {
        title: L("Agree the plan", "Kubali mpango"),
        description: L(
          "Confirm areas, methods, supplies, frequency and a reviewed quotation.",
          "Thibitisha maeneo, mbinu, vifaa, marudio na bei iliyopitiwa.",
        ),
      },
      {
        title: L("Coordinate the work", "Ratibu kazi"),
        description: L(
          "Assign the supervisor, team, schedule and service checklist.",
          "Panga msimamizi, timu, ratiba na orodha ya kazi.",
        ),
      },
      {
        title: L("Inspect & improve", "Kagua na boresha"),
        description: L(
          "Record checklist completion, issues and customer feedback.",
          "Rekodi kazi zilizokamilika, changamoto na maoni ya mteja.",
        ),
      },
    ],
    safety: L(
      "No hazardous-material, medical-waste or high-risk industrial work is offered automatically. Access restrictions, chemicals, equipment and specialist activities require an explicit safety review. Coverage and capacity are confirmed for each request.",
      "Hakuna huduma za vitu hatarishi, taka za hospitali au viwanda hatarishi zinazotolewa moja kwa moja. Masharti ya ufikiaji, kemikali, vifaa na kazi maalumu huhitaji mapitio ya usalama. Eneo na uwezo huthibitishwa kwa kila ombi.",
    ),
    faqs: [
      {
        question: L(
          "Can I request a recurring cleaning plan?",
          "Ninaweza kuomba mpango wa usafi wa mara kwa mara?",
        ),
        answer: L(
          "Yes. Select a frequency in your request. Staff will discuss the contract, visit schedule, supervision and checklist. A request alone does not create a confirmed cleaning contract.",
          "Ndiyo. Chagua marudio kwenye ombi. Timu itajadili mkataba, ratiba, usimamizi na orodha ya kazi. Ombi pekee halithibitishi mkataba.",
        ),
      },
      {
        question: L(
          "Do you need to inspect the premises first?",
          "Mnahitaji kukagua jengo kwanza?",
        ),
        answer: L(
          "A site assessment may be needed to confirm the area, surfaces, access and safety requirements. You may suggest an inspection date; staff must confirm it.",
          "Tathmini inaweza kuhitajika kuthibitisha ukubwa, sakafu, ufikiaji na usalama. Unaweza kupendekeza tarehe ya ukaguzi; timu lazima iithibitishe.",
        ),
      },
      {
        question: L(
          "Who supplies the equipment and cleaning materials?",
          "Nani anatoa vifaa na bidhaa za usafi?",
        ),
        answer: L(
          "Choose client-supplied, TOC-supplied or to be discussed. Exact equipment, materials, supervision and responsibilities are agreed in the scope, not guaranteed by this website.",
          "Chagua vifaa vya mteja, vya TOC au vya kujadili. Vifaa, bidhaa, usimamizi na majukumu hukubaliwa kwenye wigo wa kazi; tovuti haitoi hakikisho.",
        ),
      },
    ],
  },
  {
    slug: "ict-solutions",
    number: "04",
    title: L("ICT & digital solutions", "TEHAMA na suluhisho za kidijitali"),
    shortTitle: L("ICT solutions", "Suluhisho za TEHAMA"),
    eyebrow: L("Technology with a purpose.", "Teknolojia yenye kusudi."),
    headline: L(
      "Better systems.\nBetter business.",
      "Mifumo bora.\nBiashara bora.",
    ),
    description: L(
      "Websites, digital workflows, networking and IT support. Describe your challenge and start a practical technical conversation.",
      "Tovuti, mifumo ya kazi, mitandao na msaada wa TEHAMA. Eleza changamoto yako tuanze mazungumzo ya kiufundi.",
    ),
    intro: L(
      "Start with the problem, not the jargon. Tell us what your organization needs to improve, the systems involved and the people affected. The technical team reviews feasibility and delivery capability before proposing a solution, timetable or support arrangement.",
      "Anza na tatizo, si misamiati migumu. Tueleze kinachohitaji kuboreshwa, mifumo inayohusika na watu walioathirika. Timu ya kiufundi hupitia uwezekano na uwezo kabla ya kupendekeza suluhisho, ratiba au msaada.",
    ),
    image: "/assets/ict-solutions.webp",
    imageAlt:
      "AI-generated illustration of an organized technology workspace and network equipment; not a TOC project",
    icon: "monitor",
    cta: L("Discuss your ICT project", "Jadili mradi wako wa TEHAMA"),
    tags: [
      L("Websites & digital systems", "Tovuti na mifumo ya kidijitali"),
      L("Networks & IT support", "Mitandao na msaada wa TEHAMA"),
      L("Technical discovery", "Tathmini ya kiufundi"),
    ],
    capabilities: [
      {
        title: L("Websites & software", "Tovuti na programu"),
        description: L(
          "Discuss corporate websites, content management, portals, dashboards and software workflows. Requirements, testing and handover are scoped before delivery.",
          "Jadili tovuti za kampuni, usimamizi wa maudhui, milango, dashibodi na mifumo ya programu. Mahitaji, majaribio na makabidhiano hupangwa kabla ya utekelezaji.",
        ),
      },
      {
        title: L("Networks & IT support", "Mitandao na msaada wa TEHAMA"),
        description: L(
          "Describe LAN, Wi-Fi, device, software or user-support issues. Staff will assess the environment and agree the authorized support scope.",
          "Eleza matatizo ya LAN, Wi-Fi, vifaa, programu au watumiaji. Timu itatathmini mazingira na kukubaliana wigo wa msaada.",
        ),
      },
      {
        title: L(
          "Equipment & digital transformation",
          "Vifaa na mabadiliko ya kidijitali",
        ),
        description: L(
          "Request advice on equipment specifications, configuration, process mapping and automation. Procurement and vendor arrangements require separate confirmation.",
          "Omba ushauri wa vipimo vya vifaa, usanidi, michakato na otomatiki. Ununuzi na mipango ya wauzaji huhitaji uthibitisho tofauti.",
        ),
      },
      {
        title: L("Security & AI discovery", "Tathmini ya usalama na AI"),
        description: L(
          "Discuss authorized protective controls and human-reviewed AI workflows. Specialist work depends on verified expertise, written scope and explicit authorization; no certification or compliance guarantee is implied.",
          "Jadili udhibiti ulioidhinishwa na mifumo ya AI inayopitiwa na binadamu. Kazi maalumu hutegemea utaalamu uliothibitishwa, wigo wa maandishi na idhini; hakuna hakikisho la cheti au utii wa sheria.",
        ),
      },
    ],
    workflow: [
      {
        title: L("Discover", "Elewa mahitaji"),
        description: L(
          "Document the problem, requirements and business objectives.",
          "Rekodi tatizo, mahitaji na malengo ya biashara.",
        ),
      },
      {
        title: L("Design & authorize", "Buni na idhinisha"),
        description: L(
          "Review the solution, scope, quotation and written authorization.",
          "Pitia suluhisho, wigo, bei na idhini ya maandishi.",
        ),
      },
      {
        title: L("Implement & test", "Tekeleza na jaribu"),
        description: L(
          "Track work, changes, functional tests and acceptance evidence.",
          "Fuatilia kazi, mabadiliko, majaribio na ushahidi wa kukubalika.",
        ),
      },
      {
        title: L("Hand over", "Kabidhi"),
        description: L(
          "Agree documentation, training, support and customer acceptance.",
          "Kubali nyaraka, mafunzo, msaada na kukubalika na mteja.",
        ),
      },
    ],
    safety: L(
      "Never submit passwords, API keys, private keys or production credentials. Urgency is a triage preference, not a guaranteed response time. Cybersecurity assessments require written authorization. Confidential files are exchanged only through the protected document workflow after staff review.",
      "Usitume nywila, funguo za API, funguo binafsi au taarifa za siri za mifumo. Uharaka ni kipaumbele cha tathmini, si ahadi ya muda wa majibu. Tathmini za usalama huhitaji idhini ya maandishi. Faili za siri hutumwa kupitia mfumo uliolindwa baada ya mapitio ya timu.",
    ),
    faqs: [
      {
        question: L(
          "What should I include in an ICT request?",
          "Nijumuishe nini katika ombi la TEHAMA?",
        ),
        answer: L(
          "Describe the business problem, existing systems, approximate affected users, urgency, location or remote preference and consultation needs. Never include credentials or confidential production data.",
          "Eleza tatizo, mifumo iliyopo, watumiaji walioathirika, uharaka, eneo au msaada wa mbali na hitaji la mazungumzo. Usijumuishe nywila au data za siri.",
        ),
      },
      {
        question: L(
          "Does critical urgency guarantee immediate support?",
          "Kipaumbele cha dharura kinahakikisha msaada wa papo hapo?",
        ),
        answer: L(
          "No. Staff must confirm availability, responsibilities and any service-level agreement. This public form is not an emergency response service.",
          "Hapana. Timu lazima ithibitishe upatikanaji, majukumu na makubaliano ya huduma. Fomu hii si huduma ya kujibu dharura.",
        ),
      },
      {
        question: L(
          "Can I request software, networking and support together?",
          "Ninaweza kuomba programu, mitandao na msaada pamoja?",
        ),
        answer: L(
          "Yes. Explain the combined requirement. The technical team will confirm the delivery scope, competencies, dependencies, testing, documentation and support terms before work begins.",
          "Ndiyo. Eleza mahitaji kwa pamoja. Timu itathibitisha wigo, utaalamu, utegemezi, majaribio, nyaraka na masharti ya msaada kabla ya kazi kuanza.",
        ),
      },
    ],
  },
  {
    slug: "entertainment",
    number: "05",
    title: L("Entertainment & production", "Burudani na uzalishaji wa hafla"),
    shortTitle: L("Production", "Uzalishaji"),
    eyebrow: L(
      "Set the scene. Bring it to life.",
      "Andaa mazingira. Leta uhai.",
    ),
    headline: L(
      "Make every moment\nfeel extraordinary.",
      "Fanya kila wakati\nuwe wa kipekee.",
    ),
    description: L(
      "Sound, lighting, photography and live event coordination. The finishing touches that make the difference.",
      "Sauti, mwanga, picha na uratibu wa burudani. Miguso ya mwisho inayoleta tofauti.",
    ),
    intro: L(
      "From a clear presentation to a beautifully lit celebration, the technical details matter. Share the atmosphere you have in mind and we will discuss the production and entertainment arrangements your occasion needs.",
      "Kuanzia wasilisho linalosikika vizuri hadi sherehe yenye mwanga mzuri, maelezo ya kiufundi ni muhimu. Tueleze mazingira unayotaka ili tujadili maandalizi ya kiufundi na burudani unayohitaji.",
    ),
    image: "/assets/entertainment.webp",
    imageAlt:
      "Illustrative professional live-event sound and lighting control desk",
    icon: "audio",
    tags: [
      L("Sound & lighting", "Sauti na mwanga"),
      L("Photography & video", "Picha na video"),
      L("Live entertainment", "Burudani ya moja kwa moja"),
    ],
    capabilities: [
      {
        title: L("Sound & presentation", "Sauti na mawasilisho"),
        description: L(
          "Discuss microphones, sound reinforcement and presentation requirements for your venue and programme.",
          "Jadili mahitaji ya vipaza sauti, mfumo wa sauti na mawasilisho kwa ukumbi na ratiba yako.",
        ),
      },
      {
        title: L(
          "Stage & lighting coordination",
          "Uratibu wa jukwaa na mwanga",
        ),
        description: L(
          "Bring stage presentation, ambient lighting and technical suppliers into a coordinated event plan.",
          "Unganisha mwonekano wa jukwaa, mwanga na watoa huduma za kiufundi katika mpango mmoja.",
        ),
      },
      {
        title: L("Photography & videography", "Picha na video"),
        description: L(
          "Plan the moments you want to capture, the coverage required and your preferred final deliverables.",
          "Panga matukio unayotaka kunasa, muda wa huduma na kazi za mwisho unazohitaji.",
        ),
      },
      {
        title: L("Entertainment arrangements", "Mipango ya burudani"),
        description: L(
          "Discuss live performances, event hosting and entertainment suited to your audience and occasion.",
          "Jadili maonesho ya moja kwa moja, uongozaji wa hafla na burudani inayofaa wageni na tukio lako.",
        ),
      },
    ],
    faqs: [
      {
        question: L(
          "Can I book equipment or performers online?",
          "Ninaweza kuweka nafasi ya vifaa au wasanii mtandaoni?",
        ),
        answer: L(
          "You can send a requirements inquiry online. Equipment, suppliers, performers, availability and technical specifications are confirmed by staff before any booking or commitment.",
          "Unaweza kutuma mahitaji mtandaoni. Vifaa, watoa huduma, wasanii, upatikanaji na vipimo vya kiufundi vinathibitishwa na timu kabla ya kuweka nafasi.",
        ),
      },
      {
        question: L(
          "Can production be part of an event request?",
          "Huduma za kiufundi zinaweza kuwa sehemu ya ombi la hafla?",
        ),
        answer: L(
          "Yes. Add sound, lighting, stage or photography requirements to your event inquiry so the team can review everything together.",
          "Ndiyo. Ongeza mahitaji ya sauti, mwanga, jukwaa au picha katika ombi lako la hafla ili timu ipitie kila kitu pamoja.",
        ),
      },
      {
        question: L(
          "Is all equipment owned by TOC?",
          "Je, vifaa vyote vinamilikiwa na TOC?",
        ),
        answer: L(
          "Specific arrangements may involve TOC, rental providers or external specialists. Your proposal should confirm the agreed scope and delivery arrangements; the website does not guarantee equipment ownership or availability.",
          "Mipango inaweza kujumuisha TOC, watoa vifaa vya kukodi au wataalamu wengine. Pendekezo lako litathibitisha huduma na mpango wa utekelezaji; tovuti haihakikishi umiliki au upatikanaji wa vifaa.",
        ),
      },
    ],
  },
];

// All five divisions are included at the user's direction on 17 November 2026.
// Inclusion is not evidence of certifications, equipment ownership or available capacity.
export const unpublishedDivisions: {
  slug: string;
  status: string;
  reason: string;
}[] = [];

export const galleryImages = [
  {
    id: "cleaning",
    src: "/assets/general-cleaning.webp",
    category: "cleaning",
    title: L("A cleaner working day", "Siku ya kazi katika usafi"),
    subtitle: L(
      "AI-generated cleaning inspiration",
      "Msukumo wa usafi uliotengenezwa kwa AI",
    ),
  },
  {
    id: "ict",
    src: "/assets/ict-solutions.webp",
    category: "ict",
    title: L("Connected to better possibilities", "Unganika na uwezekano bora"),
    subtitle: L(
      "AI-generated ICT inspiration",
      "Msukumo wa TEHAMA uliotengenezwa kwa AI",
    ),
  },
  {
    id: "gala",
    src: "/assets/hero.webp",
    category: "events",
    title: L("An occasion to remember", "Tukio la kukumbukwa"),
    subtitle: L(
      "Gala & celebration inspiration",
      "Msukumo wa sherehe na hafla",
    ),
  },
  {
    id: "conference",
    src: "/assets/gallery-conference.webp",
    category: "events",
    title: L(
      "Set for meaningful conversations",
      "Mazingira ya mazungumzo muhimu",
    ),
    subtitle: L("Conference inspiration", "Msukumo wa mikutano"),
  },
  {
    id: "buffet",
    src: "/assets/catering.webp",
    category: "catering",
    title: L(
      "A warm welcome, beautifully served",
      "Ukaribisho mzuri, huduma ya kuvutia",
    ),
    subtitle: L(
      "Buffet & hospitality inspiration",
      "Msukumo wa bafe na ukarimu",
    ),
  },
  {
    id: "production",
    src: "/assets/entertainment.webp",
    category: "production",
    title: L(
      "Behind every memorable moment",
      "Nyuma ya kila wakati wa kukumbukwa",
    ),
    subtitle: L(
      "Live production inspiration",
      "Msukumo wa uzalishaji wa hafla",
    ),
  },
  {
    id: "dining",
    src: "/assets/gallery-gala.webp",
    category: "events",
    title: L(
      "Every place setting, considered",
      "Kila meza imeandaliwa kwa makini",
    ),
    subtitle: L("Formal dining inspiration", "Msukumo wa chakula rasmi"),
  },
  {
    id: "corporate-catering",
    src: "/assets/gallery-catering.webp",
    category: "catering",
    title: L("Bringing people to the table", "Kuwaunganisha watu mezani"),
    subtitle: L(
      "Corporate catering inspiration",
      "Msukumo wa upishi wa kampuni",
    ),
  },
  {
    id: "exhibition",
    src: "/assets/gallery-exhibition.webp",
    category: "events",
    title: L(
      "Space for your next big idea",
      "Nafasi ya wazo lako kubwa lijalo",
    ),
    subtitle: L("Exhibition inspiration", "Msukumo wa maonesho"),
  },
  {
    id: "live-event",
    src: "/assets/gallery-production.webp",
    category: "production",
    title: L("Capture the atmosphere", "Nasa mazingira ya tukio"),
    subtitle: L("Event photography inspiration", "Msukumo wa picha za hafla"),
  },
  {
    id: "fresh",
    src: "/assets/about-detail.webp",
    category: "catering",
    title: L("Care in the preparation", "Umakini katika maandalizi"),
    subtitle: L(
      "Food preparation inspiration",
      "Msukumo wa maandalizi ya chakula",
    ),
  },
];

export const values = [
  {
    title: L("Quality, without shortcuts", "Ubora bila njia za mkato"),
    text: L(
      "Care in the preparation. Consideration in the presentation. Attention in the delivery.",
      "Umakini katika maandalizi, uwasilishaji na utoaji wa huduma.",
    ),
  },
  {
    title: L("Professional from the start", "Utaalamu kuanzia mwanzo"),
    text: L(
      "Clear conversations, thoughtful planning and respect for every commitment we make.",
      "Mazungumzo ya wazi, mipango makini na kuheshimu kila ahadi tunayotoa.",
    ),
  },
  {
    title: L("Hospitality with heart", "Ukarimu kutoka moyoni"),
    text: L(
      "An approachable team and a service experience shaped around the people who matter to you.",
      "Timu rafiki na huduma inayopangwa kwa watu walio muhimu kwako.",
    ),
  },
  {
    title: L("Integrity in every detail", "Uadilifu katika kila hatua"),
    text: L(
      "Honest advice, transparent scope and the belief that trust is earned through our actions.",
      "Ushauri wa kweli, wigo wazi wa huduma na imani kuwa uaminifu unajengwa kwa matendo.",
    ),
  },
];

export const processSteps = [
  {
    title: L("Share your vision", "Shiriki maono yako"),
    text: L(
      "Tell us about your event, premises or technical challenge and what you have in mind.",
      "Tueleze kuhusu hafla, jengo au changamoto ya kiufundi na mawazo uliyonayo.",
    ),
  },
  {
    title: L("Shape the details", "Panga maelezo"),
    text: L(
      "We discuss the scope, practicalities and a plan that fits your requirements.",
      "Tunajadili huduma, mahitaji ya msingi na mpango unaokufaa.",
    ),
  },
  {
    title: L("Make it official", "Thibitisha makubaliano"),
    text: L(
      "Review your tailored quotation and agree on the details with our team.",
      "Pitia bei maalumu na ukubaliane na timu yetu kuhusu maelezo.",
    ),
  },
  {
    title: L("Deliver & review", "Tekeleza na tathmini"),
    text: L(
      "We coordinate the agreed services and review the result with you.",
      "Tunaratibu huduma mlizokubaliana na kupitia matokeo pamoja nawe.",
    ),
  },
];
