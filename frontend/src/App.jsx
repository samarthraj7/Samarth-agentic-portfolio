import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Message, { TypingIndicator } from './components/Message';
import { SYSTEM_PROMPT } from './data/profileData';
import './styles/index.css';

const API_URL = '';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelName, setModelName] = useState('llama3.2');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    const assistantId = Date.now() + 1;
    const assistantMsg = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      console.log('Sending request to:', `${API_URL}/api/chat`);
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          systemPrompt: SYSTEM_PROMPT,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      console.log('Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              console.log('Received [DONE]');
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                accumulated += parsed.token;
                console.log('Token received, total length:', accumulated.length);
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: accumulated, streaming: true }
                    : m
                ));
              }
            } catch (e) {
              console.error('Parse error:', e, 'Line:', data);
            }
          }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: `⚠️ ${err.message || 'Connection failed. Make sure the backend is running.'}`, streaming: false, error: true }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* Ambient orbs */}
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />

      <div className="app-layout">
        {/* Sidebar */}
        <Sidebar onSuggestion={sendMessage} onNewChat={handleNewChat} />

        {/* Main chat */}
        <main className="chat-main">
          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-title">Portfolio AI Assistant</div>
            <div className="topbar-model">
              <div className="model-indicator" />
              {modelName} · Local
            </div>
          </div>

          {/* Messages */}
          <div className="messages-area">
            {messages.length === 0 && (
              <div className="welcome-state">
                <div className="welcome-icon">🤖</div>
                <h1 className="welcome-heading">
                  Ask me anything about <span>Samarth</span>
                </h1>
                <p className="welcome-subtitle">
                  I have deep knowledge of his experience at British Telecom,
                  his research on cricket analytics and agricultural AI, his
                  technical skills, and everything on his resume.
                </p>
              </div>
            )}

            {messages.map(msg => (
              <Message key={msg.id} message={msg} />
            ))}

            {isLoading && messages[messages.length - 1]?.streaming === false && (
              <TypingIndicator />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="chat-input"
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Samarth's experience, projects, or research..."
                rows={1}
                disabled={isLoading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                title="Send (Enter)"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <div className="input-hint">Enter to send · Shift+Enter for new line</div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
