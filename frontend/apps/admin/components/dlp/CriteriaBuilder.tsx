import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  Plus,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Type,
  Hash,
  FileText,
} from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

interface Entity {
  id: string;
  name: string;
  type: string;
  patterns: string[];
  description?: string;
  is_active: boolean;
}

interface CriteriaCondition {
  id: string;
  condition_type: "prompt_contains" | "entity_detected" | "user_is" | "regex" | "file_type" | "file_size";
  entity_types?: string[];
  text_patterns?: string[];
  regex_pattern?: string;
  user_conditions?: Record<string, any>;
  file_conditions?: Record<string, any>;
  file_types?: string[];
  file_size_min?: number;
  file_size_max?: number;
  logical_operator: "AND" | "OR";
  negate: boolean;
}

interface CriteriaBuilderProps {
  criteria: CriteriaCondition[];
  onChange: (criteria: CriteriaCondition[]) => void;
  className?: string;
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function CriteriaBuilder({ criteria, onChange, className }: CriteriaBuilderProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const response = await axiosWithAuth.get(`${API}/admin/dlp/entities`);
      setEntities(response.data.entities || []);
    } catch (error) {
      console.error("Error loading entities:", error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    const newCondition: CriteriaCondition = {
      id: `condition_${Date.now()}`,
      condition_type: "entity",
      entity_types: [],
      logical_operator: "AND"
    };
    onChange([...criteria, newCondition]);
    setExpandedConditions(prev => new Set(Array.from(prev).concat([newCondition.id])));
  };

  const updateCondition = (id: string, updates: Partial<CriteriaCondition>) => {
    const updatedCriteria = criteria.map(condition =>
      condition.id === id ? { ...condition, ...updates } : condition
    );
    onChange(updatedCriteria);
  };

  const removeCondition = (id: string) => {
    const updatedCriteria = criteria.filter(condition => condition.id !== id);
    onChange(updatedCriteria);
    setExpandedConditions(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const toggleConditionExpansion = (id: string) => {
    setExpandedConditions(prev => {
      const newSet = new Set(Array.from(prev));
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getConditionTypeIcon = (type: string) => {
    switch (type) {
      case "entity": return <Database className="h-4 w-4" />;
      case "text_pattern": return <Type className="h-4 w-4" />;
      case "regex": return <Hash className="h-4 w-4" />;
      case "file_type": return <FileText className="h-4 w-4" />;
      case "file_size": return <Settings className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getConditionTypeLabel = (type: string) => {
    switch (type) {
      case "entity": return "Entity Tipi";
      case "text_pattern": return "Metin Deseni";
      case "regex": return "Regex Deseni";
      case "file_type": return "Dosya Tipi";
      case "file_size": return "Dosya Boyutu";
      default: return "Bilinmeyen";
    }
  };

  const renderConditionContent = (condition: CriteriaCondition) => {
    switch (condition.condition_type) {
      case "entity":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Entity Tipleri</label>
              <div className="mt-2 space-y-2">
                {entities.map(entity => (
                  <label key={entity.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={condition.entity_types?.includes(entity.name) || false}
                      onChange={(e) => {
                        const currentTypes = condition.entity_types || [];
                        const updatedTypes = e.target.checked
                          ? [...currentTypes, entity.name]
                          : currentTypes.filter(type => type !== entity.name);
                        updateCondition(condition.id, { entity_types: updatedTypes });
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{entity.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {entity.type}
                    </Badge>
                  </label>
                ))}
              </div>
              {entities.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Henüz entity tanımlanmamış. Entity sekmesinden yeni entity'ler oluşturun.
                </p>
              )}
            </div>
          </div>
        );

      case "text_pattern":
        return (
          <div>
            <label className="text-sm font-medium">Metin Desenleri</label>
            <Input
              value={condition.text_patterns?.join(", ") || ""}
              onChange={(e) => updateCondition(condition.id, {
                text_patterns: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
              })}
              placeholder="kredi kartı, kart numarası, card number"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Virgülle ayırarak birden fazla desen girebilirsiniz
            </p>
          </div>
        );

      case "regex":
        return (
          <div>
            <label className="text-sm font-medium">Regex Deseni</label>
            <Input
              value={condition.regex_pattern || ""}
              onChange={(e) => updateCondition(condition.id, { regex_pattern: e.target.value })}
              placeholder="^\d{4}-\d{4}-\d{4}-\d{4}$"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              JavaScript regex formatında desen girin
            </p>
          </div>
        );

      case "file_type":
        return (
          <div>
            <label className="text-sm font-medium">Dosya Tipleri</label>
            <Input
              value={condition.file_types?.join(", ") || ""}
              onChange={(e) => updateCondition(condition.id, {
                file_types: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
              })}
              placeholder="pdf, doc, docx, xls, xlsx"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Dosya uzantılarını virgülle ayırarak girin
            </p>
          </div>
        );

      case "file_size":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Min Boyut (MB)</label>
              <Input
                type="number"
                min="0"
                value={condition.file_size_min || ""}
                onChange={(e) => updateCondition(condition.id, {
                  file_size_min: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="0"
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Boyut (MB)</label>
              <Input
                type="number"
                min="0"
                value={condition.file_size_max || ""}
                onChange={(e) => updateCondition(condition.id, {
                  file_size_max: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="100"
                className="mt-2"
              />
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">Bilinmeyen koşul tipi</p>;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Kural Kriterleri</span>
          </CardTitle>
          <CardDescription>
            Kuralın hangi durumlarda tetikleneceğini belirleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {criteria.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz kriter tanımlanmamış</p>
                <p className="text-sm text-muted-foreground">
                  Kuralın çalışması için en az bir kriter eklemelisiniz
                </p>
              </div>
            ) : (
              criteria.map((condition, index) => (
                <Card key={condition.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getConditionTypeIcon(condition.condition_type)}
                        <div>
                          <h4 className="font-medium">
                            Koşul {index + 1}: {getConditionTypeLabel(condition.condition_type)}
                          </h4>
                          {index > 0 && (
                            <Badge variant="outline" className="mt-1">
                              {condition.logical_operator}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleConditionExpansion(condition.id)}
                        >
                          {expandedConditions.has(condition.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(condition.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedConditions.has(condition.id) && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Koşul Tipi</label>
                          <select
                            value={condition.condition_type}
                            onChange={(e) => updateCondition(condition.id, {
                              condition_type: e.target.value as any,
                              // Reset other fields when type changes
                              entity_types: undefined,
                              text_patterns: undefined,
                              regex_pattern: undefined,
                              file_types: undefined,
                              file_size_min: undefined,
                              file_size_max: undefined,
                            })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                          >
                            <option value="entity">Entity Tipi</option>
                            <option value="text_pattern">Metin Deseni</option>
                            <option value="regex">Regex Deseni</option>
                            <option value="file_type">Dosya Tipi</option>
                            <option value="file_size">Dosya Boyutu</option>
                          </select>
                        </div>

                        {renderConditionContent(condition)}

                        {index > 0 && (
                          <div>
                            <label className="text-sm font-medium">Mantıksal Operatör</label>
                            <select
                              value={condition.logical_operator}
                              onChange={(e) => updateCondition(condition.id, {
                                logical_operator: e.target.value as "AND" | "OR"
                              })}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                            >
                              <option value="AND">VE (AND)</option>
                              <option value="OR">VEYA (OR)</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                              Bu koşulun önceki koşullarla nasıl birleştirileceğini belirler
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}

            <Button onClick={addCondition} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kriter Ekle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}