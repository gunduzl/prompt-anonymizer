import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import {
  Users,
  Key,
  Shield,
  Settings,
  BarChart3,
  Activity,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Archive,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Upload,
  Filter,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  Database,
  Server,
  MessageSquare,
  TrendingUp,
  Copy,
  Calendar,
  DollarSign,
  Gauge,
} from "lucide-react";
import axios from "axios";
import DLPDashboard from "../components/dlp/DLPDashboard";
import DLPAnalyticsDashboard from "../components/DLPAnalyticsDashboard";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type AdminLocale = "en" | "tr";

const adminCopy = {
  en: {
    appTitle: "Safe Chat Admin",
    nav: {
      dashboard: "Dashboard",
      analytics: "Analytics",
      users: "Users",
      sessions: "Sessions",
      keys: "API Keys Management",
      policies: "DLP Management",
      config: "System Settings",
      audit: "Audit Logs",
      logout: "Logout",
    },
    login: {
      title: "Admin Panel",
      description: "Sign in to the administration panel",
      email: "Email or username",
      password: "Password",
      submit: "Sign In",
      loading: "Signing in...",
      failed: "Login failed",
    },
    common: {
      refresh: "Refresh",
      add: "Add",
      error: "Error",
      active: "Active",
      inactive: "Inactive",
      enable: "Enable",
      disable: "Disable",
      created: "Created",
      userId: "User ID",
      none: "None",
      private: "Private",
      public: "Public",
      optional: "optional",
      days: "days",
      message: "message",
      messages: "messages",
    },
    language: {
      title: "Language",
      description: "Choose the admin panel language. This applies to all admin menus and pages.",
      label: "Admin language",
      english: "English",
      turkish: "Turkish",
    },
    dashboard: {
      title: "Dashboard",
      description: "System overview and statistics",
      totalUsers: "Total Users",
      activeUsers: "Active",
      totalSessions: "Total Sessions",
      avgDuration: "Average duration",
      totalMessages: "Total Messages",
      lastPeriod: "Last {{days}} days",
      dlpViolations: "DLP Violations",
      totalDetected: "Total detected",
      recentUsers: "Recent Users",
      activePolicies: "Active Policies",
    },
    analytics: {
      title: "DLP Analytics",
      description: "User-based DLP violations and session analytics",
    },
    users: {
      title: "User Management",
      description: "View and manage users",
      search: "Search users...",
      addTitle: "Add New User",
      email: "Email",
      username: "Username",
      password: "Password",
      listTitle: "Users",
      failedAttempts: "Failed",
      loadError: "Users could not be loaded",
      createError: "User could not be created",
      deleteConfirm: "Delete user?",
      deleteError: "User could not be deleted",
    },
    sessions: {
      title: "Session Management",
      description: "View and manage all user sessions",
      search: "Search sessions...",
      listTitle: "Sessions",
      untitled: "Untitled Session",
      pinned: "Pinned",
      archived: "Archived",
      loadError: "Sessions could not be loaded",
      archiveError: "Session could not be archived",
      deleteConfirm: "Delete session?",
      deleteError: "Session could not be deleted",
      messagesError: "Messages could not be loaded",
    },
    settings: {
      title: "System Settings",
      description: "Manage system configuration",
      addTitle: "Add New Configuration",
      key: "Key",
      value: "Value",
      descriptionField: "Description",
      descriptionOptional: "Description (optional)",
      public: "Public",
      addConfig: "Add Configuration",
      listTitle: "System Configurations",
      loadError: "Configurations could not be loaded",
      createError: "Configuration could not be added",
      deleteConfirm: "Delete configuration?",
      deleteError: "Configuration could not be deleted",
    },
    keys: {
      title: "API Keys Management",
      description: "Manage LiteLLM API keys, track usage and expiry",
      addTitle: "Add New API Key",
      name: "Key Name",
      keyValue: "API Key Value",
      alias: "Key Alias (optional)",
      maxBudget: "Maximum Budget ($)",
      usageLimit: "Usage Limit",
      expiresAt: "Expiry Date",
      listTitle: "API Keys",
      aliasLabel: "Alias",
      spend: "Spend",
      budget: "Budget",
      usage: "Usage",
      expires: "Expires",
      lastUsed: "Last Used",
      daysLeft: "days left",
      expired: "Expired",
      expiringSoon: "Expiring Soon",
      neverExpires: "Never Expires",
      noLimit: "No Limit",
      unlimited: "Unlimited",
      totalKeys: "Total Keys",
      activeKeys: "Active Keys",
      totalSpend: "Total Spend",
      expiringKeys: "Expiring Soon",
      copyKey: "Copy Key",
      keyCopied: "Key copied!",
      loadError: "Keys could not be loaded",
      addError: "Key could not be added",
      toggleError: "Key status could not be changed",
      deleteConfirm: "Delete key?",
      deleteError: "Key could not be deleted",
    },
    audit: {
      title: "Audit Logs",
      description: "View admin actions and system events",
      listTitle: "Audit Events",
      admin: "Admin",
      loadError: "Audit logs could not be loaded",
    },
  },
  tr: {
    appTitle: "Safe Chat Yönetici",
    nav: {
      dashboard: "Kontrol Paneli",
      analytics: "Analitik",
      users: "Kullanıcılar",
      sessions: "Oturumlar",
      keys: "API Anahtar Yönetimi",
      policies: "DLP Yönetimi",
      config: "Sistem Ayarları",
      audit: "Audit Logları",
      logout: "Çıkış Yap",
    },
    login: {
      title: "Admin Panel",
      description: "Yönetim paneline giriş yapın",
      email: "Email veya kullanıcı adı",
      password: "Parola",
      submit: "Giriş Yap",
      loading: "Giriş yapılıyor...",
      failed: "Giriş başarısız",
    },
    common: {
      refresh: "Yenile",
      add: "Ekle",
      error: "Hata",
      active: "Aktif",
      inactive: "Pasif",
      enable: "Aktifleştir",
      disable: "Pasifleştir",
      created: "Oluşturulma",
      userId: "Kullanıcı ID",
      none: "Yok",
      private: "Özel",
      public: "Herkese Açık",
      optional: "opsiyonel",
      days: "gün",
      message: "mesaj",
      messages: "mesaj",
    },
    language: {
      title: "Dil",
      description: "Admin panel dilini seçin. Bu ayar tüm admin menülerinde ve sayfalarında uygulanır.",
      label: "Admin dili",
      english: "İngilizce",
      turkish: "Türkçe",
    },
    dashboard: {
      title: "Kontrol Paneli",
      description: "Sistem özeti ve istatistikler",
      totalUsers: "Toplam Kullanıcı",
      activeUsers: "Aktif",
      totalSessions: "Toplam Oturum",
      avgDuration: "Ortalama süre",
      totalMessages: "Toplam Mesaj",
      lastPeriod: "Son {{days}} gün",
      dlpViolations: "DLP İhlalleri",
      totalDetected: "Toplam tespit edilen",
      recentUsers: "Son Kullanıcılar",
      activePolicies: "Aktif Politikalar",
    },
    analytics: {
      title: "DLP Analitikleri",
      description: "Kullanıcı bazlı DLP ihlalleri ve oturum analitikleri",
    },
    users: {
      title: "Kullanıcı Yönetimi",
      description: "Kullanıcıları görüntüle ve yönet",
      search: "Kullanıcı ara...",
      addTitle: "Yeni Kullanıcı Ekle",
      email: "Email",
      username: "Kullanıcı Adı",
      password: "Parola",
      listTitle: "Kullanıcılar",
      failedAttempts: "Başarısız",
      loadError: "Kullanıcılar yüklenemedi",
      createError: "Kullanıcı oluşturulamadı",
      deleteConfirm: "Kullanıcı silinsin mi?",
      deleteError: "Kullanıcı silinemedi",
    },
    sessions: {
      title: "Oturum Yönetimi",
      description: "Tüm kullanıcı oturumlarını görüntüle ve yönet",
      search: "Oturum ara...",
      listTitle: "Oturumlar",
      untitled: "Başlıksız Oturum",
      pinned: "Sabitlenmiş",
      archived: "Arşivlenmiş",
      loadError: "Oturumlar yüklenemedi",
      archiveError: "Oturum arşivlenemedi",
      deleteConfirm: "Oturum silinsin mi?",
      deleteError: "Oturum silinemedi",
      messagesError: "Mesajlar yüklenemedi",
    },
    settings: {
      title: "Sistem Ayarları",
      description: "Sistem konfigürasyonlarını yönet",
      addTitle: "Yeni Konfigürasyon Ekle",
      key: "Anahtar",
      value: "Değer",
      descriptionField: "Açıklama",
      descriptionOptional: "Açıklama (opsiyonel)",
      public: "Herkese açık",
      addConfig: "Konfigürasyon Ekle",
      listTitle: "Sistem Konfigürasyonları",
      loadError: "Konfigürasyonlar yüklenemedi",
      createError: "Konfigürasyon eklenemedi",
      deleteConfirm: "Konfigürasyon silinsin mi?",
      deleteError: "Konfigürasyon silinemedi",
    },
    keys: {
      title: "API Anahtar Yönetimi",
      description: "LiteLLM API anahtarlarını yönet, kullanım ve süresi takip et",
      addTitle: "Yeni API Anahtarı Ekle",
      name: "Anahtar Adı",
      keyValue: "API Anahtar Değeri",
      alias: "Anahtar Takma Adı (opsiyonel)",
      maxBudget: "Maksimum Bütçe ($)",
      usageLimit: "Kullanım Limiti",
      expiresAt: "Son Kullanım Tarihi",
      listTitle: "API Anahtarları",
      aliasLabel: "Takma ad",
      spend: "Harcama",
      budget: "Bütçe",
      usage: "Kullanım",
      expires: "Bitiş",
      lastUsed: "Son Kullanım",
      daysLeft: "gün kaldı",
      expired: "Süresi Dolmuş",
      expiringSoon: "Süresi Yakında Dolacak",
      neverExpires: "Süresiz",
      noLimit: "Limitsiz",
      unlimited: "Sınırsız",
      totalKeys: "Toplam Anahtar",
      activeKeys: "Aktif Anahtarlar",
      totalSpend: "Toplam Harcama",
      expiringKeys: "Süresi Yaklaşanlar",
      copyKey: "Anahtarı Kopyala",
      keyCopied: "Anahtar kopyalandı!",
      loadError: "Anahtarlar yüklenemedi",
      addError: "Anahtar eklenemedi",
      toggleError: "Anahtar durumu değiştirilemedi",
      deleteConfirm: "Anahtar silinsin mi?",
      deleteError: "Anahtar silinemedi",
    },
    audit: {
      title: "Audit Logları",
      description: "Admin eylemlerini ve sistem olaylarını görüntüle",
      listTitle: "Audit Olayları",
      admin: "Admin",
      loadError: "Audit logları yüklenemedi",
    },
  },
} as const;

