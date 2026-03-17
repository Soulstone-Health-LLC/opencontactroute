import { useState } from "react";

export function usePagination(defaultPerPage = 25) {
  const [page, setPage] = useState(1);
  const [perPage] = useState(defaultPerPage);

  const reset = () => setPage(1);

  return { page, setPage, perPage, reset };
}
