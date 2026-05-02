import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  Shield,
  Users,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Database,
  FileText,
  Zap,
} from "lucide-react";
import EntityManager from "./EntityManager";
import PolicyManager from "./PolicyManager";
import UserExceptions from "./UserExceptions";
import DragDropPolicyManager from "./DragDropPolicyManager";
import RuleSetManager from "./RuleSetManager";
import DlpPolicyIntegration from "./DlpPolicyIntegration";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

interface DLPStats {
  total_policies: number;
  active_policies: number;
  total_entities: number;
  custom_entities: number;
  total_exceptions: number;
  active_exceptions: number;
  recent_violations: number;
  blocked_messages: number;
  masked_messages: number;
}

interface RecentActivity {
  id: string;
  type: "policy_created" | "policy_updated" | "exception_added" | "violation_detected";
  description: string;
  user: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function DLPDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "current-rules" | "policies" | "advanced-policies" | "rule-sets" | "entities" | "exceptions">("overview");
  const [stats, setStats] = useState<DLPStats>({
    total_policies: 0,
    active_policies: 0,
    total_entities: 0,
    custom_entities: 0,
    total_exceptions: 0,
    active_exceptions: 0,
    recent_violations: 0,
    blocked_messages: 0,
    masked_messages: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await axiosWithAuth.get(`${API}/admin/dlp/stats`);
      const data = response.data;
      
      // Map backend response to frontend interface
      const mappedStats: DLPStats = {
        total_policies: data.policies?.total || 0,
        active_policies: data.policies?.active || 0,
        total_entities: data.entities?.total || 0,
        custom_entities: data.entities?.custom || 0,
        total_exceptions: 0, // Not provided by backend yet
        active_exceptions: 0, // Not provided by backend yet
        recent_violations: data.activity?.today?.total || 0,
        blocked_messages: data.activity?.today?.blocked || 0,
        masked_messages: data.activity?.today?.masked || 0,
      };
      
      setStats(mappedStats);
    } catch (error) {
      console.error("Error loading DLP stats:", error);
      // Mock data for demo
      setStats({
        total_policies: 12,
        active_policies: 10,
        total_entities: 15,
        custom_entities: 3,
        total_exceptions: 5,
        active_exceptions: 4,
        recent_violations: 23,
        blocked_messages: 45,
        masked_messages: 128,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/dlp/activity?limit=10`);
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error("Error loading recent activity:", error);
      setRecentActivity([]); // Ensure recentActivity is always an array
      // Mock data for demo
      setRecentActivity([
        {
          id: "1",
          type: "policy_created",
          description: "Yeni CREDIT_CARD policy oluşturuldu",
          user: "admin@company.com",
          timestamp: new Date().toISOString(),
          severity: "medium",
        },
        {
          id: "2",
          type: "violation_detected",
          description: "EMAIL entity tespit edildi ve maskelendi",
          user: "user@company.com",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          severity: "low",
        },
        {
          id: "3",
          type: "exception_added",
          description: "john.doe@company.com için PERSON exception eklendi",
          user: "admin@company.com",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          severity: "high",
        },
      ]);
    }
  };

  const handleDataChange = () => {
    loadStats();
    loadRecentActivity();
  };

  useEffect(() => {
    loadStats();
    loadRecentActivity();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "policy_created":
      case "policy_updated":
        return <Settings className="h-4 w-4" />;
      case "exception_added":
        return <Users className="h-4 w-4" />;
      case "violation_detected":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const tabs = [
    { id: "overview", label: "Genel Bakış", icon: BarChart3 },
    { id: "current-rules", label: "Mevcut Kurallar", icon: Activity },
    { id: "policies", label: "Policy Yönetimi", icon: Shield },
    { id: "advanced-policies", label: "Gelişmiş Policy", icon: Settings },
    { id: "rule-sets", label: "Kural Setleri", icon: FileText },
    { id: "entities", label: "Entity Yönetimi", icon: Database },
    { id: "exceptions", label: "Kullanıcı Exception'ları", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">DLP Yönetim Paneli</h2>
          <p className="text-muted-foreground">
            Data Loss Prevention policy'lerini ve entity'lerini yönet
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Sistem Aktif
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Policy</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_policies}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">{stats.active_policies} aktif</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entity Türleri</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_entities}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-blue-500">{stats.custom_entities} özel</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kullanıcı Exception'ları</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_exceptions}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">{stats.active_exceptions} aktif</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Son 24 Saat</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recent_violations}</div>
                <p className="text-xs text-muted-foreground">
                  DLP tespit sayısı
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Message Processing Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Mesaj İşleme İstatistikleri</CardTitle>
                <CardDescription>Son 30 günlük DLP aktivitesi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Engellenen Mesajlar</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{stats.blocked_messages}</div>
                      <div className="text-xs text-muted-foreground">mesaj</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Maskelenen Mesajlar</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{stats.masked_messages}</div>
                      <div className="text-xs text-muted-foreground">mesaj</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">İzin Verilen</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {Math.max(0, 1000 - stats.blocked_messages - stats.masked_messages)}
                      </div>
                      <div className="text-xs text-muted-foreground">mesaj</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Son Aktiviteler</CardTitle>
                <CardDescription>DLP sistemindeki son değişiklikler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`mt-1 ${getSeverityColor(activity.severity)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{activity.user}</span>
                          <span>•</span>
                          <span>{new Date(activity.timestamp).toLocaleString("tr-TR")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Henüz aktivite bulunmuyor</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Hızlı İşlemler</CardTitle>
              <CardDescription>Sık kullanılan DLP yönetim işlemleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("policies")}
                >
                  <Shield className="h-6 w-6 mb-2" />
                  <span className="text-sm">Yeni Policy</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("entities")}
                >
                  <Database className="h-6 w-6 mb-2" />
                  <span className="text-sm">Entity Ekle</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("exceptions")}
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">Exception Ekle</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={handleDataChange}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  <span className="text-sm">Rapor Al</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "current-rules" && (
        <DlpPolicyIntegration onPolicyChange={handleDataChange} />
      )}

      {activeTab === "policies" && (
        <PolicyManager onPolicyChange={handleDataChange} />
      )}

      {activeTab === "advanced-policies" && (
        <DragDropPolicyManager onPolicyChange={handleDataChange} />
      )}

      {activeTab === "entities" && (
        <EntityManager onEntityChange={handleDataChange} />
      )}

      {activeTab === "exceptions" && (
        <UserExceptions onExceptionChange={handleDataChange} />
      )}

      {activeTab === "rule-sets" && (
        <RuleSetManager onRuleSetChange={handleDataChange} />
      )}
    </div>
  );
}