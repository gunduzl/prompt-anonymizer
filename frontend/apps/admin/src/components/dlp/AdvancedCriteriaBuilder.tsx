import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Label } from '../../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Separator } from '../../../components/ui/Separator';
import { Textarea } from '../../../components/ui/Textarea';
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

const USER_CONDITION_TYPES = [
  { value: 'role', label: 'Role' },
  { value: 'group', label: 'Group' },
  { value: 'department', label: 'Department' },
  { value: 'email_domain', label: 'Email Domain' },
];

const FILE_SIZE_UNITS = [
  { value: 'bytes', label: 'Bytes' },
  { value: 'kb', label: 'KB' },
  { value: 'mb', label: 'MB' },
  { value: 'gb', label: 'GB' },
];

const FILE_SIZE_OPERATORS = [
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'eq', label: 'Equal to' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lte', label: 'Less than or equal' },
];

export default function AdvancedCriteriaBuilder({ criteria, onChange }: AdvancedCriteriaBuilderProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/dlp/entities');
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
    setExpandedConditions(prev => new Set([...prev, newCondition.id]));
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
    setExpandedConditions(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const toggleConditionExpansion = (id: string) => {
    setExpandedConditions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderConditionContent = (condition: CriteriaCondition) => {
    const isExpanded = expandedConditions.has(condition.id);
    const ConditionIcon = CONDITION_TYPES.find(t => t.value === condition.condition_type)?.icon || AlertCircle;

    return (
      <Card key={condition.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
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
              variant="ghost"
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
                  <Label htmlFor={`condition-type-${condition.id}`}>Condition Type</Label>
                  <Select
                    value={condition.condition_type}
                    onValueChange={(value) => updateCriteriaCondition(condition.id, { condition_type: value as CriteriaCondition['condition_type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`logical-operator-${condition.id}`}>Logical Operator</Label>
                  <Select
                    value={condition.logical_operator}
                    onValueChange={(value) => updateCriteriaCondition(condition.id, { logical_operator: value as CriteriaCondition['logical_operator'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGICAL_OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`negate-${condition.id}`}
                    checked={condition.negate}
                    onCheckedChange={(checked) => updateCriteriaCondition(condition.id, { negate: checked })}
                  />
                  <Label htmlFor={`negate-${condition.id}`}>Negate (NOT)</Label>
                </div>
              </div>

              <Separator />

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
            <Label>Text Patterns</Label>
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
                    variant="ghost"
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
            <Label>Entity Types</Label>
            <Select
              value={condition.entity_types?.[0] || ''}
              onValueChange={(value) => updateCriteriaCondition(condition.id, { entity_types: [value] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity type..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map(entity => (
                  <SelectItem key={entity.id} value={entity.type}>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{entity.category}</Badge>
                      <span>{entity.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'user_is':
        return (
          <div className="space-y-3">
            <Label>User Conditions</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Condition Type</Label>
                <Select
                  value={condition.user_conditions?.type || ''}
                  onValueChange={(value) => updateCriteriaCondition(condition.id, {
                    user_conditions: { ...condition.user_conditions, type: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_CONDITION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  value={condition.user_conditions?.value || ''}
                  onChange={(e) => updateCriteriaCondition(condition.id, {
                    user_conditions: { ...condition.user_conditions, value: e.target.value }
                  })}
                  placeholder="Enter value..."
                />
              </div>
            </div>
          </div>
        );

      case 'regex':
        return (
          <div className="space-y-3">
            <Label>Regex Pattern</Label>
            <Textarea
              value={condition.regex_pattern || ''}
              onChange={(e) => updateCriteriaCondition(condition.id, { regex_pattern: e.target.value })}
              placeholder="Enter regex pattern..."
              className="font-mono"
            />
            <div className="text-sm text-gray-600">
              <p>Examples:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>\b\d{3}-\d{2}-\d{4}\b</code> - SSN pattern</li>
                <li><code>\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{'{2,}'}\b</code> - Email pattern</li>
                <li><code>\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b</code> - Credit card pattern</li>
              </ul>
            </div>
          </div>
        );

      case 'file_type':
        return (
          <div className="space-y-3">
            <Label>File Extensions</Label>
            <div className="space-y-2">
              {(condition.file_conditions?.extensions || []).map((ext: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={ext}
                    onChange={(e) => {
                      const newExtensions = [...(condition.file_conditions?.extensions || [])];
                      newExtensions[index] = e.target.value;
                      updateCriteriaCondition(condition.id, {
                        file_conditions: { ...condition.file_conditions, extensions: newExtensions }
                      });
                    }}
                    placeholder="e.g., pdf, docx, xlsx"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newExtensions = (condition.file_conditions?.extensions || []).filter((_: any, i: number) => i !== index);
                      updateCriteriaCondition(condition.id, {
                        file_conditions: { ...condition.file_conditions, extensions: newExtensions }
                      });
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
                  const newExtensions = [...(condition.file_conditions?.extensions || []), ''];
                  updateCriteriaCondition(condition.id, {
                    file_conditions: { ...condition.file_conditions, extensions: newExtensions }
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Extension
              </Button>
            </div>
          </div>
        );

      case 'file_size':
        return (
          <div className="space-y-3">
            <Label>File Size Condition</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Operator</Label>
                <Select
                  value={condition.file_conditions?.operator || 'gt'}
                  onValueChange={(value) => updateCriteriaCondition(condition.id, {
                    file_conditions: { ...condition.file_conditions, operator: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_SIZE_OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Size</Label>
                <Input
                  type="number"
                  value={condition.file_conditions?.size || ''}
                  onChange={(e) => updateCriteriaCondition(condition.id, {
                    file_conditions: { ...condition.file_conditions, size: parseInt(e.target.value) || 0 }
                  })}
                  placeholder="Enter size..."
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={condition.file_conditions?.unit || 'mb'}
                  onValueChange={(value) => updateCriteriaCondition(condition.id, {
                    file_conditions: { ...condition.file_conditions, unit: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_SIZE_UNITS.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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
            <p>Active Operators: {criteria.map(c => c.logical_operator).filter((op, i, arr) => arr.indexOf(op) === i).join(', ')}</p>
            <p>Negated Conditions: {criteria.filter(c => c.negate).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}