// Skeleton loaders — kept tiny so they lazy-load fast
export const SkeletonRow = () => (
    <tr className="border-b border-white/5">
        {[1, 2, 3, 4, 5].map(i => (
            <td key={i} className="px-4 py-4">
                <div className="h-4 bg-white/5 rounded-lg animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            </td>
        ))}
    </tr>
);

export const SkeletonCard = () => (
    <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4 animate-pulse">
        <div className="h-3 bg-white/5 rounded-full w-20" />
        <div className="h-6 bg-white/5 rounded-xl w-3/4" />
        <div className="w-full h-1 bg-white/5 rounded-full" />
        <div className="h-3 bg-white/5 rounded-full w-1/2" />
    </div>
);
