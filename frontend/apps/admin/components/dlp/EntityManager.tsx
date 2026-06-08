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
  Library,
  Code2,
} from "lucide-react";
import axios from "axios";
import PatternPicker, { PatternItem } from "./PatternPicker";
import RegexTester from "./RegexTester";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

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
  locale?: "en" | "tr";
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type AddMode = "pick" | "custom" | null;

export default function EntityManager({ onEntityChange, locale = "en" }: EntityManagerProps) {
  const t = {
    title: locale === "en" ? "Entity Management" : "Entity Yönetimi",
    desc: locale === "en" ? "Manage and customize DLP entities" : "DLP entity'lerini yönet ve özelleştir",
    refresh: locale === "en" ? "Refresh" : "Yenile",
    newEntity: locale === "en" ? "New Entity" : "Yeni Entity",
    filters: locale === "en" ? "Filters" : "Filtreler",
    search: locale === "en" ? "Search entity..." : "Entity ara...",
    allTypes: locale === "en" ? "All Types" : "Tüm Türler",
    all: locale === "en" ? "All" : "Tümü",
    predefined: locale === "en" ? "Predefined" : "Öntanımlı",
    custom: locale === "en" ? "Custom" : "Özel",
    total: locale === "en" ? "Total" : "Toplam",
    addTitle: locale === "en" ? "Add New Entity" : "Yeni Entity Ekle",
    addDesc: locale === "en" ? "Create a custom DLP entity definition" : "Özel bir DLP entity tanımı oluşturun",
    name: locale === "en" ? "Entity Name (e.g. CUSTOM_ID)" : "Entity Adı (ör. CUSTOM_ID)",
    mask: locale === "en" ? "Mask" : "Maskele",
    block: locale === "en" ? "Block" : "Engelle",
    description: locale === "en" ? "Description" : "Açıklama",
    regex: locale === "en" ? "Regex Pattern (optional)" : "Regex Pattern (opsiyonel)",
    threshold: locale === "en" ? "Confidence Threshold (0.0-1.0)" : "Güven Eşiği (0.0-1.0)",
    active: locale === "en" ? "Active" : "Aktif",
    cancel: locale === "en" ? "Cancel" : "İptal",
    add: locale === "en" ? "Add Entity" : "Entity Ekle",
    list: locale === "en" ? "Entity List" : "Entity Listesi",
    inactive: locale === "en" ? "INACTIVE" : "PASİF",
    conf: locale === "en" ? "Confidence Threshold" : "Güven Eşiği",
    empty1: locale === "en" ? "No entity found" : "Hiç entity bulunamadı",
    empty2: locale === "en" ? "Check your filters or add a new entity" : "Filtrelerinizi kontrol edin veya yeni entity ekleyin",
    pickFromLib: locale === "en" ? "Select from Library" : "Kütüphaneden Seç",
    customRegex: locale === "en" ? "Custom Regex" : "Özel Regex",
    chooseMode: locale === "en" ? "How would you like to add an entity?" : "Entity nasıl eklemek istersiniz?",
    chooseDesc: locale === "en" ? "Pick from predefined patterns or create a custom regex entity" : "Öntanımlı patternlerden seçin veya özel regex entity oluşturun",
    selectedPattern: locale === "en" ? "Selected from library" : "Kütüphaneden seçildi",
    testRegex: locale === "en" ? "Test & Validate" : "Test Et & Doğrula",
  };

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "block" | "mask">("all");
  const [filterCustom, setFilterCustom] = useState<"all" | "predefined" | "custom">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [showPatternPicker, setShowPatternPicker] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<PatternItem | null>(null);
  const [showRegexTester, setShowRegexTester] = useState(false);

  const [newEntity, setNewEntity] = useState<Partial<Entity>>({
    name: "",
    type: "mask",
    description: "",
    regex_pattern: "",
    confidence_threshold: 0.8,
    is_active: true,
  });

  const resetForm = () => {
    setNewEntity({
      name: "",
      type: "mask",
      description: "",
      regex_pattern: "",
      confidence_threshold: 0.8,
      is_active: true,
    });
    setAddMode(null);
    setSelectedPattern(null);
    setShowRegexTester(false);
    setShowAddForm(false);
  };

  const handleNewEntityClick = () => {
    setShowAddForm(true);
    setAddMode(null);
    setSelectedPattern(null);
    setShowRegexTester(false);
  };

  const handlePickFromLibrary = () => {
    setAddMode("pick");
    setShowPatternPicker(true);
  };

  const handleCustomRegex = () => {
    setAddMode("custom");
    setShowRegexTester(true);
    setNewEntity({
      name: "",
      type: "mask",
      description: "",
      regex_pattern: "",
      confidence_threshold: 0.8,
      is_active: true,
    });
  };

  const handlePatternSelect = (pattern: PatternItem) => {
    setShowPatternPicker(false);
    setSelectedPattern(pattern);
    const action = pattern.action?.toLowerCase();
    setNewEntity({
      name: pattern.name.toUpperCase(),
      type: action === "block" ? "block" : "mask",
      description: pattern.description,
      regex_pattern: pattern.pattern,
      confidence_threshold: 0.8,
      is_active: true,
    });
    setShowRegexTester(true);
  };

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
      resetForm();
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
          <h3 className="text-2xl font-bold tracking-tight">{t.title}</h3>
          <p className="text-muted-foreground">
            {t.desc}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportEntities}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadEntities} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t.refresh}
          </Button>
          <Button onClick={handleNewEntityClick}>
            <Plus className="h-4 w-4 mr-2" />
            {t.newEntity}
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
              <option value="block">Block Entities</option>
              <option value="mask">Mask Entities</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterCustom}
              onChange={(e) => setFilterCustom(e.target.value as any)}
            >
              <option value="all">{t.all}</option>
              <option value="predefined">{t.predefined}</option>
              <option value="custom">{t.custom}</option>
            </select>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {t.total}: {filteredEntities.length}
              </Badge>
              <Badge variant="secondary">
                {t.custom}: {filteredEntities.filter(e => e.is_custom).length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Entity Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t.addTitle}</CardTitle>
            <CardDescription>
              {addMode === null ? t.chooseDesc : t.addDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mode Selection */}
            {addMode === null && (
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                  onClick={handlePickFromLibrary}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Library className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{t.pickFromLib}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {locale === "en" ? "Choose from predefined pattern library grouped by category" : "Kategorilere göre gruplandırılmış öntanımlı pattern kütüphanesinden seçin"}
                    </p>
                  </div>
                </button>

                <button
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                  onClick={handleCustomRegex}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Code2 className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{t.customRegex}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {locale === "en" ? "Write your own regex pattern and test it with sample data" : "Kendi regex pattern'inizi yazın ve örnek verilerle test edin"}
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Entity Form (shown after mode selection) */}
            {addMode !== null && (
              <>
                {/* Selected Pattern Info */}
                {selectedPattern && (
                  <div className="mb-4 p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{t.selectedPattern}: </span>
                      <span className="text-sm text-muted-foreground">{selectedPattern.display_name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{selectedPattern.category}</Badge>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder={t.name}
                    value={newEntity.name}
                    onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value.toUpperCase() })}
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newEntity.type}
                    onChange={(e) => setNewEntity({ ...newEntity, type: e.target.value as "block" | "mask" })}
                  >
                    <option value="mask">Mask ({t.mask})</option>
                    <option value="block">Block ({t.block})</option>
                  </select>
                  <Input
                    placeholder={t.description}
                    value={newEntity.description}
                    onChange={(e) => setNewEntity({ ...newEntity, description: e.target.value })}
                  />
                  <Input
                    placeholder={t.threshold}
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
                    <label htmlFor="is_active" className="text-sm">{t.active}</label>
                  </div>
                </div>

                {/* Regex Tester */}
                {showRegexTester && (
                  <RegexTester
                    pattern={newEntity.regex_pattern || ""}
                    onPatternChange={(p) => setNewEntity({ ...newEntity, regex_pattern: p })}
                    locale={locale}
                  />
                )}

                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setAddMode(null)}>
                    ← {locale === "en" ? "Back" : "Geri"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    {t.cancel}
                  </Button>
                  <Button onClick={createEntity} disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.add}
                  </Button>
                </div>
              </>
            )}

            {/* Cancel for mode selection */}
            {addMode === null && (
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={resetForm}>
                  {t.cancel}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pattern Picker Modal */}
      <PatternPicker
        open={showPatternPicker}
        onClose={() => setShowPatternPicker(false)}
        onSelect={handlePatternSelect}
        locale={locale}
      />

      {/* Entities List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.list} ({filteredEntities.length})</CardTitle>
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
                        <Badge variant="outline">{t.custom.toUpperCase()}</Badge>
                      )}
                      {!entity.is_active && (
                        <Badge variant="secondary">{t.inactive}</Badge>
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
                        {t.conf}: {entity.confidence_threshold}
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
