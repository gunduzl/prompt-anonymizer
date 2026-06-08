import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Users,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  User,
  Mail,
  Building,
} from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

interface UserException {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  entity_types: string[];
  exception_type: "allow" | "bypass" | "custom";
  reason: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
}

interface UserExceptionsProps {
  onExceptionChange?: () => void;
  locale?: "en" | "tr";
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function UserExceptions({ onExceptionChange, locale = "en" }: UserExceptionsProps) {
  const t = {
    title: locale === "en" ? "User Exceptions" : "Kullanıcı Exception'ları",
    desc: locale === "en" ? "Manage user-based DLP exceptions" : "Kullanıcı bazlı DLP exception'larını yönet",
    refresh: locale === "en" ? "Refresh" : "Yenile",
    newException: locale === "en" ? "New Exception" : "Yeni Exception",
    filters: locale === "en" ? "Filters" : "Filtreler",
    search: locale === "en" ? "Search user..." : "Kullanıcı ara...",
    allTypes: locale === "en" ? "All Types" : "Tüm Türler",
    allStatuses: locale === "en" ? "All Statuses" : "Tüm Durumlar",
    active: locale === "en" ? "Active" : "Aktif",
    inactive: locale === "en" ? "Inactive" : "Pasif",
    expired: locale === "en" ? "Expired" : "Süresi Dolmuş",
    total: locale === "en" ? "Total" : "Toplam",
    addTitle: locale === "en" ? "Add New Exception" : "Yeni Exception Ekle",
    addDesc: locale === "en" ? "Create a DLP exception definition for a user" : "Kullanıcı için DLP exception tanımı oluşturun",
    userId: locale === "en" ? "User ID" : "Kullanıcı ID",
    userEmail: locale === "en" ? "User Email (optional)" : "Kullanıcı Email (opsiyonel)",
    expireDate: locale === "en" ? "Expiration Date (YYYY-MM-DD)" : "Son Kullanma Tarihi (YYYY-MM-DD)",
    reason: locale === "en" ? "Exception Reason" : "Exception Sebebi",
    entityTypes: locale === "en" ? "Entity Types" : "Entity Türleri",
    cancel: locale === "en" ? "Cancel" : "İptal",
    add: locale === "en" ? "Add Exception" : "Exception Ekle",
    list: locale === "en" ? "Exception List" : "Exception Listesi",
    because: locale === "en" ? "Reason" : "Sebep",
    created: locale === "en" ? "Created" : "Oluşturulma",
    creator: locale === "en" ? "Created by" : "Oluşturan",
    expires: locale === "en" ? "Expires" : "Son Kullanma",
    disable: locale === "en" ? "Disable" : "Pasifleştir",
    enable: locale === "en" ? "Enable" : "Aktifleştir",
    empty1: locale === "en" ? "No exception found" : "Hiç exception bulunamadı",
    empty2: locale === "en" ? "Check your filters or add a new exception" : "Filtrelerinizi kontrol edin veya yeni exception ekleyin",
  };
  const [exceptions, setExceptions] = useState<UserException[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "allow" | "bypass" | "custom">("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingException, setEditingException] = useState<UserException | null>(null);
  
  const [newException, setNewException] = useState<Partial<UserException>>({
    user_id: "",
    user_email: "",
    entity_types: [],
    exception_type: "allow",
    reason: "",
    expires_at: "",
    is_active: true,
  });

  const [availableEntityTypes] = useState([
    "PERSON", "EMAIL", "PHONE_NUMBER", "CREDIT_CARD", "IBAN", "IP_ADDRESS",
    "URL", "DATE_TIME", "LOCATION", "ORGANIZATION", "MEDICAL_LICENSE",
    "PASSPORT", "SSN", "DRIVER_ID", "CUSTOM_ID"
  ]);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("exception_type", filterType);
      if (filterActive === "active") params.append("is_active", "true");
      if (filterActive === "inactive") params.append("is_active", "false");
      if (filterActive === "expired") params.append("expired", "true");
      if (searchTerm) params.append("search", searchTerm);

      const response = await axiosWithAuth.get(`${API}/admin/dlp/exceptions?${params}`);
      setExceptions(response.data.exceptions || []);
    } catch (error) {
      console.error("Error loading exceptions:", error);
      setExceptions([]); // Ensure exceptions is always an array
    } finally {
      setLoading(false);
    }
  };

  const createException = async () => {
    if (!newException.user_id || !newException.reason || !newException.entity_types?.length) {
      alert("Kullanıcı ID, sebep ve en az bir entity türü gereklidir");
      return;
    }

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/dlp/exceptions`, {
        ...newException,
        expires_at: newException.expires_at || null,
      });
      setNewException({
        user_id: "",
        user_email: "",
        entity_types: [],
        exception_type: "allow",
        reason: "",
        expires_at: "",
        is_active: true,
      });
      setShowAddForm(false);
      loadExceptions();
      onExceptionChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Exception oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  const updateException = async (exceptionId: string, updates: Partial<UserException>) => {
    setLoading(true);
    try {
      await axiosWithAuth.put(`${API}/admin/dlp/exceptions/${exceptionId}`, updates);
      loadExceptions();
      onExceptionChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Exception güncellenemedi");
    } finally {
      setLoading(false);
    }
  };

  const deleteException = async (exceptionId: string) => {
    if (!confirm("Bu exception silinsin mi?")) return;

    setLoading(true);
    try {
      await axiosWithAuth.delete(`${API}/admin/dlp/exceptions/${exceptionId}`);
      loadExceptions();
      onExceptionChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Exception silinemedi");
    } finally {
      setLoading(false);
    }
  };

  const toggleEntityType = (entityType: string) => {
    setNewException(prev => ({
      ...prev,
      entity_types: prev.entity_types?.includes(entityType)
        ? prev.entity_types.filter(t => t !== entityType)
        : [...(prev.entity_types || []), entityType]
    }));
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getExceptionTypeVariant = (type: string) => {
    switch (type) {
      case "allow": return "default";
      case "bypass": return "secondary";
      case "custom": return "outline";
      default: return "outline";
    }
  };

  const getStatusBadge = (exception: UserException) => {
    if (!exception.is_active) {
      return <Badge variant="secondary">{(locale === "en" ? "INACTIVE" : "PASİF")}</Badge>;
    }
    if (isExpired(exception.expires_at)) {
      return <Badge variant="destructive">{(locale === "en" ? "EXPIRED" : "SÜRESİ DOLMUŞ")}</Badge>;
    }
    return <Badge variant="default">{(locale === "en" ? "ACTIVE" : "AKTİF")}</Badge>;
  };

  useEffect(() => {
    loadExceptions();
  }, [filterType, filterActive, searchTerm]);

  const filteredExceptions = exceptions.filter((exception) => {
    const matchesSearch = !searchTerm || 
      exception.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exception.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exception.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exception.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{t.title}</h3>
          <p className="text-muted-foreground">
            {t.desc}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadExceptions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t.refresh}
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t.newException}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t.filters}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">{t.allTypes}</option>
              <option value="allow">Allow</option>
              <option value="bypass">Bypass</option>
              <option value="custom">Custom</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
            >
              <option value="all">{t.allStatuses}</option>
              <option value="active">{t.active}</option>
              <option value="inactive">{t.inactive}</option>
              <option value="expired">{t.expired}</option>
            </select>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {t.total}: {filteredExceptions.length}
              </Badge>
              <Badge variant="secondary">
                {t.active}: {filteredExceptions.filter(e => e.is_active && !isExpired(e.expires_at)).length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Exception Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t.addTitle}</CardTitle>
            <CardDescription>
              {t.addDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  placeholder={t.userId}
                  value={newException.user_id}
                  onChange={(e) => setNewException({ ...newException, user_id: e.target.value })}
                />
                <Input
                  placeholder={t.userEmail}
                  value={newException.user_email}
                  onChange={(e) => setNewException({ ...newException, user_email: e.target.value })}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newException.exception_type}
                  onChange={(e) => setNewException({ ...newException, exception_type: e.target.value as any })}
                >
                  <option value="allow">Allow</option>
                  <option value="bypass">Bypass</option>
                  <option value="custom">Custom</option>
                </select>
                <Input
                  placeholder={t.expireDate}
                  type="date"
                  value={newException.expires_at}
                  onChange={(e) => setNewException({ ...newException, expires_at: e.target.value })}
                />
              </div>
              
              <Input
                placeholder={t.reason}
                value={newException.reason}
                onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">{t.entityTypes}</label>
                <div className="grid gap-2 md:grid-cols-4">
                  {availableEntityTypes.map((entityType) => (
                    <div key={entityType} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`entity-${entityType}`}
                        checked={newException.entity_types?.includes(entityType)}
                        onChange={() => toggleEntityType(entityType)}
                      />
                      <label htmlFor={`entity-${entityType}`} className="text-sm">
                        {entityType}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active_exception"
                  checked={newException.is_active}
                  onChange={(e) => setNewException({ ...newException, is_active: e.target.checked })}
                />
                <label htmlFor="is_active_exception" className="text-sm">{t.active}</label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                {t.cancel}
              </Button>
              <Button onClick={createException} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {t.add}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exceptions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.list} ({filteredExceptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExceptions.map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium">
                        {exception.user_name || exception.user_email || exception.user_id}
                      </p>
                      <Badge variant={getExceptionTypeVariant(exception.exception_type)}>
                        {exception.exception_type.toUpperCase()}
                      </Badge>
                      {getStatusBadge(exception)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                      {exception.user_email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{exception.user_email}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>ID: {exception.user_id}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>{t.because}:</strong> {exception.reason}
                    </p>

                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-muted-foreground">{t.entityTypes}:</span>
                      {exception.entity_types.map((entityType) => (
                        <Badge key={entityType} variant="outline" className="text-xs">
                          {entityType}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{t.created}: {new Date(exception.created_at).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}</span>
                      </div>
                      {exception.expires_at && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span className={isExpired(exception.expires_at) ? "text-red-500" : ""}>
                            {t.expires}: {new Date(exception.expires_at).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
                          </span>
                        </div>
                      )}
                      <span>{t.creator}: {exception.created_by}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {exception.is_active && !isExpired(exception.expires_at) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateException(exception.id, { is_active: !exception.is_active })}
                  >
                    {exception.is_active ? t.disable : t.enable}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingException(exception)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteException(exception.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredExceptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t.empty1}</p>
                <p className="text-sm">{t.empty2}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
