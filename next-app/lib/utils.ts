/**
 * Get display name - first name + last name (handling compound family names)
 * "Omar Khaled Mohammed Al-Basuony" -> "Omar Al-Basuony"
 * "نبيلة / nabila" -> "nabila" (takes first part)
 */
export function getDisplayName(fullName: string | null | undefined): string | undefined {
    if (!fullName || !fullName.trim()) return undefined;

    // Clean up mixed format like "nabila / نبيلة"
    const cleaned = fullName.split('/')[0].trim();
    const parts = cleaned.trim().split(/\s+/);

    if (parts.length <= 2) return cleaned.trim();

    const firstName = parts[0];
    const lastPart = parts[parts.length - 1];
    const secondToLast = parts.length > 2 ? parts[parts.length - 2] : null;

    // Common compound prefixes: Al, El, Abd, Abu, Ben, Ibn
    const compoundPrefixes = /^(al|el|abd|abu|ben|ibn)[-]?$/i;

    if (secondToLast && compoundPrefixes.test(secondToLast)) {
        return `${firstName} ${secondToLast} ${lastPart}`;
    }

    if (/^(al|el|abd|abu)-/i.test(lastPart)) {
        return `${firstName} ${lastPart}`;
    }

    return `${firstName} ${lastPart}`;
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
