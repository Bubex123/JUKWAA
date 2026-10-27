"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, Eye, EyeOff, LogOut, Plus, RefreshCw, Ticket, Users } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_TUKIO_API_URL ?? "http://localhost:3001/api/v1";
const providers = [["MPESA", "M-Pesa"], ["TIGOPESA", "Tigo Pesa"], ["AIRTELMONEY", "Airtel Money"], ["HALOPESA", "HaloPesa"]] as const;
const money = new Intl.NumberFormat("sw-TZ");
const sessionEvent = "tukio-organizer-session";
const subscribeSession = (onChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onChange);
  window.addEventListener(sessionEvent, onChange);
  return () => { window.removeEventListener("storage", onChange); window.removeEventListener(sessionEvent, onChange); };
};
const getStoredToken = () => typeof window === "undefined" ? "" : window.sessionStorage.getItem("tukio-organizer-token") ?? "";
const getStoredUser = () => typeof window === "undefined" ? "" : window.sessionStorage.getItem("tukio-organizer-user") ?? "";
const getClientReady = () => true;
const getServerReady = () => false;

type TicketType = { id: string; name: string; price: number; quantity: number; sold: number; reserved: number };
type OrganizerEvent = { id: string; title: string; category: string; description: string; venue: string; startsAt: string; image: string | null; badge: string | null; status: string; ticketTypes: TicketType[] };
type Dashboard = {
  summary: { eventCount: number; ticketsSold: number; ticketsReserved: number; grossSales: number; pendingOrders: number; requestedPayouts: number; availableBalance: number; simulated: boolean };
  events: OrganizerEvent[];
  payoutRequests: { id: string; amount: number; provider: string; phone: string; status: string; createdAt: string }[];
};
type OrganizerOrder = { id: string; buyerName: string; buyerPhone: string; totalAmount: number; status: string; createdAt: string; event: { title: string }; items: { quantity: number; ticketType: { name: string } }[] };
type User = { id: string; name: string; email: string; role: string };

async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : "Ombi halijafanikiwa.");
  return payload as T;
}

