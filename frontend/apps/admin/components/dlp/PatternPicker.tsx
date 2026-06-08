import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Search, X, ChevronDown, ChevronRight, Zap } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface PatternItem {
  name: string;
  display_name: string;
  pattern: string;
  category: string;
  description: string;
  action?: string;
  keyword_pattern?: string;
  allow_word_numbers?: boolean;
}

interface PatternPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (pattern: PatternItem) => void;
  locale?: "en" | "tr";
}

const CATEGORY_COLORS: Record<string, string> = {
  "PII Patterns": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Payment Card Patterns": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "Credential Patterns": "bg-red-500/10 text-red-400 border-red-500/30",
  "Network Patterns": "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  "Protected Class - Fair Lending": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Dangerous Content": "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Dangerous Content - High Risk": "bg-red-600/10 text-red-500 border-red-600/30",
  "Dangerous Content - Crisis": "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "Dangerous Content - Illegal": "bg-rose-500/10 text-rose-400 border-rose-500/30",
  "Brazilian PII Patterns": "bg-green-500/10 text-green-400 border-green-500/30",
  "EU PII Patterns": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "Aviation PII Patterns": "bg-sky-500/10 text-sky-400 border-sky-500/30",
  "Singapore PII Patterns": "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "UAE PII Patterns": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "Canadian PII Patterns": "bg-rose-500/10 text-rose-400 border-rose-500/30",
  "Canadian Institutional Identifiers (FIPPA)": "bg-violet-500/10 text-violet-400 border-violet-500/30",
};

const CATEGORY_ICONS: Record<string, string> = {
  "PII Patterns": "🔒",
  "Payment Card Patterns": "💳",
  "Credential Patterns": "🔑",
  "Network Patterns": "🌐",
  "Protected Class - Fair Lending": "⚖️",
  "Dangerous Content": "⚠️",
  "Dangerous Content - High Risk": "🚨",
  "Dangerous Content - Crisis": "🆘",
  "Dangerous Content - Illegal": "🚫",
  "Brazilian PII Patterns": "🇧🇷",
  "EU PII Patterns": "🇪🇺",
  "Aviation PII Patterns": "✈️",
  "Singapore PII Patterns": "🇸🇬",
  "UAE PII Patterns": "🇦🇪",
  "Canadian PII Patterns": "🇨🇦",
  "Canadian Institutional Identifiers (FIPPA)": "🏛️",
};

export default function PatternPicker({ open, onClose, onSelect, locale = "en" }: PatternPickerProps) {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const t = {
    title: locale === "en" ? "Select from Pattern Library" : "Pattern Kütüphanesinden Seç",
    search: locale === "en" ? "Search patterns..." : "Pattern ara...",
    loading: locale === "en" ? "Loading patterns..." : "Patternler yükleniyor...",
    empty: locale === "en" ? "No patterns found" : "Pattern bulunamadı",
    close: locale === "en" ? "Close" : "Kapat",
    select: locale === "en" ? "Select" : "Seç",
    patterns: locale === "en" ? "patterns" : "pattern",
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axiosWithAuth
      .get(`${API}/admin/dlp/patterns`)
      .then((res) => setPatterns(res.data.patterns || res.data || []))
      .catch(() => setPatterns([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return patterns;
    const q = search.toLowerCase();
    return patterns.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.display_name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [patterns, search]);

  const grouped = useMemo(() => {
    const map: Record<string, PatternItem[]> = {};
    filtered.forEach((p) => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  useEffect(() => {
    if (search && grouped.length > 0) {
      setExpandedCats(new Set(grouped.map(([cat]) => cat)));
    }
  }, [search, grouped.length]);

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t.title}</h3>
            <Badge variant="secondary">{filtered.length} {t.patterns}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Pattern List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshIcon className="h-5 w-5 animate-spin mr-2" />
              {t.loading}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.empty}</div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category} className="mb-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => toggleCat(category)}
                >
                  {expandedCats.has(category) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-base">{CATEGORY_ICONS[category] || "📋"}</span>
                  <span className="font-medium text-sm">{category}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{items.length}</Badge>
                </button>
                {expandedCats.has(category) && (
                  <div className="ml-6 mr-2 mb-2 space-y-1">
                    {items.map((p) => (
                      <button
                        key={p.name}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all group"
                        onClick={() => onSelect(p)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{p.display_name}</span>
                          <Badge className={`text-xs ${CATEGORY_COLORS[category] || ""}`}>
                            {p.action || "DETECT"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                        <p className="text-xs text-muted-foreground/60 font-mono mt-0.5 truncate">{p.pattern.slice(0, 60)}...</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
