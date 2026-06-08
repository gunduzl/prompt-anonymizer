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
  ArrowUp,
  ArrowDown,
  Copy,
  Settings,
  Users,
  FileText,
  MoreHorizontal,
  GripVertical,
  Move,
} from "lucide-react";
import axios from "axios";

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

interface PolicyRuleAdvanced {
  id: string;
  name: string;
  entity_type: string;
  action: "allow" | "mask" | "block";
  priority: number;
  description?: string;
  config?: any;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  parent_rule_id?: string;
  children?: PolicyRuleAdvanced[];
  rule_group?: string;
  conditions?: any[];
  exceptions?: string[];
}

interface DragDropPolicyManagerProps {
  onPolicyChange?: () => void;
}

export default function DragDropPolicyManager({ onPolicyChange }: DragDropPolicyManagerProps) {
  const [policies, setPolicies] = useState<PolicyRuleAdvanced[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [draggedItem, setDraggedItem] = useState<PolicyRuleAdvanced | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyRuleAdvanced | null>(null);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [newPolicy, setNewPolicy] = useState<Partial<PolicyRuleAdvanced>>({
    name: "",
    entity_type: "",
    action: "mask",
    priority: 1,
    description: "",
    config: {},
    is_active: true,
    rule_group: "",
    conditions: [],
    exceptions: [],
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const response = await axiosWithAuth.get(`${API}/dlp/policies/advanced`);
      setPolicies(response.data.policies || []);
    } catch (error) {
      console.error("Policies could not be loaded:", error);
      setPolicies([]); // Ensure policies is always an array
    } finally {
      setLoading(false);
    }
  };

  const createPolicy = async () => {
    if (!newPolicy.name || !newPolicy.entity_type) return;

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/dlp/policies/advanced`, newPolicy);
      await loadPolicies();
      setNewPolicy({
        name: "",
        entity_type: "",
        action: "mask",
        priority: 1,
        description: "",
        config: {},
        is_active: true,
        rule_group: "",
        conditions: [],
        exceptions: [],
      });
      setShowAddForm(false);
      onPolicyChange?.();
    } catch (error) {
      console.error("Policy could not be created:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (policyId: string, updates: Partial<PolicyRuleAdvanced>) => {
    setLoading(true);
    try {
      await axiosWithAuth.put(`${API}/dlp/policies/advanced/${policyId}`, updates);
      await loadPolicies();
      onPolicyChange?.();
    } catch (error) {
      console.error("Policy could not be updated:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    setLoading(true);
    try {
      await axiosWithAuth.delete(`${API}/dlp/policies/advanced/${policyId}`);
      await loadPolicies();
      onPolicyChange?.();
    } catch (error) {
      console.error("Policy silinemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const reorderPolicies = async (newOrder: PolicyRuleAdvanced[]) => {
    const reorderData = newOrder.map((policy, index) => ({
      id: policy.id,
      priority: newOrder.length - index,
    }));

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/dlp/policies/reorder`, { policies: reorderData });
      await loadPolicies();
      onPolicyChange?.();
    } catch (error) {
      console.error("Policy order could not be updated:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, policy: PolicyRuleAdvanced) => {
    setDraggedItem(policy);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverItem(targetId);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetPolicy: PolicyRuleAdvanced) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetPolicy.id) return;

    const newPolicies = [...policies];
    const draggedIndex = newPolicies.findIndex(p => p.id === draggedItem.id);
    const targetIndex = newPolicies.findIndex(p => p.id === targetPolicy.id);

    // Remove dragged item and insert at target position
    const [removed] = newPolicies.splice(draggedIndex, 1);
    newPolicies.splice(targetIndex, 0, removed);

    setPolicies(newPolicies);
    reorderPolicies(newPolicies);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const togglePolicySelection = (policyId: string) => {
    setSelectedPolicies(prev => 
      prev.includes(policyId) 
        ? prev.filter(id => id !== policyId)
        : [...prev, policyId]
    );
  };

  const selectAllPolicies = () => {
    if (selectedPolicies.length === filteredPolicies.length) {
      setSelectedPolicies([]);
    } else {
      setSelectedPolicies(filteredPolicies.map(p => p.id));
    }
  };

  const bulkUpdatePolicies = async (action: string) => {
    if (selectedPolicies.length === 0) return;

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/dlp/policies/bulk`, {
        operation: action,
        policy_ids: selectedPolicies,
      });
      await loadPolicies();
      setSelectedPolicies([]);
      onPolicyChange?.();
    } catch (error) {
      console.error("Bulk operation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const duplicatePolicy = async (policy: PolicyRuleAdvanced) => {
    const duplicated = {
      ...policy,
      name: `${policy.name} (Copy)`,
      id: undefined,
      priority: policy.priority + 1,
    };
    delete duplicated.id;

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/dlp/policies/advanced`, duplicated);
      await loadPolicies();
      onPolicyChange?.();
    } catch (error) {
      console.error("Policy could not be duplicated:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "all" || policy.action === filterAction;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && policy.is_active) ||
                         (filterStatus === "inactive" && !policy.is_active);
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  const groupedPolicies = filteredPolicies.reduce((groups, policy) => {
    const group = policy.rule_group || "General";
    if (!groups[group]) groups[group] = [];
    groups[group].push(policy);
    return groups;
  }, {} as Record<string, PolicyRuleAdvanced[]>);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "block": return "destructive";
      case "mask": return "secondary";
      case "allow": return "default";
      default: return "outline";
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "text-red-500";
    if (priority >= 5) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Advanced Policy Management</h3>
          <p className="text-muted-foreground">
            Hierarchical policy management with drag and drop ordering
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadPolicies} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters and Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="allow">Allow</option>
              <option value="mask">Mask</option>
              <option value="block">Block</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Button variant="outline" onClick={selectAllPolicies}>
              {selectedPolicies.length === filteredPolicies.length ? "Clear All" : "Select All"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions ({selectedPolicies.length} selected)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => bulkUpdatePolicies("activate")}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Enable
              </Button>
              <Button
                variant="outline"
                onClick={() => bulkUpdatePolicies("deactivate")}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Disable
              </Button>
              <Button
                variant="destructive"
                onClick={() => bulkUpdatePolicies("delete")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Policy Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Add Policy</CardTitle>
            <CardDescription>
              Create an advanced DLP policy definition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Policy Name"
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
              />
              <Input
                placeholder="Entity Type"
                value={newPolicy.entity_type}
                onChange={(e) => setNewPolicy({ ...newPolicy, entity_type: e.target.value })}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newPolicy.action}
                onChange={(e) => setNewPolicy({ ...newPolicy, action: e.target.value as any })}
              >
                <option value="allow">Allow</option>
                <option value="mask">Mask</option>
                <option value="block">Block</option>
              </select>
              <Input
                placeholder="Priority (1-10)"
                type="number"
                min="1"
                max="10"
                value={newPolicy.priority}
                onChange={(e) => setNewPolicy({ ...newPolicy, priority: parseInt(e.target.value) })}
              />
              <Input
                placeholder="Rule Group (optional)"
                value={newPolicy.rule_group}
                onChange={(e) => setNewPolicy({ ...newPolicy, rule_group: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newPolicy.is_active}
                  onChange={(e) => setNewPolicy({ ...newPolicy, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={createPolicy} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped Policies List */}
      <div className="space-y-4">
        {Object.entries(groupedPolicies).map(([groupName, groupPolicies]) => (
          <Card key={groupName}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle 
                  className="cursor-pointer flex items-center space-x-2"
                  onClick={() => toggleGroup(groupName)}
                >
                  <span>{groupName} ({groupPolicies.length})</span>
                  {expandedGroups.has(groupName) ? (
                    <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            {expandedGroups.has(groupName) && (
              <CardContent>
                <div className="space-y-2">
                  {groupPolicies
                    .sort((a, b) => b.priority - a.priority)
                    .map((policy) => (
                      <div
                        key={policy.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, policy)}
                        onDragOver={(e) => handleDragOver(e, policy.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, policy)}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-move hover:bg-muted/50 transition-colors ${
                          selectedPolicies.includes(policy.id) ? "bg-muted/50 border-primary" : ""
                        } ${
                          dragOverItem === policy.id ? "border-primary border-2" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedPolicies.includes(policy.id)}
                            onChange={() => togglePolicySelection(policy.id)}
                          />
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPriorityColor(policy.priority)}`}>
                            {policy.priority}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">{policy.name}</p>
                              <Badge variant="outline">{policy.entity_type}</Badge>
                              <Badge variant={getActionBadgeVariant(policy.action)}>
                                {policy.action}
                              </Badge>
                              <Badge variant={policy.is_active ? "default" : "secondary"}>
                                {policy.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            {policy.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {policy.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicatePolicy(policy)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePolicy(policy.id, { is_active: !policy.is_active })}
                          >
                            {policy.is_active ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPolicy(policy)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePolicy(policy.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {Object.keys(groupedPolicies).length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No policy found</p>
            <p className="text-sm text-muted-foreground">Check your filters or add a new policy</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
