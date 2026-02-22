import React, { useState, useEffect } from 'react';
import { notificationApi } from './api';
import { Bell, Check, ExternalLink, X, MessageSquare, Zap, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

export const NotificationOverlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await notificationApi.getNotifications();
            setNotifications(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="absolute top-14 right-0 w-[400px] z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="glass-dark border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col max-h-[600px]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg">Alert Center</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                {unreadCount > 0 ? `${unreadCount} unread events` : 'System healthy'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all shadow-lg border border-white/5"
                                title="Mark all as read"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all shadow-lg border border-white/5"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-4">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Syncing with registry...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                                <Shield className="w-8 h-8 text-white/10" />
                            </div>
                            <h4 className="text-white font-bold">No active alerts</h4>
                            <p className="text-xs text-gray-500">Your institutional record is up to date and clean.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-6 transition-all hover:bg-white/5 group relative ${!notif.is_read ? 'bg-primary/5' : ''}`}
                                >
                                    {!notif.is_read && (
                                        <div className="absolute left-6 top-8 w-1 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(235,108,34,0.5)]"></div>
                                    )}
                                    <div className="ml-4 space-y-3">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-1">
                                                <h4 className={`text-sm font-bold ${!notif.is_read ? 'text-white' : 'text-gray-400'}`}>
                                                    {notif.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                                    {notif.message}
                                                </p>
                                            </div>
                                            <span className="text-[9px] text-gray-600 font-black whitespace-nowrap">
                                                {formatRelativeTime(new Date(notif.created_at))}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex gap-2">
                                                {notif.link_url && (
                                                    <button
                                                        onClick={() => {
                                                            handleMarkAsRead(notif.id);
                                                            navigate(notif.link_url);
                                                            onClose();
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                                                    >
                                                        Review Action
                                                        <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {!notif.is_read && !notif.link_url && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(notif.id)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Acknowledge
                                                    </button>
                                                )}
                                            </div>
                                            {notif.notification_type === 'COMMUNICATION' && (
                                                <MessageSquare className="w-3.5 h-3.5 text-gray-700" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 text-center bg-white/5">
                    <button className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">
                        Notification Identity Policy
                    </button>
                </div>
            </div>
        </div>
    );
};
