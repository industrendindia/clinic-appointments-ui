import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Search,
  Stethoscope,
  UserRoundPlus,
  UsersRound,
  X,
  Clock3,
  Settings,
} from "lucide-react";
import "./styles.css";
import { OperationsPage } from "./Operations";

type Nav =
  | "Dashboard"
  | "Manage Appointments"
  | "Customers"
  | "Practitioners"
  | "Services"
  | "Rooms"
  | "Payments"
  | "Attendance"
  | "Success Stories"
  | "Settings";
export type User = {
  id: string;
  name: string;
  role: string;
  clinicId?: string;
  branchId?: string;
  clinic_name?: string;
  logo_base64?: string;
  logo_content_type?: string;
  branch_name?: string;
  theme?: string;
  default_slot_minutes?: number;
  opens_at?: string;
  closes_at?: string;
};
type Appointment = {
  id: string;
  starts_at: string;
  customer: string;
  service: string;
  practitioner: string;
  room: string;
  status: string;
};
type Room = {
  id: string;
  name: string;
  room_type: string;
  status: "AVAILABLE" | "OCCUPIED";
  available_at?: string;
};
type DashboardData = {
  businessDate: string;
  summary: {
    appointments: number;
    expected: number;
    room_total: number;
    rooms_occupied: number;
    partners: number;
  };
  appointments: Appointment[];
  rooms: Room[];
};
const nav: [Nav, React.ElementType][] = [
  ["Dashboard", LayoutDashboard],
  ["Manage Appointments", CalendarDays],
  ["Customers", UsersRound],
  ["Practitioners", Stethoscope],
  ["Services", ClipboardCheck],
  ["Rooms", Menu],
  ["Payments", CreditCard],
  ["Attendance", Clock3],
  ["Success Stories", ClipboardCheck],
  ["Settings", Settings],
];

export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      body.error || body.message || `Request failed (${response.status})`,
    );
  return body as T;
}
const readFileBase64 = (file: File | null) =>
  new Promise<string>((resolve, reject) => {
    if (!file || !file.size) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("clinic_token") || "",
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    api<User>("/me", {}, token)
      .then(setUser)
      .catch(() => {
        sessionStorage.removeItem("clinic_token");
        setToken("");
      })
      .finally(() => setLoading(false));
  }, [token]);
  const login = (value: string) => {
    sessionStorage.setItem("clinic_token", value);
    setLoading(true);
    setToken(value);
  };
  const logout = () => {
    sessionStorage.removeItem("clinic_token");
    setToken("");
    setUser(null);
  };
  if (loading)
    return (
      <div className="authPage">
        <div className="authCard">
          <div className="loader" />
          <p>Opening your secure workspace…</p>
        </div>
      </div>
    );
  if (!token || !user)
    return <Login onLogin={login} error={error} setError={setError} />;
  if (user.role === "PLATFORM_ADMIN")
    return <AdminPortal token={token} user={user} logout={logout} />;
  return <ClinicPortal token={token} user={user} logout={logout} />;
}

function Login({
  onLogin,
  error,
  setError,
}: {
  onLogin: (t: string) => void;
  error: string;
  setError: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const result = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: fd.get("username"),
          password: fd.get("password"),
        }),
      });
      onLogin(result.token);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="authPage">
      <div className="authVisual">
        <div className="authBrand">
          <span>C</span>
          <b>CareNest</b>
        </div>
        <div>
          <small>CLINIC OPERATIONS, SIMPLIFIED</small>
          <h1>
            More time for care.
            <br />
            Less time coordinating.
          </h1>
          <p>
            Secure appointments, practitioners, rooms and payments in one calm
            workspace.
          </p>
        </div>
        <blockquote>
          “A thoughtful day starts with a clear schedule.”
        </blockquote>
      </div>
      <form className="authCard" onSubmit={submit}>
        <div className="mobileBrand">
          <span>C</span>
          <b>CareNest</b>
        </div>
        <span className="eyebrow">Welcome back</span>
        <h2>Sign in to your clinic</h2>
        <p>Use the credentials provided by your clinic administrator.</p>
        {error && <div className="formError">{error}</div>}
        <label>
          Email or username
          <input
            name="username"
            autoComplete="username"
            required
            placeholder="you@clinic.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
          />
        </label>
        <button className="primary authSubmit" disabled={busy}>
          <LockKeyhole size={17} />
          {busy ? "Signing in…" : "Secure sign in"}
        </button>
        <small className="privacy">
          Your clinic data is isolated and encrypted in transit.
        </small>
      </form>
    </div>
  );
}

