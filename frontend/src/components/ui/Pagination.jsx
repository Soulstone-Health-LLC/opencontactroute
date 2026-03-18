export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  perPage,
}) {
  const showCount = totalItems != null && perPage != null;
  const showNav = totalPages > 1;

  if (!showCount && !showNav) return null;

  const start = showCount ? (page - 1) * perPage + 1 : null;
  const end = showCount ? Math.min(page * perPage, totalItems) : null;

  return (
    <div>
      {showCount && (
        <p className="text-muted text-center small mb-1">
          Showing {start}–{end} of {totalItems}
        </p>
      )}
      {showNav && (
        <nav aria-label="Pagination">
          <ul className="pagination justify-content-center mb-0">
            <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              </li>
            ))}
            <li
              className={`page-item ${page === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
