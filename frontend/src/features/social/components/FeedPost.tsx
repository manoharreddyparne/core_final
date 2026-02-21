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

    const handleShare = (method: string) => {
        const url = window.location.href + `?post=${post.id}`;
        if (method === 'copy') {
            navigator.clipboard.writeText(url);
            alert("Link copied to clipboard!");
        } else if (method === 'wa') {
            window.open(`https://wa.me/?text=Check out this professional update on AUIP: ${url}`);
        } else if (method === 'repost') {
            socialApi.createPost(`RP: ${post.content.substring(0, 50)}...`, post.media_url, post.media_type).then(() => {
                alert("Successfully reposted to your wall!");
            });
        }
    };

    return (
        <div className="glass p-8 rounded-[3rem] space-y-6 animate-in fade-in slide-in-from-bottom-2 group hover:border-primary/20 transition-all duration-500 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] -mr-10 -mt-10 group-hover:bg-primary/10 transition-all"></div>

            {/* Author Info */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl premium-gradient flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/20">
                        {post.author_role?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-white font-black tracking-tight text-lg">{post.author_name || "Nexus User"}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded font-black uppercase tracking-widest leading-none">{post.author_role}</span>
                            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                            <p className="text-[9px] text-muted-foreground font-mono">{new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                <button className="text-white/20 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6 relative z-10">
                <p className="text-blue-50/90 font-medium leading-relaxed text-xl">
                    {post.content}
                </p>

                {post.media_url && (
                    <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-white/5 shadow-2xl">
                        {post.media_type === 'IMAGE' ? (
                            <img src={post.media_url} alt="Post content" className="w-full h-auto object-cover max-h-[600px] hover:scale-105 transition-transform duration-700" />
                        ) : (
                            <video src={post.media_url} controls className="w-full h-auto max-h-[600px]" />
                        )}
                    </div>
                )}
            </div>

            {/* Engagement Actions */}
            <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex gap-10">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all group/btn ${liked ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${liked ? 'bg-primary/20 scale-110' : 'group-hover/btn:bg-white/5'}`}>
                            <svg className="w-5 h-5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        {likes} Respect
                    </button>
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white font-black uppercase tracking-[0.2em] transition-all group/btn"
                    >
                        <div className="p-2 rounded-xl group-hover/btn:bg-white/5 transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        {comments.length} Thoughts
                    </button>

                    {/* Share Menu */}
                    <div className="flex items-center gap-4 border-l border-white/10 pl-6 ml-2">
                        <button onClick={() => handleShare('copy')} className="text-white/20 hover:text-white transition-colors p-2" title="Copy Link">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" /></svg>
                        </button>
                        <button onClick={() => handleShare('wa')} className="text-white/20 hover:text-green-400 transition-colors p-2" title="Share on WhatsApp">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 2.031.815 3.146.816 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.765-5.768-5.765zm3.12 8.169c-.129.364-.741.679-1.02.723-.279.043-.62.064-1.019-.064-.399-.129-.904-.322-1.503-.58-2.584-1.116-4.265-3.755-4.394-3.926-.129-.172-1.04-1.383-1.04-2.628 0-1.245.644-1.859.875-2.108.231-.249.508-.311.679-.311.171 0 .343.011.493.021.163.011.385-.064.602.45.223.536.762 1.853.827 1.983.064.129.108.279.022.45-.429.836-.312.643-.536.877-.086.086-.172.172-.086.322.086.15.385.635.827 1.029.569.508 1.048.665 1.2.74l.215-.15c.108-.129.231-.279.364-.429.129-.15.279-.193.45-.129.172.064 1.116.536 1.309.643.193.107.322.15.364.236.065.108.065.623-.064.987z" /></svg>
                        </button>
                        <button onClick={() => handleShare('repost')} className="text-white/20 hover:text-indigo-400 transition-colors p-2" title="Repost to Wall">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
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
