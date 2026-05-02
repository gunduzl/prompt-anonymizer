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
  Download,
  Upload,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

interface Entity {
  name: string;
  type: "block" | "mask";
  description?: string;
  regex_pattern?: string;
  confidence_threshold?: number;
  is_custom: boolean;
  is_active: boolean;
  created_at?: string;
  created_by?: string;
}

interface EntityManagerProps {
  onEntityChange?: () => void;
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function EntityManager({ onEntityChange }: EntityManagerProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "block" | "mask">("all");
  const [filterCustom, setFilterCustom] = useState<"all" | "predefined" | "custom">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  
  const [newEntity, setNewEntity] = useState<Partial<Entity>>({
    name: "",
    type: "mask",
    description: "",
    regex_pattern: "",
    confidence_threshold: 0.8,
    is_active: true,
  });

  const loadEntities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("entity_type", filterType);
      if (filterCustom === "predefined") params.append("is_custom", "false");
      if (filterCustom === "custom") params.append("is_custom", "true");
      if (searchTerm) params.append("search", searchTerm);

      const response = await axiosWithAuth.get(`${API}/admin/dlp/entities?${params}`);
      setEntities(response.data.entities || []);
    } catch (error) {
      console.error("Error loading entities:", error);
      setEntities([]); // Ensure entities is always an array
    } finally {
      setLoading(false);
    }
  };

  const createEntity = async () => {
    if (!newEntity.name || !newEntity.type) {
      alert("Entity adı ve türü gereklidir");
      return;
    }

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/dlp/entities`, newEntity);
      setNewEntity({
        name: "",
        type: "mask",
        description: "",
        regex_pattern: "",
        confidence_threshold: 0.8,
        is_active: true,
      });
      setShowAddForm(false);
      loadEntities();
      onEntityChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Entity oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  const deleteEntity = async (entityName: string) => {
    if (!confirm(`'${entityName}' entity'si silinsin mi?`)) return;

    setLoading(true);
    try {
      await axiosWithAuth.delete(`${API}/admin/dlp/entities/${entityName}`);
      loadEntities();
      onEntityChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Entity silinemedi");
    } finally {
      setLoading(false);
    }
  };

  const exportEntities = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/dlp/export?format=json`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dlp-entities-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Export işlemi başarısız");
    }
  };

  useEffect(() => {
    loadEntities();
  }, [filterType, filterCustom, searchTerm]);

  const filteredEntities = entities.filter((entity) => {
    const matchesSearch = !searchTerm || 
      entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Entity Yönetimi</h3>
          <p className="text-muted-foreground">
            DLP entity'lerini yönet ve özelleştir
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportEntities}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadEntities} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Entity
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Entity ara..."
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
              <option value="all">Tüm Türler</option>
              <option value="block">Block Entities</option>
              <option value="mask">Mask Entities</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterCustom}
              onChange={(e) => setFilterCustom(e.target.value as any)}
            >
              <option value="all">Tümü</option>
              <option value="predefined">Öntanımlı</option>
              <option value="custom">Özel</option>
            </select>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                Toplam: {filteredEntities.length}
              </Badge>
              <Badge variant="secondary">
                Özel: {filteredEntities.filter(e => e.is_custom).length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Entity Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Yeni Entity Ekle</CardTitle>
            <CardDescription>
              Özel bir DLP entity tanımı oluşturun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Entity Adı (ör. CUSTOM_ID)"
                value={newEntity.name}
                onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value.toUpperCase() })}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newEntity.type}
                onChange={(e) => setNewEntity({ ...newEntity, type: e.target.value as "block" | "mask" })}
              >
                <option value="mask">Mask (Maskele)</option>
                <option value="block">Block (Engelle)</option>
              </select>
              <Input
                placeholder="Açıklama"
                value={newEntity.description}
                onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })}
              />
              <Input
                placeholder="Regex Pattern (opsiyonel)"
                value={newEntity.regex_pattern}
                onChange={(e) => setNewEntity({ ...newEntity, regex_pattern: e.target.value })}
              />
              <Input
                placeholder="Güven Eşiği (0.0-1.0)"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={newEntity.confidence_threshold}
                onChange={(e) => setNewEntity({ ...newEntity, confidence_threshold: parseFloat(e.target.value) })}
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newEntity.is_active}
                  onChange={(e) => setNewEntity({ ...newEntity, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm">Aktif</label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                İptal
              </Button>
              <Button onClick={createEntity} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Entity Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entities List */}
      <Card>
        <CardHeader>
          <CardTitle>Entity Listesi ({filteredEntities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntities.map((entity, index) => (
              <div
                key={`${entity.name}-${index}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {entity.type === "block" ? (
                      <Shield className="h-5 w-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{entity.name}</p>
                      <Badge
                        variant={entity.type === "block" ? "destructive" : "secondary"}
                      >
                        {entity.type.toUpperCase()}
                      </Badge>
                      {entity.is_custom && (
                        <Badge variant="outline">ÖZEL</Badge>
                      )}
                      {!entity.is_active && (
                        <Badge variant="secondary">PASİF</Badge>
                      )}
                    </div>
                    {entity.description && (
                      <p className="text-sm text-muted-foreground">
                        {entity.description}
                      </p>
                    )}
                    {entity.regex_pattern && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Pattern: {entity.regex_pattern}
                      </p>
                    )}
                    {entity.confidence_threshold && (
                      <p className="text-xs text-muted-foreground">
                        Güven Eşiği: {entity.confidence_threshold}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {entity.is_active ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  {entity.is_custom && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEntity(entity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteEntity(entity.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredEntities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Hiç entity bulunamadı</p>
                <p className="text-sm">Filtrelerinizi kontrol edin veya yeni entity ekleyin</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}