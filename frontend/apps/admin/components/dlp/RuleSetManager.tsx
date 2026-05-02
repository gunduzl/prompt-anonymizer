import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import CriteriaBuilder from "./CriteriaBuilder";
import AdvancedCriteriaBuilder from "./AdvancedCriteriaBuilder";
import axios from "axios";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Download,
  Power,
  Settings,
  CheckCircle,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Tag,
  Shield,
  Users,
  Zap,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

// Interface definitions
interface RuleSetCriteria {
  id: string;
  condition_type: "prompt_contains" | "entity_detected" | "user_is" | "regex" | "file_type" | "file_size";
  entity_types?: string[];
  text_patterns?: string[];
  regex_pattern?: string;
  user_conditions?: Record<string, any>;
  file_conditions?: Record<string, any>;
  logical_operator: "AND" | "OR";
  negate: boolean;
}

interface RuleSetRule {
  id?: string;
  name: string;
  criteria: RuleSetCriteria[];
  action: "allow" | "mask" | "block" | "remove";
  action_config?: Record<string, any>;
  priority: number;
  is_active: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface RuleSet {
  id: string;
  name: string;
  description?: string;
  priority: number;
  is_active: boolean;
  rules: RuleSetRule[];
  rules_count: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
  category?: "security" | "compliance" | "custom";
}

interface RuleSetManagerProps {
  onRuleSetChange?: () => void;
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function RuleSetManager({ onRuleSetChange }: RuleSetManagerProps) {
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleSet, setEditingRuleSet] = useState<RuleSet | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [useAdvancedCriteria, setUseAdvancedCriteria] = useState(false);
  const [expandedRuleSet, setExpandedRuleSet] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    priority: 1,
    rules: [] as RuleSetRule[],
    tags: [] as string[],
    category: "custom",
  });

  useEffect(() => {
    loadRuleSets();
  }, [searchTerm, filterActive, filterCategory]);

  const loadRuleSets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterActive !== "all") params.append("is_active", (filterActive === "active").toString());
      
      const response = await axiosWithAuth.get(`${API}/admin/dlp/rule-sets?${params}`);
      setRuleSets(response.data.rule_sets || []);
    } catch (error) {
      console.error("Error loading rule sets:", error);
      setRuleSets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingRuleSet) {
        await axiosWithAuth.put(`${API}/admin/dlp/rule-sets/${editingRuleSet.id}`, formData);
      } else {
        await axiosWithAuth.post(`${API}/admin/dlp/rule-sets`, formData);
      }
      
      setShowAddForm(false);
      setEditingRuleSet(null);
      resetForm();
      loadRuleSets();
      onRuleSetChange?.();
    } catch (error) {
      console.error("Error saving rule set:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRuleSet = async (id: string) => {
    if (!confirm("Bu kural setini silmek istediğinizden emin misiniz?")) return;

    try {
      await axiosWithAuth.delete(`${API}/admin/dlp/rule-sets/${id}`);
      loadRuleSets();
      onRuleSetChange?.();
    } catch (error) {
      console.error("Error deleting rule set:", error);
    }
  };

  const toggleRuleSet = async (id: string, isActive: boolean) => {
    try {
      await axiosWithAuth.patch(`${API}/admin/dlp/rule-sets/${id}`, { is_active: isActive });
      loadRuleSets();
      onRuleSetChange?.();
    } catch (error) {
      console.error("Error toggling rule set:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      priority: 1,
      is_active: true,
      rules: [],
      tags: [],
      category: "custom",
    });
  };

  const startEdit = (ruleSet: RuleSet) => {
    setEditingRuleSet(ruleSet);
    setFormData({
      name: ruleSet.name,
      description: ruleSet.description || "",
      priority: ruleSet.priority,
      is_active: ruleSet.is_active,
      rules: ruleSet.rules,
      tags: ruleSet.tags || [],
      category: ruleSet.category || "custom",
    });
    setShowAddForm(true);
  };

  const addNewRule = () => {
    const newRule: RuleSetRule = {
      name: "",
      criteria: [{
        id: `criteria_${Date.now()}`,
        condition_type: "prompt_contains",
        entity_types: [],
        logical_operator: "AND",
        negate: false,
      }],
      action: "mask",
      priority: formData.rules.length + 1,
      is_active: true,
    };
    setFormData({ ...formData, rules: [...formData.rules, newRule] });
  };

  const updateRule = (index: number, updatedRule: RuleSetRule) => {
    const updatedRules = [...formData.rules];
    updatedRules[index] = updatedRule;
    setFormData({ ...formData, rules: updatedRules });
  };

  const removeRule = (index: number) => {
    const updatedRules = formData.rules.filter((_, i) => i !== index);
    setFormData({ ...formData, rules: updatedRules });
  };

  const movePriority = async (ruleSetId: string, direction: "up" | "down") => {
    try {
      const currentRuleSet = ruleSets.find(rs => rs.id === ruleSetId);
      if (!currentRuleSet) return;

      const newPriority = direction === "up" 
        ? Math.max(1, currentRuleSet.priority - 1)
        : currentRuleSet.priority + 1;

      await axiosWithAuth.patch(`${API}/admin/dlp/rule-sets/${ruleSetId}`, {
        priority: newPriority
      });

      await loadRuleSets();
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, ruleSetId: string) => {
    setDraggedItem(ruleSetId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    try {
      const draggedRuleSet = ruleSets.find(rs => rs.id === draggedItem);
      const targetRuleSet = ruleSets.find(rs => rs.id === targetId);
      
      if (!draggedRuleSet || !targetRuleSet) return;

      // Swap priorities
        await axiosWithAuth.patch(`${API}/admin/dlp/rule-sets/${draggedItem}`, {
          priority: targetRuleSet.priority
        });
        
        await axiosWithAuth.patch(`${API}/admin/dlp/rule-sets/${targetId}`, {
        priority: draggedRuleSet.priority
      });

      await loadRuleSets();
    } catch (error) {
      console.error("Failed to reorder rule sets:", error);
    } finally {
      setDraggedItem(null);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ 
      ...formData, 
      tags: formData.tags.filter(tag => tag !== tagToRemove) 
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "allow": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "mask": return <Shield className="h-4 w-4 text-yellow-600" />;
      case "block": return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "remove": return <Trash2 className="h-4 w-4 text-red-600" />;
      default: return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "security": return <Shield className="h-4 w-4 text-red-600" />;
      case "compliance": return <FileText className="h-4 w-4 text-blue-600" />;
      case "custom": return <Settings className="h-4 w-4 text-gray-600" />;
      default: return <Tag className="h-4 w-4 text-gray-600" />;
    }
  };

  const toggleRuleSetExpansion = (ruleSetId: string) => {
    setExpandedRuleSet(expandedRuleSet === ruleSetId ? null : ruleSetId);
  };

  const filteredAndSortedRuleSets = ruleSets
    .filter(ruleSet => {
      const matchesSearch = ruleSet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ruleSet.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActive = filterActive === "all" || 
                           (filterActive === "active" && ruleSet.is_active) ||
                           (filterActive === "inactive" && !ruleSet.is_active);
      const matchesCategory = filterCategory === "all" || ruleSet.category === filterCategory;
      
      return matchesSearch && matchesActive && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "priority":
          comparison = a.priority - b.priority;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "rules_count":
          comparison = a.rules_count - b.rules_count;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "allow": return "bg-green-100 text-green-800";
      case "mask": return "bg-yellow-100 text-yellow-800";
      case "block": return "bg-red-100 text-red-800";
      case "remove": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "allow": return "İzin Ver";
      case "mask": return "Maskele";
      case "block": return "Engelle";
      case "remove": return "Kaldır";
      default: return action;
    }
  };

  useEffect(() => {
    loadRuleSets();
  }, [searchTerm, filterActive]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rule Sets</h2>
          <p className="text-gray-600">DLP kurallarını yönetin ve öncelik sıralarını belirleyin</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Rule Set
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Rule set ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="security">Güvenlik</option>
                <option value="compliance">Uyumluluk</option>
                <option value="custom">Özel</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="priority">Öncelik</option>
                <option value="name">İsim</option>
                <option value="created_at">Oluşturma Tarihi</option>
                <option value="rules_count">Kural Sayısı</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule Sets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Yükleniyor...</p>
          </div>
        ) : filteredAndSortedRuleSets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Hiç rule set bulunamadı.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedRuleSets.map((ruleSet) => (
            <Card
              key={ruleSet.id}
              className={`transition-all duration-200 ${
                draggedItem === ruleSet.id ? 'opacity-50' : ''
              } hover:shadow-md`}
              draggable
              onDragStart={(e) => handleDragStart(e, ruleSet.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, ruleSet.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Priority and Drag Handle */}
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => movePriority(ruleSet.id, "up")}
                        disabled={ruleSet.priority === 1}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                        {ruleSet.priority}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => movePriority(ruleSet.id, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Rule Set Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(ruleSet.category || "custom")}
                        <h3 className="text-lg font-semibold text-gray-900">{ruleSet.name}</h3>
                        <Badge variant={ruleSet.is_active ? "default" : "secondary"}>
                          {ruleSet.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                      
                      {ruleSet.description && (
                        <p className="text-gray-600 text-sm mb-2">{ruleSet.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{ruleSet.rules_count} kural</span>
                        <span>Oluşturulma: {new Date(ruleSet.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>

                      {/* Tags */}
                      {ruleSet.tags && ruleSet.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {ruleSet.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRuleSetExpansion(ruleSet.id)}
                    >
                      {expandedRuleSet === ruleSet.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRuleSet(ruleSet.id, !ruleSet.is_active)}
                    >
                      {ruleSet.is_active ? (
                        <Zap className="h-4 w-4 text-green-600" />
                      ) : (
                        <Zap className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(ruleSet)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRuleSet(ruleSet.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Rules */}
                {expandedRuleSet === ruleSet.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Kurallar:</h4>
                    <div className="space-y-2">
                      {ruleSet.rules.map((rule, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getActionIcon(rule.action)}
                            <div>
                              <p className="text-sm font-medium">{rule.name || `Kural ${index + 1}`}</p>
                              <p className="text-xs text-gray-500">
                                {rule.criteria.length} kriter, Eylem: {rule.action}
                              </p>
                            </div>
                          </div>
                          <Badge variant={rule.is_active ? "default" : "secondary"} className="text-xs">
                            {rule.is_active ? "Aktif" : "Pasif"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRuleSet ? "Kural Setini Düzenle" : "Yeni Kural Seti"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Kural Seti Adı</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Finansal Veri Koruması"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kategori</label>
                  <select
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="security">Güvenlik</option>
                    <option value="compliance">Uyumluluk</option>
                    <option value="custom">Özel</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Öncelik</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      required
                    />
                    <div className="text-xs text-gray-500">
                      1 = En Yüksek
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Etiketler</label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Etiket ekle..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input?.value) {
                        addTag(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kural setinin açıklaması..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Aktif
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="use_advanced_criteria"
                    checked={useAdvancedCriteria}
                    onChange={(e) => setUseAdvancedCriteria(e.target.checked)}
                  />
                  <label htmlFor="use_advanced_criteria" className="text-sm font-medium">
                    Gelişmiş Kriter Oluşturucu
                  </label>
                </div>
              </div>

              {/* Rules Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-blue-600" />
                    Kurallar
                  </h4>
                  <Button type="button" variant="outline" onClick={addNewRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Kural Ekle
                  </Button>
                </div>

                {formData.rules.map((rule, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500 relative">
                    <CardContent className="pt-4">
                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs">
                          #{rule.priority}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(index)}
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 pr-16">
                        <div>
                          <label className="text-sm font-medium">Kural Adı</label>
                          <Input
                            value={rule.name}
                            onChange={(e) => updateRule(index, { ...rule, name: e.target.value })}
                            placeholder="Örn: Kredi Kartı Tespiti"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Aksiyon</label>
                          <div className="flex items-center space-x-2">
                            <select
                              className="flex-1 px-3 py-2 border border-input bg-background rounded-md"
                              value={rule.action}
                              onChange={(e) => updateRule(index, { ...rule, action: e.target.value as "allow" | "mask" | "block" | "remove" })}
                            >
                              <option value="allow">İzin Ver</option>
                              <option value="mask">Maskele</option>
                              <option value="block">Engelle</option>
                              <option value="remove">Kaldır</option>
                            </select>
                            {getActionIcon(rule.action)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-sm font-medium">Kural Kriterleri</label>
                        {useAdvancedCriteria ? (
                          <AdvancedCriteriaBuilder
                            criteria={rule.criteria}
                            onChange={(newCriteria) => updateRule(index, { ...rule, criteria: newCriteria })}
                          />
                        ) : (
                          <CriteriaBuilder
                            criteria={rule.criteria}
                            onChange={(newCriteria) => updateRule(index, { ...rule, criteria: newCriteria })}
                            className="mt-2"
                          />
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="text-sm font-medium">Öncelik</label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={rule.priority}
                            onChange={(e) => updateRule(index, { ...rule, priority: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Açıklama</label>
                          <Input
                            value={rule.description || ""}
                            onChange={(e) => updateRule(index, { ...rule, description: e.target.value })}
                            placeholder="Kural açıklaması..."
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <input
                            type="checkbox"
                            id={`rule_active_${index}`}
                            checked={rule.is_active}
                            onChange={(e) => updateRule(index, { ...rule, is_active: e.target.checked })}
                          />
                          <label htmlFor={`rule_active_${index}`} className="text-sm font-medium">
                            Aktif
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {formData.rules.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Kural Yok</h3>
                      <p className="text-gray-600 mb-4">
                        Bu kural setine ilk kuralınızı ekleyin
                      </p>
                      <Button type="button" onClick={addNewRule}>
                        <Plus className="h-4 w-4 mr-2" />
                        İlk Kuralı Ekle
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Kaydediliyor..." : editingRuleSet ? "Güncelle" : "Oluştur"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingRuleSet(null);
                    resetForm();
                  }}
                >
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rule Sets List */}
      <div className="space-y-4">
        {ruleSets.map((ruleSet) => (
          <Card key={ruleSet.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{ruleSet.name}</span>
                      <Badge variant={ruleSet.is_active ? "default" : "secondary"}>
                        {ruleSet.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                      <Badge variant="outline">
                        Öncelik: {ruleSet.priority}
                      </Badge>
                      <Badge variant="outline">
                        {ruleSet.rules_count} Kural
                      </Badge>
                    </CardTitle>
                    {ruleSet.description && (
                      <CardDescription className="mt-1">
                        {ruleSet.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedRuleSet(
                      expandedRuleSet === ruleSet.id ? null : ruleSet.id
                    )}
                  >
                    {expandedRuleSet === ruleSet.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(ruleSet)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleRuleSet(ruleSet.id, !ruleSet.is_active)}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRuleSet(ruleSet.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedRuleSet === ruleSet.id && (
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">KURALLAR</h4>
                  {ruleSet.rules.map((rule, index) => (
                    <div key={rule.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{rule.priority}</Badge>
                        <span className="font-medium">{rule.name}</span>
                        <Badge className={getActionBadgeColor(rule.action)}>
                          {getActionLabel(rule.action)}
                        </Badge>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rule.criteria.length > 0 && (
                          <span>
                            {rule.criteria.length} kriter tanımlanmış
                          </span>
                        )}
                        {rule.criteria.length === 0 && (
                          <span className="text-orange-600">Kriter tanımlanmamış</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {ruleSet.rules.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Bu kural setinde henüz kural bulunmuyor</p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {ruleSets.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Henüz kural seti bulunmuyor</h3>
              <p className="text-muted-foreground mb-4">
                İlk kural setinizi oluşturmak için yukarıdaki "Yeni Kural Seti" butonunu kullanın.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Kural Setini Oluştur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}