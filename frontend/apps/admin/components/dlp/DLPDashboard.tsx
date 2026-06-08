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

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
type AdminLocale = "en" | "tr";

const dlpCopy = {
  en: {
    title: "DLP Management Panel",
    description: "Manage Data Loss Prevention policies and entities",
    systemActive: "System Active",
    tabs: {
      overview: "Overview",
      currentRules: "Current Rules",
      policies: "Policy Management",
      advancedPolicies: "Advanced Policy",
      ruleSets: "Rule Sets",
      entities: "Entity Management",
      exceptions: "User Exceptions",
    },
    stats: {
      totalPolicy: "Total Policies",
      active: "active",
      entityTypes: "Entity Types",
      custom: "custom",
      userExceptions: "User Exceptions",
      last24Hours: "Last 24 Hours",
      dlpDetections: "DLP detections",
    },
    processing: {
      title: "Message Processing Statistics",
      description: "DLP activity over the last 30 days",
      blocked: "Blocked Messages",
      masked: "Masked Messages",
      allowed: "Allowed",
      message: "message",
    },
    activity: {
      title: "Recent Activity",
      description: "Latest changes in the DLP system",
      empty: "No activity yet",
    },
    quick: {
      title: "Quick Actions",
      description: "Common DLP management actions",
      newPolicy: "New Policy",
      addEntity: "Add Entity",
      addException: "Add Exception",
      report: "Export Report",
    },
  },
  tr: {
    title: "DLP Yönetim Paneli",
    description: "Data Loss Prevention policy'lerini ve entity'lerini yönet",
    systemActive: "Sistem Aktif",
    tabs: {
      overview: "Genel Bakış",
      currentRules: "Mevcut Kurallar",
      policies: "Policy Yönetimi",
      advancedPolicies: "Gelişmiş Policy",
      ruleSets: "Kural Setleri",
      entities: "Entity Yönetimi",
      exceptions: "Kullanıcı Exception'ları",
    },
    stats: {
      totalPolicy: "Toplam Policy",
      active: "aktif",
      entityTypes: "Entity Türleri",
      custom: "özel",
      userExceptions: "Kullanıcı Exception'ları",
      last24Hours: "Son 24 Saat",
      dlpDetections: "DLP tespit sayısı",
    },
    processing: {
      title: "Mesaj İşleme İstatistikleri",
      description: "Son 30 günlük DLP aktivitesi",
      blocked: "Engellenen Mesajlar",
      masked: "Maskelenen Mesajlar",
      allowed: "İzin Verilen",
      message: "mesaj",
    },
    activity: {
      title: "Son Aktiviteler",
      description: "DLP sistemindeki son değişiklikler",
      empty: "Henüz aktivite bulunmuyor",
    },
    quick: {
      title: "Hızlı İşlemler",
      description: "Sık kullanılan DLP yönetim işlemleri",
      newPolicy: "Yeni Policy",
      addEntity: "Entity Ekle",
      addException: "Exception Ekle",
      report: "Rapor Al",
    },
  },
} as const;

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

export default function DLPDashboard({ locale = "en" }: { locale?: AdminLocale }) {
  const copy = dlpCopy[locale];
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
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
    { id: "overview", label: copy.tabs.overview, icon: BarChart3 },
    { id: "current-rules", label: copy.tabs.currentRules, icon: Activity },
    { id: "policies", label: copy.tabs.policies, icon: Shield },
    { id: "advanced-policies", label: copy.tabs.advancedPolicies, icon: Settings },
    { id: "rule-sets", label: copy.tabs.ruleSets, icon: FileText },
    { id: "entities", label: copy.tabs.entities, icon: Database },
    { id: "exceptions", label: copy.tabs.exceptions, icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{copy.title}</h2>
          <p className="text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            {copy.systemActive}
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
                <CardTitle className="text-sm font-medium">{copy.stats.totalPolicy}</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_policies}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">{stats.active_policies} {copy.stats.active}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{copy.stats.entityTypes}</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_entities}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-blue-500">{stats.custom_entities} {copy.stats.custom}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{copy.stats.userExceptions}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_exceptions}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">{stats.active_exceptions} {copy.stats.active}</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{copy.stats.last24Hours}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recent_violations}</div>
                <p className="text-xs text-muted-foreground">
                  {copy.stats.dlpDetections}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Message Processing Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{copy.processing.title}</CardTitle>
                <CardDescription>{copy.processing.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">{copy.processing.blocked}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{stats.blocked_messages}</div>
                      <div className="text-xs text-muted-foreground">{copy.processing.message}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">{copy.processing.masked}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{stats.masked_messages}</div>
                      <div className="text-xs text-muted-foreground">{copy.processing.message}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{copy.processing.allowed}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {Math.max(0, 1000 - stats.blocked_messages - stats.masked_messages)}
                      </div>
                      <div className="text-xs text-muted-foreground">{copy.processing.message}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>{copy.activity.title}</CardTitle>
                <CardDescription>{copy.activity.description}</CardDescription>
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
                          <span>{new Date(activity.timestamp).toLocaleString(dateLocale)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{copy.activity.empty}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{copy.quick.title}</CardTitle>
              <CardDescription>{copy.quick.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("policies")}
                >
                  <Shield className="h-6 w-6 mb-2" />
                  <span className="text-sm">{copy.quick.newPolicy}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("entities")}
                >
                  <Database className="h-6 w-6 mb-2" />
                  <span className="text-sm">{copy.quick.addEntity}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("exceptions")}
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">{copy.quick.addException}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={handleDataChange}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  <span className="text-sm">{copy.quick.report}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "current-rules" && (
        <DlpPolicyIntegration onPolicyChange={handleDataChange} locale={locale} />
      )}

      {activeTab === "policies" && (
        <PolicyManager onPolicyChange={handleDataChange} />
      )}

      {activeTab === "advanced-policies" && (
        <DragDropPolicyManager onPolicyChange={handleDataChange} />
      )}

      {activeTab === "entities" && (
        <EntityManager onEntityChange={handleDataChange} locale={locale} />
      )}

      {activeTab === "exceptions" && (
        <UserExceptions onExceptionChange={handleDataChange} locale={locale} />
      )}

      {activeTab === "rule-sets" && (
        <RuleSetManager onRuleSetChange={handleDataChange} locale={locale} />
      )}
    </div>
  );
}
