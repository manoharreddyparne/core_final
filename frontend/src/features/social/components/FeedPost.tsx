import React, { useState } from 'react';
import { socialApi } from '../api';

interface FeedPostProps {
    post: any;
}

export const FeedPost: React.FC<FeedPostProps> = ({ post }) => {
    const [likes, setLikes] = useState(post.likes_count);
    const [liked, setLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState(post.comments || []);

    const handleLike = async () => {
        try {
            const res = await socialApi.likePost(post.id);
            setLikes(res.likes);
            setLiked(!liked);
        } catch (err) {
            console.error(err);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            await socialApi.commentOnPost(post.id, commentText);
            setCommentText("");
            // Refresh comments or optimistic update
            setComments([...comments, { content: commentText, user_name: "You", created_at: new Date().toISOString() }]);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="glass p-8 rounded-[3rem] space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Author Info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xl">
                        {post.author_role?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-white font-black tracking-tight">{post.author_name || "Nexus User"}</p>
                        <p className="text-[10px] text-primary uppercase font-black tracking-widest">{post.author_role}</p>
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{new Date(post.created_at).toLocaleDateString()}</p>
            </div>

            {/* Content */}
            <div className="space-y-4">
                <p className="text-blue-50/90 font-medium leading-relaxed text-lg">
                    {post.content}
                </p>

                {post.media_url && (
                    <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-white/5">
                        {post.media_type === 'IMAGE' ? (
                            <img src={post.media_url} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
                        ) : (
                            <video src={post.media_url} controls className="w-full h-auto max-h-[500px]" />
                        )}
                    </div>
                )}
            </div>

            {/* Engagement Actions */}
            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-8">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${liked ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                    >
                        <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {likes} Respect
                    </button>
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white font-black uppercase tracking-widest transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        {comments.length} Thoughts
                    </button>
                    <button className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white font-black uppercase tracking-widest transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Sync
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="pt-6 space-y-4 animate-in slide-in-from-top-2">
                    <form onSubmit={handleComment} className="flex gap-4">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Share your thoughts..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                        />
                        <button type="submit" className="px-6 py-3 bg-primary text-white font-bold rounded-2xl">Post</button>
                    </form>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {comments.map((comment: any, idx: number) => (
                            <div key={idx} className="bg-white/5 p-4 rounded-2xl space-y-1">
                                <div className="flex justify-between items-center">
                                    <p className="text-primary text-[10px] font-black uppercase tracking-widest">{comment.user_name}</p>
                                    <p className="text-[9px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</p>
                                </div>
                                <p className="text-white/80 text-sm">{comment.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
