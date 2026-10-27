"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Minus, Plus, Ticket, X } from "lucide-react";
import QRCode from "qrcode";

type TicketType = { id: string; name: string; price: number; available: number };
type EventDetails = {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  image: string;
  ticketTypes: TicketType[];
};
type BookingResult = {
  data: { id: string; status: string; amount: number; currency: string; expiresAt: string };
  accessToken: string;
  payment: { instructions: string };
};
type TicketReceipt = { tickets: { id: string; code: string; type: string; status: string; qrPayload: string }[] };

const apiBase = process.env.NEXT_PUBLIC_TUKIO_API_URL ?? "http://localhost:3001/api/v1";
const paymentMethods = [
  ["MPESA", "M-Pesa"],
  ["TIGOPESA", "Tigo Pesa"],
  ["AIRTELMONEY", "Airtel Money"],
  ["HALOPESA", "HaloPesa"],
] as const;

export default function BookingForm({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<string>(paymentMethods[0][0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [pendingBooking, setPendingBooking] = useState<BookingResult | null>(null);
  const [ticketReceipt, setTicketReceipt] = useState<TicketReceipt | null>(null);
  const [ticketQrs, setTicketQrs] = useState<Record<string, string>>({});
  const [showBuyerDetails, setShowBuyerDetails] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadEvent() {
      try {
        const response = await fetch(`${apiBase}/events/${encodeURIComponent(eventId)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Tukio halijapatikana.");
        const payload: { data?: EventDetails } = await response.json();
        if (!payload.data) throw new Error("Tukio halijapatikana.");
        setEvent(payload.data);
        setSelectedTicketId(payload.data.ticketTypes[0]?.id ?? "");
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Imeshindikana kupakia tukio.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadEvent();
    return () => controller.abort();
  }, [eventId]);

  const selectedTicket = useMemo(() => event?.ticketTypes.find((ticket) => ticket.id === selectedTicketId), [event, selectedTicketId]);
  const total = (selectedTicket?.price ?? 0) * quantity;
  const money = new Intl.NumberFormat("sw-TZ");

  useEffect(() => {
    if (!paymentDialogOpen) return;
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") setPaymentDialogOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [paymentDialogOpen]);

  useEffect(() => {
    if (!ticketReceipt) return;
    let active = true;
    void Promise.all(ticketReceipt.tickets.map(async (ticket) => [ticket.id, await QRCode.toDataURL(ticket.qrPayload, { width: 220, margin: 1 })] as const))
      .then((entries) => { if (active) setTicketQrs(Object.fromEntries(entries)); })
      .catch(() => { if (active) setTicketQrs({}); });
    return () => { active = false; };
  }, [ticketReceipt]);

  function openPaymentMenu(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPaymentPhone(buyerPhone);
    setError("");
    setPaymentDialogOpen(true);
  }

  async function submitBooking(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!event || !selectedTicket) return;
    setSubmitting(true);
    setError("");
    try {
      let result = pendingBooking;
      if (!result) {
        const response = await fetch(`${apiBase}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id, ticketTypeId: selectedTicket.id, quantity, buyerName, buyerEmail: buyerEmail || undefined, buyerPhone: paymentPhone || buyerPhone, paymentProvider }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : "Imeshindikana kuweka nafasi ya tiketi. Jaribu tena.");
        result = payload as BookingResult;
        setPendingBooking(result);
        window.sessionStorage.setItem(`tukio-order:${result.data.id}`, result.accessToken);
      }
      const simulation = await fetch(`${apiBase}/orders/${result.data.id}/simulate-payment`, { method: "POST", headers: { "x-order-token": result.accessToken } });
      const simulationPayload = await simulation.json();
      if (!simulation.ok) throw new Error(typeof simulationPayload.message === "string" ? simulationPayload.message : "Demo ya malipo haikukamilika. Jaribu tena.");
      const receiptResponse = await fetch(`${apiBase}/orders/${result.data.id}`, { headers: { "x-order-token": result.accessToken } });
      const receiptPayload = await receiptResponse.json();
      if (!receiptResponse.ok) throw new Error("Oda imelipiwa kwa demo lakini tiketi haikuweza kupakiwa.");
      setTicketReceipt(receiptPayload.data as TicketReceipt);
      setBooking({ ...result, data: { ...result.data, status: simulationPayload.data?.status ?? "PAID" } });
      setPaymentDialogOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Imeshindikana kuweka nafasi ya tiketi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="booking-shell"><div className="booking-message">Inapakia taarifa za tukio...</div></main>;
  if (!event) {
    return <main className="booking-shell"><div className="booking-message"><h1>Tukio halijapatikana</h1><p>{error || "Tukio hili halipo au limeondolewa."}</p><Link className="button button-primary" href="/#matukio"><ArrowLeft size={16} /> Rudi kwenye matukio</Link></div></main>;
  }

  return (
    <main className="booking-shell">
      <header className="booking-header">
        <Link className="brand" href="/" aria-label="Tukio - mwanzo"><span className="brand-mark">t</span><span>Tukio</span></Link>
        <Link className="booking-back" href="/#matukio"><ArrowLeft size={15} /> Rudi kwenye matukio</Link>
      </header>

      <section className="booking-hero" style={{ backgroundImage: `linear-gradient(90deg, rgb(24 19 14 / 78%), rgb(24 19 14 / 20%)), url("${event.image}")` }}>
        <div className="booking-hero-inner">
          <span className="booking-hero-category">{event.category}</span>
          <h1>{event.title}</h1>
          <div className="booking-hero-meta"><span><CalendarDays size={15} />{event.date}</span><span><Clock3 size={15} />{event.time}</span><span><MapPin size={15} />{event.venue}</span></div>
        </div>
      </section>

      <div className="booking-layout">
        <div className="booking-event-details">
          <section className="booking-description">
            <span className="eyebrow"><span className="eyebrow-dot" />Kuhusu tukio</span>
            <h2>Kuhusu tukio</h2>
            <p>{event.description}</p>
            <div className="booking-event-meta"><span><CalendarDays size={16} />{event.date}</span><span><Clock3 size={16} />{event.time}</span></div>
          </section>
          <section className="booking-venue">
            <h2>Ukumbi na kuingia</h2>
            <div className="booking-map"><iframe title={`Ramani ya ${event.venue}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venue)}&output=embed`} /></div>
            <p><MapPin size={15} />{event.venue}</p>
          </section>
        </div>

        <section className="booking-panel">
          {booking ? (
            <div className="booking-success" role="status">
              <span className="booking-success-icon"><Ticket size={22} /></span>
              <p className="eyebrow">Malipo ya majaribio yamekamilika</p><h2>Asante kwa kujaribu</h2>
              <p>Namba ya oda: <strong>{booking.data.id}</strong></p>
              <p>Jumla: <strong>TZS {money.format(booking.data.amount)}</strong></p>
              <p>Nafasi imehifadhiwa hadi {new Date(booking.data.expiresAt).toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" })}.</p>
              <div className="booking-notice" role="note"><strong>SIMULATION TU — hakuna pesa iliyotumwa.</strong><span>Hali ya oda kwenye demo: {booking.data.status}. Hakuna malipo halisi yaliyofanyika.</span></div>
              <div className="buyer-ticket-list">
                <h3>Tiketi zako za majaribio</h3>
                {ticketReceipt?.tickets.map((ticket) => <article className="buyer-ticket-card" key={ticket.id}>
                  {ticketQrs[ticket.id] ? <Image src={ticketQrs[ticket.id]} alt={`QR Code ya ${ticket.type}, ${ticket.code}`} width={150} height={150} unoptimized /> : <span className="buyer-ticket-qr-loading">Inatengeneza QR...</span>}
                  <div><span className="event-category">{ticket.type}</span><strong>{ticket.code}</strong><small>Hali: {ticket.status} · Demo</small>{ticketQrs[ticket.id] && <a className="buyer-ticket-download" href={ticketQrs[ticket.id]} download={`${ticket.code}.png`}>Pakua QR</a>}</div>
                </article>)}
                <p className="buyer-ticket-note">QR hizi ni za demo, hazithibitishi malipo halisi wala kuingia kwenye tukio.</p>
              </div>
              <Link className="button button-primary" href="/matukio">Rudi kwenye matukio</Link>
            </div>
          ) : (
            <>
              <p className="eyebrow"><span className="eyebrow-dot" />Aina za tiketi</p>
              <h2>Chagua tiketi</h2>
              <p className="booking-intro">Bei na upatikanaji wa tiketi za tukio hili.</p>
              <form className="booking-form" onSubmit={openPaymentMenu}>
                <div className="booking-ticket-options" role="radiogroup" aria-label="Chagua aina ya tiketi">
                  {event.ticketTypes.map((ticket) => (
                    <label className={`booking-ticket-option${ticket.id === selectedTicketId ? " selected" : ""}`} key={ticket.id}>
                      <input type="radio" name="ticketType" value={ticket.id} checked={ticket.id === selectedTicketId} disabled={ticket.available < 1} onChange={() => { setSelectedTicketId(ticket.id); setQuantity(Math.min(quantity, ticket.available)); setShowBuyerDetails(false); }} />
                      <span><strong>{ticket.name}</strong><small>{ticket.available} tiketi zinapatikana</small></span>
                      <strong className="booking-ticket-price">TZS {money.format(ticket.price)}</strong>
                    </label>
                  ))}
                </div>
                {event.ticketTypes.length === 0 || event.ticketTypes.every((ticket) => ticket.available < 1) ? <p className="booking-error" role="status">Tiketi za tukio hili zimeisha kwa sasa.</p> : null}
                <div className="booking-quantity-row">
                  <span>Idadi ya tiketi</span>
                  <div className="booking-quantity-control">
                    <button type="button" aria-label="Punguza idadi" disabled={quantity <= 1} onClick={() => setQuantity((count) => Math.max(1, count - 1))}><Minus size={14} /></button>
                    <strong>{quantity}</strong>
                    <button type="button" aria-label="Ongeza idadi" disabled={!selectedTicket || quantity >= Math.min(10, selectedTicket.available)} onClick={() => setQuantity((count) => Math.min(10, selectedTicket?.available ?? 1, count + 1))}><Plus size={14} /></button>
                  </div>
                </div>
                <div className="booking-total"><span>Jumla</span><strong>TZS {money.format(total)}</strong></div>
                {showBuyerDetails && (
                  <div className="booking-buyer-details">
                    <h3>Taarifa zako</h3>
                    <label>Jina lako<input autoComplete="name" maxLength={100} onChange={(input) => setBuyerName(input.target.value)} required value={buyerName} /></label>
                    <label>Namba ya simu<input autoComplete="tel" maxLength={30} onChange={(input) => setBuyerPhone(input.target.value)} placeholder="+255 7XX XXX XXX" required type="tel" value={buyerPhone} /></label>
                    <label>Barua pepe <span className="booking-optional">(si lazima)</span><input autoComplete="email" onChange={(input) => setBuyerEmail(input.target.value)} type="email" value={buyerEmail} /></label>
                    <p className="booking-payment-step-note">Chagua mtandao wa simu kwenye hatua inayofuata.</p>
                  </div>
                )}
                {error && <p className="booking-error" role="alert">{error}</p>}
                {showBuyerDetails ? (
                  <button className="button button-primary booking-submit" disabled={!selectedTicket || selectedTicket.available < 1} type="submit">Lipa kwa simu</button>
                ) : (
                  <button className="button button-primary booking-submit" disabled={!selectedTicket || selectedTicket.available < 1} onClick={() => setShowBuyerDetails(true)} type="button">Nunua tiketi</button>
                )}
                <small className="booking-payment-note">Hii ni demo ya malipo. Hakuna pesa itakayotumwa.</small>
              </form>
            </>
          )}
        </section>
      </div>
      {paymentDialogOpen && (
        <div className="simulation-payment-backdrop" onMouseDown={(pointerEvent) => { if (pointerEvent.target === pointerEvent.currentTarget && !submitting) setPaymentDialogOpen(false); }}>
          <section className="simulation-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="simulation-payment-title">
            <div className="simulation-payment-heading">
              <div><span className="simulation-badge">DEMO TU</span><h2 id="simulation-payment-title">Lipa kwa simu</h2><p>Chagua huduma ya simu na namba ya kupokea ombi la malipo la majaribio.</p></div>
              <button className="event-picker-close" type="button" onClick={() => setPaymentDialogOpen(false)} disabled={submitting} aria-label="Funga menyu ya malipo"><X size={20} /></button>
            </div>
            <form className="simulation-payment-form" onSubmit={submitBooking}>
              <fieldset className="simulation-provider-list">
                <legend>Chagua mtandao</legend>
                {paymentMethods.map(([value, label]) => (
                  <label className={`simulation-provider-option${paymentProvider === value ? " selected" : ""}`} key={value}>
                    <input type="radio" name="paymentProvider" value={value} checked={paymentProvider === value} onChange={() => setPaymentProvider(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
              <label className="simulation-phone-label">Namba ya simu
                <input autoComplete="tel" maxLength={30} onChange={(input) => setPaymentPhone(input.target.value)} required type="tel" value={paymentPhone} />
              </label>
              <div className="simulation-payment-total"><span>Kiasi cha kujaribu</span><strong>TZS {money.format(total)}</strong></div>
              <p className="simulation-payment-warning">Majaribio pekee. Hakuna USSD, SMS au muamala halisi utakaotumwa.</p>
              {error && <p className="booking-error" role="alert">{error}</p>}
              <button className="button button-primary booking-submit" disabled={submitting} type="submit">{submitting ? "Inakamilisha demo..." : "Thibitisha malipo (demo)"}</button>
              <button className="simulation-cancel" disabled={submitting} onClick={() => setPaymentDialogOpen(false)} type="button">Rudi kwenye booking</button>
            </form>
          </section>
        </div>
      )}
      <footer className="booking-footer"><span>Tukio</span><span>Matukio ya Tanzania, sehemu moja.</span></footer>
    </main>
  );
}
