import { useEffect, useState } from "react";
import axios from "axios";
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Key, 
  Database, 
  FileText, 
  Activity,
  Moon,
  Sun,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  Archive,
  Search,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

// Type definitions
interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  auth_type: string;
  is_active: boolean;
  dlp_violation_count: number;
  failed_login_attempts: number;
  locked_until?: string;
  profile_data?: any;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  user_id: string;
  title?: string;
  pinned: boolean;
  is_archived: boolean;
  tags?: string[];
  session_metadata?: any;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  session_id: string;
  user_id: string;
  role: string;
  content: string;
  pii_flags?: any;
  dlp_status?: string;
  created_at: string;
}

interface DlpPolicy {
  id: string;
  name: string;
  entity_type: string;
  action: string;
  config_json?: any;
  is_active: boolean;
  priority: number;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface LiteLLMKey {
  id: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SystemConfig {
  id: string;
  key: string;
  value?: string;
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

// Axios instance with auth
const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function AdminPanel() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(false);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [keys, setKeys] = useState<LiteLLMKey[]>([]);
  const [policies, setPolicies] = useState<DlpPolicy[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Form states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);

  // Load functions
  const loadUsers = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/users`);
      setUsers(response.data || []);
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/sessions`);
      setSessions(response.data || []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setSessions([]);
    }
  };

  const loadKeys = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/keys`);
      setKeys(response.data || []);
    } catch (error) {
      console.error("Failed to load keys:", error);
      setKeys([]);
    }
  };

  const loadPolicies = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/policies`);
      setPolicies(response.data || []);
    } catch (error) {
      console.error("Failed to load policies:", error);
      setPolicies([]);
    }
  };

  const loadConfigs = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/system-config`);
      setConfigs(response.data || []);
    } catch (error) {
      console.error("Failed to load configs:", error);
      setConfigs([]);
    }
  };

  const loadAuditEvents = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/audit-events`);
      setAuditEvents(response.data || []);
    } catch (error) {
      console.error("Failed to load audit events:", error);
      setAuditEvents([]);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/analytics/overview`);
      setAnalytics(response.data || null);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setAnalytics(null);
    }
  };

  // Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username: loginForm.username,
        password: loginForm.password,
      });

      const { access_token, user } = response.data;
      
      // Check if user has admin role
      if (!user.roles?.some((role: any) => role.name === "admin")) {
        setLoginError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }

      localStorage.setItem("admin_token", access_token);
      localStorage.setItem("admin_user", JSON.stringify(user));
      setIsAuthenticated(true);
      
      // Load initial data
      await Promise.all([
        loadUsers(),
        loadSessions(),
        loadKeys(),
        loadPolicies(),
        loadConfigs(),
        loadAuditEvents(),
        loadAnalytics()
      ]);
    } catch (error: any) {
      setLoginError(error.response?.data?.detail || error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setIsAuthenticated(false);
    setActiveTab("dashboard");
  };

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      setIsAuthenticated(true);
      // Load initial data
      Promise.all([
        loadUsers(),
        loadSessions(),
        loadKeys(),
        loadPolicies(),
        loadConfigs(),
        loadAuditEvents(),
        loadAnalytics()
      ]);
    }
  }, []);

  // CRUD Operations
  const createUser = async (userData: Partial<User>) => {
    try {
      await axiosWithAuth.post(`${API}/admin/users`, userData);
      await loadUsers();
      setShowUserForm(false);
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  const updateUser = async (userId: string, userData: Partial<User>) => {
    try {
      await axiosWithAuth.put(`${API}/admin/users/${userId}`, userData);
      await loadUsers();
      setSelectedUser(null);
      setShowUserForm(false);
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await axiosWithAuth.delete(`${API}/admin/users/${userId}`);
        await loadUsers();
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const archiveSession = async (sessionId: string) => {
    try {
      await axiosWithAuth.put(`${API}/admin/sessions/${sessionId}`, { is_archived: true });
      await loadSessions();
    } catch (error) {
      console.error("Failed to archive session:", error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      try {
        await axiosWithAuth.delete(`${API}/admin/sessions/${sessionId}`);
        await loadSessions();
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    }
  };

  const viewSessionMessages = async (sessionId: string) => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/sessions/${sessionId}/messages`);
      setSessionMessages(response.data);
      setSelectedSession(sessions.find(s => s.id === sessionId) || null);
    } catch (error) {
      console.error("Failed to load session messages:", error);
    }
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600">Sign in to access admin features</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              {loginError && (
                <div className="text-red-600 text-sm text-center">{String(loginError)}</div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main admin interface
  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Panel</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white dark:bg-gray-800 shadow-sm h-screen sticky top-0">
          <div className="p-4 space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "users", label: "Users", icon: Users },
              { id: "sessions", label: "Sessions", icon: Activity },
              { id: "keys", label: "API Keys", icon: Key },
              { id: "policies", label: "DLP Policies", icon: Shield },
              { id: "config", label: "System Config", icon: Settings },
              { id: "audit", label: "Audit Logs", icon: FileText },
              { id: "analytics", label: "Analytics", icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                }`}
              >
                <tab.icon className="mr-3 h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
              
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.total_users}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Activity className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.total_sessions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Shield className="h-8 w-8 text-red-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">DLP Violations</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.total_dlp_violations}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Database className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Messages</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.total_messages}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Users</h3>
                    <div className="space-y-3">
                      {users.length > 0 ? users.slice(0, 5).map((user) => (
                          <div key={user.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{user.display_name || user.username}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )) : (
                          <p className="text-gray-500 dark:text-gray-400">No users found</p>
                        )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Policies</h3>
                    <div className="space-y-3">
                      {policies.length > 0 ? policies.filter(p => p.is_active).slice(0, 5).map((policy) => (
                          <div key={policy.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{policy.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{policy.entity_type} - {policy.action}</p>
                            </div>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Priority {policy.priority}
                            </span>
                          </div>
                        )) : (
                          <p className="text-gray-500 dark:text-gray-400">No active policies found</p>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
                <Button onClick={() => setShowUserForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DLP Violations</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.length > 0 ? users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.display_name || user.username}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {user.dlp_violation_count || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setSelectedUser(user);
                                setShowUserForm(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteUser(user.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              No users found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h2>

              <Card>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Session</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sessions.length > 0 ? sessions.map((session) => (
                          <tr key={session.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {session.title || `Session ${session.id.slice(0, 8)}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {session.user_id.slice(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                session.is_archived ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {session.is_archived ? 'Archived' : 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => viewSessionMessages(session.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => archiveSession(session.id)}>
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteSession(session.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              No sessions found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add other tab content here... */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 dark:text-gray-400">Analytics dashboard coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "keys" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h2>
                <Button onClick={() => setShowKeyForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Key
                </Button>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Key</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {keys.length > 0 ? keys.map((key) => (
                          <tr key={key.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                Key {key.id.slice(0, 8)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {key.key_value ? key.key_value.slice(0, 8) + '...' : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                key.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {key.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {key.created_at ? new Date(key.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => {
                                // Handle edit key
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                // Handle delete key
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              No API keys found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "policies" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">DLP Policies</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 dark:text-gray-400">DLP policy management coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 dark:text-gray-400">System configuration coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Resource</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">IP Address</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {auditEvents.length > 0 ? auditEvents.map((event) => (
                          <tr key={event.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {event.action || 'Unknown Action'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {event.admin_user_id ? event.admin_user_id.slice(0, 8) + '...' : 'System'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {event.resource_type || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {event.ip_address || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {event.created_at ? new Date(event.created_at).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                              No audit events found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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