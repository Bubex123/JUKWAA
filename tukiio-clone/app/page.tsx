"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  MapPin,
  Menu,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Ticket,
  WalletCards,
  X,
} from "lucide-react";

type EventSummary = {
  id: string;
  category: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  price: number;
  currency: "TZS";
  image: string;
  badge: string | null;
  ticketTypes: { id: string; name: string; price: number; available: number }[];
};

const apiBase =
  process.env.NEXT_PUBLIC_TUKIO_API_URL ?? "http://localhost:3001/api/v1";
const supportPhone = "+255 610 452 257";
const supportPhoneLink = `tel:${supportPhone.replaceAll(" ", "")}`;

const categories = ["Zote", "Muziki", "Kongamano", "Burudani", "Sherehe", "Michezo", "Movies", "Buses", "Flights"];

const faqs = [
  {
    question: "Je, ninawezaje kulipia tiketi kwa njia gani?",
    answer:
      "Unaweza kulipia kwa M-Pesa, Tigo Pesa, Airtel Money au HaloPesa. Chagua njia unayotumia wakati wa kulipia.",
  },
  {
    question: "Nitapokea tiketi yangu vipi?",
    answer:
      "Tiketi yenye QR Code itatumwa papo hapo kwa WhatsApp, SMS na barua pepe uliyoingiza wakati wa malipo.",
  },
  {
    question: "Lipa Kidogo Kidogo inafanyaje kazi?",
    answer:
      "Kwa baadhi ya matukio unaweza kuweka nafasi kwa malipo ya awali na kulipa salio kabla ya muda wa tukio. Masharti huonyeshwa kwenye ukurasa wa tiketi.",
  },
  {
    question: "Je, tiketi inaweza kutumika mara mbili?",
    answer:
      "Hapana. QR Code ya kila tiketi ni ya kipekee na huchanganuliwa mara moja tu mlangoni.",
  },
  {
    question: "Muandaaji hupokea pesa yake lini?",
    answer:
      "Malipo huthibitishwa baada ya kila mauzo. Muandaaji anaweza kufuatilia mauzo na malipo kupitia dashibodi yake.",
  },
  {
    question: "Je, naweza kufuatilia mauzo ya tukio langu?",
    answer:
      "Ndiyo. Dashibodi ya Tukio inakuonyesha tiketi zilizouzwa, malipo na hali ya wageni wanaoingia kwa wakati halisi.",
  },
];

const steps = [
  {
    number: "01",
    title: "Jisajili na Weka Tukio",
    text: "Unda akaunti yako, weka taarifa za tukio, mahali, muda na aina za tiketi kama VIP au Early Bird.",
  },
  {
    number: "02",
    title: "Uza Tiketi Mtandaoni",
    text: "Wahudhuriaji wanunue papo hapo kwa M-Pesa, Tigo Pesa, Airtel Money au HaloPesa.",
  },
  {
    number: "03",
    title: "Tuma Tiketi kwa QR Code",
    text: "Tiketi za kidijitali zenye QR Code zinatumwa papo hapo kupitia WhatsApp, SMS au email.",
  },
  {
    number: "04",
    title: "Hakiki Wageni kwa Kusani",
    text: "Wakaguzi wanathibitisha QR Code kwa App ya Tukio kuzua utapeli na kupunguza misongamano.",
  },
  {
    number: "05",
    title: "Pokea Pesa Yako Haraka",
    text: "Fuatilia mauzo kwa wakati halisi na toa mapato yako ndani ya saa 24.",
  },
];

const featureRows = [
  "Malipo ya Mobile Money",
  "Tiketi kwa WhatsApp/SMS",
  "Lipa Kidogo Kidogo",
  "Uhakiki wa QR gateni",
  "Pesa ndani ya saa 24",
  "Huduma kwa Kiswahili",
];

