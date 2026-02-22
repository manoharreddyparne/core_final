// src/features/social/pages/ProfessionalHub.tsx
import React, { useEffect, useState } from 'react';
import { socialApi } from '../api';

import { FeedPost } from '../components/FeedPost';

const ProfessionalHub: React.FC = () => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
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
                    {/* Pending Requests */}
                    {pendingRequests.length > 0 && (
                        <div className="glass p-8 rounded-[3rem] border-indigo-500/20 bg-indigo-500/5 animate-pulse-slow">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                                <div className="w-2 h-8 bg-indigo-400 rounded-full"></div>
                                Pending Influx
                            </h2>
                            <div className="space-y-4">
                                {pendingRequests.map(req => (
                                    <div key={req.request_id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white text-xs font-bold">{req.sender_name}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase">{req.sender_role}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRespondRequest(req.request_id, 'ACCEPT')}
                                                className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-all"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleRespondRequest(req.request_id, 'DECLINE')}
                                                className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
                        For You
                    </h2>
                    <div className="space-y-4">
                        {blogs.map(blog => (
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