// Enhanced Types
interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  dlp_violation_count: number;
  failed_login_attempts: number;
  locked_until?: string;
  profile_data?: any;
  created_at: string;
  last_login?: string;
}

interface Session {
  id: string;
  user_id: string;
  title: string | null;
  pinned: boolean;
  is_archived: boolean;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

interface Message {
  id: string;
  session_id: string;
  role: string;
  content: string;
  dlp_status?: string;
  dlp_flags?: string[];
  created_at: string;
}

interface DlpPolicy {
  id: string;
  name: string;
  entity_type: string;
  action: string;
  config?: any;
  priority: number;
  description?: string;
  created_by?: string;
  is_active: boolean;
  created_at?: string;
}

interface LiteLLMKey {
  id: string;
  key_value: string;
  key_prefix: string;
  key_name?: string;
  key_alias?: string;
  is_active: boolean;
  expires_at?: string;
  days_until_expiry?: number;
  expiry_status: "active" | "expired" | "expiring_soon";
  max_budget?: number;
  spend: number;
  budget_usage_pct?: number;
  usage_count: number;
  usage_limit?: number;
  last_used_at?: string;
  created_at: string;
  updated_at?: string;
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  data_type: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditEvent {
  id: string;
  admin_user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface Analytics {
  period_days: number;
  total_sessions: number;
  total_messages: number;
  total_dlp_violations: number;
  avg_session_duration: number;
  total_users: number;
  active_users: number;
  user_activity_rate: number;
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  return config;
});

interface AdminProps {
  theme?: "light" | "dark";
  toggleTheme?: () => void;
}

export default function Admin({ theme, toggleTheme }: AdminProps) {
  const locale: AdminLocale = "en";
  const copy = adminCopy.en;
  const dateLocale = "en-US";

  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "users"
    | "sessions"
    | "keys"
    | "policies"
    | "config"
    | "audit"
    | "analytics"
  >("dashboard");
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [keys, setKeys] = useState<LiteLLMKey[]>([]);
  const [policies, setPolicies] = useState<DlpPolicy[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [loginForm, setLoginForm] = useState({
    email_or_username: "",
    password: "",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forms
  const [keyForm, setKeyForm] = useState({
    key_name: "",
    key_value: "",
    key_alias: "",
    max_budget: "",
    usage_limit: "",
    expires_at: "",
  });
  const [policyForm, setPolicyForm] = useState({
    name: "",
    entity_type: "",
    action: "mask",
    config: "",
    priority: "1",
    description: "",
  });
  const [configForm, setConfigForm] = useState({
    key: "",
    value: "",
    data_type: "string",
    description: "",
    is_public: false,
  });

  // Filters and pagination
  const [userFilter, setUserFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // State for error handling
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});

  // Helper function to set loading state
  const setLoadingState = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  // Helper function to set error state
  const setError = (key: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error || '' }));
  };