const features = [
  {
    icon: WalletCards,
    title: "Malipo ya Mobile Money",
    text: "Lipa papo hapo kwa M-Pesa, Tigo Pesa, Airtel Money au HaloPesa bila kadi ya benki.",
    link: "Lipa kwa Mobile Money",
    href: "/matukio",
    large: true,
  },
  {
    icon: QrCode,
    title: "Tiketi za QR Code",
    text: "Tiketi yenye QR Code inatumwa papo hapo kwa WhatsApp, SMS, au Email.",
    link: "Pata tiketi ya QR",
    href: "/matukio",
  },
  {
    icon: Clock3,
    title: "Mauzo kwa Wakati Halisi",
    text: "Fuatilia idadi ya tiketi na pesa zinazoingia kwenye simu au kompyuta yako.",
    link: "Nunua tiketi",
    href: "/organizer",
  },
  {
    icon: ShieldCheck,
    title: "Uhakiki Gateni",
    text: "Skani QR Code gateni kuzuia tiketi moja kutumika mara mbili.",
    link: "Nunua tiketi",
    href: "/organizer",
    wide: true,
  },
  {
    icon: CreditCard,
    title: "Lipa Kidogo Kidogo",
    text: "Wahudhuriaji wanaweza kulipia tiketi hatua kwa hatua.",
    link: "Anza kulipa kidogo",
    href: "/matukio",
  },
  {
    icon: CircleDollarSign,
    title: "Malipo ya Haraka",
    text: "Waandaaji hupokea pesa zao za mauzo ndani ya saa 24.",
    link: "Nunua tiketi",
    href: "/organizer",
  },
];

function Brand() {
  return (
    <a className="brand" href="#nyumbani" aria-label="Tukio - mwanzo">
      <span className="brand-mark">t</span>
      <span>Tukio</span>
    </a>
  );
}

