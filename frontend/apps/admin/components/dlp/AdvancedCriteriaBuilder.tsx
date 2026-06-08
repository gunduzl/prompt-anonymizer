import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Plus, Trash2, ChevronDown, ChevronRight, AlertCircle, Code, User, FileText, HardDrive } from 'lucide-react';
import axios from 'axios';

interface Entity {
  id: string;
  name: string;
  type: string;
  category: string;
}

interface CriteriaCondition {
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

interface AdvancedCriteriaBuilderProps {
  criteria: CriteriaCondition[];
  onChange: (criteria: CriteriaCondition[]) => void;
}

const CONDITION_TYPES = [
  { value: 'prompt_contains', label: 'Prompt Contains', icon: FileText },
  { value: 'entity_detected', label: 'Entity Detected', icon: AlertCircle },
  { value: 'user_is', label: 'User Is', icon: User },
  { value: 'regex', label: 'Regex Pattern', icon: Code },
  { value: 'file_type', label: 'File Type', icon: FileText },
  { value: 'file_size', label: 'File Size', icon: HardDrive },
];

const LOGICAL_OPERATORS = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
];

export default function AdvancedCriteriaBuilder({ criteria, onChange }: AdvancedCriteriaBuilderProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedConditions, setExpandedConditions] = useState<string[]>([]);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
      const token = localStorage.getItem("auth_token");
      const response = await axios.get(`${API}/admin/dlp/entities`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setEntities(response.data.entities || []);
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCriteriaCondition = () => {
    const newCondition: CriteriaCondition = {
      id: `condition_${Date.now()}`,
      condition_type: 'prompt_contains',
      logical_operator: 'AND',
      negate: false,
    };
    onChange([...criteria, newCondition]);
    setExpandedConditions([...expandedConditions, newCondition.id]);
  };

  const updateCriteriaCondition = (id: string, updates: Partial<CriteriaCondition>) => {
    const updatedCriteria = criteria.map(condition =>
      condition.id === id ? { ...condition, ...updates } : condition
    );
    onChange(updatedCriteria);
  };

  const removeCriteriaCondition = (id: string) => {
    const updatedCriteria = criteria.filter(condition => condition.id !== id);
    onChange(updatedCriteria);
    setExpandedConditions(expandedConditions.filter(expId => expId !== id));
  };

  const toggleConditionExpansion = (id: string) => {
    if (expandedConditions.includes(id)) {
      setExpandedConditions(expandedConditions.filter(expId => expId !== id));
    } else {
      setExpandedConditions([...expandedConditions, id]);
    }
  };

  const renderConditionContent = (condition: CriteriaCondition) => {
    const isExpanded = expandedConditions.includes(condition.id);
    const ConditionIcon = CONDITION_TYPES.find(t => t.value === condition.condition_type)?.icon || AlertCircle;

    return (
      <Card key={condition.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleConditionExpansion(condition.id)}
                className="p-1"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <ConditionIcon className="h-4 w-4 text-blue-600" />
              <div className="flex items-center space-x-2">
                <Badge variant={condition.negate ? "destructive" : "secondary"}>
                  {condition.negate ? "NOT" : condition.logical_operator}
                </Badge>
                <span className="font-medium">
                  {CONDITION_TYPES.find(t => t.value === condition.condition_type)?.label}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeCriteriaCondition(condition.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Condition Type</label>
                  <select
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    value={condition.condition_type}
                    onChange={(e) => updateCriteriaCondition(condition.id, { condition_type: e.target.value as CriteriaCondition["condition_type"] })}
                  >
                    {CONDITION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Logical Operator</label>
                  <select
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    value={condition.logical_operator}
                    onChange={(e) => updateCriteriaCondition(condition.id, { logical_operator: e.target.value as CriteriaCondition["logical_operator"] })}
                  >
                    {LOGICAL_OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`negate-${condition.id}`}
                    checked={condition.negate}
                    onChange={(e) => updateCriteriaCondition(condition.id, { negate: e.target.checked })}
                  />
                  <label htmlFor={`negate-${condition.id}`} className="text-sm font-medium">Negate (NOT)</label>
                </div>
              </div>

              <hr className="my-4" />

              {/* Condition-specific content */}
              {renderConditionSpecificContent(condition)}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderConditionSpecificContent = (condition: CriteriaCondition) => {
    switch (condition.condition_type) {
      case 'prompt_contains':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium">Text Patterns</label>
            <div className="space-y-2">
              {(condition.text_patterns || []).map((pattern, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={pattern}
                    onChange={(e) => {
                      const newPatterns = [...(condition.text_patterns || [])];
                      newPatterns[index] = e.target.value;
                      updateCriteriaCondition(condition.id, { text_patterns: newPatterns });
                    }}
                    placeholder="Enter text pattern..."
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPatterns = (condition.text_patterns || []).filter((_, i) => i !== index);
                      updateCriteriaCondition(condition.id, { text_patterns: newPatterns });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPatterns = [...(condition.text_patterns || []), ''];
                  updateCriteriaCondition(condition.id, { text_patterns: newPatterns });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pattern
              </Button>
            </div>
          </div>
        );

      case 'entity_detected':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium">Entity Types</label>
            <select
              className="w-full px-3 py-2 border border-input bg-background rounded-md"
              value={condition.entity_types?.[0] || ''}
              onChange={(e) => updateCriteriaCondition(condition.id, { entity_types: [e.target.value] })}
            >
              <option value="">Select entity type...</option>
              {entities.map(entity => (
                <option key={entity.id} value={entity.type}>
                  {entity.name} ({entity.category})
                </option>
              ))}
            </select>
          </div>
        );

      case 'regex':
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium">Regex Pattern</label>
            <textarea
              value={condition.regex_pattern || ''}
              onChange={(e) => updateCriteriaCondition(condition.id, { regex_pattern: e.target.value })}
              placeholder="Enter regex pattern..."
              className="w-full px-3 py-2 border border-input bg-background rounded-md font-mono"
              rows={3}
            />
            <div className="text-sm text-gray-600">
              <p>Examples:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>\b\d{3}-\d{2}-\d{4}\b</code> - SSN pattern</li>
                <li><code>\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{'{2,}'}\b</code> - Email pattern</li>
              </ul>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            Configuration for {condition.condition_type} will be available soon.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Advanced Criteria Builder</h3>
          <p className="text-sm text-gray-600">
            Define complex conditions using logical operators and multiple criteria types
          </p>
        </div>
        <Button onClick={addCriteriaCondition} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Condition</span>
        </Button>
      </div>

      {criteria.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Criteria Defined</h3>
            <p className="text-gray-600 mb-4">
              Add your first condition to start building complex rule criteria
            </p>
            <Button onClick={addCriteriaCondition}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Condition
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {criteria.map((condition, index) => (
            <div key={condition.id}>
              {index > 0 && (
                <div className="flex justify-center py-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {condition.logical_operator}
                  </Badge>
                </div>
              )}
              {renderConditionContent(condition)}
            </div>
          ))}
        </div>
      )}

      {criteria.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Criteria Summary</h4>
          <div className="text-sm text-blue-800">
            <p>Total Conditions: {criteria.length}</p>
            <p>Active Operators: {Array.from(new Set(criteria.map(c => c.logical_operator))).join(', ')}</p>
            <p>Negated Conditions: {criteria.filter(c => c.negate).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
