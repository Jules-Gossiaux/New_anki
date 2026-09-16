export type Tag = {
  id: string;
  name: string;
  createdAt: string;
};

export function normalizeTagName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function normalizeTagNames(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeTagName).filter((value) => value.length > 0))];
}
