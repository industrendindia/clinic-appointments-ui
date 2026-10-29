import React, { FormEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { api, User } from "./main";

type Nav =
  | "Appointments"
  | "Customers"
  | "Partners"
  | "Services"
  | "Rooms"
  | "Payments"
  | "Attendance"
  | "Settings";
type Row = Record<string, any>;
const money = (v: any) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v || 0),
  );
function useRows(path: string, token: string) {
  const [rows, setRows] = useState<Row[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const load = () => {
    setBusy(true);
    api<Row[]>(path, {}, token)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };
  useEffect(load, [path, token]);
  return { rows, error, busy, load };
}
function Notice({ error, ok }: { error: string; ok: string }) {
  return (
    <>
      {error && <div className="formError">{error}</div>}
      {ok && <div className="formSuccess">{ok}</div>}
    </>
  );
}
function Page({
  title,
  subtitle,
  icon: I,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="content resourcePage">
      <div className="resourceTitle">
        <i>
          <I />
        </i>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
function CardList({
  rows,
  render,
  empty,
}: {
  rows: Row[];
  render: (r: Row) => React.ReactNode;
  empty: string;
}) {
  return (
    <div className="recordList">
      {rows.length ? (
        rows.map((r, i) => (
          <article className="record" key={r.id || i}>
            {render(r)}
          </article>
        ))
      ) : (
        <div className="emptyState">
          <ClipboardCheck />
          <b>{empty}</b>
        </div>
      )}
    </div>
  );
}
function CreateForm({
  title,
  onSubmit,
  children,
}: {
  title: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <form className="createForm" onSubmit={onSubmit}>
      <h3>
        <Plus size={18} />
        {title}
      </h3>
      <div className="formGrid">{children}</div>
      <button className="primary">
        <Plus size={16} />
        Save
      </button>
    </form>
  );
}
const field = (f: FormData, n: string) => String(f.get(n) || "");

export function OperationsPage({
  active,
  token,
  user,
  onAppointmentCreated,
}: {
  active: Nav;
  token: string;
  user: User;
  onAppointmentCreated: () => void;
}) {
  if (active === "Rooms")
    return <Rooms token={token} owner={user.role === "OWNER"} />;
  if (active === "Customers") return <Customers token={token} />;
  if (active === "Partners")
    return <Partners token={token} owner={user.role === "OWNER"} />;
  if (active === "Services")
    return <Services token={token} owner={user.role === "OWNER"} />;
  if (active === "Appointments")
    return <Appointments token={token} onCreated={onAppointmentCreated} />;
  if (active === "Payments") return <Payments token={token} />;
  if (active === "Attendance") return <Attendance token={token} />;
  return (
    <Page
      title="Clinic settings"
      subtitle="Clinic identity and working hours are loaded from the database."
      icon={Menu}
    >
      <section className="panel">
        <dl className="settingsList">
          <div>
            <dt>Clinic</dt>
            <dd>{user.clinic_name}</dd>
          </div>
          <div>
            <dt>Branch</dt>
            <dd>{user.branch_name}</dd>
          </div>
          <div>
            <dt>Default session</dt>
            <dd>{user.default_slot_minutes} minutes</dd>
          </div>
          <div>
            <dt>Working hours</dt>
            <dd>
              {user.opens_at} – {user.closes_at}
            </dd>
          </div>
        </dl>
      </section>
    </Page>
  );
}

function Rooms({ token, owner }: { token: string; owner: boolean }) {
  const data = useRows("/rooms", token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await api(
        "/rooms",
        {
          method: "POST",
          body: JSON.stringify({
            name: field(f, "name"),
            roomType: field(f, "roomType"),
          }),
        },
        token,
      );
      form.reset();
      setOk("Room added.");
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Rooms"
      subtitle="Configure bookable rooms and their required service type."
      icon={Menu}
    >
      {owner && (
        <CreateForm title="Add room" onSubmit={submit}>
          <label>
            Room name
            <input name="name" required placeholder="Therapy 1" />
          </label>
          <label>
            Room type
            <select name="roomType">
              <option>THERAPY</option>
              <option>ASSESSMENT</option>
              <option>COUNSELLING</option>
              <option>GENERAL</option>
            </select>
          </label>
        </CreateForm>
      )}
      <Notice error={error || data.error} ok={ok} />
      <CardList
        rows={data.rows}
        empty="No rooms configured"
        render={(r) => (
          <>
            <div>
              <b>{r.name}</b>
              <small>{r.room_type}</small>
            </div>
            <em className="statusPill">{r.active ? "Active" : "Inactive"}</em>
          </>
        )}
      />
    </Page>
  );
}

function Customers({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const data = useRows(`/customers?q=${encodeURIComponent(q)}`, token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await api(
        "/customers",
        {
          method: "POST",
          body: JSON.stringify({
            fullName: field(f, "fullName"),
            phone: field(f, "phone"),
            email: field(f, "email") || null,
          }),
        },
        token,
      );
      form.reset();
      setOk("Customer added.");
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Customers"
      subtitle="Create and search real customer records for this clinic."
      icon={UsersRound}
    >
      <CreateForm title="Add customer" onSubmit={submit}>
        <label>
          Full name
          <input name="fullName" required />
        </label>
        <label>
          Phone
          <input name="phone" required inputMode="tel" />
        </label>
        <label>
          Email
          <input name="email" type="email" />
        </label>
      </CreateForm>
      <label className="pageSearch">
        <Search />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers"
        />
      </label>
      <Notice error={error || data.error} ok={ok} />
      <CardList
        rows={data.rows}
        empty="No customers found"
        render={(r) => (
          <>
            <div>
              <b>{r.full_name}</b>
              <small>
                {r.phone}
                {r.email ? ` · ${r.email}` : ""}
              </small>
            </div>
            <em>{r.joined_on}</em>
          </>
        )}
      />
    </Page>
  );
}

function Partners({ token, owner }: { token: string; owner: boolean }) {
  const data = useRows("/practitioners", token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await api(
        "/staff",
        {
          method: "POST",
          body: JSON.stringify({
            username: field(f, "username"),
            password: field(f, "password"),
            displayName: field(f, "displayName"),
            phone: field(f, "phone"),
            role: "PRACTITIONER",
            engagement: field(f, "engagement"),
            yearsExperience: Number(field(f, "yearsExperience")),
          }),
        },
        token,
      );
      form.reset();
      setOk("Practitioner account created.");
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Partner practitioners"
      subtitle="Onboard practitioners with their own secure login."
      icon={Stethoscope}
    >
      {owner && (
        <CreateForm title="Add practitioner" onSubmit={submit}>
          <label>
            Name
            <input name="displayName" required />
          </label>
          <label>
            Login email
            <input name="username" type="email" required />
          </label>
          <label>
            Temporary password
            <input name="password" type="password" minLength={12} required />
          </label>
          <label>
            Phone
            <input name="phone" inputMode="tel" />
          </label>
          <label>
            Engagement
            <select name="engagement">
              <option>FULL_TIME</option>
              <option>PART_TIME</option>
              <option>VISITING</option>
            </select>
          </label>
          <label>
            Experience (years)
            <input
              name="yearsExperience"
              type="number"
              min="0"
              step="0.5"
              defaultValue="0"
            />
          </label>
        </CreateForm>
      )}
      <Notice error={error || data.error} ok={ok} />
      <CardList
        rows={data.rows}
        empty="No practitioners configured"
        render={(r) => (
          <>
            <div>
              <b>{r.full_name}</b>
              <small>
                {r.username} · {r.engagement}
              </small>
            </div>
            <em>{r.years_experience} years</em>
          </>
        )}
      />
    </Page>
  );
}

function Services({ token, owner }: { token: string; owner: boolean }) {
  const services = useRows("/services", token),
    products = useRows("/products", token),
    packages = useRows("/packages", token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(path: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    let body: any = Object.fromEntries(f.entries());
    for (const n of [
      "minutes",
      "price",
      "discountPercent",
      "stockQuantity",
      "sessionCount",
    ])
      if (n in body) body[n] = Number(body[n]);
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) }, token);
      form.reset();
      setOk("Saved to clinic catalogue.");
      services.load();
      products.load();
      packages.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function share() {
    try {
      const m = await api<any>("/whatsapp/service-menu", {}, token);
      const text = [
        `*${m.clinic.name} services*`,
        ...m.services.map(
          (s: any, i: number) =>
            `${i + 1}. ${s.name} — ${s.minutes} min — ${money(s.price)}`,
        ),
      ].join("\n");
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Services, sessions & products"
      subtitle="Maintain a database-backed catalogue and share it on WhatsApp."
      icon={ClipboardCheck}
    >
      <button className="whatsapp" onClick={share}>
        <MessageCircle />
        Share service menu on WhatsApp
      </button>
      {owner && (
        <div className="catalogForms">
          <CreateForm
            title="Add service"
            onSubmit={(e) => submit("/services", e)}
          >
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Category
              <input name="category" required placeholder="Therapy" />
            </label>
            <label>
              Room type
              <select name="roomType">
                <option>THERAPY</option>
                <option>ASSESSMENT</option>
                <option>COUNSELLING</option>
                <option>GENERAL</option>
              </select>
            </label>
            <label>
              Minutes
              <input name="minutes" type="number" min="15" defaultValue="45" />
            </label>
            <label>
              Price
              <input name="price" type="number" min="0" step="0.01" />
            </label>
            <label>
              Discount %
              <input
                name="discountPercent"
                type="number"
                min="0"
                max="100"
                defaultValue="0"
              />
            </label>
          </CreateForm>
          <CreateForm
            title="Add product"
            onSubmit={(e) => submit("/products", e)}
          >
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Description
              <input name="description" />
            </label>
            <label>
              Price
              <input name="price" type="number" min="0" step="0.01" />
            </label>
            <label>
              Stock
              <input
                name="stockQuantity"
                type="number"
                min="0"
                defaultValue="0"
              />
            </label>
          </CreateForm>
          <CreateForm
            title="Add session package"
            onSubmit={(e) => submit("/packages", e)}
          >
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Service
              <select name="serviceId" required>
                <option value="">Select service</option>
                {services.rows.map((s) => (
                  <option value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              Sessions
              <input
                name="sessionCount"
                type="number"
                min="1"
                defaultValue="4"
              />
            </label>
            <label>
              Package price
              <input name="price" type="number" min="0" step="0.01" />
            </label>
          </CreateForm>
        </div>
      )}
      <Notice
        error={error || services.error || products.error || packages.error}
        ok={ok}
      />
      <h3 className="sectionLabel">Services</h3>
      <CardList
        rows={services.rows}
        empty="No services configured"
        render={(r) => (
          <>
            <div>
              <b>{r.name}</b>
              <small>
                {r.category} · {r.minutes} minutes
              </small>
            </div>
            <em>{money(r.price)}</em>
          </>
        )}
      />
      <h3 className="sectionLabel">Products</h3>
      <CardList
        rows={products.rows}
        empty="No products configured"
        render={(r) => (
          <>
            <div>
              <b>{r.name}</b>
              <small>
                {r.description || "Clinic product"} · Stock {r.stock_quantity}
              </small>
            </div>
            <em>{money(r.price)}</em>
          </>
        )}
      />
      <h3 className="sectionLabel">Session packages</h3>
      <CardList
        rows={packages.rows}
        empty="No packages configured"
        render={(r) => (
          <>
            <div>
              <b>{r.name}</b>
              <small>
                {r.service} · {r.session_count} sessions
              </small>
            </div>
            <em>{money(r.price)}</em>
          </>
        )}
      />
    </Page>
  );
}

function Appointments({
  token,
  onCreated,
}: {
  token: string;
  onCreated: () => void;
}) {
  const customers = useRows("/customers?q=", token),
    practitioners = useRows("/practitioners", token),
    services = useRows("/services", token);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    data = useRows(`/appointments?date=${date}`, token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await api(
        "/appointments",
        {
          method: "POST",
          body: JSON.stringify({
            customerId: field(f, "customerId"),
            practitionerId: field(f, "practitionerId"),
            serviceId: field(f, "serviceId"),
            startsAt: field(f, "startsAt"),
          }),
        },
        token,
      );
      form.reset();
      setOk("Appointment booked and room allocated.");
      data.load();
      onCreated();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Appointments"
      subtitle="Book a customer with a practitioner; an available matching room is allocated automatically."
      icon={CalendarDays}
    >
      <CreateForm title="New appointment" onSubmit={submit}>
        <label>
          Customer
          <select name="customerId" required>
            <option value="">Select customer</option>
            {customers.rows.map((x) => (
              <option value={x.id}>{x.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Practitioner
          <select name="practitionerId" required>
            <option value="">Select practitioner</option>
            {practitioners.rows.map((x) => (
              <option value={x.id}>{x.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Service
          <select name="serviceId" required>
            <option value="">Select service</option>
            {services.rows.map((x) => (
              <option value={x.id}>{x.name}</option>
            ))}
          </select>
        </label>
        <label>
          Date and time
          <input name="startsAt" type="datetime-local" required />
        </label>
      </CreateForm>
      <Notice error={error || data.error} ok={ok} />
      <label className="dateFilter">
        Schedule date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <CardList
        rows={data.rows}
        empty="No appointments for this date"
        render={(r) => (
          <>
            <div>
              <b>{r.customer}</b>
              <small>
                {r.service} · {r.practitioner} · {r.room}
              </small>
            </div>
            <em>
              {new Date(r.starts_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </em>
          </>
        )}
      />
    </Page>
  );
}

function Payments({ token }: { token: string }) {
  const customers = useRows("/customers?q=", token),
    data = useRows("/payments", token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      const r = await api<any>(
        "/payments/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            customerId: field(f, "customerId"),
            amount: Number(field(f, "amount")),
            method: field(f, "method"),
            otp: field(f, "otp"),
          }),
        },
        token,
      );
      form.reset();
      setOk(`Payment recorded. Receipt ${r.receiptNumber}`);
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Payments"
      subtitle="Record confirmed clinic payments and issue a receipt number."
      icon={CreditCard}
    >
      <CreateForm title="Record payment" onSubmit={submit}>
        <label>
          Customer
          <select name="customerId" required>
            <option value="">Select customer</option>
            {customers.rows.map((x) => (
              <option value={x.id}>{x.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Method
          <select name="method">
            <option>UPI</option>
            <option>CARD</option>
            <option>CASH</option>
            <option>BANK_TRANSFER</option>
          </select>
        </label>
        <label>
          Confirmation OTP
          <input name="otp" inputMode="numeric" required />
        </label>
      </CreateForm>
      <Notice error={error || data.error} ok={ok} />
      <CardList
        rows={data.rows}
        empty="No payments recorded"
        render={(r) => (
          <>
            <div>
              <b>{r.customer}</b>
              <small>
                {r.method} · {r.receipt_number}
              </small>
            </div>
            <em>{money(r.amount)}</em>
          </>
        )}
      />
    </Page>
  );
}

function Attendance({ token }: { token: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    data = useRows(`/appointments?date=${date}`, token),
    [error, setError] = useState("");
  async function mark(id: string, status: string) {
    try {
      await api(
        `/appointments/${id}/attendance`,
        { method: "PUT", body: JSON.stringify({ status, comment: "" }) },
        token,
      );
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Attendance"
      subtitle="Mark completed sessions or no-shows from the live appointment register."
      icon={ClipboardCheck}
    >
      <label className="dateFilter">
        Attendance date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <Notice error={error || data.error} ok="" />
      <CardList
        rows={data.rows}
        empty="No appointments to mark"
        render={(r) => (
          <>
            <div>
              <b>{r.customer}</b>
              <small>
                {r.service} ·{" "}
                {new Date(r.starts_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
            {r.status === "BOOKED" ? (
              <div className="rowActions">
                <button onClick={() => mark(r.id, "DONE")}>Present</button>
                <button
                  className="danger"
                  onClick={() => mark(r.id, "NO_SHOW")}
                >
                  No show
                </button>
              </div>
            ) : (
              <em className="statusPill">{r.status}</em>
            )}
          </>
        )}
      />
    </Page>
  );
}
