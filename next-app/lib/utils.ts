/**
 * Truncate a full name to first two names only
 * "Ahmed Mohamed Ebrahim" -> "Ahmed Mohamed"
 * "احمد محمد ابراهيم" -> "احمد محمد"
 */
export function getDisplayName(fullName: string | null | undefined): string {
    if (!fullName) return 'User';
    const parts = fullName.trim().split(/\s+/);
    return parts.slice(0, 2).join(' ') || 'User';
}

/**
 * Get initials from a name (first letter of first two words)
 */
export function getInitials(name: string | null | undefined): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0]?.[0]?.toUpperCase() || 'U';
}
