import { useState } from "react";

// Manages current page and per-page size for paginated list views.
// Call reset() when filters change to return to page 1.
export function usePagination(defaultPerPage = 25) {
  const [page, setPage] = useState(1);
  const [perPage] = useState(defaultPerPage);

  const reset = () => setPage(1);

  return { page, setPage, perPage, reset };
}
