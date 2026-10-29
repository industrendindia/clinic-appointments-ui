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
  | "Manage Appointments"
  | "Customers"
  | "Practitioners"
  | "Services"
  | "Rooms"
  | "Payments"
  | "Attendance"
  | "Success Stories"
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
const selected = (f: FormData, n: string) => f.getAll(n).map(String);
const groupByDate = (rows: Row[]) =>
  rows.reduce<Record<string, Row[]>>((groups, row) => {
    (groups[String(row.date)] ??= []).push(row);
    return groups;
  }, {});
const idList = (value: any): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};
const fileData = (file: File | null) =>
  new Promise<string>((resolve, reject) => {
    if (!file || !file.size) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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
  if (active === "Practitioners")
    return <Partners token={token} owner={user.role === "OWNER"} />;
  if (active === "Services")
    return <Services token={token} owner={user.role === "OWNER"} />;
  if (active === "Manage Appointments")
    return <Appointments token={token} onCreated={onAppointmentCreated} />;
  if (active === "Payments")
    return <Payments token={token} owner={user.role === "OWNER"} />;
  if (active === "Attendance") return <Attendance token={token} />;
  if (active === "Success Stories")
    return <MediaLibrary token={token} owner={user.role === "OWNER"} />;
  return <Settings token={token} />;
}

function Settings({ token }: { token: string }) {
  const [value, setValue] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  useEffect(() => {
    api<Row>("/settings", {}, token)
      .then(setValue)
      .catch((e) => setError(e.message));
  }, [token]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(
        "/settings",
        {
          method: "PUT",
          body: JSON.stringify({
            theme: field(f, "theme"),
            defaultSlotMinutes: Number(field(f, "defaultSlotMinutes")),
            freeCustomerCancellations: Number(
              field(f, "freeCustomerCancellations"),
            ),
            practitionerCancelCredit: Number(
              field(f, "practitionerCancelCredit"),
            ),
            cancellationNoticeHours: Number(
              field(f, "cancellationNoticeHours"),
            ),
            opensAt: field(f, "opensAt"),
            closesAt: field(f, "closesAt"),
            whatsappPhone: field(f, "whatsappPhone"),
            email: field(f, "email"),
            logoUrl: field(f, "logoUrl"),
            paymentOtp: field(f, "paymentOtp"),
          }),
        },
        token,
      );
      setOk(
        "Clinic policies saved. Sign in again to apply the selected theme.",
      );
    } catch (x) {
      setError((x as Error).message);
    }
  }
  if (!value)
    return (
      <Page
        title="Clinic settings"
        subtitle="Loading database configuration…"
        icon={Menu}
      >
        <Notice error={error} ok="" />
      </Page>
    );
  return (
    <Page
      title="Clinic settings"
      subtitle="Manage branch hours, booking policies, branding and payment confirmation."
      icon={Menu}
    >
      <form className="createForm" onSubmit={submit}>
        <div className="formGrid">
          <label>
            Warm theme
            <select name="theme" defaultValue={value.theme}>
              {[
                "terracotta",
                "sage",
                "sunset",
                "rose",
                "sand",
                "plum",
                "ocean",
                "marigold",
                "lavender",
              ].map((x) => (
                <option value={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Opening time
            <input
              name="opensAt"
              type="time"
              defaultValue={String(value.opens_at).slice(0, 5)}
            />
          </label>
          <label>
            Closing time
            <input
              name="closesAt"
              type="time"
              defaultValue={String(value.closes_at).slice(0, 5)}
            />
          </label>
          <label>
            Default slot minutes
            <input
              name="defaultSlotMinutes"
              type="number"
              min="15"
              max="180"
              defaultValue={value.default_slot_minutes}
            />
          </label>
          <label>
            Free customer cancellations
            <input
              name="freeCustomerCancellations"
              type="number"
              min="0"
              defaultValue={value.free_customer_cancellations}
            />
          </label>
          <label>
            Cancellation notice hours
            <input
              name="cancellationNoticeHours"
              type="number"
              min="0"
              defaultValue={value.cancellation_notice_hours}
            />
          </label>
          <label>
            Doctor cancellation credit
            <input
              name="practitionerCancelCredit"
              type="number"
              min="0"
              defaultValue={value.practitioner_cancel_credit}
            />
          </label>
          <label>
            WhatsApp number
            <input
              name="whatsappPhone"
              defaultValue={value.whatsapp_phone || ""}
            />
          </label>
          <label>
            Clinic email
            <input name="email" type="email" defaultValue={value.email || ""} />
          </label>
          <label>
            Logo URL
            <input
              name="logoUrl"
              type="url"
              defaultValue={value.logo_url || ""}
            />
          </label>
          <label>
            New payment OTP
            <input
              name="paymentOtp"
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="Leave blank to keep current"
            />
          </label>
        </div>
        <button className="primary">Save clinic settings</button>
      </form>
      <Notice error={error} ok={ok} />
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
            active: f.get("active") === "on",
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
  async function update(id: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(
        `/rooms/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: field(f, "name"),
            roomType: field(f, "roomType"),
            active: f.get("active") === "on",
          }),
        },
        token,
      );
      setOk("Room updated.");
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
          <label className="checkField">
            <input name="active" type="checkbox" defaultChecked />
            Available for booking
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
            {owner && (
              <details className="inlineEditor">
                <summary>Edit</summary>
                <form onSubmit={(e) => update(r.id, e)}>
                  <label>
                    Name
                    <input name="name" defaultValue={r.name} required />
                  </label>
                  <label>
                    Type
                    <select name="roomType" defaultValue={r.room_type}>
                      <option>THERAPY</option>
                      <option>ASSESSMENT</option>
                      <option>COUNSELLING</option>
                      <option>GENERAL</option>
                    </select>
                  </label>
                  <label className="checkField">
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={r.active}
                    />
                    Active
                  </label>
                  <button>Save changes</button>
                </form>
              </details>
            )}
          </>
        )}
      />
    </Page>
  );
}

function Customers({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const data = useRows(`/customers?q=${encodeURIComponent(q)}`, token),
    services = useRows("/services", token),
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
            dob: field(f, "dob") || null,
            address: field(f, "address") || null,
            guardianName: field(f, "guardianName") || null,
            guardianPhone: field(f, "guardianPhone") || null,
            serviceIds: selected(f, "serviceIds"),
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
  async function update(id: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(
        `/customers/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            fullName: field(f, "fullName"),
            phone: field(f, "phone"),
            email: field(f, "email") || null,
            dob: field(f, "dob") || null,
            address: field(f, "address") || null,
            guardianName: field(f, "guardianName") || null,
            guardianPhone: field(f, "guardianPhone") || null,
            serviceIds: selected(f, "serviceIds"),
            active: f.get("active") === "on",
          }),
        },
        token,
      );
      setOk("Customer updated.");
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
        <label>
          Date of birth
          <input name="dob" type="date" />
        </label>
        <label>
          Address
          <input name="address" />
        </label>
        <label>
          Guardian name
          <input name="guardianName" />
        </label>
        <label>
          Guardian phone
          <input name="guardianPhone" inputMode="tel" />
        </label>
        <label>
          Services needed
          <select
            name="serviceIds"
            multiple
            size={Math.min(4, Math.max(2, services.rows.length))}
          >
            {services.rows.map((s) => (
              <option value={s.id}>{s.name}</option>
            ))}
          </select>
          <small>Use Ctrl/⌘ to select more than one.</small>
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
            <details className="inlineEditor">
              <summary>Edit</summary>
              <form onSubmit={(e) => update(r.id, e)}>
                <label>
                  Name
                  <input name="fullName" defaultValue={r.full_name} required />
                </label>
                <label>
                  Phone
                  <input name="phone" defaultValue={r.phone} required />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={r.email || ""}
                  />
                </label>
                <label>
                  Date of birth
                  <input name="dob" type="date" defaultValue={r.dob || ""} />
                </label>
                <label>
                  Address
                  <input name="address" defaultValue={r.address || ""} />
                </label>
                <label>
                  Guardian
                  <input
                    name="guardianName"
                    defaultValue={r.guardian_name || ""}
                  />
                </label>
                <label>
                  Guardian phone
                  <input
                    name="guardianPhone"
                    defaultValue={r.guardian_phone || ""}
                  />
                </label>
                <label>
                  Services
                  <select
                    name="serviceIds"
                    multiple
                    defaultValue={idList(r.service_ids)}
                  >
                    {services.rows.map((s) => (
                      <option value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
                <label className="checkField">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={r.active}
                  />
                  Active
                </label>
                <button>Save changes</button>
              </form>
            </details>
          </>
        )}
      />
    </Page>
  );
}

function Partners({ token, owner }: { token: string; owner: boolean }) {
  const data = useRows("/practitioners", token),
    services = useRows("/services", token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      const photo = f.get("photo") as File,
        docs = f.get("documents") as File;
      await api(
        "/practitioners/onboard",
        {
          method: "POST",
          body: JSON.stringify({
            username: field(f, "username") || null,
            password: field(f, "password") || null,
            displayName: field(f, "displayName"),
            phone: field(f, "phone"),
            dob: field(f, "dob") || null,
            joinedOn: field(f, "joinedOn") || null,
            engagement: field(f, "engagement"),
            yearsExperience: Number(field(f, "yearsExperience")),
            rate: Number(field(f, "rate") || 0),
            salary: Number(field(f, "salary") || 0),
            serviceIds: selected(f, "serviceIds"),
            availability: selected(f, "days").map((day) => ({
              dayOfWeek: Number(day),
              startsAt: field(f, "availableFrom"),
              endsAt: field(f, "availableTo"),
            })),
            photoBase64: await fileData(photo),
            photoContentType: photo?.type || null,
            documentZipBase64: await fileData(docs),
            documentZipName: docs?.name || null,
            createLogin: f.get("createLogin") === "on",
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
  async function submitReceptionist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      await api(
        "/receptionists",
        {
          method: "POST",
          body: JSON.stringify({
            displayName: field(f, "displayName"),
            username: field(f, "username"),
            password: field(f, "password"),
            phone: field(f, "phone"),
            joinedOn: field(f, "joinedOn") || null,
          }),
        },
        token,
      );
      form.reset();
      setOk("Receptionist account created.");
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function update(id: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      photo = f.get("photo") as File,
      docs = f.get("documents") as File;
    try {
      await api(
        `/practitioners/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            displayName: field(f, "displayName"),
            phone: field(f, "phone"),
            dob: field(f, "dob") || null,
            joinedOn: field(f, "joinedOn") || null,
            engagement: field(f, "engagement"),
            yearsExperience: Number(field(f, "yearsExperience") || 0),
            rate: Number(field(f, "rate") || 0),
            salary: Number(field(f, "salary") || 0),
            serviceIds: selected(f, "serviceIds"),
            availability: selected(f, "days").map((day) => ({
              dayOfWeek: Number(day),
              startsAt: field(f, "availableFrom"),
              endsAt: field(f, "availableTo"),
            })),
            photoBase64: await fileData(photo),
            photoContentType: photo?.type || null,
            documentZipBase64: await fileData(docs),
            documentZipName: docs?.name || null,
            active: f.get("active") === "on",
          }),
        },
        token,
      );
      setOk("Practitioner profile updated.");
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
        <>
          <CreateForm title="Add practitioner" onSubmit={submit}>
            <label>
              Name
              <input name="displayName" required />
            </label>
            <label>
              Login email
              <input
                name="username"
                type="email"
                placeholder="Optional when no login is created"
              />
            </label>
            <label>
              Temporary password
              <input
                name="password"
                type="password"
                minLength={12}
                placeholder="At least 12 characters"
              />
            </label>
            <label>
              Phone
              <input name="phone" inputMode="tel" />
            </label>
            <label>
              Date of birth
              <input name="dob" type="date" />
            </label>
            <label>
              Date joined
              <input name="joinedOn" type="date" required />
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
            <label>
              Per-session rate
              <input name="rate" type="number" min="0" step="0.01" />
            </label>
            <label>
              Monthly salary
              <input name="salary" type="number" min="0" step="0.01" />
            </label>
            <label>
              Services provided
              <select
                name="serviceIds"
                multiple
                required
                size={Math.min(5, Math.max(2, services.rows.length))}
              >
                {services.rows.map((s) => (
                  <option value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <fieldset className="availability">
              <legend>Available days</legend>
              {[
                [1, "Mon"],
                [2, "Tue"],
                [3, "Wed"],
                [4, "Thu"],
                [5, "Fri"],
                [6, "Sat"],
                [7, "Sun"],
              ].map(([v, n]) => (
                <label>
                  <input type="checkbox" name="days" value={v} />
                  {n}
                </label>
              ))}
            </fieldset>
            <label>
              Available from
              <input name="availableFrom" type="time" defaultValue="09:30" />
            </label>
            <label>
              Available to
              <input name="availableTo" type="time" defaultValue="20:00" />
            </label>
            <label>
              Profile photo
              <input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <label>
              Documents ZIP
              <input
                name="documents"
                type="file"
                accept=".zip,application/zip"
              />
            </label>
            <label className="checkField">
              <input name="createLogin" type="checkbox" defaultChecked />
              Create practitioner login
            </label>
          </CreateForm>
          <CreateForm title="Add receptionist" onSubmit={submitReceptionist}>
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
              Date joined
              <input name="joinedOn" type="date" />
            </label>
          </CreateForm>
        </>
      )}
      <Notice error={error || data.error} ok={ok} />
      <CardList
        rows={data.rows}
        empty="No practitioners configured"
        render={(r) => (
          <>
            <div>
              {r.photo_base64 && (
                <img
                  className="profilePhoto"
                  src={`data:${r.photo_content_type};base64,${r.photo_base64}`}
                  alt=""
                />
              )}
              <b>{r.full_name}</b>
              <small>
                {r.username || "No portal login"} · {r.engagement} ·{" "}
                {r.services || "No services assigned"}
              </small>
            </div>
            <em>{r.years_experience} years</em>
            {owner && (
              <details className="inlineEditor">
                <summary>Edit profile</summary>
                <form onSubmit={(e) => update(r.id, e)}>
                  <label>
                    Name
                    <input
                      name="displayName"
                      defaultValue={r.full_name}
                      required
                    />
                  </label>
                  <label>
                    Phone
                    <input name="phone" defaultValue={r.phone || ""} />
                  </label>
                  <label>
                    DOB
                    <input name="dob" type="date" defaultValue={r.dob || ""} />
                  </label>
                  <label>
                    Joined
                    <input
                      name="joinedOn"
                      type="date"
                      defaultValue={r.joined_on || ""}
                    />
                  </label>
                  <label>
                    Engagement
                    <select name="engagement" defaultValue={r.engagement}>
                      <option>FULL_TIME</option>
                      <option>PART_TIME</option>
                      <option>VISITING</option>
                    </select>
                  </label>
                  <label>
                    Experience
                    <input
                      name="yearsExperience"
                      type="number"
                      min="0"
                      step="0.5"
                      defaultValue={r.years_experience}
                    />
                  </label>
                  <label>
                    Rate
                    <input
                      name="rate"
                      type="number"
                      min="0"
                      defaultValue={r.rate || 0}
                    />
                  </label>
                  <label>
                    Salary
                    <input
                      name="salary"
                      type="number"
                      min="0"
                      defaultValue={r.salary || 0}
                    />
                  </label>
                  <label>
                    Services
                    <select
                      name="serviceIds"
                      multiple
                      defaultValue={idList(r.service_ids)}
                    >
                      {services.rows.map((s) => (
                        <option value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                  <fieldset className="availability">
                    <legend>Available days</legend>
                    {[
                      [1, "Mon"],
                      [2, "Tue"],
                      [3, "Wed"],
                      [4, "Thu"],
                      [5, "Fri"],
                      [6, "Sat"],
                      [7, "Sun"],
                    ].map(([v, n]) => (
                      <label>
                        <input
                          type="checkbox"
                          name="days"
                          value={v}
                          defaultChecked={String(r.availability || "").includes(
                            `${v}:`,
                          )}
                        />
                        {n}
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    From
                    <input
                      name="availableFrom"
                      type="time"
                      defaultValue="09:30"
                    />
                  </label>
                  <label>
                    To
                    <input
                      name="availableTo"
                      type="time"
                      defaultValue="20:00"
                    />
                  </label>
                  <label>
                    Replace photo
                    <input name="photo" type="file" accept="image/*" />
                  </label>
                  <label>
                    Replace documents
                    <input name="documents" type="file" accept=".zip" />
                  </label>
                  <label className="checkField">
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={r.active}
                    />
                    Active
                  </label>
                  <button>Save changes</button>
                </form>
              </details>
            )}
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
  async function updateService(id: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(
        `/services/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: field(f, "name"),
            category: field(f, "category"),
            roomType: field(f, "roomType"),
            minutes: Number(field(f, "minutes")),
            price: Number(field(f, "price")),
            discountPercent: Number(field(f, "discountPercent")),
            active: f.get("active") === "on",
          }),
        },
        token,
      );
      setOk("Service updated.");
      services.load();
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
            {owner && (
              <details className="inlineEditor">
                <summary>Edit</summary>
                <form onSubmit={(e) => updateService(r.id, e)}>
                  <label>
                    Name
                    <input name="name" defaultValue={r.name} required />
                  </label>
                  <label>
                    Category
                    <input name="category" defaultValue={r.category} required />
                  </label>
                  <label>
                    Room type
                    <select name="roomType" defaultValue={r.room_type}>
                      <option>THERAPY</option>
                      <option>ASSESSMENT</option>
                      <option>COUNSELLING</option>
                      <option>GENERAL</option>
                    </select>
                  </label>
                  <label>
                    Minutes
                    <input
                      name="minutes"
                      type="number"
                      min="15"
                      defaultValue={r.minutes}
                    />
                  </label>
                  <label>
                    Price
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={r.price}
                    />
                  </label>
                  <label>
                    Discount %
                    <input
                      name="discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={r.discount_percent}
                    />
                  </label>
                  <label className="checkField">
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={r.active}
                    />
                    Active
                  </label>
                  <button>Save changes</button>
                </form>
              </details>
            )}
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

function RescheduleEditor({
  appointment,
  token,
  onSaved,
  onError,
}: {
  appointment: Row;
  token: string;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const initialDate = String(appointment.starts_at).slice(0, 10);
  const [serviceId, setServiceId] = useState(String(appointment.service_id));
  const [date, setDate] = useState(initialDate);
  const [slot, setSlot] = useState("");
  const [services, setServices] = useState<Row[]>([]);
  const [slots, setSlots] = useState<Row[]>([]);

  useEffect(() => {
    api<Row[]>(
      `/practitioners/${appointment.practitioner_id}/services`,
      {},
      token,
    )
      .then(setServices)
      .catch((e) => onError(e.message));
  }, [appointment.practitioner_id, token]);

  useEffect(() => {
    if (!serviceId || !date) return;
    setSlot("");
    api<Row[]>(
      `/slots?practitionerId=${appointment.practitioner_id}&serviceId=${serviceId}&date=${date}&excludeAppointmentId=${appointment.id}`,
      {},
      token,
    )
      .then(setSlots)
      .catch((e) => {
        setSlots([]);
        onError(e.message);
      });
  }, [appointment.id, appointment.practitioner_id, date, serviceId, token]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) return onError("Select an available replacement slot");
    try {
      await api(
        `/appointments/${appointment.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ serviceId, startsAt: slot }),
        },
        token,
      );
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <form onSubmit={save}>
      <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
        {services.map((service) => (
          <option value={service.id}>{service.name}</option>
        ))}
      </select>
      <input
        type="date"
        min={new Date().toISOString().slice(0, 10)}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <select value={slot} onChange={(e) => setSlot(e.target.value)} required>
        <option value="">Select a free slot</option>
        {slots.map((available) => (
          <option value={available.startsAt}>{available.label}</option>
        ))}
      </select>
      {!slots.length && <small>No free slots on this date.</small>}
      <button disabled={!slot}>Save this date</button>
    </form>
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
    practitioners = useRows("/practitioners", token);
  const date = new Date().toISOString().slice(0, 10);
  const [filterFrom, setFilterFrom] = useState(date),
    [filterTo, setFilterTo] = useState(date);
  const [customerFilter, setCustomerFilter] = useState(""),
    [practitionerFilter, setPractitionerFilter] = useState("");
  const data = useRows(
    `/appointments?from=${filterFrom}&to=${filterTo}${customerFilter ? `&customerId=${customerFilter}` : ""}${practitionerFilter ? `&practitionerId=${practitionerFilter}` : ""}`,
    token,
  );
  const [error, setError] = useState(""),
    [ok, setOk] = useState("");
  const [practitionerId, setPractitionerId] = useState(""),
    [serviceId, setServiceId] = useState(""),
    [bookingDate, setBookingDate] = useState(date),
    [bookingMonth, setBookingMonth] = useState(date.slice(0, 7)),
    [bookingMode, setBookingMode] = useState<"SINGLE" | "MONTH">("SINGLE"),
    [monthTime, setMonthTime] = useState(""),
    [serviceOptions, setServiceOptions] = useState<Row[]>([]),
    [slots, setSlots] = useState<Row[]>([]),
    [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  useEffect(() => {
    if (!practitionerId) {
      setServiceOptions([]);
      return;
    }
    api<Row[]>(`/practitioners/${practitionerId}/services`, {}, token)
      .then(setServiceOptions)
      .catch((e) => setError(e.message));
  }, [practitionerId, token]);
  useEffect(() => {
    const month =
      bookingMode === "SINGLE" ? bookingDate.slice(0, 7) : bookingMonth;
    if (!practitionerId || !serviceId || !month) {
      setSlots([]);
      return;
    }
    api<Row[]>(
      `/availability/month?practitionerId=${practitionerId}&serviceId=${serviceId}&month=${month}`,
      {},
      token,
    )
      .then((rows) => {
        setSlots(
          bookingMode === "SINGLE"
            ? rows.filter((x) => x.date === bookingDate)
            : rows,
        );
        setSelectedSlots([]);
      })
      .catch((e) => setError(e.message));
  }, [
    practitionerId,
    serviceId,
    bookingDate,
    bookingMonth,
    bookingMode,
    token,
  ]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    try {
      if (!selectedSlots.length)
        throw new Error("Select at least one available slot");
      await api(
        "/appointments/series",
        {
          method: "POST",
          body: JSON.stringify({
            customerId: field(f, "customerId"),
            practitionerId,
            serviceId,
            startsAt: selectedSlots,
          }),
        },
        token,
      );
      form.reset();
      setOk(
        `${selectedSlots.length} appointment${selectedSlots.length > 1 ? "s" : ""} booked. Those slots are no longer offered to other bookings.`,
      );
      setSelectedSlots([]);
      data.load();
      onCreated();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  function chooseMonthlySlot(slotDate: string, value: string) {
    setSelectedSlots((current) => {
      const withoutDate = current.filter((slot) => !slot.startsWith(slotDate));
      return value ? [...withoutDate, value] : withoutDate;
    });
  }
  return (
    <Page
      title="Appointments"
      subtitle="Book a customer with a practitioner; an available matching room is allocated automatically."
      icon={CalendarDays}
    >
      <CreateForm title="New appointment" onSubmit={submit}>
        <fieldset className="bookingMode">
          <legend>Booking type</legend>
          <label>
            <input
              type="radio"
              name="bookingMode"
              checked={bookingMode === "SINGLE"}
              onChange={() => setBookingMode("SINGLE")}
            />
            One session
          </label>
          <label>
            <input
              type="radio"
              name="bookingMode"
              checked={bookingMode === "MONTH"}
              onChange={() => setBookingMode("MONTH")}
            />
            Choose sessions for a month
          </label>
        </fieldset>
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
          <select
            name="practitionerId"
            required
            value={practitionerId}
            onChange={(e) => {
              setPractitionerId(e.target.value);
              setServiceId("");
            }}
          >
            <option value="">Select practitioner</option>
            {practitioners.rows.map((x) => (
              <option value={x.id}>{x.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Service
          <select
            name="serviceId"
            required
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            disabled={!practitionerId}
          >
            <option value="">Select service</option>
            {serviceOptions.map((x) => (
              <option value={x.id}>{x.name}</option>
            ))}
          </select>
        </label>
        {bookingMode === "SINGLE" ? (
          <label>
            Appointment date
            <input
              name="bookingDate"
              type="date"
              required
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
          </label>
        ) : (
          <label>
            Booking month
            <input
              type="month"
              value={bookingMonth}
              min={new Date().toISOString().slice(0, 7)}
              onChange={(e) => setBookingMonth(e.target.value)}
            />
          </label>
        )}
        <div
          className={`slotPicker ${bookingMode === "SINGLE" ? "singleSlotPicker" : ""}`}
        >
          <div className="slotPickerHead">
            <b>Available slots</b>
            <small>{selectedSlots.length} selected</small>
          </div>
          {bookingMode === "MONTH" && slots.length > 0 && (
            <div className="applyMonthSlot">
              <label>
                Use the same time across this month
                <select
                  value={monthTime}
                  onChange={(e) => setMonthTime(e.target.value)}
                >
                  <option value="">Select a time</option>
                  {Array.from(new Set(slots.map((x) => String(x.label))))
                    .sort()
                    .map((time) => (
                      <option value={time}>{time}</option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!monthTime}
                onClick={() =>
                  setSelectedSlots(
                    slots
                      .filter((x) => String(x.label) === monthTime)
                      .map((x) => String(x.startsAt)),
                  )
                }
              >
                Apply to all available dates
              </button>
              <small>
                Only dates where both the practitioner and a matching room are
                free will be selected.
              </small>
            </div>
          )}
          {!practitionerId || !serviceId ? (
            <p>Select a practitioner and service first.</p>
          ) : !slots.length ? (
            <p>
              No available slots for this{" "}
              {bookingMode === "SINGLE" ? "date" : "month"}.
            </p>
          ) : bookingMode === "SINGLE" ? (
            <label className="singleSlotSelect">
              Available slot
              <select
                value={selectedSlots[0] || ""}
                onChange={(e) =>
                  setSelectedSlots(e.target.value ? [e.target.value] : [])
                }
              >
                <option value="">Select an available slot</option>
                {slots.map((x) => (
                  <option value={x.startsAt}>{x.label}</option>
                ))}
              </select>
              <small>Only free practitioner and room slots are shown.</small>
            </label>
          ) : (
            Object.entries(groupByDate(slots)).map(([slotDate, daySlots]) => (
              <section className="slotDay" key={slotDate}>
                <h4>
                  {new Intl.DateTimeFormat("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }).format(new Date(`${slotDate}T00:00:00`))}
                </h4>
                <select
                  value={
                    selectedSlots.find((slot) => slot.startsWith(slotDate)) ||
                    ""
                  }
                  onChange={(e) => chooseMonthlySlot(slotDate, e.target.value)}
                >
                  <option value="">No session this date</option>
                  {daySlots.map((x) => (
                    <option value={x.startsAt}>{x.label}</option>
                  ))}
                </select>
              </section>
            ))
          )}
        </div>
      </CreateForm>
      <Notice error={error || data.error} ok={ok} />
      <section className="appointmentFilters">
        <h3>Manage appointments</h3>
        <label>
          From
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            min={filterFrom}
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
          />
        </label>
        <label>
          Customer
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="">All customers</option>
            {customers.rows.map((x) => (
              <option value={x.id}>{x.full_name}</option>
            ))}
          </select>
        </label>
        <label>
          Practitioner
          <select
            value={practitionerFilter}
            onChange={(e) => setPractitionerFilter(e.target.value)}
          >
            <option value="">All practitioners</option>
            {practitioners.rows.map((x) => (
              <option value={x.id}>{x.full_name}</option>
            ))}
          </select>
        </label>
      </section>
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
            <div className="appointmentActions">
              <em>
                {new Date(r.starts_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </em>
              {r.status === "BOOKED" && (
                <>
                  <details className="modifyBooking">
                    <summary>Modify</summary>
                    <RescheduleEditor
                      appointment={r}
                      token={token}
                      onError={setError}
                      onSaved={() => {
                        setOk(
                          "This appointment was updated without changing the rest of its series.",
                        );
                        data.load();
                      }}
                    />
                  </details>
                  <button
                    className="linkDanger"
                    type="button"
                    onClick={async () => {
                      const reason = window.prompt("Cancellation reason") || "";
                      if (!reason) return;
                      try {
                        await api(
                          `/appointments/${r.id}/cancel`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              reason,
                              cancelledBy: "CUSTOMER",
                            }),
                          },
                          token,
                        );
                        data.load();
                      } catch (x) {
                        setError((x as Error).message);
                      }
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </>
        )}
      />
    </Page>
  );
}

function Payments({ token, owner }: { token: string; owner: boolean }) {
  const customers = useRows("/customers?q=", token),
    data = useRows("/payments", token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  const [customerId, setCustomerId] = useState(""),
    [due, setDue] = useState<Row | null>(null);
  useEffect(() => {
    if (!customerId) {
      setDue(null);
      return;
    }
    api<Row>(`/payments/due/${customerId}`, {}, token)
      .then(setDue)
      .catch((e) => setError(e.message));
  }, [customerId, token]);
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
            adjustment: Number(field(f, "adjustment") || 0),
            notes: field(f, "notes") || null,
            method: field(f, "method"),
            otp: field(f, "otp"),
          }),
        },
        token,
      );
      form.reset();
      setOk(`Payment recorded. Receipt ${r.receiptNumber}`);
      setDue(null);
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function update(id: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(
        `/payments/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            amount: Number(field(f, "amount")),
            adjustment: Number(field(f, "adjustment") || 0),
            method: field(f, "method"),
            notes: field(f, "notes") || null,
            reason: field(f, "reason"),
          }),
        },
        token,
      );
      setOk("Payment corrected with an audit entry.");
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
          <select
            name="customerId"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Select customer</option>
            {customers.rows.map((x) => (
              <option value={x.id}>{x.full_name}</option>
            ))}
          </select>
        </label>
        {due && (
          <div className="dueSummary">
            <small>
              Sessions {money(due.sessionCharges)} · cancellations{" "}
              {money(due.cancellationCharges)} · paid {money(due.paid)}
            </small>
            <b>Amount due {money(due.due)}</b>
          </div>
        )}
        <label>
          Amount
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={due?.due || ""}
            key={String(due?.due)}
          />
        </label>
        <label>
          Adjustment (+/-)
          <input name="adjustment" type="number" step="0.01" defaultValue="0" />
        </label>
        <label>
          Adjustment note
          <input name="notes" placeholder="Reason for adjustment" />
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
                {r.method} · {r.receipt_number}{" "}
                {r.receipt_url && (
                  <a href={r.receipt_url} target="_blank">
                    View receipt
                  </a>
                )}
              </small>
            </div>
            <em>{money(r.amount)}</em>
            {owner && (
              <details className="inlineEditor">
                <summary>Correct details</summary>
                <form onSubmit={(e) => update(r.id, e)}>
                  <label>
                    Amount
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      defaultValue={r.amount}
                    />
                  </label>
                  <label>
                    Adjustment
                    <input
                      name="adjustment"
                      type="number"
                      step="0.01"
                      defaultValue={r.adjustment || 0}
                    />
                  </label>
                  <label>
                    Method
                    <select name="method" defaultValue={r.method}>
                      <option>UPI</option>
                      <option>CARD</option>
                      <option>CASH</option>
                      <option>BANK_TRANSFER</option>
                    </select>
                  </label>
                  <label>
                    Notes
                    <input name="notes" defaultValue={r.notes || ""} />
                  </label>
                  <label>
                    Correction reason
                    <input name="reason" required />
                  </label>
                  <button>Save audited correction</button>
                </form>
              </details>
            )}
          </>
        )}
      />
    </Page>
  );
}

function MediaLibrary({ token, owner }: { token: string; owner: boolean }) {
  const data = useRows("/media", token),
    [error, setError] = useState(""),
    [ok, setOk] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      file = f.get("file") as File;
    if (!file?.size) {
      setError("Choose a photo or video file.");
      return;
    }
    try {
      await api(
        "/media",
        {
          method: "POST",
          body: JSON.stringify({
            mediaType: field(f, "mediaType"),
            title: field(f, "title"),
            caption: field(f, "caption") || null,
            contentType: file.type,
            originalName: file.name,
            contentBase64: await fileData(file),
            featured: f.get("featured") === "on",
            active: true,
          }),
        },
        token,
      );
      form.reset();
      setOk("Media uploaded to the clinic library.");
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  async function update(id: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(
        `/media/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            mediaType: field(f, "mediaType"),
            title: field(f, "title"),
            caption: field(f, "caption") || null,
            featured: f.get("featured") === "on",
            active: f.get("active") === "on",
          }),
        },
        token,
      );
      setOk("Media details updated.");
      data.load();
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <Page
      title="Success stories & social media"
      subtitle="Upload clinic photos, reels, stories and success-story media from the database."
      icon={ClipboardCheck}
    >
      {owner && (
        <CreateForm title="Upload media" onSubmit={submit}>
          <label>
            Content type
            <select name="mediaType">
              <option>SUCCESS_STORY</option>
              <option>PHOTO</option>
              <option>REEL</option>
              <option>STORY</option>
            </select>
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Caption
            <input name="caption" />
          </label>
          <label>
            Photo or video
            <input name="file" type="file" accept="image/*,video/*" required />
          </label>
          <label className="checkField">
            <input name="featured" type="checkbox" />
            Featured story
          </label>
        </CreateForm>
      )}
      <Notice error={error || data.error} ok={ok} />
      <div className="mediaGrid">
        {data.rows.map((r) => (
          <article className="mediaCard" key={r.id}>
            {String(r.content_type).startsWith("video/") ? (
              <video
                controls
                src={`data:${r.content_type};base64,${r.content_base64}`}
              />
            ) : (
              <img
                src={`data:${r.content_type};base64,${r.content_base64}`}
                alt={r.title}
              />
            )}
            <div>
              <span>{String(r.media_type).replace("_", " ")}</span>
              <h3>{r.title}</h3>
              <p>{r.caption}</p>
              {r.featured && <b>Featured</b>}
            </div>
            {owner && (
              <details className="inlineEditor">
                <summary>Edit</summary>
                <form onSubmit={(e) => update(r.id, e)}>
                  <label>
                    Type
                    <select name="mediaType" defaultValue={r.media_type}>
                      <option>SUCCESS_STORY</option>
                      <option>PHOTO</option>
                      <option>REEL</option>
                      <option>STORY</option>
                    </select>
                  </label>
                  <label>
                    Title
                    <input name="title" defaultValue={r.title} />
                  </label>
                  <label>
                    Caption
                    <input name="caption" defaultValue={r.caption || ""} />
                  </label>
                  <label className="checkField">
                    <input
                      name="featured"
                      type="checkbox"
                      defaultChecked={r.featured}
                    />
                    Featured
                  </label>
                  <label className="checkField">
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={r.active}
                    />
                    Active
                  </label>
                  <button>Save changes</button>
                </form>
              </details>
            )}
          </article>
        ))}
      </div>
    </Page>
  );
}

function Attendance({ token }: { token: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    data = useRows(`/appointments?date=${date}`, token),
    [error, setError] = useState("");
  async function mark(id: string, status: string) {
    try {
      const comment =
        window.prompt("Short attendance comment (optional)") || "";
      await api(
        `/appointments/${id}/attendance`,
        { method: "PUT", body: JSON.stringify({ status, comment }) },
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
