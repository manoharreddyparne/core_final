// src/features/social/pages/ProfessionalHub.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { socialApi } from '../api';
import { X } from 'lucide-react';

import { FeedPost } from '../components/FeedPost';

const ProfessionalHub: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [blogs, setBlogs] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(searchParams.get('review') === '1');
    const [newPostContent, setNewPostContent] = useState("");
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [discoverList, setDiscoverList] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    const fetchAll = () => {
        Promise.all([
            socialApi.getBlogsForYou(),
            socialApi.getFeed(),
            socialApi.getDiscovery(),
            socialApi.getRequests()
        ]).then(([b, p, d, r]) => {
            setBlogs(b);
            setPosts(p?.results || p); // Handle DRF Pagination if present
            setDiscoverList(d);
            setPendingRequests(r);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleCreatePost = async () => {
        if (!newPostContent) return;
        try {
            const mType = mediaFile ? (mediaFile.type.startsWith('image') ? 'IMAGE' : 'VIDEO') : 'NONE';
            await socialApi.createPost(newPostContent, mediaFile || "", mType);
            setNewPostContent("");
            setMediaFile(null);
            setShowCreateModal(false);
            fetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const handleConnect = async (userId: number, role: string = 'STUDENT') => {
        try {
            await socialApi.connectToUser(userId, role);
            socialApi.getDiscovery().then(res => setDiscoverList(res));
        } catch (err) {
            console.error(err);
        }
    };

    const handleRespondRequest = async (requestId: number, action: 'ACCEPT' | 'DECLINE') => {
        try {
            await socialApi.respondToRequest(requestId, action);
            fetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const handleMessage = async (userId: number, role: string) => {
        try {
            const session = await socialApi.startChat(userId, role);
            if (session?.session_id) {
                window.location.href = `/chat-hub?session=${session.session_id}`;
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="text-white animate-pulse">Synchronizing professional networks...</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic">
                        Social & <span className="text-primary NOT-italic">Professional</span> Hub
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium">
                        Your personalized network powered by the AUIP Intelligence Matrix.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-8 py-3 bg-white text-blue-900 font-bold rounded-2xl shadow-xl hover:bg-white/90 transition-all"
                >
                    Create New Post
                </button>
            </div>

            {/* Create Post Modal (Mock/Inline for now) */}
            {showCreateModal && (
                <div className="glass p-8 rounded-[3rem] space-y-4 animate-in zoom-in-95">
                    <h3 className="text-xl font-bold text-white">What's on your mind?</h3>
                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white min-h-[120px] focus:outline-none focus:border-primary"
                        placeholder="Share an update, project or thought..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="file"
                                id="post-media"
                                className="hidden"
                                onChange={(e) => setMediaFile(e.target.files ? e.target.files[0] : null)}
                            />
                            <label
                                htmlFor="post-media"
                                className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-all w-full"
                            >
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {mediaFile ? mediaFile.name : "Attach Image/Video"}
                            </label>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleCreatePost}
                                className="px-8 py-3 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                            >
                                Broadcast
                            </button>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-3 bg-white/5 text-white/40 hover:text-white font-bold rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left: Feed */}
                <div className="lg:col-span-3 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-2 h-8 bg-primary rounded-full"></div>
                        Collaborative Wall
                    </h2>

                    <div className="space-y-6">
                        {posts.map(post => (
                            <FeedPost key={post.id} post={post} />
                        ))}
                    </div>
                </div>

                {/* Right: Blogs & Discovery */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Pending Requests Button */}
                    {pendingRequests.length > 0 && (
                        <div className="glass p-8 rounded-[3rem] border-indigo-500/20 bg-indigo-500/5 animate-pulse-slow text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <h2 className="text-xl font-black text-white">Pending Requests</h2>
                            <p className="text-xs text-indigo-200/60 font-bold uppercase tracking-widest">{pendingRequests.length} Waiting</p>
                            <button
                                onClick={() => setShowReviewModal(true)}
                                className="w-full py-4 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Review Influx
                            </button>
                        </div>
                    )}

                    {/* Pending Requests Modal */}
                    {showReviewModal && pendingRequests.length > 0 && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowReviewModal(false)}></div>
                            <div className="glass-dark border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 relative z-10 animate-in zoom-in-95 fade-in duration-300 shadow-2xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                        <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                                        Connection Requests
                                    </h2>
                                    <button onClick={() => setShowReviewModal(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                    {pendingRequests.map(req => (
                                        <div key={req.request_id} className="glass p-5 rounded-3xl flex items-center justify-between border-white/5 hover:border-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white/10">
                                                    {req.sender_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-bold">{req.sender_name}</p>
                                                    <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">{req.sender_role}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        handleRespondRequest(req.request_id, 'ACCEPT');
                                                        if (pendingRequests.length === 1) setShowReviewModal(false);
                                                    }}
                                                    className="px-4 py-2 bg-green-500 text-white text-xs font-black uppercase rounded-xl hover:bg-green-400 hover:scale-105 transition-all shadow-lg shadow-green-500/20"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleRespondRequest(req.request_id, 'DECLINE');
                                                        if (pendingRequests.length === 1) setShowReviewModal(false);
                                                    }}
                                                    className="px-4 py-2 bg-white/5 text-gray-400 text-xs font-black uppercase rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
                        For You
                    </h2>
                    <div className="space-y-4">
                        {(blogs || []).map(blog => (
                            <div key={blog.id} className="glass group overflow-hidden rounded-[2.5rem] border-white/5 hover:border-pink-500/30 transition-all">
                                <div className="h-32 bg-white/5 relative flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent"></div>
                                    <svg className="w-12 h-12 text-white/5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z" /></svg>
                                </div>
                                <div className="p-6 space-y-2">
                                    <h4 className="font-bold text-white group-hover:text-pink-400 transition-colors leading-tight line-clamp-2">
                                        {blog.title}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {blog.tags?.map((tag: string) => (
                                            <span key={tag} className="text-[9px] text-pink-400/60 font-black uppercase italic">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Support Card */}
                    <div className="glass p-8 rounded-[3rem] bg-gradient-to-br from-indigo-500/20 to-transparent border-none">
                        <h4 className="text-lg font-bold text-white">Need Support?</h4>
                        <p className="text-blue-100/60 text-xs mt-1 mb-4">Our AI Engine can diagnose and heal account issues instantly.</p>
                        <button className="w-full py-4 bg-white text-indigo-900 font-black rounded-2xl hover:bg-white/90 transition-all shadow-xl">
                            CONTACT SUPPORT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalHub;
