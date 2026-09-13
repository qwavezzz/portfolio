/** Prefix local routes and public assets for both root and subdirectory hosting. */
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}
