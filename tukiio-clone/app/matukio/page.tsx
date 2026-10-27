"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, MapPin, Search } from "lucide-react";

type EventSummary = {
  id: string;
  category: string;
  title: string;
  description: string;
  date: string;
  startsAt: string;
  time: string;
  venue: string;
  price: number;
  currency: "TZS";
  image: string;
  badge: string | null;
  ticketTypes: { id: string; name: string; price: number; available: number }[];
};

const apiBase = process.env.NEXT_PUBLIC_TUKIO_API_URL ?? "http://localhost:3001/api/v1";
const money = new Intl.NumberFormat("sw-TZ");

function eventPrice(event: EventSummary) {
  const prices = event.ticketTypes.map((ticket) => ticket.price);
  if (prices.length < 2 || Math.min(...prices) === Math.max(...prices)) {
    return `TZS ${money.format(prices[0] ?? event.price)}`;
  }
  return `TZS ${money.format(Math.min(...prices))} - ${money.format(Math.max(...prices))}`;
}

function EventCard({ event, past = false }: { event: EventSummary; past?: boolean }) {
  const [day, month] = event.date.split(" ");
  return (
    <article className="listing-event-card">
      <div className="listing-event-image" role="img" aria-label={`Picha ya tukio: ${event.title}`} style={{ backgroundImage: `url("${event.image}")` }}>
        <span className="date-badge"><strong>{day}</strong><small>{month}</small></span>
        {event.badge && <span className="event-badge">{event.badge}</span>}
      </div>
      <div className="listing-event-copy">
        <span className="event-category">{event.category}</span>
        <h2>{event.title}</h2>
        <div className="listing-event-meta">
          <span><MapPin size={17} />{event.venue}</span>
          <span><CalendarDays size={15} />{event.date} · {event.time}</span>
        </div>
        {past ? <span className="event-past-label">Tukio limepita</span> : (
          <Link className="listing-buy-button" href={`/matukio/${event.id}/booking`}>
            <span>Buy Ticket ({eventPrice(event)})</span><ArrowUpRight size={17} />
          </Link>
        )}
      </div>
    </article>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadEvents() {
      try {
        const response = await fetch(`${apiBase}/events?includePast=true`, { signal: controller.signal });
        if (!response.ok) throw new Error("Events request failed");
        const payload: { data?: EventSummary[] } = await response.json();
        if (!Array.isArray(payload.data)) throw new Error("Invalid event response");
        setNow(Date.now());
        setEvents(payload.data);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadEvents();
    return () => controller.abort();
  }, []);

  const filteredEvents = events.filter((event) =>
    `${event.title} ${event.category} ${event.venue}`.toLocaleLowerCase("sw").includes(query.trim().toLocaleLowerCase("sw")),
  );
  const upcomingEvents = now === null ? [] : filteredEvents.filter((event) => new Date(event.startsAt).getTime() >= now);
  const pastEvents = now === null ? [] : filteredEvents.filter((event) => new Date(event.startsAt).getTime() < now).reverse();

  return (
    <main className="events-page">
      <header className="events-page-header">
        <Link className="brand" href="/" aria-label="Tukio - mwanzo"><span className="brand-mark">t</span><span>Tukio</span></Link>
        <Link className="events-page-home" href="/"><ArrowLeft size={15} /> Rudi mwanzo</Link>
      </header>
      <section className="events-page-main">
        <div className="events-page-title-row">
          <div>
            <span className="eyebrow"><span className="eyebrow-dot" />Gundua matukio</span>
            <h1>Matangazo Yote</h1>
            <p>Gundua matukio, filamu, safari za basi na ndege sehemu moja.</p>
          </div>
          <label className="events-page-search"><Search size={16} /><input value={query} onChange={(input) => setQuery(input.target.value)} placeholder="Tafuta tukio au mahali" aria-label="Tafuta tukio au mahali" /></label>
        </div>

        {loading ? (
          <div className="events-page-message" role="status"><Clock3 size={22} /><h2>Inapakia matukio...</h2><p>Tunasasisha matukio yanayopatikana.</p></div>
        ) : error ? (
          <div className="events-page-message" role="alert"><Search size={22} /><h2>Matukio hayajapakia</h2><p>Hakikisha huduma ya Tukio inaendelea kisha jaribu tena.</p></div>
        ) : filteredEvents.length ? (
          <>
            {upcomingEvents.length > 0 && <section className="events-listing-section"><h2>Matukio Yanayokuja</h2><div className="events-page-grid">{upcomingEvents.map((event) => <EventCard key={event.id} event={event} />)}</div></section>}
            {pastEvents.length > 0 && <section className="events-listing-section"><h2>Matukio Yaliyopita</h2><div className="events-page-grid">{pastEvents.map((event) => <EventCard key={event.id} event={event} past />)}</div></section>}
          </>        ) : (
          <div className="events-page-message"><Search size={22} /><h2>Hakuna tukio lililopatikana</h2><p>Jaribu jina au mahali tofauti.</p></div>
        )}
      </section>
      <footer className="events-page-footer"><span>Tukio</span><span>Matukio ya Tanzania, sehemu moja.</span><span>© 2026 Tukio</span></footer>
    </main>
  );
}
