/** Paginated envelope. Adjust in the services' `unwrap()` helper if your API differs. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportSummary {
  totalPetitions?: number;
  activePetitions?: number;
  underReviewPetitions?: number;
  closedPetitions?: number;
  totalSignatures?: number;
  totalPolls?: number;
  activePolls?: number;
  closedPolls?: number;
  totalVotes?: number;
  participationRate?: number;
  [key: string]: number | undefined;
}

export interface CategoryStat {
  label: string;
  value: number;
}

export interface MonthlyStat {
  month: string;
  petitions?: number;
  signatures?: number;
  votes?: number;
}

export type LoadState = 'idle' | 'loading' | 'loaded' | 'empty' | 'error' | 'unavailable';
