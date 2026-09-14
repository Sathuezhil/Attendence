import { useState } from 'react';

export function usePagedFilters(filterKey: string) {
  const [pager, setPager] = useState({ key: '', page: 1 });
  const page = pager.key === filterKey ? pager.page : 1;

  return {
    page,
    setPage: (next: number) => setPager({ key: filterKey, page: next }),
  };
}
