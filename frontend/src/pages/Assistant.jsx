import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../config";
import "./Assistant.css";

const SUGGESTED_PROMPTS = [
  "Who is my manager?",
  "How many leaves do I have left?",
  "Who is the CTO?",
  "Who works in Engineering?",
  "What are the company working hours?",
  "What is the medical leave policy?",
  "How do I submit my documents?"
];

const HR_SUGGESTED_PROMPTS = [
  "Show pending leave requests",
  "Show today's attendance summary",
  "Summarize payroll for September 2026",
  "Show employees by department",
  "Show employees without a reporting manager",
  "Show recent employee documents requiring attention"
];

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem("hrisUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

let messageSeq = 0;
function createMessageId(prefix) {
  messageSeq += 1;
  return `${prefix}-${Date.now()}-${messageSeq}`;
}

function getCurrentTimestamp() {
  return new Date();
}

export default function Assistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHRRoute = location.pathname.startsWith("/hr");

  const storedUser = getStoredUser();
  const userRole = (storedUser?.role || storedUser?.employee?.role)?.toUpperCase();

  const isHRUser =
    userRole === "HR" ||
    userRole === "ADMIN" ||
    (isHRRoute && userRole !== "EMPLOYEE");

  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hello! I am your HRIS Company Assistant. Ask me about your reporting manager, leave balances, team members, document policies, or company procedures.",
      sources: ["Company Assistant Knowledge Base"],
      timestamp: new Date()
    }
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);



  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setError("");
    const userMsg = {
      id: createMessageId("user"),
      sender: "user",
      text,
      timestamp: getCurrentTimestamp()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/assistant/chat`,
        { message: text },
        { withCredentials: true }
      );

      const assistantMsg = {
        id: createMessageId("assistant"),
        sender: "assistant",
        text: response.data.answer || "I could not find an answer to that question.",
        sources: response.data.sources || [],
        timestamp: getCurrentTimestamp()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError(
        err.response?.data?.message ||
          "Failed to get a response from the Company Assistant. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: createMessageId("welcome"),
        sender: "assistant",
        text: "Conversation cleared. How can I help you today?",
        sources: ["Company Assistant"],
        timestamp: getCurrentTimestamp()
      }
    ]);
    setError("");
  };

  const chatContent = (
    <div className="assistant-container">
      {/* Assistant Header */}
      <div className="assistant-header">
        <div className="assistant-identity">
          <div className="assistant-avatar">🤖</div>
          <div>
            <h2>Company Assistant</h2>
            <div className="assistant-status">
              <span className="status-indicator"></span>
              <span>Grounded in HRIS Company Data • Secure & Role-Aware</span>
            </div>
          </div>
        </div>

        <button type="button" className="clear-chat-btn" onClick={clearChat} title="Start new conversation">
          ↻ New Chat
        </button>
      </div>

      {error && <div className="assistant-error-banner">{error}</div>}

      {/* Messages Scroll Area */}
      <div className="assistant-messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender === "user" ? "user-row" : "assistant-row"}`}>
            {msg.sender === "assistant" && <div className="msg-avatar assistant-icon">🤖</div>}

            <div className={`message-bubble ${msg.sender === "user" ? "user-bubble" : "assistant-bubble"}`}>
              <div className="message-text">{msg.text}</div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  {msg.sources.map((src, idx) => (
                    <span key={idx} className="source-tag">
                      📌 {src}
                    </span>
                  ))}
                </div>
              )}

              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {msg.sender === "user" && <div className="msg-avatar user-icon">👤</div>}
          </div>
        ))}

        {loading && (
          <div className="message-row assistant-row">
            <div className="msg-avatar assistant-icon">🤖</div>
            <div className="message-bubble assistant-bubble typing-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">Looking up HRIS database & knowledge base...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* HR / Admin Suggested Questions */}
      {isHRUser && (
        <div className="assistant-suggestions hr-suggestions-section">
          <span className="suggestions-label hr-suggestions-label">HR / Admin:</span>
          <div className="suggestions-scroll">
            {HR_SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="suggestion-chip hr-suggestion-chip"
                onClick={() => handleSendMessage(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      <div className="assistant-suggestions">
        <span className="suggestions-label">Suggested:</span>
        <div className="suggestions-scroll">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="suggestion-chip"
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Composer */}
      <div className="assistant-input-bar">
        <textarea
          rows={1}
          placeholder="Ask a question about your manager, leaves, teams, or policies..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          className="send-button"
          onClick={() => handleSendMessage()}
          disabled={loading || !inputMessage.trim()}
          title="Send message"
        >
          <span>Send</span>
          <span className="send-icon">➤</span>
        </button>
      </div>
    </div>
  );

  if (isHRRoute) {
    return <div className="hr-assistant-wrapper">{chatContent}</div>;
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <h1>Company Assistant</h1>
          <p>Interactive AI assistant for company policies, directory, and personal HR inquiries.</p>
        </div>
        <div className="profile">
          <div className="profile-avatar">E</div>
          <div>
            <strong>Employee Portal</strong>
            <span>Virtual Assistant</span>
          </div>
        </div>
      </header>

      <div className="assistant-page-body">{chatContent}</div>
    </div>
  );
}
