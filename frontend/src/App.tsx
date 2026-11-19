import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import QRCode from "react-qr-code";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Check,
  ClipboardList,
  FileDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldOff,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("ict-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
type User = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
type Assessment = {
  id: string;
  title: string;
  status: string;
  category?: string;
  categoryId?: string;
  targetGroup?: string;
  assessmentType?: "GENERAL" | "PRE_TEST" | "POST_TEST";
  startAt?: string | null;
  endAt?: string | null;
  responseCount?: number;
  publicToken?: string;
  publicUrl?: string;
  questions?: Question[];
};
type Question = {
  id?: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options: { id?: string; optionText: string; score: number }[];
};
type Category = {
  id: string;
  name: string;
  description?: string | null;
  _count?: { assessments: number };
};
const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
const loginSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});
const SUCCESS_TOAST_EVENT = "ict:success-toast";

function showSuccessToast(message: string) {
  window.dispatchEvent(
    new CustomEvent(SUCCESS_TOAST_EVENT, { detail: { message } }),
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/assessment/:token" element={<PublicForm />} />
        <Route path="/success" element={<Success />} />
        <Route path="*" element={<Guard />} />
      </Routes>
      <SuccessToastHost />
    </BrowserRouter>
  );
}

function SuccessToastHost() {
  const [message, setMessage] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;
    let removeTimeout: ReturnType<typeof setTimeout> | undefined;
    const handleSuccess = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message || "บันทึกข้อมูลเรียบร้อยแล้ว");
      setIsLeaving(false);
      if (hideTimeout) clearTimeout(hideTimeout);
      if (removeTimeout) clearTimeout(removeTimeout);
      hideTimeout = setTimeout(() => setIsLeaving(true), 320);
      removeTimeout = setTimeout(() => setMessage(""), 440);
    };

    window.addEventListener(SUCCESS_TOAST_EVENT, handleSuccess);
    return () => {
      window.removeEventListener(SUCCESS_TOAST_EVENT, handleSuccess);
      if (hideTimeout) clearTimeout(hideTimeout);
      if (removeTimeout) clearTimeout(removeTimeout);
    };
  }, []);

  if (!message) return null;
  return (
    <div
      className={`success-toast-layer${isLeaving ? " is-leaving" : ""}`}
      role="presentation"
    >
      <div
        className={`success-toast${isLeaving ? " is-leaving" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="success-toast-icon">
          <Check size={25} strokeWidth={3} />
        </span>
        <strong>ทำรายการเสร็จสิ้น</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
function Guard() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem("ict-token")) {
      setReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.data))
      .catch(() => sessionStorage.removeItem("ict-token"))
      .finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <div className="loading">
        <span className="spinner" />
        กำลังเชื่อมต่อระบบ…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Shell
      user={user}
      onLogout={() => {
        sessionStorage.removeItem("ict-token");
        location.href = "/login";
      }}
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assessments" element={<AssessmentList />} />
        <Route path="/assessments/new" element={<AssessmentEditor />} />
        <Route path="/assessments/:id" element={<AssessmentEditor />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/categories" element={<CategoriesPage user={user} />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/profile" element={<ProfilePage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
function Shell({
  user,
  onLogout,
  children,
}: {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/", label: "ภาพรวม", icon: LayoutDashboard },
    { to: "/assessments", label: "แบบประเมิน", icon: ClipboardList },
    { to: "/categories", label: "จัดการหมวดหมู่", icon: FolderKanban },
    ...(user.role === "ADMIN"
      ? [{ to: "/users", label: "จัดการผู้ใช้งาน", icon: Users }]
      : []),
    { to: "/reports", label: "รายงานผล", icon: BarChart3 },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Activity size={21} />
          </div>
          <div>
            <b>ICT Assessment</b>
            <small>ศูนย์ ICT ขอนแก่น</small>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={17} />
            <span>ข้อมูลเชื่อมต่อฐานข้อมูลจริง</span>
          </div>
          <button
            className="profile-mini"
            onClick={() => (location.href = "/profile")}
          >
            <div className="avatar">{user.fullName.slice(0, 1)}</div>
            <span>
              <b>{user.fullName}</b>
              <small>
                {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
              </small>
            </span>
            <Settings size={16} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="crumb">
            ศูนย์ ICT <span>/</span> <b>ระบบประเมินออนไลน์</b>
          </div>
          <div className="top-user">
            <div className="avatar">{user.fullName.slice(0, 1)}</div>
            <div>
              <b>{user.fullName}</b>
              <small>{user.role}</small>
            </div>
            <button
              className="icon-button"
              title="ออกจากระบบ"
              onClick={onLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {children}
      </main>
      {open && (
        <button
          className="scrim"
          onClick={() => setOpen(false)}
          aria-label="ปิดเมนู"
        />
      )}
    </div>
  );
}
function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow || "ICT ONLINE ASSESSMENT"}</div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [chartPeriod, setChartPeriod] = useState<"daily" | "monthly" | "yearly">("daily");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [downloadPeriod, setDownloadPeriod] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setIsRefreshing(true);
    setError("");
    Promise.all([api.get("/dashboard/summary"), api.get("/dashboard/charts")])
      .then(([s, c]) => {
        setSummary(s.data.data);
        setCharts(c.data.data);
        setLastUpdated(new Date());
      })
      .catch(() =>
        setError("ไม่สามารถโหลดข้อมูลได้ ตรวจสอบการเชื่อมต่อ Backend"),
      )
      .finally(() => setIsRefreshing(false));
  }, [refreshKey]);
  const downloadSummary = async (period: "weekly" | "monthly" | "yearly") => {
    setDownloadError("");
    setDownloadPeriod(period);
    try {
      const response = await api.get("/reports/summary/export", {
        params: { period },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `assessment-report-${period}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setDownloadError(
        error.response?.data?.error?.message || "ดาวน์โหลดรายงานไม่สำเร็จ",
      );
    } finally {
      setDownloadPeriod("");
    }
  };
  if (error && !summary)
    return (
      <section className="content">
        <PageHeader title="ภาพรวม" />
        <div className="alert error">{error}</div>
      </section>
    );
  if (!summary)
    return (
      <div className="loading">
        <span className="spinner" />
        กำลังโหลดข้อมูลจริง…
      </div>
    );
  const chartData = charts?.[chartPeriod] || [];
  const chartKey = chartPeriod === "daily" ? "date" : chartPeriod === "monthly" ? "month" : "year";
  const periodResponses = chartData.reduce(
    (total: number, bucket: { count: number }) => total + bucket.count,
    0,
  );
  const totalRespondents = summary.responses.total || 0;
  const internalPercent = totalRespondents
    ? Math.round((summary.responses.internal / totalRespondents) * 100)
    : 0;
  const externalPercent = totalRespondents
    ? 100 - internalPercent
    : 0;
  const topAssessmentMaximum = Math.max(
    1,
    ...(summary.topAssessments || []).map((item: Assessment) => item.responseCount || 0),
  );
  const stats = [
    {
      label: "คำตอบในช่วงที่เลือก",
      value: periodResponses,
      unit: "คำตอบ",
      Icon: Users,
      tone: "blue",
      note: chartPeriod === "daily" ? "30 วันล่าสุด" : chartPeriod === "monthly" ? "12 เดือนล่าสุด" : "5 ปีล่าสุด",
    },
    {
      label: "แบบประเมินทั้งหมด",
      value: summary.assessments.total,
      unit: "รายการ",
      Icon: ClipboardList,
      tone: "blue",
      note: "รวมทุกสถานะ",
    },
    {
      label: "เผยแพร่แล้ว",
      value: summary.assessments.published,
      unit: "รายการ",
      Icon: Activity,
      tone: "green",
      note: "สถานะปัจจุบัน",
    },
    {
      label: "ฉบับร่าง",
      value: summary.assessments.draft,
      unit: "รายการ",
      Icon: Pencil,
      tone: "orange",
      note: "ยังไม่เผยแพร่",
    },
    {
      label: "Pre-test",
      value: summary.assessments.preTests || 0,
      unit: "รายการ",
      Icon: ShieldCheck,
      tone: "purple",
      note: "แบบทดสอบก่อนเรียน",
    },
    {
      label: "Post-test",
      value: summary.assessments.postTests || 0,
      unit: "รายการ",
      Icon: ShieldCheck,
      tone: "blue",
      note: "แบบทดสอบหลังเรียน",
    },
  ];
  return (
    <section className="content">
      <PageHeader
        eyebrow="ศูนย์ ICT ขอนแก่น"
        title="ภาพรวมระบบ"
        subtitle={`ข้อมูลตามสิทธิ์บัญชี${lastUpdated ? ` · อัปเดตล่าสุด ${lastUpdated.toLocaleString("th-TH")}` : ""}`}
        action={
          <div className="dashboard-header-actions">
            <div className="dashboard-period-switch" aria-label="ช่วงเวลาของกราฟ">
              {([
                ["daily", "30 วัน"],
                ["monthly", "12 เดือน"],
                ["yearly", "5 ปี"],
              ] as const).map(([period, label]) => (
                <button
                  key={period}
                  type="button"
                  className={chartPeriod === period ? "active" : ""}
                  aria-pressed={chartPeriod === period}
                  onClick={() => setChartPeriod(period)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="button outline"
              disabled={isRefreshing}
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
              รีเฟรช
            </button>
            <Link className="button primary" to="/assessments/new">
              <Plus size={17} />
              สร้างแบบประเมิน
            </Link>
          </div>
        }
      />
      {error && <div className="alert error dashboard-alert">{error}</div>}
      <div className="stat-grid dashboard-stat-grid">
        {stats.map(({ label, value, unit, Icon, tone, note }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}>
              <Icon size={19} />
            </div>
            <div className="stat-title">{label}</div>
            <div className="stat-value">
              {Number(value).toLocaleString("th-TH")}
              <small>{unit}</small>
            </div>
            <div className="stat-foot">{note}</div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>แนวโน้มคำตอบ</h2>
              <p>
                แสดง {periodResponses.toLocaleString()} คำตอบ · {chartPeriod === "daily" ? "30 วันล่าสุด" : chartPeriod === "monthly" ? "12 เดือนล่าสุด" : "5 ปีล่าสุด"}
              </p>
            </div>
          </div>
          {periodResponses ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#edf1f5" vertical={false} />
                  <XAxis
                    dataKey={chartKey}
                    interval={chartPeriod === "daily" ? 4 : 0}
                    tickFormatter={(value: string) =>
                      chartPeriod === "daily"
                        ? value.slice(5)
                        : chartPeriod === "monthly"
                          ? value.slice(2)
                          : value
                    }
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#718292" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#718292" }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2876b8"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#2876b8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dashboard-empty-chart">
              <b>ยังไม่มีคำตอบในช่วงเวลานี้</b>
              <span>เมื่อมีผู้ตอบแบบประเมิน แนวโน้มจะแสดงที่นี่</span>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>ประเภทผู้ตอบ</h2>
              <p>สัดส่วนการตอบทั้งหมด</p>
            </div>
          </div>
          <div className="respondent-summary">
            <div className="respondent-total">
              <b>{totalRespondents.toLocaleString("th-TH")}</b>
              <span>คำตอบสะสมทั้งหมด</span>
            </div>
            <div
              className="respondent-stacked"
              role="img"
              aria-label={`ผู้ตอบภายใน ${internalPercent} เปอร์เซ็นต์ ผู้ตอบภายนอก ${externalPercent} เปอร์เซ็นต์`}
            >
              <span className="respondent-internal" style={{ width: `${internalPercent}%` }} />
              <span className="respondent-external" style={{ width: `${externalPercent}%` }} />
            </div>
            <div className="respondent-legend">
              <div>
                <i className="respondent-internal" />
                <span>ผู้ตอบภายใน</span>
                <b>{summary.responses.internal.toLocaleString("th-TH")}</b>
                <small>{internalPercent}%</small>
              </div>
              <div>
                <i className="respondent-external" />
                <span>ผู้ตอบภายนอก</span>
                <b>{summary.responses.external.toLocaleString("th-TH")}</b>
                <small>{externalPercent}%</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="dashboard-quick-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>ทางลัดและดาวน์โหลด</h2>
            <p>เริ่มงานหลักหรือส่งออกรายงานภาพรวมตามช่วงเวลา</p>
          </div>
        </div>
        <div className="dashboard-quick-grid">
          <Link className="dashboard-quick-card" to="/assessments/new">
            <span className="quick-icon green"><Plus size={18} /></span>
            <span><b>สร้างแบบประเมิน</b><small>เริ่มแบบประเมินใหม่</small></span>
          </Link>
          <Link className="dashboard-quick-card" to="/assessments">
            <span className="quick-icon blue"><ClipboardList size={18} /></span>
            <span><b>จัดการแบบประเมิน</b><small>ดูสถานะและคำตอบ</small></span>
          </Link>
          <Link className="dashboard-quick-card" to="/reports">
            <span className="quick-icon purple"><BarChart3 size={18} /></span>
            <span><b>รายงานผล</b><small>ดูผลรายข้อและ Pre/Post</small></span>
          </Link>
          {([
            ["weekly", "รายสัปดาห์", "สัปดาห์ปัจจุบัน"],
            ["monthly", "รายเดือน", "เดือนปัจจุบัน"],
            ["yearly", "รายปี", "ปีปัจจุบัน"],
          ] as const).map(([period, label, note]) => (
            <button
              className="dashboard-quick-card"
              key={period}
              disabled={Boolean(downloadPeriod)}
              onClick={() => void downloadSummary(period)}
            >
              <span className="quick-icon orange"><ArrowDownToLine size={18} /></span>
              <span><b>{downloadPeriod === period ? "กำลังสร้างไฟล์…" : `ดาวน์โหลด ${label}`}</b><small>{note} · CSV</small></span>
            </button>
          ))}
        </div>
        {downloadError && <div className="alert error">{downloadError}</div>}
      </div>
      <div className="dashboard-bottom-grid">
      <div className="panel recent dashboard-recent">
        <div className="panel-head">
          <div>
            <h2>แบบประเมินล่าสุด</h2>
            <p>รายการที่สร้างในระบบ</p>
          </div>
          <Link to="/assessments">ดูทั้งหมด →</Link>
        </div>
        {summary.recent.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ชื่อแบบประเมิน</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th>คำตอบ</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((a: Assessment) => (
                  <tr key={a.id}>
                    <td>
                      <Link className="table-link" to={`/assessments/${a.id}`}>
                        {a.title}
                      </Link>
                    </td>
                    <td>{a.assessmentType === "PRE_TEST" ? "Pre-test" : a.assessmentType === "POST_TEST" ? "Post-test" : "ทั่วไป"}</td>
                    <td>
                      <Status value={a.status} />
                    </td>
                    <td>{Number(a.responseCount || 0).toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="ยังไม่มีแบบประเมิน"
            text="สร้างแบบประเมินแรกเพื่อเริ่มเก็บข้อมูล"
          />
        )}
      </div>
      <div className="panel dashboard-top-five">
        <div className="panel-head">
          <div>
            <h2>แบบประเมินที่มีคำตอบสูงสุด</h2>
            <p>จัดอันดับจากจำนวนคำตอบทั้งหมด</p>
          </div>
          <span className="dashboard-rank-label">Top 5</span>
        </div>
        <div className="top-assessment-list">
          {summary.topAssessments?.length ? summary.topAssessments.map((a: Assessment, index: number) => (
            <Link className="top-assessment-row" to={`/assessments/${a.id}`} key={a.id}>
              <span className="top-assessment-rank">{index + 1}</span>
              <span className="top-assessment-content">
                <span className="top-assessment-name">{a.title}</span>
                <span className="top-assessment-track">
                  <i style={{ width: `${((a.responseCount || 0) / topAssessmentMaximum) * 100}%` }} />
                </span>
              </span>
              <b className="top-assessment-count">{Number(a.responseCount || 0).toLocaleString("th-TH")}</b>
            </Link>
          )) : (
            <Empty title="ยังไม่มีคำตอบ" text="อันดับจะแสดงเมื่อมีผู้ตอบแบบประเมิน" />
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
function Status({ value }: { value: string }) {
  const names: any = {
    DRAFT: "ฉบับร่าง",
    PUBLISHED: "เผยแพร่",
    CLOSED: "ปิดแล้ว",
  };
  return (
    <span className={`status ${value.toLowerCase()}`}>
      <i />
      {names[value] || value}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <ClipboardList size={30} />
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
function AssessmentList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Assessment[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/assessments", { params: { search } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setError("โหลดรายการไม่สำเร็จ"));
  }, [search]);
  return (
    <section className="content">
      <PageHeader
        title="แบบประเมิน"
        subtitle="สร้าง จัดการ และติดตามแบบประเมินของหน่วยงาน"
        action={
          <Link className="button primary" to="/assessments/new">
            <Plus size={17} />
            สร้างแบบประเมิน
          </Link>
        }
      />
      <div className="assessment-guide">
        <b>เริ่มทำแบบประเมินสำหรับทดสอบ</b>
        <span>
          สร้างแบบประเมินใหม่ → เพิ่มคำถาม → เผยแพร่ → เปิดลิงก์หรือสแกน QR
          เพื่อลองตอบ
        </span>
        <small>
          แบบประเมินที่เผยแพร่แล้วหรือมีคำตอบ จะล็อกการแก้ไขเพื่อรักษาข้อมูลเดิม
          ใช้ “ทำสำเนา” เพื่อสร้างฉบับร่างสำหรับแก้ไขหรือทดสอบ
        </small>
      </div>
      <div className="toolbar">
        <label className="searchbox">
          <Search size={17} />
          <input
            placeholder="ค้นหาชื่อแบบประเมิน"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="muted">{items.length} รายการ</span>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>แบบประเมิน</th>
              <th>หมวดหมู่</th>
              <th>สถานะ</th>
              <th>ผู้ตอบ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link className="table-link" to={`/assessments/${a.id}`}>
                    {a.title}
                  </Link>
                  <small className="table-sub">
                    กลุ่มเป้าหมาย {a.targetGroup} · {a.assessmentType === "PRE_TEST" ? "Pre-test" : a.assessmentType === "POST_TEST" ? "Post-test" : "ทั่วไป"}
                  </small>
                </td>
                <td>{a.category || "—"}</td>
                <td>
                  <Status value={a.status} />
                </td>
                <td>{a.responseCount || 0}</td>
                <td>
                  <div className="assessment-actions">
                    <Link className="text-action" to={`/assessments/${a.id}`}>
                      เปิด →
                    </Link>
                    <button
                      className="text-action-button"
                      onClick={async () => {
                        try {
                          const response = await api.post(
                            `/assessments/${a.id}/duplicate`,
                          );
                          showSuccessToast("ทำสำเนาแบบประเมินเรียบร้อยแล้ว");
                          navigate(`/assessments/${response.data.data.id}`);
                        } catch (error: any) {
                          setError(
                            error.response?.data?.error?.message ||
                              "ทำสำเนาแบบประเมินไม่สำเร็จ",
                          );
                        }
                      }}
                    >
                      ทำสำเนา
                    </button>
                    <button
                      className="icon-action danger"
                      title={
                        a.responseCount
                          ? "ลบไม่ได้ เนื่องจากแบบประเมินมีคำตอบแล้ว"
                          : "ลบแบบประเมิน"
                      }
                      aria-label={`ลบแบบประเมิน ${a.title}`}
                      disabled={Boolean(a.responseCount)}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `ลบแบบประเมิน “${a.title}” หรือไม่? การลบไม่สามารถย้อนกลับได้`,
                          )
                        )
                          return;
                        try {
                          await api.delete(`/assessments/${a.id}`);
                          setItems((current) =>
                            current.filter((item) => item.id !== a.id),
                          );
                          showSuccessToast("ลบแบบประเมินเรียบร้อยแล้ว");
                        } catch (deleteError: any) {
                          setError(
                            deleteError.response?.data?.error?.message ||
                              "ลบแบบประเมินไม่สำเร็จ",
                          );
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <Empty
            title="ไม่พบแบบประเมิน"
            text="ลองค้นหาด้วยคำอื่น หรือสร้างแบบประเมินใหม่"
          />
        )}
      </div>
    </section>
  );
}
function AssessmentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [message, setMessage] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const isLocked = Boolean(
    assessment &&
    (assessment.status !== "DRAFT" || (assessment.responseCount || 0) > 0),
  );
  useEffect(() => {
    if (id)
      api
        .get(`/assessments/${id}`)
        .then((r) => {
          setAssessment(r.data.data);
          setQuestions(r.data.data.questions || []);
          if (r.data.data.publicToken) {
            setQrUrl(
              `${(import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "")}/assessment/${r.data.data.publicToken}`,
            );
          }
        })
        .catch(() => setMessage("เปิดแบบประเมินไม่สำเร็จ"));
  }, [id]);
  const duplicateAssessment = async () => {
    if (!assessment) return;
    setIsDuplicating(true);
    try {
      const response = await api.post(
        `/assessments/${assessment.id}/duplicate`,
      );
      showSuccessToast("ทำสำเนาแบบประเมินเรียบร้อยแล้ว");
      navigate(`/assessments/${response.data.data.id}`);
    } catch (error: any) {
      setMessage(
        error.response?.data?.error?.message || "ทำสำเนาแบบประเมินไม่สำเร็จ",
      );
    } finally {
      setIsDuplicating(false);
    }
  };
  const saveAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      description: fd.get("description"),
      targetGroup: fd.get("targetGroup"),
      assessmentType: fd.get("assessmentType"),
      startAt: fd.get("startAt")
        ? new Date(String(fd.get("startAt"))).toISOString()
        : null,
      endAt: fd.get("endAt")
        ? new Date(String(fd.get("endAt"))).toISOString()
        : null,
    };
    try {
      const r = id
        ? await api.put(`/assessments/${id}`, body)
        : await api.post("/assessments", body);
      setAssessment(r.data.data);
      setMessage("บันทึกข้อมูลแบบประเมินแล้ว");
      showSuccessToast("บันทึกข้อมูลแบบประเมินเรียบร้อยแล้ว");
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "บันทึกไม่สำเร็จ");
    }
  };
  const addQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assessment) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const type = String(fd.get("questionType"));
    const options = String(fd.get("options") || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((optionText, index) => {
        const scores = String(fd.get("scores") || "")
          .split("\n")
          .map((score) => score.trim())
          .filter(Boolean);
        const score = scores[index] == null ? index + 1 : Number(scores[index]);
        return { optionText, score: Number.isFinite(score) ? score : 0 };
      });
    try {
      const r = await api.post(`/assessments/${assessment.id}/questions`, {
        questionText: fd.get("questionText"),
        questionType: type,
        isRequired: fd.get("required") === "on",
        sortOrder: questions.length,
        options,
      });
      const q = r.data.data;
      setQuestions([
        ...questions,
        {
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          isRequired: q.is_required,
          options: q.question_options.map((o: any) => ({
            id: o.id,
            optionText: o.option_text,
            score: o.score,
          })),
        },
      ]);
      form.reset();
      showSuccessToast("เพิ่มคำถามเรียบร้อยแล้ว");
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "เพิ่มคำถามไม่สำเร็จ");
    }
  };
  const publish = async () => {
    try {
      const r = await api.post(`/assessments/${assessment?.id}/publish`);
      setAssessment({
        ...assessment!,
        status: "PUBLISHED",
        publicToken: r.data.data.public_token,
      });
      setQrUrl(r.data.data.publicUrl);
      setMessage("เผยแพร่แบบประเมินแล้ว");
      showSuccessToast("เผยแพร่แบบประเมินเรียบร้อยแล้ว");
    } catch (err: any) {
      setMessage(err.response?.data?.error?.message || "เผยแพร่ไม่สำเร็จ");
    }
  };
  const downloadQr = () => {
    const svg = document.querySelector("#public-qr svg") as SVGElement | null;
    if (!svg) return;
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml",
      }),
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 640;
      canvas.getContext("2d")?.drawImage(img, 0, 0, 640, 640);
      canvas.toBlob((png) => {
        if (!png) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(png);
        a.download = "assessment-qr.png";
        a.click();
        URL.revokeObjectURL(a.href);
        URL.revokeObjectURL(url);
      });
    };
    img.src = url;
  };
  return (
    <section className="content">
      <PageHeader
        title={id ? "แก้ไขแบบประเมิน" : "สร้างแบบประเมิน"}
        subtitle="1. บันทึกรายละเอียด  2. เพิ่มคำถาม  3. เผยแพร่เพื่อรับคำตอบ"
        action={
          <button
            className="button outline"
            onClick={() => navigate("/assessments")}
          >
            กลับรายการ
          </button>
        }
      />
      {message && <div className="alert info">{message}</div>}
      {isLocked && assessment && (
        <div className="assessment-lock-notice">
          <div>
            <b>
              แบบประเมินนี้
              {assessment.status === "PUBLISHED"
                ? "เผยแพร่แล้ว"
                : "ปิดรับคำตอบแล้ว"}
              {assessment.responseCount
                ? ` และมีคำตอบ ${assessment.responseCount} รายการ`
                : ""}
            </b>
            <span>
              ระบบล็อกการแก้ไขเพื่อรักษาคำถามและข้อมูลคำตอบเดิม
              ทำสำเนาเป็นฉบับร่างหากต้องการแก้ไขหรือใช้ทดสอบ
            </span>
          </div>
          <button
            className="button primary"
            onClick={() => void duplicateAssessment()}
            disabled={isDuplicating}
          >
            <ClipboardList size={16} />
            {isDuplicating ? "กำลังทำสำเนา…" : "ทำสำเนาเป็นฉบับร่าง"}
          </button>
        </div>
      )}
      <div className="editor-grid">
        <div className="panel form-panel">
          <h2>รายละเอียดแบบประเมิน</h2>
          <form
            key={assessment?.id || "new-assessment"}
            onSubmit={saveAssessment}
            className="form-grid"
          >
            <label>
              ชื่อแบบประเมิน
              <input
                name="title"
                required
                disabled={isLocked}
                defaultValue={assessment?.title}
              />
            </label>
            <label>
              ประเภทแบบประเมิน
              <select
                name="assessmentType"
                disabled={isLocked}
                defaultValue={assessment?.assessmentType || "GENERAL"}
              >
                <option value="GENERAL">แบบประเมินทั่วไป</option>
                <option value="PRE_TEST">Pre-test</option>
                <option value="POST_TEST">Post-test</option>
              </select>
            </label>
            <label>
              กลุ่มเป้าหมาย
              <select
                name="targetGroup"
                disabled={isLocked}
                defaultValue={assessment?.targetGroup || "BOTH"}
              >
                <option value="BOTH">ภายในและภายนอก</option>
                <option value="INTERNAL">ภายใน</option>
                <option value="EXTERNAL">ภายนอก</option>
              </select>
            </label>
            <label className="span-2">
              คำอธิบาย
              <textarea
                name="description"
                rows={3}
                disabled={isLocked}
                defaultValue={(assessment as any)?.description || ""}
              />
            </label>
            <label>
              เวลาเริ่มเปิดแบบประเมิน
              <input
                name="startAt"
                type="datetime-local"
                disabled={isLocked}
                defaultValue={toLocalDateTimeInput(assessment?.startAt)}
              />
            </label>
            <label>
              เวลาปิดแบบประเมิน
              <input
                name="endAt"
                type="datetime-local"
                disabled={isLocked}
                defaultValue={toLocalDateTimeInput(assessment?.endAt)}
              />
            </label>
            <div className="span-2">
              <button className="button primary" disabled={isLocked}>
                บันทึกรายละเอียด
              </button>
              {assessment && (
                <span className="inline-status">
                  <Status value={assessment.status} />
                </span>
              )}
            </div>
          </form>
        </div>
        {assessment && (
          <div className="panel form-panel">
            <h2>{isLocked ? "คำถามในแบบประเมิน" : "เพิ่มคำถาม"}</h2>
            {!isLocked && (
              <form onSubmit={addQuestion} className="form-grid">
                <label className="span-2">
                  ข้อความคำถาม
                  <input
                    name="questionText"
                    required
                    placeholder="เช่น ท่านพึงพอใจต่อการให้บริการเพียงใด"
                  />
                </label>
                <label>
                  ประเภทคำถาม
                  <select name="questionType">
                    <option value="RATING">คะแนน 1–5</option>
                    <option value="SINGLE_CHOICE">เลือกหนึ่งข้อ</option>
                    <option value="MULTIPLE_CHOICE">เลือกได้หลายข้อ</option>
                    <option value="SHORT_TEXT">ข้อความสั้น</option>
                    <option value="LONG_TEXT">ข้อความยาว</option>
                    <option value="NUMBER">ตัวเลข</option>
                  </select>
                </label>
                <label className="check-label">
                  <input name="required" type="checkbox" /> จำเป็นต้องตอบ
                </label>
                <label className="span-2">
                  ตัวเลือก{" "}
                  <small>(หนึ่งรายการต่อบรรทัด สำหรับคำถามแบบเลือก)</small>
                  <textarea
                    name="options"
                    rows={3}
                    placeholder={"ดีมาก\nปานกลาง\nน้อย"}
                  />
                </label>
                <label className="span-2">
                  คะแนนของแต่ละตัวเลือก
                  <small>(ใส่คะแนนหนึ่งค่าต่อบรรทัด ให้ตรงลำดับตัวเลือก; เว้นว่างจะใช้ 1, 2, 3…)</small>
                  <textarea
                    name="scores"
                    rows={2}
                    placeholder={"0\n1\n0"}
                  />
                </label>
                <button className="button secondary">
                  <Plus size={16} />
                  เพิ่มคำถาม
                </button>
              </form>
            )}
            <div className="question-list">
              {questions.map((q, i) => (
                <div className="question-row" key={q.id}>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <span>
                    {q.questionText}
                    <small>
                      {q.questionType} {q.isRequired ? "· จำเป็น" : ""}
                    </small>
                  </span>
                  {!isLocked && (
                    <button
                      className="quiet"
                      onClick={async () => {
                        try {
                          await api.delete(`/questions/${q.id}`);
                          setQuestions(questions.filter((_, n) => n !== i));
                          showSuccessToast("ลบคำถามเรียบร้อยแล้ว");
                        } catch (e: any) {
                          setMessage(
                            e.response?.data?.error?.message ||
                              "ลบคำถามไม่สำเร็จ",
                          );
                        }
                      }}
                    >
                      ลบ
                    </button>
                  )}
                </div>
              ))}
            </div>
            {assessment.status === "DRAFT" && (
              <button
                className="button primary full"
                disabled={!questions.length}
                onClick={publish}
              >
                เผยแพร่แบบประเมิน
              </button>
            )}
          </div>
        )}
        {qrUrl && (
          <div className="panel qr-panel">
            <div id="public-qr">
              <QRCode value={qrUrl} size={160} />
            </div>
            <h2>แบบประเมินพร้อมตอบ</h2>
            <p>{qrUrl}</p>
            <div className="button-row">
              <button
                className="button outline"
                onClick={() => navigator.clipboard.writeText(qrUrl)}
              >
                คัดลอกลิงก์
              </button>
              <button className="button primary" onClick={downloadQr}>
                <ArrowDownToLine size={16} />
                ดาวน์โหลด PNG
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [formError, setFormError] = useState("");
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api
      .get("/users", {
        params: {
          search,
          page,
          pageSize,
          ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
          ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        },
      })
      .then((response) => {
        if (cancelled) return;
        setItems(response.data.data.items);
        setTotal(response.data.data.total);
      })
      .catch((error: any) => {
        if (!cancelled) {
          setMessageType("error");
          setMessage(
            error.response?.data?.error?.message || "โหลดผู้ใช้งานไม่ได้",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, roleFilter, statusFilter, page, refreshKey]);

  function openCreateModal() {
    setEditingUser(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormError("");
    setModalOpen(true);
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "").trim();
    const payload = {
      fullName: String(formData.get("fullName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      role: String(formData.get("role")) as User["role"],
      isActive: formData.get("isActive") === "on",
      ...(password ? { password } : {}),
    };

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        setMessage("บันทึกการแก้ไขผู้ใช้แล้ว");
      } else {
        await api.post("/users", payload);
        setMessage("เพิ่มบัญชีผู้ใช้แล้ว");
        setPage(1);
      }
      setMessageType("success");
      setModalOpen(false);
      setRefreshKey((value) => value + 1);
      showSuccessToast(
        editingUser ? "บันทึกการแก้ไขผู้ใช้แล้ว" : "เพิ่มบัญชีผู้ใช้แล้ว",
      );
    } catch (error: any) {
      setFormError(
        error.response?.data?.error?.message || "บันทึกข้อมูลไม่สำเร็จ",
      );
    }
  }

  async function toggleUserStatus(user: User) {
    const nextStatus = !user.isActive;
    const action = nextStatus ? "เปิดใช้งาน" : "ระงับ";
    if (!window.confirm(`ยืนยัน${action}บัญชี ${user.fullName} หรือไม่?`))
      return;

    try {
      await api.patch(`/users/${user.id}/status`, { isActive: nextStatus });
      setMessage(`เปลี่ยนสถานะบัญชี ${user.fullName} แล้ว`);
      setMessageType("success");
      setRefreshKey((value) => value + 1);
      showSuccessToast(`เปลี่ยนสถานะบัญชี ${user.fullName} เรียบร้อยแล้ว`);
    } catch (error: any) {
      setMessageType("error");
      setMessage(
        error.response?.data?.error?.message || "เปลี่ยนสถานะบัญชีไม่สำเร็จ",
      );
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`ลบบัญชี ${user.fullName} อย่างถาวรหรือไม่?`)) return;

    try {
      await api.delete(`/users/${user.id}`);
      setMessage(`ลบบัญชี ${user.fullName} แล้ว`);
      setMessageType("success");
      showSuccessToast(`ลบบัญชี ${user.fullName} เรียบร้อยแล้ว`);
      if (items.length === 1 && page > 1) setPage((value) => value - 1);
      else setRefreshKey((value) => value + 1);
    } catch (error: any) {
      setMessageType("error");
      setMessage(error.response?.data?.error?.message || "ลบบัญชีไม่สำเร็จ");
    }
  }

  return (
    <section className="content">
      <PageHeader
        title="ผู้ใช้งาน"
        subtitle="เพิ่ม แก้ไขสิทธิ์ และจัดการสถานะบัญชีผู้ใช้งานระบบ"
        action={
          <button className="button primary" onClick={openCreateModal}>
            <Plus size={16} /> เพิ่มผู้ใช้งาน
          </button>
        }
      />
      <div className="panel form-panel">
        <div className="user-toolbar">
          <label className="searchbox">
            <Search size={17} />
            <input
              placeholder="ค้นหาชื่อหรืออีเมล"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="กรองตามสิทธิ์"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกสิทธิ์</option>
            <option value="ADMIN">ผู้ดูแลระบบ</option>
            <option value="STAFF">เจ้าหน้าที่</option>
          </select>
          <select
            aria-label="กรองตามสถานะ"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ระงับ</option>
          </select>
          <span className="user-result-count">ทั้งหมด {total} บัญชี</span>
        </div>
        {message && (
          <div
            className={`alert ${messageType === "error" ? "error" : "info"}`}
          >
            {message}
          </div>
        )}
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>สิทธิ์</th>
                <th>สถานะ</th>
                <th>วันที่เพิ่ม</th>
                <th>อัปเดตล่าสุด</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="users-state-cell">
                    กำลังโหลดรายชื่อผู้ใช้งาน…
                  </td>
                </tr>
              ) : items.length ? (
                items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-name-cell">
                        <span className="avatar">
                          {user.fullName.slice(0, 1)}
                        </span>
                        <b>{user.fullName}</b>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-label ${user.role.toLowerCase()}`}>
                        {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`user-state ${user.isActive ? "active" : "inactive"}`}
                      >
                        <i /> {user.isActive ? "ใช้งาน" : "ระงับ"}
                      </span>
                    </td>
                    <td>
                      {user.createdAt
                        ? new Intl.DateTimeFormat("th-TH", {
                            dateStyle: "medium",
                          }).format(new Date(user.createdAt))
                        : "—"}
                    </td>
                    <td>
                      {user.updatedAt
                        ? new Intl.DateTimeFormat("th-TH", {
                            dateStyle: "medium",
                          }).format(new Date(user.updatedAt))
                        : "—"}
                    </td>
                    <td>
                      <div className="user-actions">
                        <button
                          className="icon-action"
                          title="แก้ไขข้อมูลและรหัสผ่าน"
                          aria-label={`แก้ไข ${user.fullName}`}
                          onClick={() => openEditModal(user)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-action"
                          title={
                            user.isActive ? "ระงับบัญชี" : "เปิดใช้งานบัญชี"
                          }
                          aria-label={`${user.isActive ? "ระงับ" : "เปิดใช้งาน"} ${user.fullName}`}
                          onClick={() => void toggleUserStatus(user)}
                        >
                          {user.isActive ? (
                            <ShieldOff size={15} />
                          ) : (
                            <ShieldCheck size={15} />
                          )}
                        </button>
                        <button
                          className="icon-action danger"
                          title="ลบบัญชี"
                          aria-label={`ลบ ${user.fullName}`}
                          onClick={() => void deleteUser(user)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="users-state-cell">
                    ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <span>
            หน้า {page} จาก {pageCount}
          </span>
          <div>
            <button
              className="button outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              ก่อนหน้า
            </button>
            <button
              className="button outline"
              disabled={page >= pageCount || isLoading}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            className="user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow">USER MANAGEMENT</div>
                <h2 id="user-modal-title">
                  {editingUser ? "แก้ไขบัญชีผู้ใช้" : "เพิ่มผู้ใช้งาน"}
                </h2>
              </div>
              <button
                className="icon-action"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form
              key={editingUser?.id || "new-user"}
              className="user-form"
              onSubmit={saveUser}
            >
              <label>
                ชื่อ-นามสกุล
                <input
                  name="fullName"
                  required
                  minLength={2}
                  maxLength={150}
                  defaultValue={editingUser?.fullName || ""}
                  autoFocus
                />
              </label>
              <label>
                อีเมล
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={150}
                  defaultValue={editingUser?.email || ""}
                />
              </label>
              <label>
                สิทธิ์การใช้งาน
                <select name="role" defaultValue={editingUser?.role || "STAFF"}>
                  <option value="STAFF">เจ้าหน้าที่ (Staff)</option>
                  <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </label>
              <label>
                {editingUser
                  ? "ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
                  : "รหัสผ่านเริ่มต้น"}
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  required={!editingUser}
                  autoComplete="new-password"
                  placeholder={
                    editingUser
                      ? "อย่างน้อย 10 ตัวอักษร"
                      : "อย่างน้อย 10 ตัวอักษร"
                  }
                />
              </label>
              <label className="user-active-toggle">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={editingUser?.isActive ?? true}
                />
                เปิดใช้งานบัญชี
              </label>
              {formError && <div className="alert error">{formError}</div>}
              <div className="modal-actions">
                <button
                  className="button outline"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button className="button primary" type="submit">
                  {editingUser ? "บันทึกการแก้ไข" : "สร้างบัญชี"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
function CategoriesPage({ user }: { user: User }) {
  const [items, setItems] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [usageFilter, setUsageFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const canManageCategories = user.role === "ADMIN";
  const filteredItems = items.filter((category) => {
    const matchesSearch = `${category.name} ${category.description || ""}`
      .toLocaleLowerCase("th")
      .includes(search.trim().toLocaleLowerCase("th"));
    const assessmentCount = category._count?.assessments || 0;
    const matchesUsage =
      usageFilter === "ALL" ||
      (usageFilter === "USED" && assessmentCount > 0) ||
      (usageFilter === "UNUSED" && assessmentCount === 0);
    return matchesSearch && matchesUsage;
  });

  const load = async () => {
    try {
      const response = await api.get("/categories");
      setItems(response.data.data);
    } catch (error: any) {
      setMessage(
        error.response?.data?.error?.message || "โหลดหมวดหมู่ไม่สำเร็จ",
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  function openCreateModal() {
    setEditingCategory(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormError("");
    setModalOpen(true);
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageCategories || isSaving) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    if (!name) {
      setMessage("กรุณากรอกชื่อหมวดหมู่");
      setMessageType("error");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const payload = {
        name,
        description: description || null,
      };
      if (editingCategory) {
        const response = await api.put(
          `/categories/${editingCategory.id}`,
          payload,
        );
        const updated = response.data.data as Category;
        setItems((current) =>
          current
            .map((category) =>
              category.id === updated.id
                ? { ...category, ...updated }
                : category,
            )
            .sort((a, b) => a.name.localeCompare(b.name, "th")),
        );
        setMessage("บันทึกการแก้ไขหมวดหมู่แล้ว");
      } else {
        const response = await api.post("/categories", payload);
        const created = response.data.data as Category;
        setItems((current) =>
          [...current, { ...created, _count: { assessments: 0 } }].sort(
            (a, b) => a.name.localeCompare(b.name, "th"),
          ),
        );
        setMessage("เพิ่มหมวดหมู่แล้ว");
      }
      setMessageType("success");
      setModalOpen(false);
      showSuccessToast(
        editingCategory
          ? "บันทึกการแก้ไขหมวดหมู่แล้ว"
          : "เพิ่มหมวดหมู่เรียบร้อยแล้ว",
      );
    } catch (error: any) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.error?.message;
      setFormError(
        status === 401
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง"
          : status === 403
            ? "บัญชีนี้ไม่มีสิทธิ์เพิ่มหมวดหมู่ กรุณาเข้าสู่ระบบด้วยบัญชี Admin"
            : status === 409
              ? serverMessage || "หมวดหมู่นี้มีอยู่แล้ว"
              : !error.response
                ? "เชื่อมต่อระบบไม่ได้ กรุณาตรวจว่า backend กำลังทำงานอยู่"
                : serverMessage || "เพิ่มหมวดหมู่ไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`ลบหมวดหมู่ “${category.name}” หรือไม่?`)) return;
    try {
      await api.delete(`/categories/${category.id}`);
      setItems((current) => current.filter((item) => item.id !== category.id));
      setMessage(`ลบหมวดหมู่ “${category.name}” แล้ว`);
      setMessageType("success");
      showSuccessToast(`ลบหมวดหมู่ “${category.name}” เรียบร้อยแล้ว`);
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message || "ลบหมวดหมู่ไม่สำเร็จ");
      setMessageType("error");
    }
  }

  return (
    <section className="content">
      <PageHeader
        title="หมวดหมู่"
        subtitle="จัดกลุ่มแบบประเมินให้ค้นหาและรายงานได้ง่าย"
        action={
          canManageCategories ? (
            <button className="button primary" onClick={openCreateModal}>
              <Plus size={17} /> เพิ่มหมวดหมู่
            </button>
          ) : undefined
        }
      />
      <div className="panel form-panel">
        {!canManageCategories && (
          <div className="alert info">
            หน้านี้ใช้จัดการหมวดหมู่ ผู้ดูแลระบบ (Admin)
            เท่านั้นที่เพิ่มหรือแก้ไขได้
          </div>
        )}
        <div className="user-toolbar category-toolbar">
          <label className="searchbox">
            <Search size={18} />
            <input
              placeholder="ค้นหาชื่อหรือคำอธิบายหมวดหมู่"
              aria-label="ค้นหาหมวดหมู่"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            aria-label="กรองตามการใช้งานหมวดหมู่"
            value={usageFilter}
            onChange={(event) => setUsageFilter(event.target.value)}
          >
            <option value="ALL">ทุกหมวดหมู่</option>
            <option value="USED">มีแบบประเมิน</option>
            <option value="UNUSED">ยังไม่มีแบบประเมิน</option>
          </select>
          <span className="user-result-count">
            แสดง {filteredItems.length} จาก {items.length} หมวดหมู่
          </span>
        </div>
        {message && (
          <div
            className={`alert ${messageType}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}
        <div className="table-wrap">
          <table className="category-table">
            <thead>
              <tr>
                <th>ชื่อหมวดหมู่</th>
                <th>คำอธิบาย</th>
                <th>แบบประเมิน</th>
                {canManageCategories && <th>จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={canManageCategories ? 4 : 3}
                    className="users-state-cell"
                  >
                    กำลังโหลดหมวดหมู่…
                  </td>
                </tr>
              ) : filteredItems.length ? (
                filteredItems.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="category-name-cell">
                        <span className="category-symbol">
                          <FolderKanban size={17} />
                        </span>
                        <b>{c.name}</b>
                      </div>
                    </td>
                    <td className="category-description">
                      {c.description || "—"}
                    </td>
                    <td>{c._count?.assessments || 0} รายการ</td>
                    {canManageCategories && (
                      <td>
                        <div className="user-actions">
                          <button
                            className="icon-action"
                            title="แก้ไขหมวดหมู่"
                            aria-label={`แก้ไขหมวดหมู่ ${c.name}`}
                            onClick={() => openEditModal(c)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-action danger"
                            title="ลบหมวดหมู่"
                            aria-label={`ลบหมวดหมู่ ${c.name}`}
                            onClick={() => void deleteCategory(c)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={canManageCategories ? 4 : 3}
                    className="users-state-cell"
                  >
                    {search ? "ไม่พบหมวดหมู่ตามคำค้น" : "ยังไม่มีหมวดหมู่"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving)
              setModalOpen(false);
          }}
        >
          <section
            className="user-modal category-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow">CATEGORY MANAGEMENT</div>
                <h2 id="category-modal-title">
                  {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
                </h2>
              </div>
              <button
                className="icon-action"
                type="button"
                aria-label="ปิดหน้าต่าง"
                disabled={isSaving}
                onClick={() => setModalOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
            <form
              key={editingCategory?.id || "new-category"}
              className="user-form"
              onSubmit={saveCategory}
            >
              <label>
                ชื่อหมวดหมู่
                <input
                  name="name"
                  required
                  maxLength={150}
                  defaultValue={editingCategory?.name || ""}
                  placeholder="เช่น การให้บริการและสิ่งอำนวยความสะดวก"
                  autoFocus
                  disabled={isSaving}
                />
              </label>
              <label>
                คำอธิบาย
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={editingCategory?.description || ""}
                  placeholder="ระบุรายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  disabled={isSaving}
                />
              </label>
              {formError && <div className="alert error">{formError}</div>}
              <div className="modal-actions">
                <button
                  className="button outline"
                  type="button"
                  disabled={isSaving}
                  onClick={() => setModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "กำลังบันทึก…"
                    : editingCategory
                      ? "บันทึกการแก้ไข"
                      : "เพิ่มหมวดหมู่"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
function ReportsPage() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState("");
  const [preTestId, setPreTestId] = useState("");
  const [postTestId, setPostTestId] = useState("");
  const [comparison, setComparison] = useState<any>();
  const [comparisonError, setComparisonError] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [data, setData] = useState<any>();
  const [reportError, setReportError] = useState("");
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const selectedAssessment = items.find(
    (assessment) => assessment.id === selected,
  );

  useEffect(() => {
    api
      .get("/assessments", { params: { pageSize: 100 } })
      .then((r) => setItems(r.data.data.items));
  }, []);

  async function comparePrePost() {
    setComparisonError("");
    setIsComparing(true);
    try {
      const response = await api.get("/reports/pre-post", {
        params: { preTestId, postTestId },
      });
      setComparison(response.data.data);
    } catch (error: any) {
      setComparisonError(
        error.response?.data?.error?.message || "โหลดรายงานเปรียบเทียบไม่สำเร็จ",
      );
      setComparison(undefined);
    } finally {
      setIsComparing(false);
    }
  }

  useEffect(() => {
    setData(undefined);
    setReportError("");
    if (!selected) {
      setIsLoadingReport(false);
      return;
    }

    let cancelled = false;
    setIsLoadingReport(true);
    api
      .get(`/reports/assessments/${selected}`)
      .then((r) => {
        if (!cancelled) setData(r.data.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setReportError(
            error.response?.data?.error?.message || "โหลดรายงานไม่สำเร็จ",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReport(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  async function exportCsv() {
    try {
      const response = await api.get(
        `/reports/assessments/${selected}/export`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `assessment-report-${selected}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setReportError(
        error.response?.data?.error?.message || "ส่งออก CSV ไม่สำเร็จ",
      );
    }
  }

  function printReport() {
    const previousTitle = document.title;
    const title = (selectedAssessment?.title || "assessment-report")
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim();
    document.title = `รายงานผล-${title}`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    window.print();
  }

  return (
    <section className="content">
      <PageHeader
        title="รายงานผล"
        subtitle="สรุปคำตอบและคะแนนจากข้อมูลจริง"
        action={
          selected && data ? (
            <div className="report-header-actions">
              <button
                className="button outline"
                onClick={() => void exportCsv()}
              >
                <ArrowDownToLine size={17} /> ส่งออก CSV
              </button>
              <button className="button outline" onClick={printReport}>
                <Printer size={17} /> พิมพ์รายงาน
              </button>
              <button className="button primary" onClick={printReport}>
                <FileDown size={17} /> ส่งออก PDF
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="panel form-panel report-panel pre-post-panel">
        <div className="panel-head">
          <div>
            <h2>เปรียบเทียบผล Pre-test / Post-test</h2>
            <p>จับคู่ผู้ตอบด้วยอีเมล หรือชื่อที่กรอกตรงกัน และคำนวณจากข้อที่มีคะแนน</p>
          </div>
        </div>
        <div className="report-controls pre-post-controls">
          <label>
            Pre-test
            <select value={preTestId} onChange={(event) => setPreTestId(event.target.value)}>
              <option value="">เลือกแบบทดสอบก่อนเรียน</option>
              {items.filter((item) => item.assessmentType === "PRE_TEST").map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <label>
            Post-test
            <select value={postTestId} onChange={(event) => setPostTestId(event.target.value)}>
              <option value="">เลือกแบบทดสอบหลังเรียน</option>
              {items.filter((item) => item.assessmentType === "POST_TEST").map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            disabled={!preTestId || !postTestId || isComparing}
            onClick={() => void comparePrePost()}
          >
            {isComparing ? "กำลังคำนวณ…" : "เปรียบเทียบผล"}
          </button>
        </div>
        {comparisonError && <div className="alert error">{comparisonError}</div>}
        {comparison && (
          <div className="pre-post-results">
            <div className="pre-post-score">
              <span>{comparison.preTest.title}</span>
              <b>{comparison.preTest.averageScore == null ? "—" : comparison.preTest.averageScore.toFixed(2)}</b>
              <small>เฉลี่ยจากผู้ตอบที่มีคะแนน {comparison.preTest.scoredResponses}/{comparison.preTest.responses} คน</small>
            </div>
            <div className="pre-post-delta">
              <span>เปลี่ยนแปลงเฉลี่ย</span>
              <b className={comparison.averageChange > 0 ? "positive" : comparison.averageChange < 0 ? "negative" : ""}>
                {comparison.averageChange == null ? "ไม่มีข้อมูลผู้ตอบที่จับคู่ได้" : `${comparison.averageChange > 0 ? "+" : ""}${comparison.averageChange.toFixed(2)}`}
              </b>
              <small>จับคู่ได้ {comparison.pairedRespondents} คน · คะแนนเพิ่ม {comparison.improvedRespondents} คน</small>
            </div>
            <div className="pre-post-score">
              <span>{comparison.postTest.title}</span>
              <b>{comparison.postTest.averageScore == null ? "—" : comparison.postTest.averageScore.toFixed(2)}</b>
              <small>เฉลี่ยจากผู้ตอบที่มีคะแนน {comparison.postTest.scoredResponses}/{comparison.postTest.responses} คน</small>
            </div>
          </div>
        )}
      </div>
      <div className="panel form-panel report-panel">
        <div className="report-controls">
          <label>
            เลือกแบบประเมิน
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">เลือกแบบประเมิน</option>
              {items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {reportError && <div className="alert error">{reportError}</div>}
        {isLoadingReport && (
          <div className="loading report-loading">
            <span className="spinner" /> กำลังจัดทำรายงาน…
          </div>
        )}
        {data && (
          <div className="report-print-area">
            <h2 className="report-print-title">
              {data.assessment.title} · {data.assessment.assessmentType === "PRE_TEST" ? "Pre-test" : data.assessment.assessmentType === "POST_TEST" ? "Post-test" : "แบบประเมินทั่วไป"}
            </h2>
            <div className="stat-grid report-stat-grid">
              <div className="stat-card">
                <div className="stat-icon blue">
                  <Users size={18} />
                </div>
                <div className="stat-title">ผู้ตอบทั้งหมด</div>
                <div className="stat-value">
                  {data.summary.total}
                  <small>คน</small>
                </div>
                <div className="stat-foot">จำนวนคำตอบของแบบประเมินนี้</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">
                  <ShieldCheck size={18} />
                </div>
                <div className="stat-title">ผู้ตอบภายใน</div>
                <div className="stat-value">
                  {data.summary.internal}
                  <small>คน</small>
                </div>
                <div className="stat-foot">บุคลากรภายในหน่วยงาน</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">
                  <Users size={18} />
                </div>
                <div className="stat-title">ผู้ตอบภายนอก</div>
                <div className="stat-value">
                  {data.summary.external}
                  <small>คน</small>
                </div>
                <div className="stat-foot">ผู้รับบริการภายนอก</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">
                  <Activity size={18} />
                </div>
                <div className="stat-title">
                  {data.assessment.assessmentType === "PRE_TEST" || data.assessment.assessmentType === "POST_TEST" ? "คะแนนเฉลี่ยแบบทดสอบ" : "คะแนนเฉลี่ย"}
                </div>
                <div className="stat-value">
                  {(data.assessment.assessmentType === "PRE_TEST" || data.assessment.assessmentType === "POST_TEST" ? data.summary.averageScore : data.summary.average) == null
                    ? "—"
                    : (data.assessment.assessmentType === "PRE_TEST" || data.assessment.assessmentType === "POST_TEST" ? data.summary.averageScore : data.summary.average).toFixed(2)}
                  <small>{data.assessment.assessmentType === "PRE_TEST" || data.assessment.assessmentType === "POST_TEST" ? ` · ${data.summary.scoredResponses} คน` : "คำตอบตัวเลข"}</small>
                </div>
                <div className="stat-foot">
                  {data.assessment.assessmentType === "PRE_TEST" || data.assessment.assessmentType === "POST_TEST" ? "เฉลี่ยคะแนนจากคำถามตัวเลขและตัวเลือกที่กำหนดคะแนน" : "คำนวณจากคำถามแบบให้คะแนน"}
                </div>
              </div>
            </div>
            <div className="report-timeline">
              <h3>จำนวนคำตอบตามวันที่</h3>
              {data.timeline.length ? (
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.timeline}>
                      <CartesianGrid stroke="#edf1f5" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#2876b8" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="muted">ยังไม่มีคำตอบในแบบประเมินนี้</p>}
            </div>
            <div className="table-wrap report-question-table">
              <table>
                <thead>
                  <tr>
                    <th>คำถาม</th>
                    <th>ประเภท</th>
                    <th>คะแนนเฉลี่ย</th>
                    <th>ตัวเลือก/คำตอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questions.length ? (
                    data.questions.map((question: any) => (
                      <tr key={question.id}>
                        <td>{question.question}</td>
                        <td>{question.type}</td>
                        <td>
                          {question.average == null
                            ? "—"
                            : question.average.toFixed(2)}
                        </td>
                        <td>
                          {Object.entries(question.options).length ? (
                            <div className="answer-distribution">
                              {Object.entries(question.options).map(([label, count]) => (
                                <div className="answer-distribution-row" key={label}>
                                  <span>{label}</span>
                                  <progress max={question.answerCount || 1} value={Number(count)} />
                                  <b>{Number(count)}</b>
                                </div>
                              ))}
                            </div>
                          ) : question.texts.slice(0, 3).join(" · ") || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="users-state-cell">
                        ยังไม่มีคำตอบสำหรับแบบประเมินนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="report-response-list">
              <h3>คำตอบรายบุคคล</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ส่งเมื่อ</th>
                      <th>ประเภทผู้ตอบ</th>
                      <th>คะแนน</th>
                      <th>คำตอบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.responses.length ? data.responses.slice(0, 100).map((response: any) => (
                      <tr key={response.id}>
                        <td>{new Date(response.submittedAt).toLocaleString("th-TH")}</td>
                        <td>{response.type === "INTERNAL" ? "ภายใน" : "ภายนอก"}</td>
                        <td>{response.score == null ? "—" : response.score.toFixed(2)}</td>
                        <td>{response.answers.map((answer: any, index: number) => {
                          const value = answer.text || (answer.number != null ? String(answer.number) : answer.options.join(", ") || "—");
                          return <div key={`${response.id}-${index}`}><b>{answer.question}:</b> {value}</div>;
                        })}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="users-state-cell">ยังไม่มีคำตอบ</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {data.responses.length > 100 && <small className="muted">แสดง 100 คำตอบล่าสุดจากทั้งหมด {data.responses.length} รายการ</small>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function ProfilePage({ user }: { user: User }) {
  const [message, setMessage] = useState("");
  return (
    <section className="content">
      <PageHeader
        title="บัญชีของฉัน"
        subtitle="ข้อมูลผู้ใช้งานและความปลอดภัย"
      />
      <div className="panel form-panel narrow">
        <h2>{user.fullName}</h2>
        <p className="muted">
          {user.email} · {user.role}
        </p>
        <h3>เปลี่ยนรหัสผ่าน</h3>
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await api.put("/auth/change-password", {
                currentPassword: f.get("currentPassword"),
                newPassword: f.get("newPassword"),
              });
              setMessage("เปลี่ยนรหัสผ่านแล้ว");
              showSuccessToast("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
            } catch (x: any) {
              setMessage(
                x.response?.data?.error?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ",
              );
            }
          }}
        >
          <label className="span-2">
            รหัสผ่านปัจจุบัน
            <input name="currentPassword" type="password" required />
          </label>
          <label className="span-2">
            รหัสผ่านใหม่
            <input name="newPassword" type="password" minLength={10} required />
          </label>
          <button className="button primary">บันทึกรหัสผ่าน</button>
        </form>
        {message && <div className="alert info">{message}</div>}
      </div>
    </section>
  );
}
function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  const submit = handleSubmit(async (values) => {
    setError("");
    try {
      const r = await api.post("/auth/login", values);
      sessionStorage.setItem("ict-token", r.data.data.token);
      navigate("/");
    } catch (e: any) {
      setError(
        e.response?.data?.error?.message ||
          "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบ Backend และบัญชี",
      );
    }
  });
  return (
    <div className="login-page">
      <div className="login-aside">
        <div className="brand light">
          <div className="brand-icon">
            <Activity />
          </div>
          <div>
            <b>ICT Assessment</b>
            <small>ศูนย์ ICT ขอนแก่น</small>
          </div>
        </div>
        <div className="login-message">
          <span className="eyebrow">ICT KHON KAEN</span>
          <h1>
            เสียงของคุณ
            <br />
            ขับเคลื่อนบริการ
            <br />
            <em>ให้ดียิ่งขึ้น</em>
          </h1>
          <p>
            ระบบประเมินออนไลน์และวิเคราะห์ผล
            <br />
            เพื่อการพัฒนาบริการอย่างต่อเนื่อง
          </p>
          <div className="login-decoration">
            <div />
            <div />
            <div />
          </div>
        </div>
        <small className="copyright">© 2026 ศูนย์ ICT ขอนแก่น</small>
      </div>
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-symbol">
            <ShieldCheck />
          </div>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>เข้าสู่ระบบ</h2>
          <p>กรุณาใช้บัญชีเจ้าหน้าที่เพื่อดำเนินการต่อ</p>
          <form onSubmit={submit}>
            <label>
              อีเมล
              <input
                {...register("email")}
                type="email"
                placeholder="name@organization.go.th"
                autoComplete="username"
              />
              {errors.email && (
                <small className="field-error">{errors.email.message}</small>
              )}
            </label>
            <label>
              รหัสผ่าน
              <input
                {...register("password")}
                type="password"
                placeholder="กรอกรหัสผ่าน"
                autoComplete="current-password"
              />
              {errors.password && (
                <small className="field-error">{errors.password.message}</small>
              )}
            </label>
            {error && <div className="alert error">{error}</div>}
            <button className="button primary full" disabled={isSubmitting}>
              {isSubmitting ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
          <div className="login-help">บัญชีผู้ใช้จัดการโดยผู้ดูแลระบบ</div>
          <div className="public-link">
            ผู้ตอบแบบประเมินสามารถเปิดผ่าน QR Code โดยไม่ต้องเข้าสู่ระบบ
          </div>
        </div>
      </div>
    </div>
  );
}
function PublicForm() {
  const { token = "" } = useParams();
  const [survey, setSurvey] = useState<any>();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    api
      .get(`/public/assessments/${token}`)
      .then((r) => setSurvey(r.data.data))
      .catch(() => setError("แบบประเมินนี้ไม่เปิดรับคำตอบหรือไม่พบลิงก์"));
  }, [token]);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const answers = survey.questions.map((q: any) => {
      const raw = f.get(`q-${q.id}`);
      return {
        questionId: q.id,
        text: q.type.includes("TEXT") ? String(raw || "") : undefined,
        number:
          ["RATING", "NUMBER"].includes(q.type) && raw !== null && raw !== ""
            ? Number(raw)
            : undefined,
        optionIds:
          q.type === "MULTIPLE_CHOICE"
            ? f.getAll(`q-${q.id}`).map(String)
            : q.type === "SINGLE_CHOICE" && raw
              ? [String(raw)]
              : [],
      };
    });
    try {
      await api.post(
        `/public/assessments/${token}/responses`,
        {
          respondentType: f.get("respondentType"),
          name: f.get("name") || null,
          email: f.get("email") || null,
          answers,
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
      navigate("/success");
    } catch (x: any) {
      setError(x.response?.data?.error?.message || "ส่งคำตอบไม่สำเร็จ");
    }
  };
  if (error)
    return (
      <div className="public-page">
        <div className="public-card">
          <div className="brand-icon">
            <Activity />
          </div>
          <h1>ไม่สามารถเปิดแบบประเมิน</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  if (!survey)
    return (
      <div className="loading">
        <span className="spinner" />
        กำลังโหลดแบบประเมิน…
      </div>
    );
  return (
    <div className="public-page">
      <form className="public-form" onSubmit={submit}>
        <section className="public-form-card public-form-heading-card">
          <div className="public-brand">
            <div className="brand-icon">
              <Activity />
            </div>
            <span>ศูนย์ ICT ขอนแก่น</span>
          </div>
          <div className="eyebrow">แบบประเมินออนไลน์</div>
          <h1>{survey.title}</h1>
          <p>
            {survey.description ||
              "ความคิดเห็นของท่านมีส่วนสำคัญในการพัฒนาบริการ"}
          </p>
          <div className="public-required-note">
            <em>*</em> ระบุว่าเป็นคำถามที่จำเป็นต้องตอบ
          </div>
        </section>

        <section className="public-form-card respondent-card">
          <h2>ข้อมูลผู้ตอบแบบประเมิน</h2>
          <div className="public-fields">
            <label>
              ประเภทผู้ตอบ <em>*</em>
              <select name="respondentType" required>
                <option value="INTERNAL">บุคลากรภายใน</option>
                <option value="EXTERNAL">บุคคลภายนอก</option>
              </select>
            </label>
            <label>
              ชื่อ <small>(ไม่บังคับ)</small>
              <input name="name" placeholder="ไม่ระบุชื่อได้" />
            </label>
            <label>
              อีเมล <small>(ไม่บังคับ)</small>
              <input name="email" type="email" placeholder="name@example.com" />
            </label>
          </div>
        </section>
        {survey.questions.map((q: any, i: number) => (
          <section className="public-form-card public-question" key={q.id}>
            <label>
              <b>
                {i + 1}. {q.text}
              </b>
              {q.required && <em> *</em>}
            </label>
            {q.type === "SHORT_TEXT" ? (
              <input name={`q-${q.id}`} required={q.required} />
            ) : q.type === "LONG_TEXT" ? (
              <textarea name={`q-${q.id}`} rows={4} required={q.required} />
            ) : q.type === "RATING" ? (
              <>
                <div className="rating-options">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={n}
                        required={q.required}
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
                <div className="rating-scale-caption">
                  <span>น้อยที่สุด</span>
                  <span>มากที่สุด</span>
                </div>
              </>
            ) : q.type === "NUMBER" ? (
              <input name={`q-${q.id}`} type="number" required={q.required} />
            ) : (
              <div className="choice-list">
                {q.options.map((o: any) => (
                  <label key={o.id}>
                    <input
                      type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                      name={`q-${q.id}`}
                      value={o.id}
                      required={q.required && q.type === "SINGLE_CHOICE"}
                    />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
        ))}
        <section className="public-form-footer-card">
          {error && <div className="alert error">{error}</div>}
          <button className="button primary">ส่งคำตอบ</button>
          <small className="privacy-note">
            <ShieldCheck size={15} />
            ระบบใช้ข้อมูลเพื่อการประเมินและรักษาความเป็นส่วนตัว
          </small>
        </section>
      </form>
    </div>
  );
}
function Success() {
  return (
    <div className="public-page">
      <div className="public-card success-card">
        <div className="success-check">✓</div>
        <div className="eyebrow">SUBMISSION COMPLETE</div>
        <h1>ขอบคุณสำหรับความคิดเห็น</h1>
        <p>
          ระบบบันทึกคำตอบของท่านเรียบร้อยแล้ว
          ข้อมูลของท่านช่วยให้เราพัฒนาบริการได้ดียิ่งขึ้น
        </p>
        <Link className="button outline" to="/login">
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
export default App;
