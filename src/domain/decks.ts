export type Deck = {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeckInput = {
  name: string;
  parentId?: string | null;
};

export type UpdateDeckInput = {
  name: string;
  parentId?: string | null;
};

export function assertDeckName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0) {
    throw new Error('Deck name cannot be empty.');
  }
  if (normalized.length > 120) {
    throw new Error('Deck name cannot exceed 120 characters.');
  }
  return normalized;
}
