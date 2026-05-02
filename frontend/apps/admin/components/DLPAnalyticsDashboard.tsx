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
  Shield,
  Activity,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
} from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

interface UserAnalytics {
  user_id: string;
  username: string;
  email: string;
  total_violations: number;
  total_sessions: number;
  recent_sessions: number;
  recent_violations: number;
  blocked_messages: number;
  masked_messages: number;
  last_activity: string | null;
}

interface SessionAnalytics {
  session_id: string;
  title: string;
  user_id: string;
  username: string;
  created_at: string;
  message_count: number;
  dlp_violations: number;
  blocked_count: number;
  masked_count: number;
  last_message_at: string | null;
}

interface DLPTrends {
  violations_by_day: Array<{ date: string; violations: number }>;
  violations_by_type: Array<{ type: string; count: number }>;
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  return config;
});

export default function DLPAnalyticsDashboard() {
  const [userAnalytics, setUserAnalytics] = useState<{
    users: UserAnalytics[];
    active_sessions: number;
    period_days: number;
  } | null>(null);
  const [sessionAnalytics, setSessionAnalytics] = useState<{
    sessions: SessionAnalytics[];
    period_days: number;
  } | null>(null);
  const [dlpTrends, setDlpTrends] = useState<DLPTrends | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [userFilter, setUserFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadUserAnalytics = async () => {
    try {
      const response = await axiosWithAuth.get(
        `${API}/admin/analytics/users?days=${selectedPeriod}&limit=50`
      );
      setUserAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load user analytics:", error);
    }
  };

  const loadSessionAnalytics = async () => {
    try {
      const url = selectedUserId
        ? `${API}/admin/analytics/sessions?days=${selectedPeriod}&user_id=${selectedUserId}`
        : `${API}/admin/analytics/sessions?days=${selectedPeriod}`;
      const response = await axiosWithAuth.get(url);
      setSessionAnalytics(response.data);
    } catch (error) {
      console.error("Failed to load session analytics:", error);
    }
  };

  const loadDLPTrends = async () => {
    try {
      const response = await axiosWithAuth.get(
        `${API}/admin/analytics/dlp-trends?days=${selectedPeriod}`
      );
      setDlpTrends(response.data);
    } catch (error) {
      console.error("Failed to load DLP trends:", error);
    }
  };

  const loadAllAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserAnalytics(),
        loadSessionAnalytics(),
        loadDLPTrends(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [selectedPeriod, selectedUserId]);

  const filteredUsers = userAnalytics?.users.filter(
    (user) =>
      user.username.toLowerCase().includes(userFilter.toLowerCase()) ||
      user.email.toLowerCase().includes(userFilter.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Hiç";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
          {selectedUserId && (
            <Button
              variant="outline"
              onClick={() => setSelectedUserId(null)}
              size="sm"
            >
              Tüm Kullanıcılar
            </Button>
          )}
        </div>
        <Button onClick={loadAllAnalytics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Summary Cards */}
      {userAnalytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Oturumlar</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {userAnalytics.active_sessions}
              </div>
              <p className="text-xs text-muted-foreground">Son 24 saat</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam İhlaller</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {userAnalytics.users.reduce((sum, user) => sum + user.recent_violations, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Son {selectedPeriod} gün</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engellenen Mesajlar</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {userAnalytics.users.reduce((sum, user) => sum + user.blocked_messages, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Son {selectedPeriod} gün</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maskelenen Mesajlar</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {userAnalytics.users.reduce((sum, user) => sum + user.masked_messages, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Son {selectedPeriod} gün</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Analytics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kullanıcı Bazlı DLP İstatistikleri</CardTitle>
              <CardDescription>
                Kullanıcıların DLP ihlal sayıları ve session aktiviteleri
              </CardDescription>
            </div>
            <Input
              placeholder="Kullanıcı ara..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Kullanıcı</th>
                  <th className="text-left p-2">Toplam İhlal</th>
                  <th className="text-left p-2">Son İhlaller</th>
                  <th className="text-left p-2">Engellenen</th>
                  <th className="text-left p-2">Maskelenen</th>
                  <th className="text-left p-2">Oturumlar</th>
                  <th className="text-left p-2">Son Aktivite</th>
                  <th className="text-left p-2">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers?.map((user) => (
                  <tr key={user.user_id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant={user.total_violations > 10 ? "destructive" : "secondary"}>
                        {user.total_violations}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge variant={user.recent_violations > 5 ? "destructive" : "outline"}>
                        {user.recent_violations}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <span className="text-red-600 font-medium">{user.blocked_messages}</span>
                    </td>
                    <td className="p-2">
                      <span className="text-orange-600 font-medium">{user.masked_messages}</span>
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        <div>{user.total_sessions} toplam</div>
                        <div className="text-muted-foreground">{user.recent_sessions} son dönem</div>
                      </div>
                    </td>
                    <td className="p-2 text-sm">{formatDate(user.last_activity)}</td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserId(user.user_id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Session Analytics */}
      {sessionAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedUserId ? "Kullanıcı Oturumları" : "DLP İhlalli Oturumlar"}
            </CardTitle>
            <CardDescription>
              DLP ihlali içeren oturumların detaylı analizi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Oturum</th>
                    <th className="text-left p-2">Kullanıcı</th>
                    <th className="text-left p-2">Mesaj Sayısı</th>
                    <th className="text-left p-2">DLP İhlalleri</th>
                    <th className="text-left p-2">Engellenen</th>
                    <th className="text-left p-2">Maskelenen</th>
                    <th className="text-left p-2">Son Mesaj</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionAnalytics.sessions
                    .filter((session) => session.dlp_violations > 0)
                    .slice(0, 20)
                    .map((session) => (
                      <tr key={session.session_id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="font-medium truncate max-w-48">
                            {session.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(session.created_at)}
                          </div>
                        </td>
                        <td className="p-2 text-sm">{session.username}</td>
                        <td className="p-2">{session.message_count}</td>
                        <td className="p-2">
                          <Badge variant="destructive">{session.dlp_violations}</Badge>
                        </td>
                        <td className="p-2">
                          <span className="text-red-600">{session.blocked_count}</span>
                        </td>
                        <td className="p-2">
                          <span className="text-orange-600">{session.masked_count}</span>
                        </td>
                        <td className="p-2 text-sm">{formatDate(session.last_message_at)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DLP Trends */}
      {dlpTrends && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Günlük İhlal Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dlpTrends.violations_by_day.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm">{day.date}</span>
                    <div className="flex items-center space-x-2">
                      <div
                        className="bg-red-500 h-2 rounded"
                        style={{
                          width: `${Math.max(4, (day.violations / Math.max(...dlpTrends.violations_by_day.map(d => d.violations))) * 100)}px`
                        }}
                      />
                      <span className="text-sm font-medium">{day.violations}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İhlal Türleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dlpTrends.violations_by_type.map((type) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {type.type === "blocked" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="capitalize">{type.type}</span>
                    </div>
                    <Badge variant={type.type === "blocked" ? "destructive" : "secondary"}>
                      {type.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}