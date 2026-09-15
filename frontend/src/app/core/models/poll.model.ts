import { LocationInfo } from './user.model';

export type PollStatus = 'ACTIVE' | 'CLOSED';

export interface PollOption {
  id?: string;
  _id?: string;
  text: string;
  votes?: number;
  votesCount?: number;
}

export interface Poll extends LocationInfo {
  id: string;
  _id?: string;
  title?: string;
  question: string;
  description?: string;
  options: PollOption[];
  status: PollStatus;
  totalVotes?: number;
  category?: string;
  hasVoted?: boolean;
  votedOptionId?: string | null;
  closingDate?: string | null;
  endDate?: string | null;
  createdBy?: { id?: string; _id?: string; fullName?: string; name?: string };
  creator?: { id?: string; _id?: string; fullName?: string; name?: string };
  targetLocation?: LocationInfo;
  createdAt?: string;
}

export interface PollPayload extends LocationInfo {
  question: string;
  title?: string;
  description?: string;
  options: { text: string }[];
  category?: string;
  closingDate?: string | null;
  endDate?: string | null;
  targetLocation?: LocationInfo;
}

export interface PollResultOption {
  id?: string;
  _id?: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  question: string;
  title?: string;
  status: PollStatus;
  totalVotes: number;
  options: PollResultOption[];
  city?: string | null;
  state?: string | null;
  location?: LocationInfo;
}

export interface PollQuery {
  search?: string;
  status?: PollStatus | 'active' | 'closed' | '';
  city?: string;
  state?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}