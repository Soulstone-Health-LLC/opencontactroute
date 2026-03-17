import { useRef } from "react";
import { toast } from "react-toastify";

const WIDGET_PATH = "/v1/widget";

function getOrigin() {
  return window.location.origin;
}

export default function SettingsPage() {
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
