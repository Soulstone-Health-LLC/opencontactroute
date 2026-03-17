import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  getSiteConfig,
  updateSiteConfig,
} from "../../../services/settingsService";
import { useSiteConfig } from "../../../hooks/useSiteConfig";

const WIDGET_PATH = "/v1/widget";

function getOrigin() {
  return window.location.origin;
}

export default function SettingsPage() {
  const [config, setConfig] = useState({
    org_name: "",
    primary_color: "#0d6efd",
  });
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const { reloadSiteConfig } = useSiteConfig();

  useEffect(() => {
    getSiteConfig()
      .then((res) => setConfig(res.data))
      .catch(() => setLoadError("Failed to load settings."));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSiteConfig(config);
      setConfig(res.data);
      reloadSiteConfig();
      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleField(field) {
    return (e) => setConfig((prev) => ({ ...prev, [field]: e.target.value }));
  }

  const widgetUrl = `${getOrigin()}${WIDGET_PATH}`;
  const iframeSnippet =
    `<iframe\n` +
    `  src="${widgetUrl}"\n` +
    `  title="Contact Support Directory"\n` +
    `  width="100%"\n` +
    `  height="600"\n` +
    `  style="border: none;"\n` +
    `  loading="lazy"\n` +
    `></iframe>`;

  const previewRef = useRef(null);

  function copyText(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(successMessage);
    });
  }

  return (
    <div>
      <h2 className="mb-4">Settings</h2>

      {/* ── Instance & Branding ─────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Instance &amp; Branding</div>
        <div className="card-body">
          {loadError && (
            <div className="alert alert-danger" role="alert">
              {loadError}
            </div>
          )}
          <form onSubmit={handleSave} noValidate>
            <div className="mb-3">
              <label htmlFor="org-name" className="form-label">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                className="form-control"
                value={config.org_name}
                onChange={handleField("org_name")}
                placeholder="Acme Health"
                aria-describedby="org-name-help"
              />
              <div id="org-name-help" className="form-text">
                Shown to members in the widget as the support directory owner.
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="primary-color" className="form-label">
                Primary Color
              </label>
              <div className="d-flex gap-2 align-items-center">
                <input
                  id="primary-color"
                  type="color"
                  className="form-control form-control-color"
                  value={config.primary_color}
                  onChange={handleField("primary_color")}
                  title="Choose primary color"
                  style={{ width: "3rem" }}
                />
                <input
                  type="text"
                  className="form-control font-monospace"
                  value={config.primary_color}
                  onChange={handleField("primary_color")}
                  aria-label="Primary color hex value"
                  style={{ maxWidth: "10rem" }}
                />
              </div>
              <div className="form-text">
                Used as the accent color in the embedded widget.
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Widget Embed ─────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Widget Embed</div>
        <div className="card-body">
          <p className="text-muted small mb-4">
            Embed the public-facing Contact Support Directory on any intranet,
            broker portal, or website by sharing the link or pasting the iframe
            snippet.
          </p>

          {/* Direct URL */}
          <div className="mb-4">
            <label htmlFor="widget-url" className="form-label fw-semibold">
              Direct URL
            </label>
            <div className="input-group">
              <input
                id="widget-url"
                type="url"
                className="form-control font-monospace"
                value={widgetUrl}
                readOnly
                aria-label="Widget direct URL"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => copyText(widgetUrl, "URL copied to clipboard.")}
                aria-label="Copy direct URL"
              >
                Copy
              </button>
            </div>
            <div className="form-text">
              Use this as a standalone page link or button destination.
            </div>
          </div>

          {/* iFrame snippet */}
          <div className="mb-4">
            <label htmlFor="widget-snippet" className="form-label fw-semibold">
              Embed Code (iframe)
            </label>
            <div className="input-group align-items-start">
              <textarea
                id="widget-snippet"
                className="form-control font-monospace"
                value={iframeSnippet}
                readOnly
                rows={8}
                aria-label="Widget iframe embed code"
                style={{ resize: "none" }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() =>
                  copyText(iframeSnippet, "Embed code copied to clipboard.")
                }
                aria-label="Copy embed code"
              >
                Copy
              </button>
            </div>
            <div className="form-text">
              Paste this into any HTML page or CMS. Pass{" "}
              <code>?source=your-site</code> on the URL to track where views
              come from in reports.
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="fw-semibold mb-2">Live Preview</p>
            <div
              className="border rounded"
              style={{ height: 520, overflow: "hidden" }}
            >
              <iframe
                ref={previewRef}
                src={widgetUrl}
                title="Widget preview"
                width="100%"
                height="100%"
                style={{ border: "none" }}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
