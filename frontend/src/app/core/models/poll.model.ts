import { LocationInfo } from './user.model';

export type PollStatus = 'ACTIVE' | 'CLOSED';

export interface PollOption {
  id?: string;
  text: string;
  votes?: number;
}

export interface Poll extends LocationInfo {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  status: PollStatus;
  totalVotes?: number;
  category?: string;
  hasVoted?: boolean;
  votedOptionId?: string | null;
  closingDate?: string | null;
  createdBy?: { id?: string; fullName?: string };
  createdAt?: string;
}

export interface PollPayload extends LocationInfo {
  question: string;
  description?: string;
  options: { text: string }[];
  category?: string;
  closingDate?: string | null;
}

export interface PollResultOption {
  id?: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  question: string;
  status: PollStatus;
  totalVotes: number;
  options: PollResultOption[];
  city?: string | null;
  state?: string | null;
}

export interface PollQuery {
  search?: string;
  status?: PollStatus | '';
  city?: string;
  state?: string;
  category?: string;
  page?: number;
  limit?: number;
}
