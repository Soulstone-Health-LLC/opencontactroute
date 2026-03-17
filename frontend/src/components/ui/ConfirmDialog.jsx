import { useEffect, useRef } from "react";

export default function ConfirmDialog({
  show,
  title,
  message,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (show) dialogRef.current?.focus();
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={dialogRef}
      className="modal d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="confirm-dialog-title">
              {title}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onCancel}
            />
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
