import { LocationInfo } from './user.model';

export type PetitionStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'CLOSED' | 'FLAGGED';

export const PETITION_STATUSES: PetitionStatus[] = [
  'ACTIVE',
  'UNDER_REVIEW',
  'CLOSED',
  'FLAGGED',
];

export interface PetitionCreator {
  id?: string;
  fullName?: string;
  email?: string;
}

export interface GovernanceResponse {
  id?: string;
  message: string;
  status?: PetitionStatus;
  respondedBy?: PetitionCreator;
  createdAt?: string;
}

export interface Petition extends LocationInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  tags?: string[];
  status: PetitionStatus;
  signaturesCount: number;
  targetSignatures: number;
  mediaUrls?: string[];
  creator?: PetitionCreator;
  creatorId?: string;
  hasSigned?: boolean;
  signedAt?: string | null;
  responses?: GovernanceResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PetitionPayload extends LocationInfo {
  title: string;
  description: string;
  category: string;
  tags: string[];
  targetSignatures: number;
  mediaUrls?: string[];
}

export interface PetitionQuery {
  search?: string;
  category?: string;
  city?: string;
  state?: string;
  status?: PetitionStatus | '';
  tag?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const PETITION_CATEGORIES = [
  'Infrastructure',
  'Environment',
  'Public Safety',
  'Transportation',
  'Health',
  'Education',
  'Housing',
  'Governance',
] as const;
