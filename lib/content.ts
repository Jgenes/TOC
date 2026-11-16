export type Language = "en" | "sw";
export type Localized = { en: string; sw: string };
export const L = (en: string, sw: string): Localized => ({ en, sw });

export const company = {
  name: "TOC Investment Company Limited",
  brand: "Touch of Class",
  email: "touchofclassinvestment@gmail.com",
  phone: "+255 677 677 703",
  phoneHref: "+255677677703",
  secondaryPhone: "+255 755 439 072",
  location: "Kisasa, Dodoma, Tanzania",
  source:
    "TOC Website Blue Print.docx — corporate master-data register, section 2.2",
  verified: false,
};
export const isPreview = process.env.NEXT_PUBLIC_PREVIEW_MODE !== "false";

export type Service = {
  slug: "event-management" | "catering" | "entertainment";
  number: string;
  title: Localized;
  shortTitle: Localized;
  eyebrow: Localized;
  headline: Localized;
  description: Localized;
  intro: Localized;
  image: string;
  imageAlt: string;
  icon: "calendar" | "utensils" | "audio";
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
    slug: "entertainment",
    number: "03",
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

// These proposed divisions are intentionally excluded from public navigation and forms.
export const unpublishedDivisions = [
  {
    slug: "general-cleaning",
    status: "under_review",
    reason:
      "Standalone commercial scope, staffing and equipment require management approval.",
  },
  {
    slug: "ict-solutions",
    status: "draft",
    reason:
      "New proposed business line; delivery capability has not been established in the source profiles.",
  },
];

export const galleryImages = [
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
      "Tell us about your occasion, your people and what you have in mind.",
      "Tueleze kuhusu tukio lako, wageni na mawazo uliyonayo.",
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
    title: L("Enjoy the occasion", "Furahia tukio"),
    text: L(
      "We coordinate the agreed services, so you can focus on your guests.",
      "Tunaratibu huduma mlizokubaliana ili uzingatie wageni wako.",
    ),
  },
];
