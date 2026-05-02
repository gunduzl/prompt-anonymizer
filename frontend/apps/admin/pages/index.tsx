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
} from "lucide-react";
import axios from "axios";
import DLPDashboard from "../components/dlp/DLPDashboard";
import DLPAnalyticsDashboard from "../components/DLPAnalyticsDashboard";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

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
  key_name: string;
  key_alias?: string;
  spend?: number;
  max_budget?: number;
  is_active: boolean;
  created_at: string;
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
    key_alias: "",
    max_budget: "",
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
      const errorMsg = e.response?.data?.detail || e.message || "Kullanıcılar yüklenemedi";
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
      const errorMsg = e.response?.data?.detail || e.message || "Oturumlar yüklenemedi";
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
      const errorMsg = e.response?.data?.detail || e.message || "Anahtarlar yüklenemedi";
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
      const errorMsg = e.response?.data?.detail || e.message || "Politikalar yüklenemedi";
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
      const errorMsg = e.response?.data?.detail || e.message || "Konfigürasyonlar yüklenemedi";
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
      const errorMsg = e.response?.data?.detail || e.message || "Audit logları yüklenemedi";
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
      const errorMsg = e.response?.data?.detail || e.message || "Analitikler yüklenemedi";
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
      alert("Giriş başarısız");
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
      alert("Kullanıcı oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Kullanıcı silinsin mi?")) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/users/${id}`);
      loadUsers();
      loadSessions();
    } catch (e) {
      alert("Kullanıcı silinemedi");
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
      alert("Oturum arşivlenemedi");
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm("Oturum silinsin mi?")) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/sessions/${sessionId}`);
      loadSessions();
    } catch (e) {
      alert("Oturum silinemedi");
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
      console.error("Mesajlar yüklenemedi:", e);
    }
  };

  // Key management
  const addKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        key_name: keyForm.key_name,
        key_alias: keyForm.key_alias || undefined,
        max_budget: keyForm.max_budget
          ? parseFloat(keyForm.max_budget)
          : undefined,
      };
      await axiosWithAuth.post(`${API}/admin/keys`, payload);
      setKeyForm({ key_name: "", key_alias: "", max_budget: "" });
      loadKeys();
    } catch (e) {
      alert("Anahtar eklenemedi");
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
      alert("Anahtar durumu değiştirilemedi");
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Anahtar silinsin mi?")) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/keys/${id}`);
      loadKeys();
    } catch (e) {
      alert("Anahtar silinemedi");
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
      alert("Konfigürasyon eklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm("Konfigürasyon silinsin mi?")) return;
    try {
      await axiosWithAuth.delete(`${API}/admin/config/${id}`);
      loadConfigs();
    } catch (e) {
      alert("Konfigürasyon silinemedi");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Admin Panel</CardTitle>
            <CardDescription className="text-center">
              Yönetim paneline giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Email veya Kullanıcı Adı"
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
                placeholder="Parola"
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                onKeyPress={(e) => e.key === "Enter" && doLogin()}
              />
            </div>
            <Button onClick={doLogin} className="w-full" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
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
            <h1 className="text-xl font-semibold">Safe Chat Admin</h1>
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
              Logout
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
              Dashboard
            </Button>
            <Button
              variant={activeTab === "analytics" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("analytics")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
            <Button
              variant={activeTab === "sessions" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("sessions")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Sessions
            </Button>
            <Button
              variant={activeTab === "keys" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("keys")}
            >
              <Key className="h-4 w-4 mr-2" />
              API Keys
            </Button>
            <Button
              variant={activeTab === "policies" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("policies")}
            >
              <Shield className="h-4 w-4 mr-2" />
              DLP Management
            </Button>
            <Button
              variant={activeTab === "config" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("config")}
            >
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>
            <Button
              variant={activeTab === "audit" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("audit")}
            >
              <Database className="h-4 w-4 mr-2" />
              Audit Logs
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">
                  System overview and statistics
                </p>
              </div>

              {/* Stats Cards */}
              {analytics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Toplam Kullanıcı
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_users}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aktif: {analytics.active_users} (%
                        {analytics.user_activity_rate})
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Toplam Oturum
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_sessions}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ortalama süre: {analytics.avg_session_duration} dk
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Toplam Mesaj
                      </CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_messages}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Son {analytics.period_days} gün
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        DLP İhlalleri
                      </CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.total_dlp_violations}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Toplam tespit edilen
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recent Activity */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Son Kullanıcılar</CardTitle>
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
                    <CardTitle>Aktif Politikalar</CardTitle>
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
                    DLP Analitikleri
                  </h2>
                  <p className="text-muted-foreground">
                    Kullanıcı bazlı DLP ihlalleri ve session analitikleri
                  </p>
                </div>
              </div>

              <DLPAnalyticsDashboard />
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    Kullanıcı Yönetimi
                  </h2>
                  <p className="text-muted-foreground">
                    Kullanıcıları görüntüle ve yönet
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Kullanıcı ara..."
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
                      <span className="text-sm font-medium">Hata: {errors.users}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add User Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Yeni Kullanıcı Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitUser} className="flex gap-4">
                    <Input
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Kullanıcı Adı"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Parola"
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required
                    />
                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ekle
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>Kullanıcılar ({users.length})</CardTitle>
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
                                Başarısız: {user.failed_login_attempts}
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
                    Oturum Yönetimi
                  </h2>
                  <p className="text-muted-foreground">
                    Tüm kullanıcı oturumlarını görüntüle ve yönet
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Oturum ara..."
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
                      <span className="text-sm font-medium">Hata: {errors.sessions}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sessions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Oturumlar ({sessions.length})</CardTitle>
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
                              <p className="font-medium">{session.title || "Başlıksız Oturum"}</p>
                              <p className="text-sm text-muted-foreground">
                                Kullanıcı ID: {session.user_id}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Oluşturulma:{" "}
                                {new Date(session.created_at).toLocaleDateString(
                                  "tr-TR"
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {session.pinned && (
                              <Badge variant="outline">Sabitlenmiş</Badge>
                            )}
                            {session.is_archived && (
                              <Badge variant="secondary">Arşivlenmiş</Badge>
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
            <DLPDashboard />
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    Sistem Ayarları
                  </h2>
                  <p className="text-muted-foreground">
                    Sistem konfigürasyonlarını yönet
                  </p>
                </div>
                <Button onClick={loadConfigs} disabled={loadingStates.configs}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStates.configs ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
              </div>

              {/* Error Display */}
              {errors.configs && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Hata: {errors.configs}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Config Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Yeni Konfigürasyon Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addConfig} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        placeholder="Anahtar"
                        value={configForm.key}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, key: e.target.value })
                        }
                        required
                      />
                      <Input
                        placeholder="Değer"
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
                        placeholder="Açıklama (opsiyonel)"
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
                          Herkese açık
                        </label>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      Konfigürasyon Ekle
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Configs List */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Sistem Konfigürasyonları ({configs.length})
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
                            {config.is_public ? "Herkese Açık" : "Özel"}
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
                    API Anahtar Yönetimi
                  </h2>
                  <p className="text-muted-foreground">
                    LiteLLM API anahtarlarını yönet
                  </p>
                </div>
                <Button onClick={loadKeys} disabled={loadingStates.keys}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStates.keys ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
              </div>

              {/* Error Display */}
              {errors.keys && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Hata: {errors.keys}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Key Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Yeni API Anahtarı Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addKey} className="flex gap-4">
                    <Input
                      placeholder="Anahtar Adı"
                      value={keyForm.key_name}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, key_name: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Anahtar Takma Adı (opsiyonel)"
                      value={keyForm.key_alias}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, key_alias: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Maksimum Bütçe (opsiyonel)"
                      type="number"
                      value={keyForm.max_budget}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, max_budget: e.target.value })
                      }
                    />
                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ekle
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Keys List */}
              <Card>
                <CardHeader>
                  <CardTitle>API Anahtarları ({keys.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {keys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Key className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{key.key_name}</p>
                            {key.key_alias && (
                              <p className="text-sm text-muted-foreground">
                                Takma ad: {key.key_alias}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Oluşturulma:{" "}
                              {new Date(key.created_at).toLocaleDateString(
                                "tr-TR"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {key.spend !== undefined && (
                            <Badge variant="outline">
                              Harcama: ${key.spend.toFixed(2)}
                            </Badge>
                          )}
                          {key.max_budget !== undefined && (
                            <Badge variant="outline">
                              Bütçe: ${key.max_budget.toFixed(2)}
                            </Badge>
                          )}
                          <Badge
                            variant={key.is_active ? "default" : "secondary"}
                          >
                            {key.is_active ? "Aktif" : "Pasif"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleKey(key)}
                          >
                            {key.is_active ? "Pasifleştir" : "Aktifleştir"}
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
                    ))}
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
                    Audit Logları
                  </h2>
                  <p className="text-muted-foreground">
                    Admin eylemlerini ve sistem olaylarını görüntüle
                  </p>
                </div>
                <Button onClick={loadAuditEvents} disabled={loadingStates.auditEvents}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingStates.auditEvents ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
              </div>

              {/* Error Display */}
              {errors.auditEvents && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Hata: {errors.auditEvents}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Audit Olayları ({auditEvents.length})</CardTitle>
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
                              {event.resource_type} • Admin:{" "}
                              {event.admin_user_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString(
                                "tr-TR"
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
