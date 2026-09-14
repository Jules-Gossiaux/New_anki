export type Note = {
  id: string;
  noteType: string;
  front: string;
  back: string;
  example: string | null;
  extra: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNoteInput = {
  noteType?: string;
  front: string;
  back: string;
  example?: string | null;
  extra?: string | null;
};

export function assertNoteContent(value: string, field: 'front' | 'back'): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Note ${field} cannot be empty.`);
  }
  return normalized;
}
