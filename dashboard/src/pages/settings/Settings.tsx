import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '../../i18n';
import type { SupportedLanguage } from '../../i18n';

interface LlmSettings {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  hasApiKey: boolean;
}

/** Module keys grouped by category */
const CORE_MODULES = ['auth', 'strategy', 'roles', 'platform', 'model-keys', 'relay', 'a2a-gateway'] as const;
const OPTIONAL_MODULES = ['tasks', 'meetings'] as const;
const HEAVY_MODULES = ['evolution', 'clawhub', 'community', 'telemetry', 'update'] as const;

type ModulesStatus = Record<string, boolean>;

export function Settings() {
  const { t, i18n } = useTranslation('settings');
  const [modules, setModules] = useState<ModulesStatus | null>(null);
  const [loadingModules, setLoadingModules] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // LLM settings
  const [llm, setLlm] = useState<LlmSettings>({ provider: '', baseUrl: '', apiKey: '', model: '', hasApiKey: false });
  const [llmDirty, setLlmDirty] = useState(false);
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmMsg, setLlmMsg] = useState<string | null>(null);
  const llmMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch current module status from backend
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const token = localStorage.getItem('grc_admin_token');
        const res = await fetch('/api/v1/admin/modules/status', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setModules(data.modules);
        }
      } catch {
        // Non-critical
      } finally {
        setLoadingModules(false);
      }
    };
    fetchModules();
  }, []);

  // Fetch LLM settings on mount
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('grc_admin_token');
        const res = await fetch('/api/v1/admin/llm-settings', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setLlm(await res.json());
      } catch { /* non-critical */ }
    })();
  }, []);

  const updateLlm = (field: keyof LlmSettings, value: string) => {
    setLlm((prev) => ({ ...prev, [field]: value }));
    setLlmDirty(true);
  };

  const saveLlmSettings = async () => {
    setLlmSaving(true); setLlmMsg(null);
    try {
      const token = localStorage.getItem('grc_admin_token');
      const res = await fetch('/api/v1/admin/llm-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ provider: llm.provider, baseUrl: llm.baseUrl, apiKey: llm.apiKey, model: llm.model }),
      });
      if (res.ok) { setLlmMsg(t('llm.saved')); setLlmDirty(false); }
      else setLlmMsg(t('llm.saveFailed'));
    } catch { setLlmMsg(t('llm.saveFailed')); }
    finally { setLlmSaving(false); if (llmMsgTimer.current) clearTimeout(llmMsgTimer.current); llmMsgTimer.current = setTimeout(() => setLlmMsg(null), 5000); }
  };

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    try {
      const token = localStorage.getItem('grc_admin_token');
      if (token) {
        await fetch('/api/v1/admin/auth/me/language', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: lang }),
        });
      }
    } catch {
      // Server sync failure is non-critical
    }
  };

  const handleToggle = useCallback(async (moduleKey: string, newValue: boolean) => {
    if (!modules) return;

    // Optimistic update
    setModules((prev) => prev ? { ...prev, [moduleKey]: newValue } : prev);
    setSaving(true);
    setSaveMsg(null);

    try {
      const token = localStorage.getItem('grc_admin_token');
      const res = await fetch('/api/v1/admin/modules', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [moduleKey]: newValue }),
      });
      if (res.ok) {
        setSaveMsg(t('modules.requiresRestart'));
      } else {
        // Revert on failure
        setModules((prev) => prev ? { ...prev, [moduleKey]: !newValue } : prev);
        setSaveMsg('Failed to save');
      }
    } catch {
      setModules((prev) => prev ? { ...prev, [moduleKey]: !newValue } : prev);
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
      // Clear message after 5s
      setTimeout(() => setSaveMsg(null), 5000);
    }
  }, [modules, t]);

  const renderModuleRow = (
    key: string,
    options: { toggleable?: boolean; requiresMysql?: boolean },
  ) => {
    const isEnabled = modules?.[key] ?? false;
    const { toggleable, requiresMysql } = options;

    return (
      <div key={key} className="module-row">
        <div className="module-info">
          <div className="module-name">
            {t(`modules.names.${key}` as never)}
          </div>
          <div className="module-desc">
            {t(`modules.descriptions.${key}` as never)}
          </div>
        </div>
        <div className="module-status">
          {requiresMysql && (
            <span className="module-badge mysql">{t('modules.requiresMysql')}</span>
          )}
          {toggleable ? (
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isEnabled}
                disabled={saving}
                onChange={() => handleToggle(key, !isEnabled)}
              />
              <span className="toggle-slider" />
            </label>
          ) : (
            <span className="module-badge enabled">{t('modules.enabled')}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="page-subtitle">{t('subtitle')}</p>
        </div>
      </div>

      {/* Language Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">{t('language.title')}</h2>
        <p className="settings-section-desc">{t('language.description')}</p>

        <div className="language-grid">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              className={`language-card${i18n.language === lang ? ' active' : ''}`}
              onClick={() => handleLanguageChange(lang)}
            >
              <span className="language-flag">{LANGUAGE_FLAGS[lang]}</span>
              <span className="language-label">{LANGUAGE_LABELS[lang]}</span>
              {i18n.language === lang && (
                <span className="language-check">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* LLM Settings Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">{t('llm.title')}</h2>
        <p className="settings-section-desc">{t('llm.description')}</p>
        <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
          <div>
            <label className="label" htmlFor="llm-provider">{t('llm.provider')}</label>
            <input id="llm-provider" className="input" value={llm.provider} onChange={(e) => updateLlm('provider', e.target.value)} placeholder="openai / anthropic / deepseek / google / qwen" />
          </div>
          <div>
            <label className="label" htmlFor="llm-base-url">{t('llm.baseUrl')}</label>
            <input id="llm-base-url" className="input" value={llm.baseUrl} onChange={(e) => updateLlm('baseUrl', e.target.value)} placeholder="https://api.openai.com/v1" />
          </div>
          <div>
            <label className="label" htmlFor="llm-api-key">{t('llm.apiKey')}</label>
            <input id="llm-api-key" className="input" type="password" value={llm.apiKey} onChange={(e) => updateLlm('apiKey', e.target.value)} placeholder={llm.hasApiKey ? '••••••••' : 'sk-...'} />
          </div>
          <div>
            <label className="label" htmlFor="llm-model">{t('llm.model')}</label>
            <input id="llm-model" className="input" value={llm.model} onChange={(e) => updateLlm('model', e.target.value)} placeholder="gpt-4o-mini" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={saveLlmSettings} disabled={llmSaving || !llmDirty} style={{ height: 38, paddingInline: 24 }}>
              {llmSaving ? t('llm.saving') : t('llm.save')}
            </button>
            {llmMsg && <span style={{ fontSize: 13, color: llmMsg === t('llm.saved') ? '#059669' : '#dc2626' }}>{llmMsg}</span>}
          </div>
        </div>
      </div>

      {/* Module Toggles Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">{t('modules.title')}</h2>
        <p className="settings-section-desc">{t('modules.description')}</p>

        {loadingModules ? (
          <div className="module-loading">Loading...</div>
        ) : modules ? (
          <div className="module-groups">
            {/* Core Modules — always on, no toggle */}
            <div className="module-group">
              <div className="module-group-header">
                <h3 className="module-group-title">{t('modules.core')}</h3>
                <p className="module-group-desc">{t('modules.coreDesc')}</p>
              </div>
              <div className="module-list">
                {CORE_MODULES.map((key) =>
                  renderModuleRow(key, {}),
                )}
              </div>
            </div>

            {/* Optional Modules — toggleable */}
            <div className="module-group">
              <div className="module-group-header">
                <h3 className="module-group-title">{t('modules.optional')}</h3>
                <p className="module-group-desc">{t('modules.optionalDesc')}</p>
              </div>
              <div className="module-list">
                {OPTIONAL_MODULES.map((key) =>
                  renderModuleRow(key, { toggleable: true }),
                )}
              </div>
            </div>

            {/* Heavy / MySQL-only Modules — toggleable with MySQL badge */}
            <div className="module-group">
              <div className="module-group-header">
                <h3 className="module-group-title">{t('modules.heavy')}</h3>
                <p className="module-group-desc">{t('modules.heavyDesc')}</p>
              </div>
              <div className="module-list">
                {HEAVY_MODULES.map((key) =>
                  renderModuleRow(key, { toggleable: true, requiresMysql: true }),
                )}
              </div>
            </div>

            {/* Restart Notice */}
            {saveMsg && (
              <div className="module-restart-notice">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm.5 11h-1V7h1v5zm0-6.5h-1v-1h1v1z" fill="currentColor"/>
                </svg>
                <span>{saveMsg}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="module-loading">Unable to load module status</div>
        )}
      </div>
    </div>
  );
}
