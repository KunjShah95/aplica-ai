'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  User,
  Key,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Monitor,
  Volume2,
  Mic,
  Save,
  ChevronRight,
  Moon,
  Sun,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sound: false,
    weekly: true,
  });
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    elevenlabs: '',
    deepL: '',
    weather: '',
  });

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'language', label: 'Language & Region', icon: Globe },
    { id: 'devices', label: 'Devices', icon: Monitor },
    { id: 'data', label: 'Data & Storage', icon: Database },
  ];

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-header">
          <Link href="/dashboard" className="back-link">
            ← Back to Chat
          </Link>
          <h1>Settings</h1>
        </div>
        <nav className="settings-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon size={18} />
              <span>{section.label}</span>
              <ChevronRight size={16} className="chevron" />
            </button>
          ))}
        </nav>
      </aside>

      <main className="settings-content">
        {activeSection === 'profile' && (
          <section className="settings-section">
            <h2>Profile Settings</h2>
            <p className="section-desc">Manage your personal information</p>

            <div className="form-group">
              <label>Display Name</label>
              <input type="text" defaultValue="John Doe" />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" defaultValue="john@example.com" />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input type="text" defaultValue="@johndoe" />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea rows={3} placeholder="Tell us about yourself..."></textarea>
            </div>

            <div className="avatar-section">
              <div className="avatar-preview">JD</div>
              <div className="avatar-actions">
                <button className="btn-secondary">Change Avatar</button>
                <button className="btn-ghost">Remove</button>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary">
                <Save size={16} /> Save Changes
              </button>
            </div>
          </section>
        )}

        {activeSection === 'appearance' && (
          <section className="settings-section">
            <h2>Appearance</h2>
            <p className="section-desc">Customize how Alpicia looks</p>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Theme</h3>
                <p>Choose your preferred color scheme</p>
              </div>
              <div className="theme-toggle">
                <button
                  className={`theme-btn ${!darkMode ? 'active' : ''}`}
                  onClick={() => setDarkMode(false)}
                >
                  <Sun size={18} /> Light
                </button>
                <button
                  className={`theme-btn ${darkMode ? 'active' : ''}`}
                  onClick={() => setDarkMode(true)}
                >
                  <Moon size={18} /> Dark
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Accent Color</h3>
                <p>Choose your accent color</p>
              </div>
              <div className="color-options">
                <button className="color-btn active" style={{ background: '#caff00' }}></button>
                <button className="color-btn" style={{ background: '#4ecdc4' }}></button>
                <button className="color-btn" style={{ background: '#ff6b6b' }}></button>
                <button className="color-btn" style={{ background: '#74b9ff' }}></button>
                <button className="color-btn" style={{ background: '#fd79a8' }}></button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Font Size</h3>
                <p>Adjust text size</p>
              </div>
              <select className="select-input">
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
                <option>Extra Large</option>
              </select>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Compact Mode</h3>
                <p>Show more content in less space</p>
              </div>
              <label className="toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </section>
        )}

        {activeSection === 'notifications' && (
          <section className="settings-section">
            <h2>Notifications</h2>
            <p className="section-desc">Control how you receive notifications</p>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Email Notifications</h3>
                <p>Receive updates via email</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Push Notifications</h3>
                <p>Receive browser notifications</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Sound Effects</h3>
                <p>Play sounds for messages</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={notifications.sound}
                  onChange={(e) => setNotifications({ ...notifications, sound: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Weekly Summary</h3>
                <p>Receive weekly activity summary</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={notifications.weekly}
                  onChange={(e) => setNotifications({ ...notifications, weekly: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </section>
        )}

        {activeSection === 'api' && (
          <section className="settings-section">
            <h2>API Keys</h2>
            <p className="section-desc">Manage your API keys for external services</p>

            <div className="api-key-card">
              <div className="api-key-header">
                <h3>OpenAI</h3>
                <span className="status connected">Connected</span>
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                  placeholder="sk-..."
                />
              </div>
            </div>

            <div className="api-key-card">
              <div className="api-key-header">
                <h3>ElevenLabs</h3>
                <span className="status">Not connected</span>
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={apiKeys.elevenlabs}
                  onChange={(e) => setApiKeys({ ...apiKeys, elevenlabs: e.target.value })}
                  placeholder="Enter your API key"
                />
              </div>
            </div>

            <div className="api-key-card">
              <div className="api-key-header">
                <h3>DeepL</h3>
                <span className="status">Not connected</span>
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={apiKeys.deepL}
                  onChange={(e) => setApiKeys({ ...apiKeys, deepL: e.target.value })}
                  placeholder="Enter your API key"
                />
              </div>
            </div>

            <div className="api-key-card">
              <div className="api-key-header">
                <h3>OpenWeatherMap</h3>
                <span className="status">Not connected</span>
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={apiKeys.weather}
                  onChange={(e) => setApiKeys({ ...apiKeys, weather: e.target.value })}
                  placeholder="Enter your API key"
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary">
                <Save size={16} /> Save API Keys
              </button>
            </div>

            <div className="info-box">
              <Shield size={18} />
              <p>
                API keys are encrypted and stored securely. We never share your keys with third
                parties.
              </p>
            </div>
          </section>
        )}

        {activeSection === 'security' && (
          <section className="settings-section">
            <h2>Security</h2>
            <p className="section-desc">Manage your account security</p>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Two-Factor Authentication</h3>
                <p>Add an extra layer of security</p>
              </div>
              <button className="btn-secondary">Enable 2FA</button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Change Password</h3>
                <p>Update your account password</p>
              </div>
              <button className="btn-secondary">Change</button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Active Sessions</h3>
                <p>Manage your active sessions</p>
              </div>
              <button className="btn-secondary">View</button>
            </div>

            <div className="danger-zone">
              <h3>Danger Zone</h3>
              <p>Irreversible and destructive actions</p>
              <button className="btn-danger">Delete Account</button>
            </div>
          </section>
        )}

        {activeSection === 'language' && (
          <section className="settings-section">
            <h2>Language & Region</h2>
            <p className="section-desc">Customize language and regional settings</p>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Language</h3>
                <p>Choose your preferred language</p>
              </div>
              <select className="select-input">
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
                <option>Chinese</option>
                <option>Japanese</option>
              </select>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Time Zone</h3>
                <p>Set your local time zone</p>
              </div>
              <select className="select-input">
                <option>UTC-8 (Pacific Time)</option>
                <option>UTC-5 (Eastern Time)</option>
                <option>UTC+0 (London)</option>
                <option>UTC+1 (Paris)</option>
                <option>UTC+9 (Tokyo)</option>
              </select>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Date Format</h3>
                <p>Choose date display format</p>
              </div>
              <select className="select-input">
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>
          </section>
        )}

        {activeSection === 'devices' && (
          <section className="settings-section">
            <h2>Devices</h2>
            <p className="section-desc">Manage connected devices</p>

            <div className="device-card active">
              <Monitor size={24} />
              <div className="device-info">
                <h3>MacBook Pro</h3>
                <p>Chrome • macOS • Active now</p>
              </div>
              <span className="device-badge current">Current</span>
            </div>

            <div className="device-card">
              <Monitor size={24} />
              <div className="device-info">
                <h3>iPhone 15 Pro</h3>
                <p>Safari • iOS • Last active 2 hours ago</p>
              </div>
              <button className="btn-ghost">Remove</button>
            </div>

            <div className="device-card">
              <Monitor size={24} />
              <div className="device-info">
                <h3>iPad Air</h3>
                <p>Safari • iPadOS • Last active 3 days ago</p>
              </div>
              <button className="btn-ghost">Remove</button>
            </div>
          </section>
        )}

        {activeSection === 'data' && (
          <section className="settings-section">
            <h2>Data & Storage</h2>
            <p className="section-desc">Manage your data and storage</p>

            <div className="storage-card">
              <h3>Storage Usage</h3>
              <div className="storage-bar">
                <div className="storage-used" style={{ width: '35%' }}></div>
              </div>
              <p className="storage-text">3.5 GB of 10 GB used</p>
            </div>

            <div className="data-actions">
              <button className="btn-secondary">
                <Download size={16} /> Export Data
              </button>
              <button className="btn-secondary">
                <Upload size={16} /> Import Data
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Clear Chat History</h3>
                <p>Delete all conversation history</p>
              </div>
              <button className="btn-danger">
                <Trash2 size={16} /> Clear
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h3>Clear Cache</h3>
                <p>Free up storage space</p>
              </div>
              <button className="btn-secondary">Clear Cache</button>
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .settings-page {
          display: flex;
          min-height: 100vh;
          background: var(--obsidian);
        }

        .settings-sidebar {
          width: 280px;
          background: var(--charcoal);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          padding: 1.5rem;
          flex-shrink: 0;
        }

        .settings-header {
          margin-bottom: 2rem;
        }

        .back-link {
          display: inline-block;
          color: var(--white-dim);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--lime);
        }

        .settings-header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          font-weight: 600;
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: transparent;
          border: none;
          color: var(--white-dim);
          font-size: 0.9375rem;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--white);
        }
        .nav-item.active {
          background: rgba(202, 255, 0, 0.1);
          color: var(--lime);
        }

        .nav-item .chevron {
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .nav-item:hover .chevron,
        .nav-item.active .chevron {
          opacity: 0.5;
        }

        .settings-content {
          flex: 1;
          padding: 3rem;
          overflow-y: auto;
        }

        .settings-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .section-desc {
          color: var(--white-dim);
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--white);
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.875rem 1rem;
          background: var(--graphite);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--white);
          font-size: 0.9375rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: var(--lime);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .avatar-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin: 2rem 0;
        }

        .avatar-preview {
          width: 80px;
          height: 80px;
          background: var(--lime);
          color: var(--obsidian);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 600;
        }

        .avatar-actions {
          display: flex;
          gap: 0.75rem;
        }

        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: var(--charcoal);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          margin-bottom: 1rem;
        }

        .setting-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .setting-info p {
          font-size: 0.875rem;
          color: var(--white-dim);
        }

        .theme-toggle {
          display: flex;
          gap: 0.5rem;
        }

        .theme-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--white-dim);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .theme-btn.active {
          background: var(--lime);
          border-color: var(--lime);
          color: var(--obsidian);
        }

        .color-options {
          display: flex;
          gap: 0.5rem;
        }

        .color-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-btn.active {
          border-color: var(--white);
          transform: scale(1.1);
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: var(--graphite);
          border-radius: 28px;
          transition: 0.3s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background: var(--white);
          border-radius: 50%;
          transition: 0.3s;
        }

        .toggle input:checked + .toggle-slider {
          background: var(--lime);
        }

        .toggle input:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .select-input {
          padding: 0.75rem 1rem;
          background: var(--graphite);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--white);
          font-size: 0.9375rem;
          cursor: pointer;
          min-width: 180px;
        }

        .api-key-card {
          background: var(--charcoal);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .api-key-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .api-key-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .status {
          font-size: 0.75rem;
          color: var(--white-dim);
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
        }

        .status.connected {
          color: var(--success);
          background: rgba(48, 209, 88, 0.1);
        }

        .danger-zone {
          margin-top: 3rem;
          padding: 1.5rem;
          background: rgba(255, 59, 48, 0.1);
          border: 1px solid rgba(255, 59, 48, 0.2);
          border-radius: 12px;
        }

        .danger-zone h3 {
          color: var(--error);
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .danger-zone p {
          color: var(--white-dim);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .device-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--charcoal);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          margin-bottom: 1rem;
        }

        .device-card.active {
          border-color: rgba(202, 255, 0, 0.3);
        }

        .device-info {
          flex: 1;
        }
        .device-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .device-info p {
          font-size: 0.875rem;
          color: var(--white-dim);
        }

        .device-badge {
          padding: 0.25rem 0.75rem;
          background: var(--lime);
          color: var(--obsidian);
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 999px;
        }

        .storage-card {
          background: var(--charcoal);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .storage-card h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .storage-bar {
          height: 8px;
          background: var(--graphite);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .storage-used {
          height: 100%;
          background: var(--lime);
          border-radius: 4px;
        }

        .storage-text {
          font-size: 0.875rem;
          color: var(--white-dim);
        }

        .data-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: var(--lime);
          border: none;
          color: var(--obsidian);
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          box-shadow: 0 4px 20px rgba(202, 255, 0, 0.3);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--white);
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          border-color: var(--white);
        }

        .btn-ghost {
          background: transparent;
          border: none;
          color: var(--white-dim);
          cursor: pointer;
          padding: 0.5rem;
          transition: color 0.2s;
        }

        .btn-ghost:hover {
          color: var(--white);
        }

        .btn-danger {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: var(--error);
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          opacity: 0.9;
        }

        .form-actions {
          margin-top: 2rem;
        }

        .info-box {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(202, 255, 0, 0.1);
          border: 1px solid rgba(202, 255, 0, 0.2);
          border-radius: 8px;
          margin-top: 1.5rem;
        }

        .info-box svg {
          color: var(--lime);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .info-box p {
          font-size: 0.875rem;
          color: var(--white-dim);
        }

        @media (max-width: 768px) {
          .settings-page {
            flex-direction: column;
          }
          .settings-sidebar {
            width: 100%;
          }
          .settings-content {
            padding: 1.5rem;
          }
          .setting-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .data-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