export default function OrganizerPage() {
  const ready = useSyncExternalStore(subscribeSession, getClientReady, getServerReady);
  const token = useSyncExternalStore(subscribeSession, getStoredToken, () => "");
  const userRaw = useSyncExternalStore(subscribeSession, getStoredUser, () => "");
  const user = useMemo(() => { try { return userRaw ? JSON.parse(userRaw) as User : null; } catch { return null; } }, [userRaw]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<OrganizerOrder[]>([]);
  const [authError, setAuthError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [eventBusy, setEventBusy] = useState(false);
  const [editingEventId, setEditingEventId] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [ticketBusy, setTicketBusy] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", category: "Muziki", description: "", venue: "", startsAt: "", image: "", ticketName: "Regular", price: "", quantity: "100" });
  const [editForm, setEditForm] = useState({ title: "", category: "", description: "", venue: "", startsAt: "", image: "" });
  const [ticketForm, setTicketForm] = useState({ eventId: "", name: "VIP", price: "", quantity: "50" });
  const [payoutForm, setPayoutForm] = useState({ amount: "", provider: "MPESA", phone: "" });
  const [qrPayload, setQrPayload] = useState("");
  const [checkinMessage, setCheckinMessage] = useState("");
  const [checkinBusy, setCheckinBusy] = useState(false);

  const loadDashboard = useCallback(async (quiet = false) => {
    if (!token) return;
    if (!quiet) setRefreshing(true);
    try {
      const [dashboardResponse, orderResponse] = await Promise.all([
        request<{ data: Dashboard }>("/organizer/dashboard", token),
        request<{ data: OrganizerOrder[] }>("/organizer/orders", token),
      ]);
      setDashboard(dashboardResponse.data);
      setOrders(orderResponse.data);
      setDashboardError("");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Imeshindikana kupakia dashibodi.";
      setDashboardError(message);
      if (/token|bearer|unauthorized/i.test(message)) logout();
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const interval = window.setInterval(() => void loadDashboard(true), 20000);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(interval); };
  }, [token, loadDashboard]);

  function logout() {
    window.sessionStorage.removeItem("tukio-organizer-token");
    window.sessionStorage.removeItem("tukio-organizer-user");
    window.localStorage.removeItem("tukio-organizer-token");
    window.localStorage.removeItem("tukio-organizer-user");
    window.dispatchEvent(new Event(sessionEvent));
    setDashboard(null); setOrders([]);
  }

  async function authenticate(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault(); setAuthBusy(true); setAuthError("");
    if (mode === "register" && authForm.password !== confirmPassword) {
      setAuthError("Nenosiri na uthibitisho wake havifanani."); setAuthBusy(false); return;
    }
    try {
      const result = await request<{ accessToken: string; user: User }>(`/auth/${mode}`, undefined, { method: "POST", body: JSON.stringify(authForm) });
      window.sessionStorage.setItem("tukio-organizer-token", result.accessToken);
      window.sessionStorage.setItem("tukio-organizer-user", JSON.stringify(result.user));
      window.localStorage.removeItem("tukio-organizer-token");
      window.localStorage.removeItem("tukio-organizer-user");
      window.dispatchEvent(new Event(sessionEvent));
      setAuthForm({ name: "", email: "", password: "" });
    } catch (authFailure) {
      setAuthError(authFailure instanceof Error ? authFailure.message : "Imeshindikana kuingia.");
    } finally { setAuthBusy(false); }
  }

  async function createEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault(); if (!token) return;
    setEventBusy(true); setNotice(""); setDashboardError("");
    try {
      const event = await request<OrganizerEvent>("/organizer/events", token, { method: "POST", body: JSON.stringify({ title: eventForm.title, category: eventForm.category, description: eventForm.description, venue: eventForm.venue, startsAt: new Date(eventForm.startsAt).toISOString(), image: eventForm.image || undefined }) });
      await request("/organizer/events/" + event.id + "/ticket-types", token, { method: "POST", body: JSON.stringify({ name: eventForm.ticketName, price: Number(eventForm.price), quantity: Number(eventForm.quantity) }) });
      setNotice("Tukio limehifadhiwa kama draft. Likague kisha libonyeze Chapisha.");
      setEventForm({ title: "", category: "Muziki", description: "", venue: "", startsAt: "", image: "", ticketName: "Regular", price: "", quantity: "100" });
      await loadDashboard(true);
    } catch (eventError) { setDashboardError(eventError instanceof Error ? eventError.message : "Imeshindikana kuunda tukio."); }
    finally { setEventBusy(false); }
  }

  async function publishEvent(eventId: string) {
    setDashboardError("");
    try { await request(`/organizer/events/${eventId}/publish`, token, { method: "PATCH" }); setNotice("Tukio limechapishwa."); await loadDashboard(true); }
    catch (publishError) { setDashboardError(publishError instanceof Error ? publishError.message : "Imeshindikana kuchapisha tukio."); }
  }

  function beginEdit(event: OrganizerEvent) {
    const startsAt = new Date(event.startsAt);
    const localDateTime = new Date(startsAt.getTime() - startsAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditForm({ title: event.title, category: event.category, description: event.description, venue: event.venue, startsAt: localDateTime, image: event.image ?? "" });
    setEditingEventId(event.id); setDashboardError(""); setNotice("");
  }

  async function updateEvent(formEvent: FormEvent<HTMLFormElement>, eventId: string) {
    formEvent.preventDefault(); setEditBusy(true); setDashboardError(""); setNotice("");
    try {
      await request(`/organizer/events/${eventId}`, token, { method: "PATCH", body: JSON.stringify({ ...editForm, startsAt: new Date(editForm.startsAt).toISOString(), image: editForm.image.trim() || null }) });
      setNotice("Taarifa za tukio zimesasishwa."); setEditingEventId(""); await loadDashboard(true);
    } catch (editError) { setDashboardError(editError instanceof Error ? editError.message : "Imeshindikana kusasisha tukio."); }
    finally { setEditBusy(false); }
  }

  async function addTicketType(formEvent: FormEvent<HTMLFormElement>, eventId: string) {
    formEvent.preventDefault(); setTicketBusy(eventId); setNotice(""); setDashboardError("");
    try {
      await request(`/organizer/events/${eventId}/ticket-types`, token, { method: "POST", body: JSON.stringify({ name: ticketForm.name, price: Number(ticketForm.price), quantity: Number(ticketForm.quantity) }) });
      setNotice("Aina mpya ya tiketi imeongezwa.");
      setTicketForm({ eventId: "", name: "VIP", price: "", quantity: "50" });
      await loadDashboard(true);
    } catch (ticketError) { setDashboardError(ticketError instanceof Error ? ticketError.message : "Aina ya tiketi haikuongezwa."); }
    finally { setTicketBusy(""); }
  }

  async function requestPayout(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault(); setPayoutBusy(true); setNotice(""); setDashboardError("");
    try {
      await request("/organizer/payout-requests", token, { method: "POST", body: JSON.stringify({ amount: Number(payoutForm.amount), provider: payoutForm.provider, phone: payoutForm.phone }) });
      setNotice("Ombi la kutoa pesa la demo limehifadhiwa. Hakuna pesa halisi itakayotumwa.");
      setPayoutForm((old) => ({ ...old, amount: "" })); await loadDashboard(true);
    } catch (payoutError) { setDashboardError(payoutError instanceof Error ? payoutError.message : "Ombi halijafanikiwa."); }
    finally { setPayoutBusy(false); }
  }

  async function checkInTicket(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault(); setCheckinBusy(true); setCheckinMessage("");
    try {
      const result = await request<{ data: { event: string; ticketType: string; status: string } }>("/checkin", token, { method: "POST", body: JSON.stringify({ qrPayload: qrPayload.trim() }) });
      setCheckinMessage(`${result.data.event} · ${result.data.ticketType} · Tiketi imethibitishwa na kutumika.`);
      setQrPayload(""); await loadDashboard(true);
    } catch (checkinError) { setCheckinMessage(checkinError instanceof Error ? checkinError.message : "Tiketi haikuweza kuhakikiwa."); }
    finally { setCheckinBusy(false); }
  }

  if (!ready) return <main className="organizer-page"><p className="organizer-loading">Inafungua dashibodi...</p></main>;
  if (!token) return (
    <main className="organizer-page">
      <header className="organizer-header"><Link className="brand" href="/"><span className="brand-mark">t</span><span>Tukio</span></Link><Link href="/" className="organizer-home-link"><ArrowLeft size={15} /> Rudi mwanzo</Link></header>
      <section className="organizer-auth-layout">
        <div className="organizer-auth-intro"><span className="eyebrow"><span className="eyebrow-dot" />Kwa waandaaji</span><h1>Simamia tukio lako sehemu moja.</h1><p>Chapisha matukio, angalia mauzo ya tiketi na fuatilia oda zako.</p><ul><li><CheckCircle2 size={16} />Mauzo na tiketi kwa kila tukio</li><li><CheckCircle2 size={16} />Aina za tiketi na bei tofauti</li><li><CheckCircle2 size={16} />Uhakiki wa tiketi za QR</li></ul></div>
        <form className="organizer-auth-card" onSubmit={authenticate}>
          <p className="eyebrow"><span className="eyebrow-dot" />Dashibodi ya muandaaji</p><h2>{mode === "login" ? "Karibu tena" : "Fungua akaunti ya muandaaji"}</h2><p>{mode === "login" ? "Ingia kufuatilia matukio na mauzo yako." : "Tumia akaunti hii kusimamia matukio yako."}</p>
          {mode === "register" && <label>Jina kamili<input autoComplete="name" maxLength={100} onChange={(input) => setAuthForm({ ...authForm, name: input.target.value })} required value={authForm.name} /></label>}
          <label>Barua pepe<input autoComplete="email" onChange={(input) => setAuthForm({ ...authForm, email: input.target.value })} required type="email" value={authForm.email} /></label>
          <label>Nenosiri<span className="organizer-password-field"><input autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} onChange={(input) => setAuthForm({ ...authForm, password: input.target.value })} required type={showPassword ? "text" : "password"} value={authForm.password} /><button aria-label={showPassword ? "Ficha nenosiri" : "Onyesha nenosiri"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{mode === "register" && <small>Tumia herufi zisizopungua 12.</small>}</label>
          {mode === "register" && <label>Thibitisha nenosiri<span className="organizer-password-field"><input autoComplete="new-password" minLength={12} onChange={(input) => setConfirmPassword(input.target.value)} required type={showConfirmPassword ? "text" : "password"} value={confirmPassword} /><button aria-label={showConfirmPassword ? "Ficha uthibitisho wa nenosiri" : "Onyesha uthibitisho wa nenosiri"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)} type="button">{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
          {authError && <p className="organizer-error" role="alert">{authError}</p>}
          <button className="button button-primary organizer-wide-button" disabled={authBusy} type="submit">{authBusy ? "Subiri..." : mode === "login" ? "Ingia" : "Jisajili"}</button>
          <button className="organizer-mode-toggle" onClick={() => { setMode(mode === "login" ? "register" : "login"); setAuthError(""); setConfirmPassword(""); setShowPassword(false); setShowConfirmPassword(false); }} type="button">{mode === "login" ? "Huna akaunti? Jisajili hapa" : "Una akaunti? Ingia"}</button>
          <small className="organizer-simulation-note">Akaunti hii ni ya waandaaji. Malipo na utoaji wa pesa bado ni demo.</small>
        </form>
      </section>
    </main>
  );

  return (
    <main className="organizer-page">
      <header className="organizer-header"><Link className="brand" href="/"><span className="brand-mark">t</span><span>Tukio</span></Link><div className="organizer-header-actions"><span>{user?.name ?? "Muandaaji"}</span><button className="organizer-logout" onClick={logout} type="button"><LogOut size={15} /> Toka</button></div></header>
      <div className="organizer-dashboard">
        <div className="organizer-dashboard-heading"><div><span className="eyebrow"><span className="eyebrow-dot" />Dashibodi ya muandaaji</span><h1>Habari, {user?.name?.split(" ")[0] ?? "Muandaaji"}</h1><p>Takwimu husasishwa kiotomatiki kila sekunde 20.</p></div><button className="organizer-refresh" disabled={refreshing} onClick={() => void loadDashboard()} type="button"><RefreshCw size={15} className={refreshing ? "is-spinning" : ""} /> Sasisha</button></div>
        {notice && <p className="organizer-notice" role="status">{notice}</p>}{dashboardError && <p className="organizer-error" role="alert">{dashboardError}</p>}
        {dashboard && <>
          <section className="organizer-stat-grid">
            <article><span><CalendarDays size={17} />Matukio</span><strong>{dashboard.summary.eventCount}</strong></article>
            <article><span><Ticket size={17} />Tiketi zimeuzwa</span><strong>{dashboard.summary.ticketsSold}</strong></article>
            <article><span><CircleDollarSign size={17} />Mauzo ya demo</span><strong>TZS {money.format(dashboard.summary.grossSales)}</strong></article>
            <article><span><Users size={17} />Oda zinazosubiri</span><strong>{dashboard.summary.pendingOrders}</strong></article>
          </section>
          <section className="organizer-dashboard-section"><div className="organizer-section-title"><div><span className="eyebrow"><span className="eyebrow-dot" />Matukio yako</span><h2>Simamia matukio</h2></div></div>
            {dashboard.events.length ? <div className="organizer-event-list">{dashboard.events.map((event) => <article className="organizer-event-card" key={event.id}>
              <div className="organizer-event-heading"><div><span className={`organizer-status ${event.status.toLowerCase()}`}>{event.status === "PUBLISHED" ? "Imechapishwa" : event.status}</span><h3>{event.title}</h3><p>{event.category} · {event.venue} · {new Date(event.startsAt).toLocaleDateString("sw-TZ")}</p></div><div className="organizer-event-actions"><button className="organizer-edit-button" onClick={() => beginEdit(event)} type="button">Hariri</button>{event.status === "DRAFT" && <button className="button button-primary button-small" disabled={!event.ticketTypes.length} onClick={() => void publishEvent(event.id)} type="button">Chapisha</button>}</div></div>
              {editingEventId === event.id && <form className="organizer-edit-form" onSubmit={(formEvent) => void updateEvent(formEvent, event.id)}><label>Jina la tukio<input maxLength={150} onChange={(input) => setEditForm({ ...editForm, title: input.target.value })} required value={editForm.title} /></label><label>Aina<input maxLength={80} onChange={(input) => setEditForm({ ...editForm, category: input.target.value })} required value={editForm.category} /></label><label>Mahali<input maxLength={200} onChange={(input) => setEditForm({ ...editForm, venue: input.target.value })} required value={editForm.venue} /></label><label>Tarehe na muda<input onChange={(input) => setEditForm({ ...editForm, startsAt: input.target.value })} required type="datetime-local" value={editForm.startsAt} /></label><label className="organizer-full-field">Maelezo<textarea maxLength={4000} onChange={(input) => setEditForm({ ...editForm, description: input.target.value })} required rows={3} value={editForm.description} /></label><label className="organizer-full-field">Kiungo cha picha (URL)<input onChange={(input) => setEditForm({ ...editForm, image: input.target.value })} placeholder="https://..." type="url" value={editForm.image} /><small>Unaweza kuongeza au kubadilisha picha hata baada ya kuchapisha tukio.</small></label><div className="organizer-edit-actions organizer-full-field"><button className="button button-primary button-small" disabled={editBusy} type="submit">{editBusy ? "Inahifadhi..." : "Hifadhi mabadiliko"}</button><button className="organizer-edit-button" disabled={editBusy} onClick={() => setEditingEventId("")} type="button">Ghairi</button></div></form>}
              <div className="organizer-ticket-table"><div className="organizer-ticket-row organizer-ticket-head"><span>Aina ya tiketi</span><span>Bei</span><span>Umeuzwa / jumla</span><span>Zimehifadhiwa</span></div>{event.ticketTypes.map((type) => <div className="organizer-ticket-row" key={type.id}><span>{type.name}</span><span>TZS {money.format(type.price)}</span><span>{type.sold} / {type.quantity}</span><span>{type.reserved}</span></div>)}</div>
              {event.status === "DRAFT" && <form className="organizer-add-ticket-form" onSubmit={(formEvent) => void addTicketType(formEvent, event.id)}><strong>Ongeza aina nyingine</strong><label>Jina<input maxLength={80} onChange={(input) => setTicketForm({ ...ticketForm, eventId: event.id, name: input.target.value })} placeholder="VIP au Early Bird" required value={ticketForm.eventId === event.id ? ticketForm.name : "VIP"} /></label><label>Bei (TZS)<input min="0" max="200000000" step="1" onChange={(input) => setTicketForm({ ...ticketForm, eventId: event.id, price: input.target.value })} required type="number" value={ticketForm.eventId === event.id ? ticketForm.price : ""} /></label><label>Idadi<input min="1" max="1000000" step="1" onChange={(input) => setTicketForm({ ...ticketForm, eventId: event.id, quantity: input.target.value })} required type="number" value={ticketForm.eventId === event.id ? ticketForm.quantity : "50"} /></label><button className="button button-primary button-small" disabled={ticketBusy === event.id} type="submit">{ticketBusy === event.id ? "Inaongeza..." : "Ongeza tiketi"}</button></form>}
            </article>)}</div> : <p className="organizer-empty">Bado huna tukio. Tumia fomu hapa chini kuanza.</p>}
          </section>
          <section className="organizer-dashboard-section organizer-two-column"><div className="organizer-subpanel"><span className="eyebrow"><span className="eyebrow-dot" />Tukio jipya</span><h2>Unda tukio</h2><form className="organizer-form-grid" onSubmit={createEvent}>
            <label>Jina la tukio<input maxLength={150} onChange={(input) => setEventForm({ ...eventForm, title: input.target.value })} required value={eventForm.title} /></label>
            <label>Aina ya tangazo<select onChange={(input) => setEventForm({ ...eventForm, category: input.target.value, ticketName: input.target.value === "Movies" ? "Standard" : input.target.value === "Buses" ? "Kawaida" : input.target.value === "Flights" ? "Economy" : "Regular" })} required value={eventForm.category}>{["Muziki", "Kongamano", "Burudani", "Sherehe", "Michezo", "Movies", "Buses", "Flights"].map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label className="organizer-full-field">Maelezo<textarea maxLength={4000} onChange={(input) => setEventForm({ ...eventForm, description: input.target.value })} required rows={3} value={eventForm.description} /></label>
            <label>Mahali, njia au kituo<input maxLength={200} onChange={(input) => setEventForm({ ...eventForm, venue: input.target.value })} placeholder={eventForm.category === "Buses" ? "Dar es Salaam → Arusha" : eventForm.category === "Flights" ? "DAR → JRO" : eventForm.category === "Movies" ? "Jumba la sinema" : "Ukumbi au eneo"} required value={eventForm.venue} /></label>
            <label>Tarehe na muda<input onChange={(input) => setEventForm({ ...eventForm, startsAt: input.target.value })} required type="datetime-local" value={eventForm.startsAt} /></label>
            <label className="organizer-full-field">Picha (URL, hiari)<input onChange={(input) => setEventForm({ ...eventForm, image: input.target.value })} type="url" value={eventForm.image} /></label>
            <h3 className="organizer-full-field">Tiketi ya kwanza</h3>
            <label>{eventForm.category === "Movies" ? "Aina ya kiti" : eventForm.category === "Flights" ? "Daraja la ndege" : eventForm.category === "Buses" ? "Daraja la safari" : "Jina la tiketi"}<input maxLength={80} onChange={(input) => setEventForm({ ...eventForm, ticketName: input.target.value })} required value={eventForm.ticketName} /></label>
            <label>Bei (TZS)<input min="0" max="200000000" step="1" onChange={(input) => setEventForm({ ...eventForm, price: input.target.value })} required type="number" value={eventForm.price} /></label>
            <label>Idadi ya tiketi<input min="1" max="1000000" step="1" onChange={(input) => setEventForm({ ...eventForm, quantity: input.target.value })} required type="number" value={eventForm.quantity} /></label>
            <button className="button button-primary organizer-full-field" disabled={eventBusy} type="submit"><Plus size={16} />{eventBusy ? "Inahifadhi..." : "Hifadhi draft"}</button>
          </form></div>
          <div className="organizer-subpanel"><span className="eyebrow"><span className="eyebrow-dot" />Payout ya demo</span><h2>Omba kutoa pesa</h2><p className="organizer-balance">Salio la majaribio: <strong>TZS {money.format(dashboard.summary.availableBalance)}</strong></p><form className="organizer-payout-form" onSubmit={requestPayout}>
            <label>Kiasi<input min="1" max={dashboard.summary.availableBalance} onChange={(input) => setPayoutForm({ ...payoutForm, amount: input.target.value })} required type="number" value={payoutForm.amount} /></label>
            <label>Mtandao<select onChange={(input) => setPayoutForm({ ...payoutForm, provider: input.target.value })} value={payoutForm.provider}>{providers.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Namba ya simu<input autoComplete="tel" maxLength={30} onChange={(input) => setPayoutForm({ ...payoutForm, phone: input.target.value })} required type="tel" value={payoutForm.phone} /></label>
            <button className="button button-primary organizer-wide-button" disabled={payoutBusy || dashboard.summary.availableBalance < 1} type="submit">{payoutBusy ? "Inatuma ombi..." : "Omba payout (demo)"}</button>
          </form><p className="organizer-simulation-note">Ombi na salio ni vya demo. Hakuna pesa inayotolewa au kutumwa.</p>{dashboard.payoutRequests.length > 0 && <div className="organizer-payout-history"><h3>Maombi ya awali</h3>{dashboard.payoutRequests.map((payout) => <p key={payout.id}>TZS {money.format(payout.amount)} · {payout.provider} · Demo tu</p>)}</div>}</div></section>
          <section className="organizer-dashboard-section"><div className="organizer-section-title"><div><span className="eyebrow"><span className="eyebrow-dot" />Mauzo ya tiketi</span><h2>Oda za hivi karibuni</h2></div></div>{orders.length ? <div className="organizer-orders-table"><div className="organizer-order-row organizer-order-head"><span>Mteja / tukio</span><span>Tiketi</span><span>Kiasi</span><span>Hali</span></div>{orders.slice(0, 30).map((order) => <div className="organizer-order-row" key={order.id}><span><strong>{order.buyerName}</strong><small>{order.event.title}</small></span><span>{order.items.map((item) => `${item.quantity} × ${item.ticketType.name}`).join(", ")}</span><span>TZS {money.format(order.totalAmount)}</span><span>{order.status === "PAID" ? "PAID · demo" : order.status}</span></div>)}</div> : <p className="organizer-empty">Oda zitaonekana wateja wanapoweka nafasi.</p>}</section>
          <section className="organizer-dashboard-section organizer-subpanel"><span className="eyebrow"><span className="eyebrow-dot" />Siku ya tukio</span><h2>Hakiki tiketi ya QR</h2><p>Bandika maandishi yaliyosomwa na QR scanner. Tiketi iliyothibitishwa haiwezi kutumika tena.</p><form className="organizer-checkin-form" onSubmit={checkInTicket}><label>QR payload<input autoComplete="off" onChange={(input) => setQrPayload(input.target.value)} placeholder="ticket-id.signature" required value={qrPayload} /></label><button className="button button-primary" disabled={checkinBusy} type="submit">{checkinBusy ? "Inahakiki..." : "Hakiki tiketi"}</button></form>{checkinMessage && <p className="organizer-notice" role="status">{checkinMessage}</p>}</section>
        </>}
      </div>
    </main>
  );
}