  // Load functions
  const loadUsers = async () => {
    setLoadingState('users', true);
    setError('users', null);
    try {
      const r = await axiosWithAuth.get(`${API}/admin/users`);
      setUsers(r.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || copy.users.loadError;
      setError('users', errorMsg);
      console.error("Kullanıcılar yüklenemedi:", e);
    } finally {
      setLoadingState('users', false);
    }
  };

  const loadSessions = async () => {
    setLoadingState('sessions', true);
    setError('sessions', null);
    try {
      const r = await axiosWithAuth.get(`${API}/admin/sessions`);
      setSessions(r.data.sessions || []);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || copy.sessions.loadError;
      setError('sessions', errorMsg);
      console.error("Oturumlar yüklenemedi:", e);
    } finally {
      setLoadingState('sessions', false);
    }
  };

  const loadKeys = async () => {
    setLoadingState('keys', true);
    setError('keys', null);
    try {
      const r = await axiosWithAuth.get(`${API}/admin/keys`);
      setKeys(r.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || copy.keys.loadError;
      setError('keys', errorMsg);
      console.error("Anahtarlar yüklenemedi:", e);
    } finally {
      setLoadingState('keys', false);
    }
  };

  const loadPolicies = async () => {
    setLoadingState('policies', true);
    setError('policies', null);
    try {
      const r = await axiosWithAuth.get(`${API}/admin/policies`);
      setPolicies(r.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || "Policies could not be loaded";
      setError('policies', errorMsg);
      console.error("Politikalar yüklenemedi:", e);
    } finally {
      setLoadingState('policies', false);
    }
  };

  const loadConfigs = async () => {
    setLoadingState('configs', true);
    setError('configs', null);
    try {
      const r = await axiosWithAuth.get(`${API}/admin/config`);
      setConfigs(r.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || copy.settings.loadError;
      setError('configs', errorMsg);
      console.error("Konfigürasyonlar yüklenemedi:", e);
    } finally {
      setLoadingState('configs', false);
    }
  };

  const loadAuditEvents = async () => {
    setLoadingState('audit', true);
    setError('audit', null);
    try {
      const r = await axiosWithAuth.get(`${API}/admin/audit`);
      setAuditEvents(r.data.events || []);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || copy.audit.loadError;
      setError('audit', errorMsg);
      console.error("Audit logları yüklenemedi:", e);
    } finally {
      setLoadingState('audit', false);
    }
  };

  const loadAnalytics = async () => {
    setLoadingState('analytics', true);
    setError('analytics', null);
    try {
      const r = await axiosWithAuth.get(`${API}/admin/analytics/overview`);
      setAnalytics(r.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || "Analytics could not be loaded";
      setError('analytics', errorMsg);
      console.error("Analitikler yüklenemedi:", e);
    } finally {
      setLoadingState('analytics', false);
    }
  };

  useEffect(() => {
    const t =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (t) setIsLoggedIn(true);
    localStorage.setItem("admin_language", "en");
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadUsers();
      loadSessions();
      loadKeys();
      loadPolicies();
      loadConfigs();
      loadAuditEvents();
      loadAnalytics();
    }
  }, [isLoggedIn]);

  const doLogin = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`${API}/auth/login`, loginForm);
      localStorage.setItem("auth_token", r.data.access_token);
      setIsLoggedIn(true);
      setLoginForm({ email_or_username: "", password: "" });
    } catch (e) {
      alert(copy.login.failed);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setIsLoggedIn(false);
    setUsers([]);
    setKeys([]);
    setPolicies([]);
    setSessions([]);
    setConfigs([]);
    setAuditEvents([]);
    setAnalytics(null);
  };

  // User management
  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/users`, form);
      setForm({ email: "", username: "", password: "" });
      loadUsers();
    } catch (e) {
      alert(copy.users.createError);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm(copy.users.deleteConfirm)) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/users/${id}`);
      loadUsers();
      loadSessions();
    } catch (e) {
      alert(copy.users.deleteError);
    }
  };

