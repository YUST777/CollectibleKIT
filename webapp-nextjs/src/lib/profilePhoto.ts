/**
 * Get profile photo URL with default fallback
 * @param photoUrl Telegram photo URL or null/undefined
 * @returns Photo URL or default avatar path
 */
export function getProfilePhotoUrl(photoUrl: string | null | undefined): string {
  if (photoUrl && photoUrl.trim()) {
    return photoUrl;
  }
  return '/default-avatar.png';
}

