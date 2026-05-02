import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useTranslation } from "next-i18next";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import LanguageToggle from "../components/LanguageToggle";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type Session = { id: string; title?: string; created_at: string };
type Message = {
  id: string;
  role: string;
  content: string;
  dlp_status?: string;
  flags?: string[];
  created_at: string;
  dlp_info?: {
    original_text?: string;
    masked_text?: string;
    placeholder_text?: string;
    placeholder_mappings?: Record<string, any>;
    recognitions?: Array<{
      entity_type: string;
      start: number;
      end: number;
      score: number;
    }>;
  };
};

const axiosWithAuth = axios.create();
axiosWithAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface HomeProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export default function Home({ isDark, toggleTheme }: HomeProps) {
  const { t } = useTranslation("common");

  const ENTITY_META: Record<
    string,
    { emoji: string; label: string; color: string }
  > = {
    EMAIL_ADDRESS: {
      emoji: "📧",
      label: t("entities.email"),
      color: "#1d4ed8",
    },
    PHONE_NUMBER: { emoji: "📞", label: t("entities.phone"), color: "#166534" },
    NATIONAL_ID_TR: {
      emoji: "🆔",
      label: t("entities.nationalId"),
      color: "#7f1d1d",
    },
    CREDIT_CARD: {
      emoji: "💳",
      label: t("entities.creditCard"),
      color: "#5b21b6",
    },
    CREDIT_CARD_CVV: {
      emoji: "💳",
      label: t("entities.cvv"),
      color: "#5b21b6",
    },
    IP_ADDRESS: { emoji: "🌐", label: t("entities.ip"), color: "#9a3412" },
    IBAN_CODE: { emoji: "💲", label: t("entities.iban"), color: "#78350f" },
    PERSON: { emoji: "👤", label: t("entities.person"), color: "#334155" },
    LOCATION: { emoji: "📍", label: t("entities.location"), color: "#334155" },
    URL: { emoji: "🔗", label: t("entities.url"), color: "#334155" },
    DATE_TIME: { emoji: "🗓️", label: t("entities.dateTime"), color: "#334155" },
  };
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email_or_username: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    username: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [dlpBlockedData, setDlpBlockedData] = useState<any>(null);
  const [showDlpEditor, setShowDlpEditor] = useState(false);
  const [editableAnonymizedText, setEditableAnonymizedText] = useState("");

  // New PII Preview states
  const [showPiiPreview, setShowPiiPreview] = useState(false);
  const [piiPreviewData, setPiiPreviewData] = useState<any>(null);
  const [selectedEntityIndex, setSelectedEntityIndex] = useState<number | null>(
    null,
  );

  // Session management states
  const [showSessionMenu, setShowSessionMenu] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // PII highlighting colors
  const PII_COLORS = [
    "#ef4444", // red-500
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
    "#84cc16", // lime-500
    "#ec4899", // pink-500
    "#6366f1", // indigo-500
  ];

  // Enhanced highlighting function with selection support
  const renderHighlightedTextWithSelection = (
    text: string,
    highlights: Array<{ start: number; end: number; entity_type: string }>,
    isOriginal: boolean,
  ) => {
    if (!highlights || highlights.length === 0) {
      return <span>{text}</span>;
    }

    const parts = [];
    let lastIndex = 0;

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

    sortedHighlights.forEach((highlight, index) => {
      const { start, end, entity_type } = highlight;

      // Add text before highlight
      if (start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>{text.slice(lastIndex, start)}</span>,
        );
      }

      const entityMeta = ENTITY_META[entity_type] || {
        emoji: "🔍",
        label: entity_type,
        color: "#6b7280",
      };

      const isSelected = selectedEntityIndex === index;
      const highlightColor = PII_COLORS[index % PII_COLORS.length];
      const highlightedText = text.slice(start, end);

      // For original text, show the actual text with highlighting
      if (isOriginal) {
        parts.push(
          <span
            key={`highlight-${index}`}
            className={`inline-flex items-center px-1 py-0.5 rounded text-sm font-medium transition-all duration-200 ${
              isSelected ? "scale-105 shadow-md" : ""
            }`}
            style={{
              backgroundColor: isSelected
                ? `${highlightColor}20`
                : `${entityMeta.color}15`,
              color: isSelected ? highlightColor : entityMeta.color,
              border: isSelected
                ? `2px solid ${highlightColor}`
                : `1px solid ${entityMeta.color}30`,
            }}
          >
            <span className="mr-1">{entityMeta.emoji}</span>
            {highlightedText}
          </span>,
        );
      } else {
        // For anonymized text, show the placeholder
        const placeholderText = `[${entity_type}_${index + 1}]`;
        parts.push(
          <span
            key={`placeholder-${index}`}
            className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
              isSelected ? "scale-105 shadow-md" : ""
            }`}
            style={{
              backgroundColor: isSelected
                ? `${highlightColor}20`
                : `${entityMeta.color}15`,
              color: isSelected ? highlightColor : entityMeta.color,
              border: isSelected
                ? `2px solid ${highlightColor}`
                : `1px solid ${entityMeta.color}30`,
            }}
          >
            <span className="mr-1">{entityMeta.emoji}</span>
            {placeholderText}
          </span>,
        );
      }

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>,
      );
    }

    return <>{parts}</>;
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      setIsLoggedIn(true);
      loadSessions();
    }
  }, []);

  const handleUnauthorized = () => {
    localStorage.removeItem("auth_token");
    setIsLoggedIn(false);
    setCurrentSessionId(null);
    setMessages([]);
    setIsLoading(false);
    alert(
      "Oturumunuzun suresi dolmus veya gecersiz. Lutfen tekrar giris yapin.",
    );
  };

  const loadSessions = async () => {
    try {
      const response = await axiosWithAuth.get(`${API}/chat/sessions`);
      setSessions(response.data);
    } catch (error: any) {
      console.error("Error loading sessions:", error);
      if (error?.response?.status === 401) {
        handleUnauthorized();
      }
    }
  };

  const handleLogin = async () => {
    try {
      setLoginError("");
      const response = await axios.post(`${API}/auth/login`, loginForm);
      localStorage.setItem("auth_token", response.data.access_token);
      setIsLoggedIn(true);
      loadSessions();
    } catch (error: any) {
      setLoginError(error.response?.data?.detail || t("auth.loginError"));
    }
  };

  const handleRegister = async () => {
    try {
      setRegisterError("");
      setRegisterSuccess("");
      await axios.post(`${API}/auth/register`, registerForm);
      setRegisterSuccess(t("auth.registerSuccess"));
      setShowRegister(false);
      setRegisterForm({ email: "", username: "", password: "" });
    } catch (error: any) {
      setRegisterError(error.response?.data?.detail || t("auth.registerError"));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    try {
      setIsLoading(true);

      // First check for PII
      const piiResponse = await axiosWithAuth.post(`${API}/pii/preview`, {
        text: currentMessage,
      });

      if (
        piiResponse.data.recognitions &&
        piiResponse.data.recognitions.length > 0
      ) {
        // PII detected, show preview
        setPiiPreviewData({
          original_text: currentMessage,
          placeholder_text: piiResponse.data.placeholder_text,
          placeholder_mappings: piiResponse.data.placeholder_mappings,
          highlights: piiResponse.data.highlights || [],
          recognitions: piiResponse.data.recognitions,
        });
        setShowPiiPreview(true);
        setIsLoading(false);
        return;
      }

      // No PII detected, send directly
      await sendMessageToChat(currentMessage);
    } catch (error) {
      console.error("Error checking PII:", error);

      // Handle errors
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(
            "PII API Response Error:",
            error.response.status,
            error.response.data,
          );
          if (error.response.status === 401) {
            handleUnauthorized();
            return;
          }
          alert(`PII kontrolü sırasında hata: ${error.response.status}`);
        } else if (error.request) {
          console.error("PII API Request Error:", error.request);
          alert("PII kontrolü sırasında ağ hatası: Backend'e ulaşılamıyor");
        } else {
          console.error("PII API Setup Error:", error.message);
          alert(`PII kontrolü sırasında hata: ${error.message}`);
        }
      } else {
        alert(`PII kontrolü sırasında bilinmeyen hata: ${error}`);
      }

      setIsLoading(false);
    }
  };

  const sendMessageToChat = async (messageText: string) => {
    try {
      setIsLoading(true);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: messageText,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setCurrentMessage("");

      const response = await axiosWithAuth.post(`${API}/chat/send`, {
        text: messageText,
        session_id: currentSessionId,
      });

      if (response.data.session_id && !currentSessionId) {
        setCurrentSessionId(response.data.session_id);
        loadSessions();
      }

      const assistantMessage: Message = {
        id: Date.now().toString() + "_assistant",
        role: "assistant",
        content: response.data.reply,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      if (error.response?.status === 403 && error.response?.data?.dlp_info) {
        setDlpBlockedData(error.response.data);
        setEditableAnonymizedText(
          error.response.data.dlp_info.masked_text || "",
        );
        setShowDlpEditor(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWithPlaceholders = async () => {
    if (!piiPreviewData) return;

    try {
      setIsLoading(true);
      setShowPiiPreview(false);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: piiPreviewData.original_text,
        created_at: new Date().toISOString(),
        dlp_info: {
          original_text: piiPreviewData.original_text,
          placeholder_text: piiPreviewData.placeholder_text,
          placeholder_mappings: piiPreviewData.placeholder_mappings,
          recognitions: piiPreviewData.recognitions,
        },
      };

      setMessages((prev) => [...prev, userMessage]);
      setCurrentMessage("");

      const response = await axiosWithAuth.post(`${API}/chat/send`, {
        text: piiPreviewData.placeholder_text,
        session_id: currentSessionId,
      });

      if (response.data.session_id && !currentSessionId) {
        setCurrentSessionId(response.data.session_id);
        loadSessions();
      }

      // Restore placeholders in the response
      let restoredResponse = response.data.reply;
      if (piiPreviewData.placeholder_mappings) {
        try {
          const restoreResponse = await axiosWithAuth.post(
            `${API}/pii/restore`,
            {
              text: response.data.reply,
              placeholder_mappings: piiPreviewData.placeholder_mappings,
            },
          );
          restoredResponse = restoreResponse.data.restored_text;
        } catch (error) {
          console.error("Error restoring placeholders:", error);
        }
      }

      const assistantMessage: Message = {
        id: Date.now().toString() + "_assistant",
        role: "assistant",
        content: restoredResponse,
        created_at: new Date().toISOString(),
        dlp_info: {
          original_text: restoredResponse,
          masked_text: response.data.reply,
          placeholder_mappings: piiPreviewData.placeholder_mappings,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setPiiPreviewData(null);
    } catch (error: any) {
      console.error("Error sending message with placeholders:", error);
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      setShowPiiPreview(false);
      setPiiPreviewData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPiiPreview = () => {
    setShowPiiPreview(false);
    setPiiPreviewData(null);
    setIsLoading(false);
  };

  const handleSendAnonymizedMessage = async () => {
    if (!editableAnonymizedText.trim() || isLoading) return;

    try {
      setIsLoading(true);
      setShowDlpEditor(false);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: dlpBlockedData.original_message,
        dlp_status: "anonymized",
        flags: dlpBlockedData.flags,
        created_at: new Date().toISOString(),
        dlp_info: dlpBlockedData.dlp_info,
      };

      setMessages((prev) => [...prev, userMessage]);
      setCurrentMessage("");

      const response = await axiosWithAuth.post(`${API}/chat/send`, {
        text: editableAnonymizedText,
        session_id: currentSessionId,
      });

      if (response.data.session_id && !currentSessionId) {
        setCurrentSessionId(response.data.session_id);
        loadSessions();
      }

      const assistantMessage: Message = {
        id: Date.now().toString() + "_assistant",
        role: "assistant",
        content: response.data.reply,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setDlpBlockedData(null);
      setEditableAnonymizedText("");
    } catch (error) {
      console.error("Error sending anonymized message:", error);
      if ((error as any)?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderHighlightedText = (
    text: string,
    highlights: Array<{ start: number; end: number; type: string }>,
  ) => {
    if (!highlights || highlights.length === 0) return text;

    const result = [];
    let lastIndex = 0;

    highlights.forEach((highlight, index) => {
      if (highlight.start > lastIndex) {
        result.push(text.slice(lastIndex, highlight.start));
      }

      const highlightedText = text.slice(highlight.start, highlight.end);
      const entityMeta = ENTITY_META[highlight.type] || {
        emoji: "🔍",
        label: highlight.type,
        color: "#6b7280",
      };

      result.push(
        <span
          key={index}
          className="px-1 py-0.5 rounded text-white text-sm font-medium"
          style={{ backgroundColor: entityMeta.color }}
          title={`${entityMeta.label}: ${highlightedText}`}
        >
          {entityMeta.emoji} {highlightedText}
        </span>,
      );

      lastIndex = highlight.end;
    });

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    return result;
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const selectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const response = await axiosWithAuth.get(
        `${API}/chat/sessions/${sessionId}/messages`,
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error loading session messages:", error);
    }
  };

  // Session management functions
  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      await axiosWithAuth.patch(`${API}/chat/sessions/${sessionId}`, {
        title: newTitle,
      });
      loadSessions();
      setEditingSessionId(null);
      setEditingSessionTitle("");
      setShowSessionMenu(null);
    } catch (error) {
      console.error("Error renaming session:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await axiosWithAuth.delete(`${API}/chat/sessions/${sessionId}`);
      loadSessions();
      setShowSessionMenu(null);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const startEditingSession = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditingSessionTitle(currentTitle || "");
    setShowSessionMenu(null);
  };

  const cancelEditingSession = () => {
    setEditingSessionId(null);
    setEditingSessionTitle("");
  };

  const saveSessionTitle = (sessionId: string) => {
    if (editingSessionTitle.trim()) {
      handleRenameSession(sessionId, editingSessionTitle.trim());
    } else {
      cancelEditingSession();
    }
  };

  // Close session menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSessionMenu) {
        setShowSessionMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showSessionMenu]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Safe Chat
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {showRegister
                  ? t("auth.createAccount")
                  : t("auth.loginToAccount")}
              </p>
            </div>

            {showRegister ? (
              <div className="space-y-4">
                {registerError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {registerError}
                  </div>
                )}
                {registerSuccess && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                    {registerSuccess}
                  </div>
                )}
                <Input
                  type="email"
                  placeholder="E-posta"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                />
                <Input
                  type="text"
                  placeholder={t("auth.username")}
                  value={registerForm.username}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      username: e.target.value,
                    })
                  }
                />
                <Input
                  type="password"
                  placeholder={t("auth.password")}
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                />
                <Button onClick={handleRegister} className="w-full">
                  {t("auth.register")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRegister(false);
                    setRegisterError("");
                    setRegisterSuccess("");
                  }}
                  className="w-full"
                >
                  {t("auth.alreadyHaveAccount")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {loginError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {loginError}
                  </div>
                )}
                {registerSuccess && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                    {registerSuccess}
                  </div>
                )}
                <Input
                  type="text"
                  placeholder={t("auth.email")}
                  value={loginForm.email_or_username}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      email_or_username: e.target.value,
                    })
                  }
                />
                <Input
                  type="password"
                  placeholder={t("auth.password")}
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                />
                <Button onClick={handleLogin} className="w-full">
                  {t("auth.login")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRegister(true);
                    setLoginError("");
                    setRegisterSuccess("");
                  }}
                  className="w-full"
                >
                  {t("auth.noAccount")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } transition-all duration-300 overflow-hidden bg-gray-50 dark:bg-gray-900 border-r border-border`}
      >
        <div className="p-4 border-b border-border">
          <Button onClick={startNewChat} className="w-full mb-4">
            + Yeni Sohbet
          </Button>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground">
              Sohbet Geçmişi
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`relative group p-3 rounded-lg mb-2 transition-all duration-300 ${
                currentSessionId === session.id
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {editingSessionId === session.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingSessionTitle}
                    onChange={(e) => setEditingSessionTitle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        saveSessionTitle(session.id);
                      } else if (e.key === "Escape") {
                        cancelEditingSession();
                      }
                    }}
                    className="text-sm flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => saveSessionTitle(session.id)}
                    className="px-2 py-1 h-6"
                  >
                    ✓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditingSession}
                    className="px-2 py-1 h-6"
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => selectSession(session.id)}
                    className="cursor-pointer flex-1"
                  >
                    <div className="text-sm font-medium truncate pr-8">
                      {session.title || t("chat.newChat")}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        currentSessionId === session.id
                          ? "text-white/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(session.created_at).toLocaleDateString("tr-TR")}
                    </div>
                  </div>

                  {/* Three dots menu */}
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSessionMenu(
                          showSessionMenu === session.id ? null : session.id,
                        );
                      }}
                      className={`transition-opacity p-1 h-6 w-6 text-xs ${
                        currentSessionId === session.id
                          ? "opacity-70 group-hover:opacity-100 text-white/90 hover:text-white"
                          : "opacity-0 group-hover:opacity-100 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      }`}
                    >
                      ⋯
                    </Button>

                    {showSessionMenu === session.id && (
                      <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 min-w-32">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingSession(
                              session.id,
                              session.title || "",
                            );
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                        >
                          ✏️ Yeniden Adlandır
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "Bu sohbeti silmek istediğinizden emin misiniz?",
                              )
                            ) {
                              handleDeleteSession(session.id);
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center gap-2"
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col gradient-bg">
        {/* Header */}
        <div className="border-b border-border/50 backdrop-blur-sm bg-background/80 p-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-primary/10 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {/* Modern Toggle Switch */}
            <div className="flex items-center">
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isDark ? "bg-gray-700" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                    isDark ? "translate-x-7" : "translate-x-1"
                  }`}
                >
                  <span className="flex h-full w-full items-center justify-center">
                    {isDark ? (
                      <svg
                        className="h-3 w-3 text-gray-700"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-3 w-3 text-yellow-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                </span>
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem("auth_token");
                setIsLoggedIn(false);
              }}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {t("navigation.logout")}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("chat.startConversation")}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {t("chat.welcomeMessage")}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex animate-fade-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`message-bubble ${
                  message.role === "user" ? "message-user" : "message-assistant"
                }`}
              >
                {message.role === "user" && message.dlp_info && (
                  <div className="mb-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-blue-600 dark:text-blue-400">
                        🛡️
                      </span>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        DLP Koruması Aktif
                      </span>
                    </div>

                    {/* Side-by-side layout for original and anonymized text */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="font-medium text-blue-700 dark:text-blue-300 block mb-2">
                          Orijinal:
                        </span>
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 min-h-[80px]">
                          {renderHighlightedText(
                            message.dlp_info.original_text || message.content,
                            message.dlp_info.recognitions?.map((r) => ({
                              start: r.start,
                              end: r.end,
                              type: r.entity_type,
                            })) || [],
                          )}
                        </div>
                      </div>

                      {message.dlp_info.placeholder_text && (
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-300 block mb-2">
                            Anonimleştirilmiş:
                          </span>
                          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 min-h-[80px]">
                            {message.dlp_info.placeholder_text}
                          </div>
                        </div>
                      )}
                    </div>

                    {message.dlp_info.recognitions &&
                      message.dlp_info.recognitions.length > 0 && (
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-300 block mb-2">
                            Tespit Edilen Veriler:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {message.dlp_info.recognitions.map(
                              (recognition, idx) => {
                                const entityMeta = ENTITY_META[
                                  recognition.entity_type
                                ] || {
                                  emoji: "🔍",
                                  label: recognition.entity_type,
                                  color: "#6b7280",
                                };
                                const originalText = (
                                  message.dlp_info.original_text ||
                                  message.content
                                ).slice(recognition.start, recognition.end);
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                                    style={{
                                      backgroundColor: entityMeta.color,
                                    }}
                                    title={originalText}
                                  >
                                    {entityMeta.emoji} {entityMeta.label}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {message.role === "assistant" && message.dlp_info && (
                  <div className="mb-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-green-600 dark:text-green-400">
                        🔄
                      </span>
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">
                        Placeholder Geri Dönüştürme
                      </span>
                    </div>

                    {/* Side-by-side layout for GPT response and converted response */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-green-700 dark:text-green-300 block mb-2">
                          GPT Yanıtı (Placeholder'lı):
                        </span>
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 min-h-[80px]">
                          {message.dlp_info.masked_text}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium text-green-700 dark:text-green-300 block mb-2">
                          Geri Dönüştürülmüş Yanıt:
                        </span>
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 min-h-[80px]">
                          {message.dlp_info.original_text}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Action buttons for assistant messages */}
                {message.role === "assistant" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        // Optional: Show a toast notification
                        const button = event?.target as HTMLElement;
                        const originalText = button.textContent;
                        button.textContent = "Kopyalandı!";
                        setTimeout(() => {
                          button.textContent = originalText;
                        }, 2000);
                      }}
                      className="text-xs bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all duration-300 border-0"
                    >
                      📋 Kopyala
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Find the corresponding user message to resend
                        const messageIndex = messages.findIndex(
                          (m) => m.id === message.id,
                        );
                        if (messageIndex > 0) {
                          const userMessage = messages[messageIndex - 1];
                          if (userMessage.role === "user") {
                            setCurrentMessage(userMessage.content);
                            // Focus on input
                            setTimeout(() => {
                              inputRef.current?.focus();
                            }, 100);
                          }
                        }
                      }}
                      className="text-xs bg-primary text-primary-foreground hover:bg-primary-hover shadow-md hover:shadow-lg transition-all duration-300 border-0"
                    >
                      {t("messages.retryMessage")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-4 mr-12">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PII Preview Modal */}
        {showPiiPreview && piiPreviewData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🛡️</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      DLP Koruması Aktif
                    </h3>
                  </div>
                  <button
                    onClick={handleCancelPiiPreview}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Side by side text comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Original Text */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      <span>Orijinal Metin</span>
                    </h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 min-h-[120px]">
                      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {renderHighlightedTextWithSelection(
                          piiPreviewData.original_text || currentMessage,
                          piiPreviewData.recognitions || [],
                          true,
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Anonymized Text */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span>Anonimleştirilmiş Metin</span>
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 min-h-[120px]">
                      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {renderHighlightedTextWithSelection(
                          piiPreviewData.placeholder_text ||
                            piiPreviewData.masked_text ||
                            currentMessage,
                          piiPreviewData.recognitions || [],
                          false,
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detected PII Entities */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <span className="text-lg">🔍</span>
                    <span>Tespit Edilen Veriler</span>
                    {selectedEntityIndex !== null && (
                      <span className="text-sm text-gray-500">
                        (Seçili: {selectedEntityIndex + 1}. öğe)
                      </span>
                    )}
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {(piiPreviewData.recognitions || []).map(
                        (recognition: any, index: number) => {
                          const entityMeta = ENTITY_META[
                            recognition.entity_type
                          ] || {
                            emoji: "🔍",
                            label: recognition.entity_type,
                            color: "#6b7280",
                          };

                          const isSelected = selectedEntityIndex === index;
                          const highlightColor =
                            PII_COLORS[index % PII_COLORS.length];
                          const originalText = (
                            piiPreviewData.original_text || currentMessage
                          ).slice(recognition.start, recognition.end);

                          return (
                            <button
                              key={index}
                              onClick={() =>
                                setSelectedEntityIndex(
                                  isSelected ? null : index,
                                )
                              }
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 text-left ${
                                isSelected
                                  ? "border-2 scale-105 shadow-lg"
                                  : "border-gray-200 hover-border-gray-300 hover:scale-102"
                              }`}
                              style={{
                                backgroundColor: isSelected
                                  ? `${highlightColor}10`
                                  : "white",
                                borderColor: isSelected
                                  ? highlightColor
                                  : undefined,
                                boxShadow: isSelected
                                  ? `0 0 15px ${highlightColor}30`
                                  : undefined,
                              }}
                            >
                              <span className="text-lg">
                                {entityMeta.emoji}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {entityMeta.label}
                                </div>
                                <div
                                  className="text-xs text-gray-500 truncate"
                                  title={originalText}
                                >
                                  {originalText}
                                </div>
                              </div>
                              {isSelected && (
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: highlightColor }}
                                ></div>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>

                    {selectedEntityIndex === null &&
                      (piiPreviewData.recognitions || []).length > 0 && (
                        <div className="mt-3 text-sm text-gray-600 text-center">
                          💡 Bir PII öğesine tıklayarak metinlerde
                          vurgulanmasını sağlayabilirsiniz
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelPiiPreview}
                    className="px-6"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleSendWithPlaceholders}
                    className="px-6 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t("messages.sendAnonymized")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border/50 backdrop-blur-sm bg-background/80 p-6">
          <div className="max-w-4xl mx-auto">
            {showDlpEditor && dlpBlockedData && (
              <Card className="mb-6 border-destructive/20 bg-destructive/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-destructive"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-destructive">
                        Kişisel Veri Tespit Edildi
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("messages.containsPII")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Orijinal Mesaj:
                      </label>
                      <div className="p-4 bg-muted/50 rounded-xl border text-sm">
                        {dlpBlockedData.original_text}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Düzenlenmiş Mesaj:
                      </label>
                      <textarea
                        value={editableAnonymizedText}
                        onChange={(e) =>
                          setEditableAnonymizedText(e.target.value)
                        }
                        className="w-full p-4 border border-border rounded-xl bg-background resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        rows={4}
                        placeholder="Mesajınızı düzenleyin..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleSendAnonymizedMessage}
                        disabled={isLoading}
                        className="btn-primary"
                      >
                        {isLoading
                          ? "Gönderiliyor..."
                          : "Düzenlenmiş Mesajı Gönder"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDlpEditor(false);
                          setDlpBlockedData(null);
                        }}
                      >
                        İptal
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Mesajınızı yazın..."
                  disabled={isLoading}
                  className="input-modern min-h-[3rem] text-base"
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className="btn-primary h-12 px-6 rounded-xl"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Gönderiliyor</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>Gönder</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PII Preview Modal */}
      {showPiiPreview && piiPreviewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🛡️</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    DLP Koruması Aktif
                  </h3>
                </div>
                <button
                  onClick={handleCancelPiiPreview}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Side by side text comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Original Text */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span>Orijinal Metin</span>
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 min-h-[120px]">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {renderHighlightedTextWithSelection(
                        piiPreviewData.original_text || currentMessage,
                        piiPreviewData.recognitions || [],
                        true,
                      )}
                    </div>
                  </div>
                </div>

                {/* Anonymized Text */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span>Anonimleştirilmiş Metin</span>
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 min-h-[120px]">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {renderHighlightedTextWithSelection(
                        piiPreviewData.placeholder_text ||
                          piiPreviewData.masked_text ||
                          currentMessage,
                        piiPreviewData.recognitions || [],
                        false,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detected PII Entities */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <span className="text-lg">🔍</span>
                  <span>Tespit Edilen Veriler</span>
                  {selectedEntityIndex !== null && (
                    <span className="text-sm text-gray-500">
                      (Seçili: {selectedEntityIndex + 1}. öğe)
                    </span>
                  )}
                </h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {(piiPreviewData.recognitions || []).map(
                      (recognition: any, index: number) => {
                        const entityMeta = ENTITY_META[
                          recognition.entity_type
                        ] || {
                          emoji: "🔍",
                          label: recognition.entity_type,
                          color: "#6b7280",
                        };

                        const isSelected = selectedEntityIndex === index;
                        const highlightColor =
                          PII_COLORS[index % PII_COLORS.length];
                        const originalText = (
                          piiPreviewData.original_text || currentMessage
                        ).slice(recognition.start, recognition.end);

                        return (
                          <button
                            key={index}
                            onClick={() =>
                              setSelectedEntityIndex(isSelected ? null : index)
                            }
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 text-left ${
                              isSelected
                                ? "border-2 scale-105 shadow-lg"
                                : "border-gray-200 hover-border-gray-300 hover:scale-102"
                            }`}
                            style={{
                              backgroundColor: isSelected
                                ? `${highlightColor}10`
                                : "white",
                              borderColor: isSelected
                                ? highlightColor
                                : undefined,
                              boxShadow: isSelected
                                ? `0 0 15px ${highlightColor}30`
                                : undefined,
                            }}
                          >
                            <span className="text-lg">{entityMeta.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {entityMeta.label}
                              </div>
                              <div
                                className="text-xs text-gray-500 truncate"
                                title={originalText}
                              >
                                {originalText}
                              </div>
                            </div>
                            {isSelected && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: highlightColor }}
                              ></div>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>

                  {selectedEntityIndex === null &&
                    (piiPreviewData.recognitions || []).length > 0 && (
                      <div className="mt-3 text-sm text-gray-600 text-center">
                        💡 Bir PII öğesine tıklayarak metinlerde vurgulanmasını
                        sağlayabilirsiniz
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancelPiiPreview}
                  className="px-6"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSendWithPlaceholders}
                  className="px-6 bg-green-600 hover:bg-green-700 text-white"
                >
                  Anonimleştirilmiş Metni Gönder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
