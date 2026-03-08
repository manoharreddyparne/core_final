/* ─────────── Time helpers ─────────── */
export function safeTime(ts: any): string {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function safeDate(ts: any): Date | null {
    if (!ts) return null;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
}

export function getDateLabel(ts: any): string {
    const d = safeDate(ts);
    if (!d) return '';
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function groupByDate(messages: any[]) {
    const groups: { label: string; msgs: any[] }[] = [];
    let lastLabel = '';
    for (const msg of messages) {
        const label = getDateLabel(msg.timestamp) || 'Unknown';
        if (label !== lastLabel) { groups.push({ label, msgs: [] }); lastLabel = label; }
        groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
}

export function formatLastSeen(ts: any): string {
    const d = safeDate(ts);
    if (!d) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const EMOJIS = [
    '😀', '😂', '😍', '😎', '😭', '😡', '🥳', '🤔', '😊', '😇',
    '👍', '❤️', '🔥', '✨', '🎉', '💯', '🙏', '🚀', '💡', '👀',
    '🙌', '😴', '🤣', '🥰', '😏', '😢', '😤', '😱', '🫡', '🫂',
];
