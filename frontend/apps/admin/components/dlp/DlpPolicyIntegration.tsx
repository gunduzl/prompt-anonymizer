import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { AlertTriangle, Shield, Eye, EyeOff, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface DlpPolicy {
  id: string;
  name: string;
  entity_type: string;
  action: 'allow' | 'mask' | 'block';
  priority: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

interface DlpPolicyIntegrationProps {
  onPolicyChange?: () => void;
}

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function DlpPolicyIntegration({ onPolicyChange }: DlpPolicyIntegrationProps) {
  const [policies, setPolicies] = useState<DlpPolicy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const response = await axiosWithAuth.get(`${API}/admin/policies`);
      setPolicies(response.data || []);
    } catch (error) {
      console.error('Failed to load DLP policies:', error);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePolicy = async (policyId: string, isActive: boolean) => {
    try {
      await axiosWithAuth.put(`${API}/admin/policies/${policyId}`, { is_active: isActive });
      await loadPolicies();
      onPolicyChange?.();
    } catch (error) {
      console.error('Failed to toggle policy:', error);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'block': return 'destructive';
      case 'mask': return 'secondary';
      case 'allow': return 'default';
      default: return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'block': return <AlertTriangle className="h-4 w-4" />;
      case 'mask': return <EyeOff className="h-4 w-4" />;
      case 'allow': return <Eye className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Mevcut DLP Kuralları</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPolicies}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Kurallar yükleniyor...</p>
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Henüz DLP kuralı bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getActionIcon(policy.action)}
                    <Badge variant={getActionColor(policy.action)}>
                      {policy.action.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium">{policy.name}</h4>
                    <p className="text-sm text-gray-500">
                      Entity: {policy.entity_type} | Öncelik: {policy.priority}
                    </p>
                    {policy.description && (
                      <p className="text-xs text-gray-400 mt-1">{policy.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={policy.is_active}
                    onCheckedChange={(checked) => togglePolicy(policy.id, checked)}
                  />
                  <span className="text-sm text-gray-500">
                    {policy.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Önemli Bilgi</h4>
              <p className="text-sm text-blue-700 mt-1">
                Bu kurallar her kullanıcı mesajında otomatik olarak kontrol edilir. 
                Kural değişiklikleri anında tüm sisteme yansır.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}