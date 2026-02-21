import React, { useState } from 'react';
import { Search, Send, Image as ImageIcon, Smile, MoreVertical, Phone, Video, Check, CheckCheck, MessageCircle } from 'lucide-react';

export const ChatHub = () => {
    const [activeChat, setActiveChat] = useState<number | null>(1);
    const [msgInput, setMsgInput] = useState("");

    const contacts = [
        { id: 1, name: "Alice Smith", role: "STUDENT", avatar: "A", lastMsg: "Did you check the new placement drive?", time: "10:42 AM", unread: 2, online: true },
        { id: 2, name: "Bob Johnson", role: "ALUMNI", avatar: "B", lastMsg: "Thanks for the referral!", time: "Yesterday", unread: 0, online: false },
        { id: 3, name: "Charlie Brown", role: "STUDENT", avatar: "C", lastMsg: "Typing...", time: "Now", unread: 0, online: true, typing: true },
    ];

    const messages = [
        { id: 1, sender: 'them', text: "Hey! Are you applying for the Microsoft role?", time: "10:30 AM", status: "seen" },
        { id: 2, sender: 'me', text: "Yes, I just uploaded my AI optimized resume from the Studio.", time: "10:35 AM", status: "seen" },
        { id: 3, sender: 'them', text: "That's awesome. Did the ATS score improve?", time: "10:38 AM", status: "seen" },
        { id: 4, sender: 'me', text: "Jumped from 65 to 92! Highly recommend.", time: "10:40 AM", status: "seen" },
        { id: 5, sender: 'them', text: "Did you check the new placement drive?", time: "10:42 AM", status: "delivered" },
    ];

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in duration-700">
            {/* Left Sidebar: Conversatons list */}
            <div className="w-full md:w-80 glass rounded-[2.5rem] border-white/5 flex flex-col overflow-hidden h-full shrink-0">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter">Messages <span className="text-primary NOT-italic">& Connect</span></h2>
                    <div className="relative mt-4">
                        <input
                            type="text"
                            placeholder="Search Network..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-all"
                        />
                        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {contacts.map(contact => (
                        <div
                            key={contact.id}
                            onClick={() => setActiveChat(contact.id)}
                            className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all ${activeChat === contact.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-lg">
                                    {contact.avatar}
                                </div>
                                {contact.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0b1120]"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-bold text-white truncate">{contact.name}</h3>
                                    <span className="text-[10px] text-gray-500 font-bold shrink-0">{contact.time}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate ${contact.typing ? 'text-primary font-bold italic' : 'text-gray-400'}`}>
                                        {contact.lastMsg}
                                    </p>
                                    {contact.unread > 0 && (
                                        <div className="w-5 h-5 rounded-full premium-gradient flex items-center justify-center text-[10px] text-white font-black shrink-0">
                                            {contact.unread}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Side: Active Chat Area */}
            {activeChat ? (
                <div className="flex-1 glass rounded-[2.5rem] border-white/5 flex flex-col overflow-hidden h-full relative">
                    {/* Chat Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black">
                                {contacts.find(c => c.id === activeChat)?.avatar}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{contacts.find(c => c.id === activeChat)?.name}</h3>
                                <p className="text-[10px] text-green-400 uppercase font-black tracking-widest">{contacts.find(c => c.id === activeChat)?.typing ? 'Typing...' : 'Online'}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Phone className="w-5 h-5" /></button>
                            <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Video className="w-5 h-5" /></button>
                            <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><MoreVertical className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 py-1.5 rounded-full bg-white/5">Today</span>
                        </div>
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                <div className={`flex flex-col gap-1 max-w-[70%]`}>
                                    <div className={`p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-xl
                                        ${msg.sender === 'me' ? 'premium-gradient text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'}
                                    `}>
                                        {msg.text}
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-[10px] text-gray-500 font-bold ${msg.sender === 'me' ? 'justify-end' : 'justify-start pl-2'}`}>
                                        {msg.time}
                                        {msg.sender === 'me' && (
                                            msg.status === 'seen' ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/5 m-2 rounded-[2rem]">
                        <div className="flex items-center gap-3">
                            <button className="p-3 text-gray-400 hover:text-primary transition-colors hover:bg-white/5 rounded-full shrink-0">
                                <Smile className="w-6 h-6" />
                            </button>
                            <button className="p-3 text-gray-400 hover:text-primary transition-colors hover:bg-white/5 rounded-full shrink-0">
                                <ImageIcon className="w-6 h-6" />
                            </button>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="flex-1 bg-white/5 border-none rounded-2xl px-6 py-3.5 text-white focus:outline-none focus:ring-1 focus:ring-primary h-full placeholder:text-gray-500"
                                value={msgInput}
                                onChange={e => setMsgInput(e.target.value)}
                            />
                            <button className="w-12 h-12 shrink-0 rounded-[1.2rem] premium-gradient flex items-center justify-center text-white shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                                <Send className="w-5 h-5 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 glass rounded-[2.5rem] border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                        <MessageCircle className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white italic">Select a conversation</h2>
                        <p className="text-gray-400 text-sm mt-2">End-to-End encrypted messaging hub.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
