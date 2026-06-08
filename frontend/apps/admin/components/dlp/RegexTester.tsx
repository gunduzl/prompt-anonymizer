import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Badge } from "../ui/Badge";
import { FlaskConical, Play, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RegexTestResult {
  valid: boolean;
  matches: Array<{ text: string; start: number; end: number }>;
  error?: string;
  match_count?: number;
}

interface RegexTesterProps {
  pattern: string;
  onPatternChange: (pattern: string) => void;
  locale?: "en" | "tr";
}

export default function RegexTester({ pattern, onPatternChange, locale = "en" }: RegexTesterProps) {
  const [testText, setTestText] = useState("");
  const [result, setResult] = useState<RegexTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const t = {
    title: locale === "en" ? "Regex Tester" : "Regex Test",
    pattern: locale === "en" ? "Regex Pattern" : "Regex Pattern",
    testText: locale === "en" ? "Test text (paste sample data to test matches)" : "Test metni (eşleşmeleri test etmek için örnek veri yapıştırın)",
    run: locale === "en" ? "Run Test" : "Test Et",
    valid: locale === "en" ? "Valid regex" : "Geçerli regex",
    invalid: locale === "en" ? "Invalid regex" : "Geçersiz regex",
    matches: locale === "en" ? "matches found" : "eşleşme bulundu",
    noMatches: locale === "en" ? "No matches found" : "Eşleşme bulunamadı",
    highlighted: locale === "en" ? "Highlighted Results" : "Vurgulanan Sonuçlar",
    matchList: locale === "en" ? "Match List" : "Eşleşme Listesi",
  };

  const testRegex = async () => {
    if (!pattern || !testText) return;
    setTesting(true);
    setClientError(null);
    setResult(null);

    try {
      // Try client-side validation first
      new RegExp(pattern);
    } catch (e: any) {
      setClientError(e.message);
      setTesting(false);
      return;
    }

    try {
      const res = await axiosWithAuth.post(`${API}/admin/dlp/regex-test`, {
        pattern,
        test_text: testText,
      });
      setResult(res.data);
    } catch (err: any) {
      // Fallback to client-side testing
      try {
        const re = new RegExp(pattern, "g");
        const matches: Array<{ text: string; start: number; end: number }> = [];
        let m;
        while ((m = re.exec(testText)) !== null) {
          matches.push({ text: m[0], start: m.index, end: m.index + m[0].length });
          if (!re.global) break;
        }
        setResult({ valid: true, matches, match_count: matches.length });
      } catch (e2: any) {
        setClientError(e2.message);
      }
    } finally {
      setTesting(false);
    }
  };

  const renderHighlighted = () => {
    if (!result || !result.matches || result.matches.length === 0) return testText;
    const sorted = [...result.matches].sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    sorted.forEach((match, i) => {
      if (match.start > lastEnd) {
        parts.push(<span key={`t-${i}`}>{testText.slice(lastEnd, match.start)}</span>);
      }
      parts.push(
        <mark
          key={`m-${i}`}
          className="bg-primary/30 text-primary-foreground rounded px-0.5 py-0 border border-primary/50 font-medium"
          title={`Match ${i + 1}: "${match.text}"`}
        >
          {match.text}
        </mark>
      );
      lastEnd = match.end;
    });

    if (lastEnd < testText.length) {
      parts.push(<span key="end">{testText.slice(lastEnd)}</span>);
    }

    return parts;
  };

  return (
    <div className="space-y-3 mt-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">{t.title}</span>
      </div>

      {/* Pattern Input */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{t.pattern}</label>
        <Input
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          placeholder="\\b\\d{3}-\\d{2}-\\d{4}\\b"
          className="font-mono text-sm"
        />
      </div>

      {/* Test Text */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{t.testText}</label>
        <Textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder={locale === "en" ? "e.g. My SSN is 123-45-6789 and phone is 555-123-4567" : "ör. SSN numaram 123-45-6789 ve telefonum 555-123-4567"}
          rows={3}
          className="font-mono text-sm"
        />
      </div>

      {/* Run Button */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={testRegex} disabled={testing || !pattern || !testText}>
          <Play className="h-3 w-3 mr-1" />
          {t.run}
        </Button>
        {clientError && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <XCircle className="h-3 w-3" />
            {t.invalid}: {clientError}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {result.matches && result.matches.length > 0 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="success">{result.matches.length} {t.matches}</Badge>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <Badge variant="warning">{t.noMatches}</Badge>
              </>
            )}
            {result.error && (
              <span className="text-xs text-destructive">{result.error}</span>
            )}
          </div>

          {/* Highlighted Text */}
          {result.matches && result.matches.length > 0 && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.highlighted}</label>
                <div className="p-3 border rounded-lg bg-background text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
                  {renderHighlighted()}
                </div>
              </div>

              {/* Match List */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t.matchList}</label>
                <div className="flex flex-wrap gap-1">
                  {result.matches.map((m, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {m.text}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