function ClinicPortal({
  token,
  user,
  logout,
}: {
  token: string;
  user: User;
  logout: () => void;
}) {
  const [active, setActive] = useState<Nav>("Dashboard");
  const [drawer, setDrawer] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const refresh = () =>
    api<DashboardData>("/dashboard", {}, token)
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (active === "Dashboard") refresh();
  }, [active, token]);
  return (
    <div className={`app theme-${user.theme || "terracotta"}`}>
      <aside className={drawer ? "side open" : "side"}>
        <div className="brand">
          <div className="mark">
            {user.logo_base64 ? (
              <img
                src={`data:${user.logo_content_type};base64,${user.logo_base64}`}
                alt={`${user.clinic_name} logo`}
              />
            ) : (
              (user.clinic_name || "C")[0]
            )}
          </div>
          <div>
            <b>{user.clinic_name}</b>
            <small>{user.branch_name}</small>
          </div>
          <button className="close" onClick={() => setDrawer(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav
            .filter(
              ([n]) =>
                user.role === "OWNER" ||
                (user.role === "RECEPTIONIST"
                  ? n !== "Practitioners"
                  : ![
                      "Manage Appointments",
                      "Customers",
                      "Payments",
                      "Attendance",
                      "Settings",
                      "Practitioners",
                      "Success Stories",
                    ].includes(n)),
            )
            .map(([n, I]) => (
              <button
                className={n === active ? "active" : ""}
                onClick={() => {
                  setActive(n);
                  setDrawer(false);
                }}
                key={n}
              >
                <I size={19} />
                <span>{n}</span>
              </button>
            ))}
        </nav>
        <div className="profile">
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <b>{user.name}</b>
            <small>{friendlyRole(user.role)}</small>
          </div>
          <button className="logoutIcon" title="Sign out" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <main>
        <header>
          <button className="hamb" onClick={() => setDrawer(true)}>
            <Menu />
          </button>
          <div>
            <small>
              {data
                ? new Intl.DateTimeFormat("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(`${data.businessDate}T00:00:00`))
                : user.branch_name}
            </small>
            <h1>
              {active === "Dashboard"
                ? `Good morning, ${user.name.split(" ")[0]}`
                : active}
            </h1>
          </div>
          <div className="headerActions">
            <button
              className="primary"
              onClick={() => setActive("Manage Appointments")}
            >
              <Plus size={18} /> New appointment
            </button>
          </div>
        </header>
        {active === "Dashboard" ? (
          <LiveDashboard data={data} error={error} />
        ) : (
          <OperationsPage
            active={active as Exclude<Nav, "Dashboard">}
            token={token}
            user={user}
            onAppointmentCreated={refresh}
          />
        )}
      </main>
      <button
        className="mobileCreate"
        aria-label="New appointment"
        onClick={() => setActive("Manage Appointments")}
      >
        <Plus />
      </button>
      <div className="mobileNav">
        {nav.slice(0, 4).map(([n, I]) => (
          <button
            key={n}
            className={active === n ? "active" : ""}
            onClick={() => setActive(n)}
          >
            <I />
            <small>{n}</small>
          </button>
        ))}
        <button onClick={() => setDrawer(true)}>
          <Menu />
          <small>More</small>
        </button>
      </div>
    </div>
  );
}

function LiveDashboard({
  data,
  error,
}: {
  data: DashboardData | null;
  error: string;
}) {
  if (error)
    return (
      <div className="content">
        <div className="formError">{error}</div>
      </div>
    );
  if (!data)
    return (
      <div className="content">
        <div className="loader" />
      </div>
    );
  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const date = new Date(`${data.businessDate}T00:00:00`);
  return (
    <div className="content">
      <section className="hero">
        <div>
          <span className="eyebrow">Today at a glance</span>
          <h2>Care begins with a well-planned day.</h2>
          <p>Live information from your clinic database.</p>
        </div>
      </section>
      <div className="stats">
        <Stat
          label="Today's appointments"
          value={String(data.summary.appointments)}
          sub="Confirmed bookings"
          icon={CalendarDays}
        />
        <Stat
          label="Expected collection"
          value={money.format(data.summary.expected)}
          sub="Based on active sessions"
          icon={CreditCard}
        />
        <Stat
          label="Rooms occupied"
          value={`${data.summary.rooms_occupied} / ${data.summary.room_total}`}
          sub="Current room usage"
          icon={Menu}
        />
        <Stat
          label="Partners"
          value={String(data.summary.partners)}
          sub="Active practitioners"
          icon={Stethoscope}
        />
      </div>
      <div className="grid">
        <section className="panel schedule">
          <div className="panelHead">
            <div>
              <h3>Today’s schedule</h3>
              <p>
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(
                  date,
                )}
              </p>
            </div>
          </div>
          {data.appointments.length === 0 ? (
            <div className="emptyState">
              <CalendarDays />
              <b>No appointments today</b>
              <small>New bookings will appear here.</small>
            </div>
          ) : (
            data.appointments.map((a) => (
              <div className="appt" key={a.id}>
                <time>
                  {new Date(a.starts_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <span className="line" />
                <div className="apptInfo">
                  <b>{a.customer}</b>
                  <small>
                    {a.service} · {a.practitioner}
                  </small>
                </div>
                <span className="room">{a.room}</span>
              </div>
            ))
          )}
        </section>
        <aside className="panel">
          <div className="panelHead">
            <div>
              <h3>Room availability</h3>
              <p>Current capacity</p>
            </div>
          </div>
          {data.rooms.length === 0 ? (
            <div className="emptyState">
              <Menu />
              <b>No active rooms</b>
            </div>
          ) : (
            data.rooms.map((r) => (
              <div className="roomRow" key={r.id}>
                <span
                  className={r.status === "OCCUPIED" ? "dot busy" : "dot"}
                />
                <div>
                  <b>{r.name}</b>
                  <small>{r.room_type}</small>
                </div>
                <em className={r.status === "OCCUPIED" ? "busy" : ""}>
                  {r.status}
                </em>
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}

function AdminPortal({
  token,
  user,
  logout,
}: {
  token: string;
  user: User;
  logout: () => void;
}) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [resetResult, setResetResult] = useState("");
  const [resetError, setResetError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const body = Object.fromEntries(f.entries());
    const logo = f.get("logo") as File;
    try {
      await api(
        "/admin/clinics",
        {
          method: "POST",
          body: JSON.stringify({
            ...body,
            slotMinutes: Number(body.slotMinutes),
            logoBase64: await readFileBase64(logo),
            logoContentType: logo?.type || null,
            logoOriginalName: logo?.name || null,
          }),
        },
        token,
      );
      setResult(
        "Clinic and owner account created successfully. The owner can now sign in.",
      );
      form.reset();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Onboarding failed");
    }
  }
  async function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetError("");
    setResetResult("");
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api(
        "/admin/users/password",
        {
          method: "PUT",
          body: JSON.stringify({
            username: f.get("username"),
            newPassword: f.get("newPassword"),
          }),
        },
        token,
      );
      setResetResult(
        "Password updated. The clinic user can sign in with the new password.",
      );
      form.reset();
    } catch (x) {
      setResetError(x instanceof Error ? x.message : "Password update failed");
    }
  }
  return (
    <div className="adminPage">
      <header className="adminHeader">
        <div className="authBrand dark">
          <span>C</span>
          <b>CareNest Admin</b>
        </div>
        <div>
          <b>{user.name}</b>
          <button onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      <main className="adminMain">
        <ClinicSearch token={token} />
        <div className="adminIntro">
          <span className="eyebrow">Platform administration</span>
          <h1>Onboard a clinic</h1>
          <p>
            Create an isolated clinic, its first branch and owner credentials.
          </p>
        </div>
        <form className="onboardForm" onSubmit={submit}>
          {error && <div className="formError wide">{error}</div>}
          {result && <div className="formSuccess wide">{result}</div>}
          <h3 className="wide">
            <Building2 /> Clinic details
          </h3>
          <label>
            Clinic name
            <input name="clinicName" required placeholder="Rise Clinic" />
          </label>
          <label>
            Clinic slug
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              placeholder="rise-clinic"
            />
          </label>
          <label>
            Branch name
            <input name="branchName" required placeholder="Dhanori" />
          </label>
          <label>
            Address
            <input name="address" required placeholder="Full branch address" />
          </label>
          <label>
            Opening time
            <input name="opensAt" type="time" defaultValue="09:30" />
          </label>
          <label>
            Closing time
            <input name="closesAt" type="time" defaultValue="20:00" />
          </label>
          <label>
            Slot minutes
            <input
              name="slotMinutes"
              type="number"
              min="15"
              max="180"
              defaultValue="45"
            />
          </label>
          <label>
            WhatsApp number
            <input name="whatsappPhone" placeholder="+91…" />
          </label>
          <label>
            Clinic email
            <input name="email" type="email" placeholder="clinic@example.com" />
          </label>
          <label>
            Clinic logo
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>
          <span />
          <h3 className="wide">
            <UserRoundPlus /> Owner account
          </h3>
          <label>
            Owner full name
            <input name="ownerName" required />
          </label>
          <label>
            Owner login email
            <input name="ownerUsername" type="email" required />
          </label>
          <label>
            Owner phone
            <input name="ownerPhone" required />
          </label>
          <label>
            Temporary password
            <input
              name="ownerPassword"
              type="password"
              minLength={12}
              required
            />
          </label>
          <div className="wide formActions">
            <button className="primary">Create clinic and owner</button>
          </div>
        </form>
        <div className="adminIntro resetIntro">
          <span className="eyebrow">Account recovery</span>
          <h2>Reset a clinic user password</h2>
          <p>
            Set a new temporary password for an owner, receptionist or
            practitioner.
          </p>
        </div>
        <form className="onboardForm resetForm" onSubmit={resetPassword}>
          {resetError && <div className="formError wide">{resetError}</div>}
          {resetResult && <div className="formSuccess wide">{resetResult}</div>}
          <label>
            Login email or username
            <input name="username" required />
          </label>
          <label>
            New temporary password
            <input
              name="newPassword"
              type="password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <div className="wide formActions">
            <button className="primary">
              <LockKeyhole size={16} /> Update password
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function ClinicSearch({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState(""),
    [ok, setOk] = useState("");
  const [page, setPage] = useState(0),
    [totalPages, setTotalPages] = useState(0),
    [totalElements, setTotalElements] = useState(0);
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      api<{
        content: Record<string, any>[];
        totalPages: number;
        totalElements: number;
      }>(
        `/admin/clinics?q=${encodeURIComponent(q)}&page=${page}&size=10`,
        {},
        token,
      )
        .then((result) => {
          setRows(result.content);
          setTotalPages(result.totalPages);
          setTotalElements(result.totalElements);
        })
        .catch((e) => setError(e.message));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, page, token]);
  async function choose(id: string) {
    setError("");
    try {
      setSelected(
        await api<Record<string, any>>(`/admin/clinics/${id}`, {}, token),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget),
      logo = f.get("logo") as File;
    try {
      await api(
        `/admin/clinics/${selected.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            clinicName: String(f.get("clinicName")),
            branchName: String(f.get("branchName")),
            address: String(f.get("address")),
            ownerPhone: String(f.get("ownerPhone")),
            whatsappPhone: String(f.get("whatsappPhone")),
            email: String(f.get("email")),
            opensAt: String(f.get("opensAt")),
            closesAt: String(f.get("closesAt")),
            slotMinutes: Number(f.get("slotMinutes")),
            active: f.get("active") === "on",
            logoBase64: await readFileBase64(logo),
            logoContentType: logo?.type || null,
            logoOriginalName: logo?.name || null,
          }),
        },
        token,
      );
      setOk("Clinic details saved.");
      await choose(String(selected.id));
    } catch (x) {
      setError((x as Error).message);
    }
  }
  return (
    <section className="clinicSearch panel">
      <div className="adminIntro">
        <span className="eyebrow">Clinic directory</span>
        <h1>Find a clinic</h1>
        <p>Search by clinic name, slug or email.</p>
      </div>
      <label className="pageSearch">
        <Search />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Search all clinics"
        />
      </label>
      {error && <div className="formError">{error}</div>}
      {ok && <div className="formSuccess">{ok}</div>}
      <small>
        {totalElements} clinic{totalElements === 1 ? "" : "s"} found
      </small>
      <div className="recordList">
        {rows.map((r) => (
          <button
            type="button"
            className="record clinicResult"
            key={r.id}
            onClick={() => choose(r.id)}
          >
            <div>
              <b>{r.name}</b>
              <small>
                {r.slug} · {r.email || "No email"}
              </small>
            </div>
            <em>
              {r.branches} branch · {r.users} users
            </em>
          </button>
        ))}
      </div>
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {totalPages ? page + 1 : 0} of {totalPages}
        </span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      {selected && (
        <form className="onboardForm clinicEdit" onSubmit={save}>
          <h3 className="wide">
            <Building2 />
            Edit clinic
          </h3>
          {selected.logo_base64 && (
            <img
              className="adminClinicLogo"
              src={`data:${selected.logo_content_type};base64,${selected.logo_base64}`}
              alt="Clinic logo"
            />
          )}
          <label>
            Clinic name
            <input
              name="clinicName"
              defaultValue={selected.clinic_name}
              required
            />
          </label>
          <label>
            Slug
            <input value={selected.slug} disabled />
          </label>
          <label>
            Branch name
            <input
              name="branchName"
              defaultValue={selected.branch_name}
              required
            />
          </label>
          <label>
            Address
            <input name="address" defaultValue={selected.address} required />
          </label>
          <label>
            Opening time
            <input
              name="opensAt"
              type="time"
              defaultValue={String(selected.opens_at).slice(0, 5)}
            />
          </label>
          <label>
            Closing time
            <input
              name="closesAt"
              type="time"
              defaultValue={String(selected.closes_at).slice(0, 5)}
            />
          </label>
          <label>
            Slot minutes
            <input
              name="slotMinutes"
              type="number"
              min="15"
              defaultValue={selected.default_slot_minutes}
            />
          </label>
          <label>
            Owner name
            <input value={selected.owner_name || ""} disabled />
          </label>
          <label>
            Owner login
            <input value={selected.owner_username || ""} disabled />
          </label>
          <label>
            Owner phone
            <input
              name="ownerPhone"
              defaultValue={selected.owner_phone || ""}
              required
            />
          </label>
          <label>
            WhatsApp
            <input
              name="whatsappPhone"
              defaultValue={selected.whatsapp_phone || ""}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue={selected.email || ""}
            />
          </label>
          <label>
            Replace logo
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>
          <label className="checkField">
            <input
              name="active"
              type="checkbox"
              defaultChecked={selected.active}
            />
            Clinic active
          </label>
          <div className="wide formActions">
            <button className="primary">Save clinic changes</button>
          </div>
        </form>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: I,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <article className="stat">
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{sub}</span>
      </div>
      <i>
        <I />
      </i>
    </article>
  );
}
function Empty({ title }: { title: string }) {
  return (
    <div className="content">
      <section className="panel empty">
        <div className="emptyIcon">
          <ClipboardCheck />
        </div>
        <h2>{title}</h2>
        <p>
          No demonstration data is shown. Records created for this clinic will
          appear here.
        </p>
      </section>
    </div>
  );
}
function initials(n: string) {
  return n
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function friendlyRole(r: string) {
  return r
    .toLowerCase()
    .replace("_", " ")
    .replace(/^./, (x) => x.toUpperCase());
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
