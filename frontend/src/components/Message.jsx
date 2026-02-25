import { useEffect, useState } from 'react';

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Simple markdown-to-HTML parser
function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    // Code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.*$)/gm, '<h3 style="font-size:0.95rem;font-weight:600;margin:10px 0 4px;font-family:Syne,sans-serif">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size:1rem;font-weight:700;margin:12px 0 4px;font-family:Syne,sans-serif">$1</h2>')
    // Unordered lists
    .replace(/^\s*[-•]\s+(.+)/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\s*\d+\.\s+(.+)/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

function TypingCursor() {
  return <span style={{ display: 'inline-block', width: '2px', height: '14px', background: 'var(--accent)', borderRadius: '1px', marginLeft: '2px', animation: 'blink 1s infinite', verticalAlign: 'middle' }} />;
}

export function TypingIndicator() {
  return (
    <div className="message-row">
      <div className="message-avatar bot">SR</div>
      <div className="message-content">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

export default function Message({ message }) {
  const { role, content, timestamp, streaming, error, rateLimit, waitTime } = message;
  const isBot = role === 'assistant';
  const [displayText, setDisplayText] = useState(streaming ? '' : content);
  const [countdown, setCountdown] = useState(waitTime || 0);

  useEffect(() => {
    if (!streaming) {
      console.log('Message content updated:', content?.substring(0, 50) + '...');
      setDisplayText(content);
    } else {
      console.log('Streaming update:', content?.substring(0, 50) + '...');
      setDisplayText(content);
    }
  }, [content, streaming]);
  useEffect(() => {
    if (rateLimit && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimit, countdown]);
  useEffect(() => {
    if (waitTime) {
      setCountdown(waitTime);
    }
  }, [waitTime]);

  const html = isBot ? parseMarkdown(displayText) : null;

  // Special rendering for rate limit error
  if (rateLimit && isBot) {
    return (
      <div className="message-row bot">
        <div className="message-avatar bot">SR</div>
        <div className="message-content">
          <div className="message-bubble rate-limit">
            <div className="rate-limit-icon">⏱️</div>
            <div className="rate-limit-title">Rate Limit Reached</div>
            <div className="rate-limit-message">
              {countdown > 0 ? (
                <>Please wait <strong>{countdown} seconds</strong> before asking another question.</>
              ) : (
                <>You can ask another question now!</>
              )}
            </div>
            <div className="rate-limit-suggestions">
              <div className="rate-limit-label">In the meantime:</div>
              <a href="/resume.pdf" target="_blank" className="rate-limit-link">
                📄 Check out my resume
              </a>
              <a href="https://www.linkedin.com/in/samarth-rajendra" target="_blank" rel="noreferrer" className="rate-limit-link">
                💼 View my LinkedIn
              </a>
              <a href="https://github.com/samarthraj7" target="_blank" rel="noreferrer" className="rate-limit-link">
                💻 Explore my GitHub
              </a>
            </div>
          </div>
          <div className="message-time">{formatTime(new Date(timestamp))}</div>
        </div>
      </div>
    );
  }

  // const html = isBot ? parseMarkdown(displayText) : null;

  return (
    <div className={`message-row ${isBot ? 'bot' : 'user'}`}>
      <div className={`message-avatar ${isBot ? 'bot' : 'user'}`}>
        {isBot ? 'SR' : 'U'}
      </div>
      <div className="message-content">
        <div className={`message-bubble ${isBot ? 'bot' : 'user'} ${error ? 'error' : ''}`}>
          {isBot ? (
            <>
              <span dangerouslySetInnerHTML={{ __html: html }} />
              {streaming && <TypingCursor />}
            </>
          ) : (
            content
          )}
        </div>
        <div className="message-time">{formatTime(new Date(timestamp))}</div>
      </div>
    </div>
  );
}
