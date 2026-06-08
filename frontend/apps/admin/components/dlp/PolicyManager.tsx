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
} from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

interface Policy {
  id: string;
  name: string;
  entity_type: string;
  action: "allow" | "mask" | "block";
  configuration: any;
  priority: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
}

interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  policies: Partial<Policy>[];
}

interface BulkOperation {
  operation: "activate" | "deactivate" | "delete" | "update_priority";
  policy_ids: string[];
  data?: any;
}

interface PolicyManagerProps {
  onPolicyChange?: () => void;
}

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function PolicyManager({ onPolicyChange }: PolicyManagerProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<"all" | "allow" | "mask" | "block">("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"priority" | "name" | "created_at">("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  
  const [newPolicy, setNewPolicy] = useState<Partial<Policy>>({
    name: "",
    entity_type: "",
    action: "mask",
    priority: 1,
    description: "",
    configuration: {},
    is_active: true,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      
      if (filterAction !== "all") params.append("action", filterAction);
      if (filterActive === "active") params.append("is_active", "true");
      if (filterActive === "inactive") params.append("is_active", "false");
      if (searchTerm) params.append("search", searchTerm);

      const response = await axiosWithAuth.get(`${API}/admin/dlp/policies/advanced?${params}`);
      setPolicies(response.data.policies || []);
        setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
    } catch (error) {
      console.error("Error loading policies:", error);
      setPolicies([]); // Ensure policies is always an array
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/dlp/templates`);
      setTemplates(response.data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      setTemplates([]); // Ensure templates is always an array
    }
  };

  const createPolicy = async () => {
    if (!newPolicy.name || !newPolicy.entity_type) {
      alert("Policy name and entity type are required");
      return;
    }

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/dlp/policies`, newPolicy);
      setNewPolicy({
        name: "",
        entity_type: "",
        action: "mask",
        priority: 1,
        description: "",
        configuration: {},
        is_active: true,
      });
      setShowAddForm(false);
      loadPolicies();
      onPolicyChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Policy could not be created");
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (policyId: string, updates: Partial<Policy>) => {
    setLoading(true);
    try {
      await axiosWithAuth.put(`${API}/admin/dlp/policies/${policyId}`, updates);
      loadPolicies();
      onPolicyChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Policy could not be updated");
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (policyId: string) => {
    if (!confirm("Delete this policy?")) return;

    setLoading(true);
    try {
      await axiosWithAuth.delete(`${API}/admin/dlp/policies/${policyId}`);
      loadPolicies();
      onPolicyChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Policy silinemedi");
    } finally {
      setLoading(false);
    }
  };

  const reorderPolicy = async (policyId: string, direction: "up" | "down") => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    const newPriority = direction === "up" ? policy.priority - 1 : policy.priority + 1;
    if (newPriority < 1) return;

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/dlp/policies/reorder`, {
        policy_id: policyId,
        new_priority: newPriority,
      });
      loadPolicies();
      onPolicyChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Policy order could not be changed");
    } finally {
      setLoading(false);
    }
  };

  const bulkOperation = async (operation: BulkOperation) => {
    if (operation.policy_ids.length === 0) {
      alert("Please select at least one policy");
      return;
    }

    if (!confirm(`${operation.policy_ids.length} for policies ${operation.operation} operation should be applied?`)) {
      return;
    }

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/dlp/policies/bulk`, operation);
      setSelectedPolicies([]);
      loadPolicies();
      onPolicyChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Bulk operation failed");
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (templateId: string) => {
    if (!confirm("This template will be applied and existing policies may be affected. Continue?")) {
      return;
    }

    setLoading(true);
    try {
      await axiosWithAuth.post(`${API}/admin/dlp/templates/${templateId}/apply`);
      loadPolicies();
      onPolicyChange?.();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Template could not be applied");
    } finally {
      setLoading(false);
    }
  };

  const exportPolicies = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/admin/dlp/export?format=json`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dlp-policies-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Export failed");
    }
  };

  const togglePolicySelection = (policyId: string) => {
    setSelectedPolicies(prev => 
      prev.includes(policyId) 
        ? prev.filter(id => id !== policyId)
        : [...prev, policyId]
    );
  };

  const selectAllPolicies = () => {
    if (selectedPolicies.length === policies.length) {
      setSelectedPolicies([]);
    } else {
      setSelectedPolicies(policies.map(p => p.id));
    }
  };

  useEffect(() => {
    loadPolicies();
    loadTemplates();
  }, [pagination.page, sortBy, sortOrder, filterAction, filterActive, searchTerm]);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "block": return "destructive";
      case "mask": return "secondary";
      case "allow": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Policy Management</h3>
          <p className="text-muted-foreground">
            Manage and edit DLP policies
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportPolicies}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadPolicies} disabled={loading}>
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
          <div className="grid gap-4 md:grid-cols-5">
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
              onChange={(e) => setFilterAction(e.target.value as any)}
            >
              <option value="all">All Actions</option>
              <option value="allow">Allow</option>
              <option value="mask">Mask</option>
              <option value="block">Block</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
            >
              <option value="priority-desc">Priority (High to Low)</option>
              <option value="priority-asc">Priority (Low to High)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="created_at-desc">Date (Newest)</option>
              <option value="created_at-asc">Date (Oldest)</option>
            </select>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                Total: {pagination.total}
              </Badge>
              <Badge variant="secondary">
                Selected: {selectedPolicies.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Policy Templates</CardTitle>
            <CardDescription>
              Apply ready-made templates for quick policy setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant="outline">{template.policies.length} policy</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyTemplate(template.id)}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                onClick={() => bulkOperation({ operation: "activate", policy_ids: selectedPolicies })}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Enable
              </Button>
              <Button
                variant="outline"
                onClick={() => bulkOperation({ operation: "deactivate", policy_ids: selectedPolicies })}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Disable
              </Button>
              <Button
                variant="destructive"
                onClick={() => bulkOperation({ operation: "delete", policy_ids: selectedPolicies })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedPolicies([])}
              >
                Clear Selection
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
              Create a new DLP policy definition
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
                placeholder="Entity Type (e.g. PERSON, EMAIL)"
                value={newPolicy.entity_type}
                onChange={(e) => setNewPolicy({ ...newPolicy, entity_type: e.target.value.toUpperCase() })}
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
                placeholder="Priority (1-100)"
                type="number"
                min="1"
                max="100"
                value={newPolicy.priority}
                onChange={(e) => setNewPolicy({ ...newPolicy, priority: parseInt(e.target.value) })}
              />
              <Input
                placeholder="Description"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                className="md:col-span-2"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active_new"
                  checked={newPolicy.is_active}
                  onChange={(e) => setNewPolicy({ ...newPolicy, is_active: e.target.checked })}
                />
                <label htmlFor="is_active_new" className="text-sm">Active</label>
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

      {/* Policies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Policy List ({policies.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPolicies}
              >
                {selectedPolicies.length === policies.length ? "Clear All" : "Select All"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 ${
                  selectedPolicies.includes(policy.id) ? "bg-muted/50 border-primary" : ""
                }`}
              >
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedPolicies.includes(policy.id)}
                    onChange={() => togglePolicySelection(policy.id)}
                  />
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">{policy.priority}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{policy.name}</p>
                      <Badge variant="outline">{policy.entity_type}</Badge>
                      <Badge variant={getActionBadgeVariant(policy.action)}>
                        {policy.action.toUpperCase()}
                      </Badge>
                      {!policy.is_active && (
                        <Badge variant="secondary">INACTIVE</Badge>
                      )}
                    </div>
                    {policy.description && (
                      <p className="text-sm text-muted-foreground">
                        {policy.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created by: {policy.created_by} • {new Date(policy.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {policy.is_active ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reorderPolicy(policy.id, "up")}
                    disabled={policy.priority === 1}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reorderPolicy(policy.id, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
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
            {policies.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No policy found</p>
                <p className="text-sm">Check your filters or add a new policy</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {Math.max(((pagination.page - 1) * pagination.limit) + 1, 0)}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