function TicketPreview() {
  return (
    <div className="ticket-preview" aria-label="Mfano wa tiketi ya Tukio">
      <div className="ticket-top">
        <span className="ticket-kicker">TIKETI YA KIDIJITALI</span>
        <h3>Bongo Flava Honors 2026</h3>
        <div className="ticket-meta">
          <span>
            <CalendarDays size={13} /> Jumamosi, 12 Desemba · 20:00
          </span>
          <span>
            <MapPin size={13} /> The Super Dome, Dar es Salaam
          </span>
        </div>
      </div>
      <div className="ticket-content">
        <div className="qr-art" aria-hidden="true">
          {Array.from({ length: 121 }, (_, index) => (
            <span
              className={
                (index * 13 + index * index * 7 + Math.floor(index / 11)) %
                  5 <
                2
                  ? "qr-cell filled"
                  : "qr-cell"
              }
              key={index}
            />
          ))}
          <span className="qr-eye qr-eye-one" />
          <span className="qr-eye qr-eye-two" />
          <span className="qr-eye qr-eye-three" />
        </div>
        <div className="ticket-details">
          <span>Aina ya tiketi</span>
          <strong>VIP</strong>
          <span>Mwenye tiketi</span>
          <strong>Juma A. Mwakalinga</strong>
          <span>Namba ya tiketi</span>
          <strong>TK-4829-70T3</strong>
          <span>Kuingia</span>
          <strong>Gate B</strong>
        </div>
      </div>
      <div className="ticket-footer">
        <BadgeCheck size={15} />
        <span>Onyesha QR Code hii getini. Usiishirikishe na mtu mwingine.</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [eventsRetry, setEventsRetry] = useState(0);
  const [category, setCategory] = useState("Zote");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setEventsLoading(true);
      setEventsError(false);

      try {
        const response = await fetch(`${apiBase}/events`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Event request failed");

        const payload: { data?: EventSummary[] } = await response.json();
        if (!Array.isArray(payload.data)) throw new Error("Invalid event response");
        setEvents(payload.data);
      } catch {
        if (!controller.signal.aborted) setEventsError(true);
      } finally {
        if (!controller.signal.aborted) setEventsLoading(false);
      }
    }

    void loadEvents();
    return () => controller.abort();
  }, [eventsRetry]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sw");
    return events.filter((event) => {
      const matchesCategory = category === "Zote" || event.category === category;
      const matchesSearch =
        query.length === 0 ||
        `${event.title} ${event.category} ${event.venue}`
          .toLocaleLowerCase("sw")
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search, events]);

  return (
    <main id="nyumbani">
      <header className="site-header">
        <div className="container nav-wrap">
          <Brand />
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "Funga menyu" : "Fungua menyu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav
            className={`main-nav${mobileMenuOpen ? " is-open" : ""}`}
            aria-label="Menyu kuu"
          >
            <a href="/matukio" onClick={() => setMobileMenuOpen(false)}>
              Matukio
            </a>
            <a href="#jinsi-inavyofanya" onClick={() => setMobileMenuOpen(false)}>
              Jinsi inavyofanya kazi
            </a>
            <a href="#huduma" onClick={() => setMobileMenuOpen(false)}>
              Huduma
            </a>
            <a href="#wasiliana" onClick={() => setMobileMenuOpen(false)}>
              Wasiliana
            </a>
          </nav>
          <a className="button button-primary nav-cta" href="/organizer">
            Anza sasa <ArrowUpRight size={15} />
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-image" role="img" aria-label="Wageni wakiingia kwenye tamasha" />
        <div className="hero-shade" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-light">
              <span className="eyebrow-dot" />
              Tiketi na kidijitali Tanzania
            </span>
            <h1>
              Uza na nunua
              <br />
              tiketi kwa <em>urahisi</em>
            </h1>
            <p>
              Tukio linaunganisha waandaaji na wahudhuriaji kwa malipo ya
              Mobile Money na tiketi za QR Code zinazotumwa papo hapo.
            </p>
            <div className="hero-actions">
              <a className="button button-white" href="/organizer">
                Unda Tukio Lako <ArrowRight size={16} />
              </a>
              <a className="button button-outline-light" href="/matukio">
                Nunua Tiketi
              </a>
            </div>
            <div className="hero-proof">
              <p>
                <strong>Rahisi. Salama. Papo hapo.</strong>
                <span>Inapendwa na waandaaji kote Tanzania</span>
              </p>
            </div>
          </div>
          <div className="hero-side-note">TANZANIA · 2026</div>
        </div>
      </section>

      <section className="events-section section-pad" id="matukio">
        <div className="container">
          <div className="section-heading events-heading">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" />Kalenda ya burudani</span>
              <h2>Matangazo Yanayokuja</h2>
              <p>Chagua tukio, lipia kwa Mobile Money, na upokee tiketi yako ya QR Code papo hapo.</p>
            </div>
            <a className="text-link desktop-link" href="/matukio">
              Tazama matukio yote <ArrowRight size={16} />
            </a>
          </div>
          <div className="event-tools">
            <div className="category-list" aria-label="Chuja matukio kwa aina">
              {categories.map((item) => (
                <button
                  className={`category-chip${category === item ? " active" : ""}`}
                  key={item}
                  onClick={() => setCategory(item)}
                  type="button"
                  aria-pressed={category === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="event-search">
              <Search size={17} />
              <input
                aria-label="Tafuta tukio, jiji au ukumbi"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tafuta tukio, jiji au ukumbi"
                type="search"
                value={search}
              />
            </label>
          </div>
          {eventsLoading ? (
            <div className="empty-events" role="status">
              <Clock3 size={22} />
              <h3>Inapakia matukio...</h3>
              <p>Tunasasisha matukio yanayopatikana.</p>
            </div>
          ) : eventsError ? (
            <div className="empty-events" role="alert">
              <Search size={22} />
              <h3>Matukio hayajapakia</h3>
              <p>Hakikisha huduma ya Tukio inaendelea, kisha ujaribu tena.</p>
              <button
                className="text-link"
                onClick={() => setEventsRetry((retry) => retry + 1)}
                type="button"
              >
                Jaribu tena <ArrowRight size={15} />
              </button>
            </div>
          ) : visibleEvents.length > 0 ? (
            <div className="event-grid">
              {visibleEvents.map((event) => (
                <article className="event-card" key={event.id}>
                  <div
                    className="event-image"
                    role="img"
                    aria-label={`Picha ya tukio: ${event.title}`}
                    style={{ backgroundImage: `url("${event.image}")` }}
                  >
                    <span className="date-badge">
                      <strong>{event.date.split(" ")[0]}</strong>
                      <small>{event.date.split(" ")[1]}</small>
                    </span>
                    {event.badge && <span className="event-badge">{event.badge}</span>}
                  </div>
                  <div className="event-card-content">
                    <span className="event-category">{event.category}</span>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <div className="event-details">
                      <span><MapPin size={14} />{event.venue}</span>
                      <span><Clock3 size={14} />{event.time}</span>
                    </div>
                    <div className="event-card-bottom">
                      <span className="event-price">
                        <small>KUANZIA</small>
                        <strong>
                          TZS {new Intl.NumberFormat("sw-TZ").format(event.price)}
                        </strong>
                      </span>
                        <a className="button button-primary button-small" href={`/matukio/${event.id}/booking`}>
                        Nunua tiketi <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-events">
              <Search size={22} />
              <h3>Hakuna tukio lililopatikana</h3>
              <p>Jaribu neno tofauti au chagua aina nyingine ya tukio.</p>
              <button
                className="text-link"
                onClick={() => {
                  setSearch("");
                  setCategory("Zote");
                }}
                type="button"
              >
                Ondoa vichujio <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="features-section section-pad" id="huduma">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow"><span className="eyebrow-dot" />Tukio lako, njia yako</span>
            <h2>Kwa Nini Tukio?</h2>
            <p>Huduma za kurahisisha tiketi za matukio, mahali pamoja.</p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, ...feature }) => (
              <article
                className={`feature-card${feature.large ? " feature-large" : ""}${feature.wide ? " feature-wide" : ""}`}
                key={feature.title}
              >
                <span className="feature-icon"><Icon size={21} strokeWidth={1.8} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <a href={feature.href}>{feature.link} <ArrowRight size={14} /></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section section-pad" aria-label="Huduma za Tukio">
        <div className="container story-list">
          <article className="story-row">
            <div
              className="story-photo event-setup-photo"
              role="img"
              aria-label="Waandaaji wakipanga tukio"
            />
            <div className="story-copy">
              <span className="eyebrow"><span className="eyebrow-dot" />Kwa waandaaji</span>
              <h2>Kuweka Tukio Mtandaoni</h2>
              <p>Jisajili, weka taarifa za tukio, mahali, muda na aina za tiketi kama VIP au Early Bird.</p>
              <ul className="check-list">
                <li><Check size={15} />Usajili wa haraka</li>
                <li><Check size={15} />Aina nyingi za tiketi</li>
                <li><Check size={15} />Chapisha kwa sekunde</li>
              </ul>
            </div>
          </article>
          <article className="story-row story-row-reverse">
            <div className="story-copy">
              <span className="eyebrow"><span className="eyebrow-dot" />Malipo rahisi</span>
              <h2>Malipo na Tiketi Papo Hapo</h2>
              <p>Mteja analipa kwa Mobile Money na kupokea tiketi yake yenye QR Code papo hapo.</p>
              <ul className="check-list">
                <li><Check size={15} />M-Pesa, Tigo Pesa na Airtel Money</li>
                <li><Check size={15} />Tiketi kwa WhatsApp, SMS au email</li>
                <li><Check size={15} />Lipa kidogo kidogo</li>
              </ul>
            </div>
            <div
              className="story-photo payment-photo"
              role="img"
              aria-label="Mhudhuriaji akinunua tiketi kwa simu"
            />
          </article>
        </div>
      </section>

      <section className="checkin-section section-pad">
        <div className="container checkin-layout">
          <div className="checkin-visual">
            <div
              className="checkin-photo photo-one"
              role="img"
              aria-label="Mhudumu akihakiki tiketi kwa simu"
            >
              <span className="checkin-photo-image" aria-hidden="true" />
              <span className="photo-caption"><Smartphone size={15} /> QR imethibitishwa</span>
            </div>
            <div
              className="checkin-photo photo-two"
              role="img"
              aria-label="Wageni wakiingia kwenye tukio"
            ><span className="checkin-photo-image" aria-hidden="true" /></div>
            <div className="checkin-counter">
              <strong>1,248</strong>
              <span>wageni wameingia</span>
              <small><span className="live-dot" /> Live sasa hivi</small>
            </div>
          </div>
          <div className="checkin-copy">
            <span className="eyebrow"><span className="eyebrow-dot" />Usalama bila usumbufu</span>
            <h2>Uhakiki Gateni</h2>
            <p>Wakaguzi huskani QR Code kwa App ya Tukio kuthibitisha tiketi ni halali. Kila mtu anaingia kwa kasi, bila foleni ndefu.</p>
            <ul className="check-list">
              <li><Check size={15} />Zuia utapeli na tiketi bandia</li>
              <li><Check size={15} />Punguza misongamano mlangoni</li>
              <li><Check size={15} />Taarifa za papo hapo kwa waandaaji</li>
            </ul>
            <a className="text-link" href="#muandaaji">Jifunze kuhusu usalama <ArrowRight size={15} /></a>
          </div>
        </div>
      </section>

      <section className="how-section section-pad" id="jinsi-inavyofanya">
        <div className="container">
          <div className="section-heading how-heading">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" />Hatua chache tu</span>
              <h2>Jinsi Tukio Inavyofanya Kazi</h2>
              <p>Mfumo mmoja kwa waandaaji, wahudhuriaji, na walinzi gateni.</p>
            </div>
            <span className="how-stamp"><Ticket size={17} /> Rahisi kuanza</span>
          </div>
          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
          <div className="how-showcase">
            <div className="showcase-copy">
              <span className="eyebrow"><span className="eyebrow-dot" />Tiketi yako, mkononi</span>
              <h3>Tiketi yenye QR Code, tayari papo hapo</h3>
              <p>
                Baada ya malipo kukamilika, tiketi yako ya kidijitali inatumwa
                moja kwa moja kwenye WhatsApp, SMS au Email. Hifadhi na uionyeshe
                mlangoni.
              </p>
              <ul className="check-list">
                <li><Check size={15} />Tiketi inatumwa sekunde chache baada ya malipo kukamilika — hakuna kusubiri</li>
                <li><Check size={15} />QR Code ya siri inathibitisha tiketi ni halali kwa tukio lako pekee</li>
                <li><Check size={15} />Mhudumu anatumia App ya Tukio kuhakikisha wageni wanaingia haraka</li>
                <li><Check size={15} />Tiketi moja haiwezi kutumika mara mbili</li>
              </ul>
              <Link className="button button-primary" href="/matukio">
                Nunua tiketi yenye QR <ArrowRight size={16} />
              </Link>
            </div>
            <div className="ticket-art-wrap">
              <span className="ticket-orbit orbit-one" />
              <span className="ticket-orbit orbit-two" />
              <TicketPreview />
              <div className="scan-note"><BadgeCheck size={16} /> Imethibitishwa</div>
            </div>
          </div>
        </div>
      </section>

      <section className="comparison-section section-pad" id="tiketi">
        <div className="container">
          <div className="section-heading comparison-heading">
            <span className="eyebrow"><span className="eyebrow-dot" />Tofauti iko wazi</span>
            <h2>Tukio dhidi ya Mifumo ya Kawaida</h2>
            <p>Kwa nini waandaaji wa Tanzania wanachagua Tukio.</p>
          </div>
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Huduma</th>
                  <th className="tukio-column" scope="col"><span className="table-brand">✳ Tukio</span></th>
                  <th scope="col">Mifumo ya Kigeni</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, index) => (
                  <tr key={row}>
                    <th scope="row">{row}</th>
                    <td className="tukio-column"><span className="table-check"><Check size={14} /></span></td>
                    <td>
                      {index === 3 ? (
                        <span className="table-check table-check-muted"><Check size={14} /></span>
                      ) : (
                        <span className="table-no"><X size={13} /></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="faq-contact-section" id="wasiliana">
        <div className="container faq-contact-layout">
          <div className="faq-copy">
            <span className="eyebrow"><span className="eyebrow-dot" />Majibu ya haraka</span>
            <h2>Maswali Yanayoulizwa Mara kwa Mara</h2>
            <p>Una swali? Tumeweka majibu ya maswali yanayoulizwa sana.</p>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <details className="faq-item" key={faq.question} open={index === 0}>
                <summary>
                  {faq.question}
                  <ChevronDown size={17} />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="contact-section section-pad">
        <div className="container contact-layout">
          <div className="contact-copy">
            <span className="eyebrow"><span className="eyebrow-dot" />Tupo hapa kukusaidia</span>
            <h2>Anza na Tukio Leo</h2>
            <p>Jiajiri kwenye tiketi zako au tuandikie kwa maswali.</p>
            <a className="button button-primary contact-phone" href={supportPhoneLink}>
              <Smartphone size={16} /> {supportPhone}
            </a>
            <span className="contact-hours">Tunapatikana kila siku, saa 24</span>
          </div>
          <form
            className="contact-form"
            onSubmit={(event) => {
              event.preventDefault();
              setContactSent(true);
            }}
          >
            <label>
              Jina lako
              <input name="jina" placeholder="Jina kamili" required />
            </label>
            <label>
              Namba ya simu
              <input name="simu" placeholder="+255 7XX XXX XXX" type="tel" required />
            </label>
            <label>
              Barua pepe
              <input name="barua-pepe" placeholder="wewe@mfano.com" type="email" required />
            </label>
            <label>
              Aina ya ombi
              <span className="select-wrap">
                <select name="aina" defaultValue="Changia">
                  <option>Changia</option>
                  <option>Kuandaa tukio</option>
                  <option>Kununua tiketi</option>
                  <option>Msaada wa kiufundi</option>
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
            <label>
              Ujumbe
              <textarea name="ujumbe" placeholder="Tuambie zaidi kuhusu tukio lako" rows={3} required />
            </label>
            <button className="button button-primary form-submit" type="submit">
              Tuma Ombi <ArrowRight size={15} />
            </button>
            <small className="form-note" role="status">
              {contactSent
                ? `Hii ni toleo la maonyesho: ujumbe haujatumwa. Tafadhali piga simu ${supportPhone}.`
                : "Fomu hii ni ya maonyesho na bado haijaunganishwa na huduma ya kutuma ujumbe."}
            </small>
          </form>
        </div>
      </section>

      <section className="organizer-cta" id="muandaaji">
        <div className="cta-glow" />
        <div className="container cta-content">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-dot" />Hatua inayofuata ni yako</span>
          <h2>Anza Kuuza<br />Tiketi Zako Leo</h2>
          <p>Jiunge na waandaaji wanaotumia Tukio kurahisisha malipo na kuzuia utapeli getini.</p>
          <a className="button button-white" href="/organizer">
            Anza Sasa <ArrowRight size={16} />
          </a>
          <span className="cta-note">Usajili wa bure · Hakuna ada za kujiunga</span>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-main">
          <div className="footer-about">
            <Brand />
            <p>Mfumo wa kidijitali wa kukata na kuuza tiketi za matukio Tanzania.</p>
            <a className="footer-contact" href={supportPhoneLink}><Smartphone size={14} /> {supportPhone}</a>
            <span className="footer-contact"><MapPin size={14} /> Tanzania</span>
          </div>
          <div className="footer-links">
            <h3>Mwanzo</h3>
            <a href="/matukio">Matukio</a>
            <a href="#jinsi-inavyofanya">Jinsi inavyofanya kazi</a>
            <a href="#huduma">Huduma</a>
            <a href="#wasiliana">Wasiliana</a>
          </div>
          <div className="footer-links">
            <h3>Kwa waandaaji</h3>
            <a href="/organizer">Anza kuuza tiketi</a>
            <a href="#tiketi">Uhakiki wa QR</a>
            <a href="#wasiliana">Msaada</a>
          </div>
          <div className="footer-social">
            <h3>Tuungane</h3>
            <p>Fuata habari za matukio na burudani Tanzania.</p>
            <div className="social-links">
              <a href="https://instagram.com" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="6" r="1.25" fill="currentColor"/></svg></a>
              <a href="https://facebook.com" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8z"/></svg></a>
              <a href="https://tiktok.com" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.6 7.2a6.1 6.1 0 0 1-3.8-1.3v7.3a5.8 5.8 0 1 1-5-5.7v3a2.8 2.8 0 1 0 2 2.7V2.5h3a6.1 6.1 0 0 0 3.8 3.1z"/></svg></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <span>© 2026 Tukio. Haki zote zimehifadhiwa.</span>
            <div><a href="#wasiliana">Faragha</a><a href="#wasiliana">Masharti ya matumizi</a></div>
            <span className="footer-made">Imetengenezwa kwa <span>♥</span> Tanzania</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
