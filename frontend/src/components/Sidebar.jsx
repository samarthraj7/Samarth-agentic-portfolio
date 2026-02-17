import { SUGGESTED_QUESTIONS } from '../data/profileData';

export default function Sidebar({ onSuggestion, onNewChat }) {
  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="avatar-ring">SR</div>
        <div className="sidebar-name">Samarth Rajendra</div>
        <div className="sidebar-title">AI/ML Engineer · USC MS CS</div>
        <div className="status-dot">Available for opportunities</div>
      </div>

      {/* Stats */}
      <div className="sidebar-section" style={{ paddingTop: 20 }}>
        <div className="sidebar-section-label">Impact</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">27K+</div>
            <div className="stat-label">Active users at BT</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">£10M</div>
            <div className="stat-label">Potential savings</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">85%</div>
            <div className="stat-label">Cricket accuracy</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">2</div>
            <div className="stat-label">Springer papers</div>
          </div>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Skills */}
      <div className="sidebar-section" style={{ paddingBottom: 0 }}>
        <div className="sidebar-section-label">Top Skills</div>
      </div>
      <div className="tag-chips">
        {['PyTorch','LLM','RAG','BERT','LSTM','GCP','AWS','NLP','GenAI'].map(t => (
          <span key={t} className="tag-chip">{t}</span>
        ))}
      </div>

      <div className="sidebar-divider" style={{ margin: '0 24px 16px' }} />

      {/* Links */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Links</div>
        <ul className="links-list">
          <li className="link-item">
            <a href="https://www.linkedin.com/in/samarth-rajendra" target="_blank" rel="noreferrer">
              <svg className="link-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          </li>
          <li className="link-item">
            <a href="https://github.com/samarthraj7" target="_blank" rel="noreferrer">
              <svg className="link-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </li>
          <li className="link-item">
            <a href="mailto:sr47937@usc.edu">
              <svg className="link-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              sr47937@usc.edu
            </a>
          </li>
        </ul>
      </div>

      <div className="sidebar-divider" />

      {/* Suggestions */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Ask me about</div>
        <ul className="suggestions-list">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <li key={i}>
              <button className="suggestion-btn" onClick={() => onSuggestion(q)}>
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="footer-badge">
          <span className="dot">◆</span>
          Powered by Ollama · llama3.2
        </div>
      </div>
    </aside>
  );
}