  // Session management
  const archiveSession = async (sessionId: string) => {
    try {
      await axiosWithAuth.patch(`${API}/admin/sessions/${sessionId}`, {
        is_archived: true,
      });
      loadSessions();
    } catch (e) {
      alert(copy.sessions.archiveError);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm(copy.sessions.deleteConfirm)) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/sessions/${sessionId}`);
      loadSessions();
    } catch (e) {
      alert(copy.sessions.deleteError);
    }
  };

  const viewSessionMessages = async (session: Session) => {
    setSelectedSession(session);
    try {
      const r = await axiosWithAuth.get(
        `${API}/admin/users/${session.user_id}/sessions/${session.id}/messages`
      );
      setMessages(r.data);
    } catch (e) {
      console.error(copy.sessions.messagesError, e);
    }
  };

  // Key management
  const addKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        key_value: keyForm.key_value,
        key_name: keyForm.key_name || undefined,
        key_alias: keyForm.key_alias || undefined,
        max_budget: keyForm.max_budget
          ? parseFloat(keyForm.max_budget)
          : undefined,
        usage_limit: keyForm.usage_limit
          ? parseInt(keyForm.usage_limit)
          : undefined,
        expires_at: keyForm.expires_at || undefined,
      };
      await axiosWithAuth.post(`${API}/admin/keys`, payload);
      setKeyForm({ key_name: "", key_value: "", key_alias: "", max_budget: "", usage_limit: "", expires_at: "" });
      loadKeys();
    } catch (e) {
      alert(copy.keys.addError);
    } finally {
      setLoading(false);
    }
  };

  const toggleKey = async (k: LiteLLMKey) => {
    try {
      await axiosWithAuth.patch(`${API}/admin/keys/${k.id}`, {
        is_active: !k.is_active,
      });
      loadKeys();
    } catch (e) {
      alert(copy.keys.toggleError);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm(copy.keys.deleteConfirm)) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/keys/${id}`);
      loadKeys();
    } catch (e) {
      alert(copy.keys.deleteError);
    }
  };

  // Policy management
  const addPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: policyForm.name,
        entity_type: policyForm.entity_type,
        action: policyForm.action,
        config: policyForm.config ? JSON.parse(policyForm.config) : null,
        priority: parseInt(policyForm.priority),
        description: policyForm.description || undefined,
      };
      await axiosWithAuth.post(`${API}/admin/policies`, payload);
      setPolicyForm({
        name: "",
        entity_type: "",
        action: "mask",
        config: "",
        priority: "1",
        description: "",
      });
      loadPolicies();
    } catch (e) {
      alert("Politika eklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const togglePolicy = async (p: DlpPolicy) => {
    try {
      await axiosWithAuth.patch(`${API}/admin/policies/${p.id}`, {
        ...p,
        is_active: !p.is_active,
      });
      loadPolicies();
    } catch (e) {
      alert("Politika durumu değiştirilemedi");
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm("Politika silinsin mi?")) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/policies/${id}`);
      loadPolicies();
    } catch (e) {
      alert("Politika silinemedi");
    }
  };

  // Config management
  const addConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/config`, configForm);
      setConfigForm({
        key: "",
        value: "",
        data_type: "string",
        description: "",
        is_public: false,
      });
      loadConfigs();
    } catch (e) {
      alert(copy.settings.createError);
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm(copy.settings.deleteConfirm)) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/config/${id}`);
      loadConfigs();
    } catch (e) {
      alert(copy.settings.deleteError);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">{copy.login.title}</CardTitle>
            <CardDescription className="text-center">
              {copy.login.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder={copy.login.email}
                value={loginForm.email_or_username}
                onChange={(e) =>
                  setLoginForm({
                    ...loginForm,
                    email_or_username: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder={copy.login.password}
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                onKeyPress={(e) => e.key === "Enter" && doLogin()}
              />
            </div>
            <Button onClick={doLogin} className="w-full" disabled={loading}>
              {loading ? copy.login.loading : copy.login.submit}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">{copy.appTitle}</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              {copy.nav.logout}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("dashboard")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {copy.nav.dashboard}
            </Button>
            <Button
              variant={activeTab === "analytics" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("analytics")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {copy.nav.analytics}
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Users className="h-4 w-4 mr-2" />
              {copy.nav.users}
            </Button>
            <Button
              variant={activeTab === "sessions" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("sessions")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {copy.nav.sessions}
            </Button>
            <Button
              variant={activeTab === "keys" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("keys")}
            >
              <Key className="h-4 w-4 mr-2" />
              {copy.nav.keys}
            </Button>
            <Button
              variant={activeTab === "policies" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("policies")}
            >
              <Shield className="h-4 w-4 mr-2" />
              {copy.nav.policies}
            </Button>
            <Button
              variant={activeTab === "config" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("config")}
            >
              <Settings className="h-4 w-4 mr-2" />
              {copy.nav.config}
            </Button>
            <Button
              variant={activeTab === "audit" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("audit")}
            >
              <Database className="h-4 w-4 mr-2" />
              {copy.nav.audit}
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{copy.dashboard.title}</h2>
                <p className="text-muted-foreground">
                  {copy.dashboard.description}
                </p>
              </div>

              {/* Stats Cards */}
              {analytics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {copy.dashboard.totalUsers}
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_users}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {copy.dashboard.activeUsers}: {analytics.active_users} (%
                        {analytics.user_activity_rate})
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {copy.dashboard.totalSessions}
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_sessions}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {copy.dashboard.avgDuration}: {analytics.avg_session_duration} dk
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {copy.dashboard.totalMessages}
                      </CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_messages}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {copy.dashboard.lastPeriod.replace("{{days}}", String(analytics.period_days))}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {copy.dashboard.dlpViolations}
                      </CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_dlp_violations}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {copy.dashboard.totalDetected}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recent Activity */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{copy.dashboard.recentUsers}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.slice(0, 5).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-4"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {user.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                          <Badge
                            variant={
                              user.dlp_violation_count > 0
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            DLP: {user.dlp_violation_count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{copy.dashboard.activePolicies}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {policies
                        .filter((p) => p.is_active)
                        .slice(0, 5)
                        .map((policy) => (
                          <div
                            key={policy.id}
                            className="flex items-center space-x-4"
                          >
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Shield className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium leading-none">
                                {policy.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {policy.entity_type}
                              </p>
                            </div>
                            <Badge
                              variant={
                                policy.action === "block"
                                  ? "destructive"
                                  : policy.action === "mask"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {policy.action}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {copy.analytics.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {copy.analytics.description}
                  </p>
                </div>
              </div>

              <DLPAnalyticsDashboard locale={locale} />
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {copy.users.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {copy.users.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder={copy.users.search}
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={loadUsers} disabled={loadingStates.users}>
                    <RefreshCw className={`h-4 w-4 ${loadingStates.users ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Error Display */}
              {errors.users && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{copy.common.error}: {errors.users}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add User Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{copy.users.addTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitUser} className="flex gap-4">
                    <Input
                      placeholder={copy.users.email}
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder={copy.users.username}
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder={copy.users.password}
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required
                    />
                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {copy.common.add}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>{copy.users.listTitle} ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users
                      .filter(
                        (u) =>
                          userFilter === "" ||
                          u.username
                            .toLowerCase()
                            .includes(userFilter.toLowerCase()) ||
                          u.email
                            .toLowerCase()
                            .includes(userFilter.toLowerCase())
                      )
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.username}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                {(user.roles || []).map((role) => (
                                  <Badge key={role} variant="outline">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                user.dlp_violation_count > 0
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              DLP: {user.dlp_violation_count}
                            </Badge>
                            {user.failed_login_attempts > 0 && (
                              <Badge variant="destructive">
                                {copy.users.failedAttempts}: {user.failed_login_attempts}
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {copy.sessions.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {copy.sessions.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder={copy.sessions.search}
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={loadSessions} disabled={loadingStates.sessions}>
                    <RefreshCw className={`h-4 w-4 ${loadingStates.sessions ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Error Display */}
              {errors.sessions && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{copy.common.error}: {errors.sessions}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sessions List */}
              <Card>
                <CardHeader>
                  <CardTitle>{copy.sessions.listTitle} ({sessions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sessions
                      .filter((session) =>
                        (session.title || "")
                          .toLowerCase()
                          .includes(sessionFilter.toLowerCase())
                      )
                      .map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{session.title || copy.sessions.untitled}</p>
                              <p className="text-sm text-muted-foreground">
                                {copy.common.userId}: {session.user_id}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {copy.common.created}:{" "}
                                {new Date(session.created_at).toLocaleDateString(
                                  dateLocale
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {session.pinned && (
                              <Badge variant="outline">{copy.sessions.pinned}</Badge>
                            )}
                            {session.is_archived && (
                              <Badge variant="secondary">{copy.sessions.archived}</Badge>
                            )}
                            {session.tags && session.tags.length > 0 && (
                              <Badge variant="outline">
                                <Tag className="h-3 w-3 mr-1" />
                                {session.tags.length}
                              </Badge>
                            )}
                            <Button
                               variant="outline"
                               size="sm"
                               onClick={() => viewSessionMessages(session)}
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => archiveSession(session.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteSession(session.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "policies" && (
            <DLPDashboard locale={locale} />
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {copy.settings.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {copy.settings.description}
                  </p>
                </div>
                <Button onClick={loadConfigs} disabled={loadingStates.configs}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStates.configs ? 'animate-spin' : ''}`} />
                  {copy.common.refresh}
                </Button>
              </div>

              {/* Error Display */}
              {errors.configs && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{copy.common.error}: {errors.configs}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Config Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{copy.settings.addTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addConfig} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        placeholder={copy.settings.key}
                        value={configForm.key}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, key: e.target.value })
                        }
                        required
                      />
                      <Input
                        placeholder={copy.settings.value}
                        value={configForm.value}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            value: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={configForm.data_type}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            data_type: e.target.value,
                          })
                        }
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="json">JSON</option>
                      </select>
                      <Input
                        placeholder={copy.settings.descriptionOptional}
                        value={configForm.description}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            description: e.target.value,
                          })
                        }
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_public"
                          checked={configForm.is_public}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              is_public: e.target.checked,
                            })
                          }
                        />
                        <label htmlFor="is_public" className="text-sm">
                          {copy.settings.public}
                        </label>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {copy.settings.addConfig}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Configs List */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {copy.settings.listTitle} ({configs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {configs.map((config) => (
                      <div
                        key={config.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Settings className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{config.key}</p>
                            <p className="text-sm text-muted-foreground">
                              {config.value} ({config.data_type})
                            </p>
                            {config.description && (
                              <p className="text-xs text-muted-foreground">
                                {config.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={config.is_public ? "default" : "secondary"}
                          >
                            {config.is_public ? copy.common.public : copy.common.private}
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteConfig(config.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "keys" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {copy.keys.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {copy.keys.description}
                  </p>
                </div>
                <Button onClick={loadKeys} disabled={loadingStates.keys}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStates.keys ? 'animate-spin' : ''}`} />
                  {copy.common.refresh}
                </Button>
              </div>

              {/* Error Display */}
              {errors.keys && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{copy.common.error}: {errors.keys}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{copy.keys.totalKeys}</CardTitle>
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{keys.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{copy.keys.activeKeys}</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {keys.filter(k => k.is_active && k.expiry_status !== "expired").length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{copy.keys.totalSpend}</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${keys.reduce((sum, k) => sum + (k.spend || 0), 0).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{copy.keys.expiringKeys}</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {keys.filter(k => k.expiry_status === "expiring_soon").length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Add Key Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{copy.keys.addTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addKey} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        placeholder={copy.keys.name}
                        value={keyForm.key_name}
                        onChange={(e) =>
                          setKeyForm({ ...keyForm, key_name: e.target.value })
                        }
                      />
                      <Input
                        placeholder={copy.keys.keyValue}
                        value={keyForm.key_value}
                        onChange={(e) =>
                          setKeyForm({ ...keyForm, key_value: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <Input
                        placeholder={copy.keys.alias}
                        value={keyForm.key_alias}
                        onChange={(e) =>
                          setKeyForm({ ...keyForm, key_alias: e.target.value })
                        }
                      />
                      <Input
                        placeholder={copy.keys.maxBudget}
                        type="number"
                        step="0.01"
                        min="0"
                        value={keyForm.max_budget}
                        onChange={(e) =>
                          setKeyForm({ ...keyForm, max_budget: e.target.value })
                        }
                      />
                      <Input
                        placeholder={copy.keys.usageLimit}
                        type="number"
                        min="0"
                        value={keyForm.usage_limit}
                        onChange={(e) =>
                          setKeyForm({ ...keyForm, usage_limit: e.target.value })
                        }
                      />
                      <Input
                        placeholder={copy.keys.expiresAt}
                        type="datetime-local"
                        value={keyForm.expires_at}
                        onChange={(e) =>
                          setKeyForm({ ...keyForm, expires_at: e.target.value })
                        }
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {copy.common.add}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Keys List */}
              <Card>
                <CardHeader>
                  <CardTitle>{copy.keys.listTitle} ({keys.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {keys.map((key) => (
                      <div
                        key={key.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          key.expiry_status === "expired"
                            ? "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                            : key.expiry_status === "expiring_soon"
                            ? "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {/* Row 1: Name, Alias, Status, Actions */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              key.expiry_status === "expired"
                                ? "bg-red-100 dark:bg-red-900/30"
                                : key.expiry_status === "expiring_soon"
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : "bg-primary/10"
                            }`}>
                              <Key className={`h-5 w-5 ${
                                key.expiry_status === "expired"
                                  ? "text-red-500"
                                  : key.expiry_status === "expiring_soon"
                                  ? "text-yellow-500"
                                  : "text-primary"
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold">{key.key_name || "Unnamed Key"}</p>
                                {key.key_alias && (
                                  <Badge variant="outline" className="text-xs">
                                    {key.key_alias}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                  {key.key_prefix}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(key.key_value);
                                  }}
                                  title={copy.keys.copyKey}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Status Badge */}
                            {key.expiry_status === "expired" ? (
                              <Badge variant="destructive">{copy.keys.expired}</Badge>
                            ) : key.expiry_status === "expiring_soon" ? (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                                {copy.keys.expiringSoon}
                              </Badge>
                            ) : null}
                            <Badge
                              variant={key.is_active ? "default" : "secondary"}
                            >
                              {key.is_active ? copy.common.active : copy.common.inactive}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleKey(key)}
                            >
                              {key.is_active ? copy.common.disable : copy.common.enable}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteKey(key.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Row 2: Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          {/* Budget/Spend */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">
                              {copy.keys.spend} / {copy.keys.budget}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                ${(key.spend || 0).toFixed(2)}
                              </span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-muted-foreground">
                                {key.max_budget ? `$${key.max_budget.toFixed(2)}` : copy.keys.unlimited}
                              </span>
                            </div>
                            {key.max_budget && key.max_budget > 0 && (
                              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    (key.budget_usage_pct || 0) >= 90
                                      ? "bg-red-500"
                                      : (key.budget_usage_pct || 0) >= 70
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{ width: `${Math.min(key.budget_usage_pct || 0, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Usage */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">{copy.keys.usage}</p>
                            <span className="font-medium">
                              {key.usage_count}
                              {key.usage_limit ? ` / ${key.usage_limit}` : ""}
                            </span>
                            {!key.usage_limit && (
                              <span className="text-xs text-muted-foreground ml-1">({copy.keys.noLimit})</span>
                            )}
                          </div>

                          {/* Expiry */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">{copy.keys.expires}</p>
                            {key.expires_at ? (
                              <div>
                                <span className={`font-medium ${
                                  key.expiry_status === "expired"
                                    ? "text-red-600"
                                    : key.expiry_status === "expiring_soon"
                                    ? "text-yellow-600"
                                    : ""
                                }`}>
                                  {new Date(key.expires_at).toLocaleDateString(dateLocale)}
                                </span>
                                {key.days_until_expiry !== null && key.days_until_expiry !== undefined && key.days_until_expiry > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({key.days_until_expiry} {copy.keys.daysLeft})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">{copy.keys.neverExpires}</span>
                            )}
                          </div>

                          {/* Last Used */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">{copy.keys.lastUsed}</p>
                            <span className="font-medium">
                              {key.last_used_at
                                ? new Date(key.last_used_at).toLocaleDateString(dateLocale)
                                : "—"}
                            </span>
                          </div>

                          {/* Created */}
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">{copy.common.created}</p>
                            <span className="font-medium">
                              {new Date(key.created_at).toLocaleDateString(dateLocale)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {keys.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No API keys found</p>
                        <p className="text-sm">Add a new key to get started</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {copy.audit.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {copy.audit.description}
                  </p>
                </div>
                <Button onClick={loadAuditEvents} disabled={loadingStates.audit}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStates.audit ? 'animate-spin' : ''}`} />
                  {copy.common.refresh}
                </Button>
              </div>

              {/* Error Display */}
              {errors.audit && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{copy.common.error}: {errors.audit}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>{copy.audit.listTitle} ({auditEvents.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {auditEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Database className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{event.action}</p>
                            <p className="text-sm text-muted-foreground">
                              {event.resource_type} • {copy.audit.admin}:{" "}
                              {event.admin_user_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString(
                                dateLocale
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {event.ip_address && (
                            <Badge variant="outline">{event.ip_address}</Badge>
                          )}
                          <Badge variant="secondary">
                            {event.resource_type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
