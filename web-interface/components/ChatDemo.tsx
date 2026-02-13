"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { User, Terminal, Lock, Unlock, Send } from "lucide-react";

export function ChatDemo() {
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hello! I'm OpenClaw v2. Secure connection established. How can I assist you today?" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isSecure, setIsSecure] = useState(true);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setInput("");
        setIsTyping(true);

        // Simulate AI processing
        setTimeout(() => {
            setIsTyping(false);
            const responses = [
                "I've encrypted that request and am processing it locally.",
                "Analyzing network patterns... No threats detected.",
                "Based on your secure profile, I recommend optimizing the data flow.",
                "Function executed successfully within the sandbox environment.",
                "I can help you with that. Accessing secure primitives..."
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            setMessages(prev => [...prev, { role: "assistant", content: randomResponse }]);
        }, 1500);
    };

    const suggestions = [
        "Audit security logs",
        "Generate encryption key",
        "Optimize workflow"
    ];

    return (
        <div className="w-full max-w-2xl mx-auto bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 mr-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <span className="text-xs text-neutral-400 font-mono">openclaw-v2</span>
                </div>
                <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${isSecure ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} cursor-pointer transition-all`}
                    onClick={() => setIsSecure(!isSecure)}
                >
                    {isSecure ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {isSecure ? "AES-256 Encrypted" : "Insecure"}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 flex-shrink-0 mt-1">
                                <Terminal className="w-4 h-4 text-blue-400" />
                            </div>
                        )}

                        <div
                            className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white/10 text-neutral-200 border border-white/5 rounded-bl-none'
                                }`}
                        >
                            {msg.content}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 flex-shrink-0 mt-1">
                                <User className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </motion.div>
                ))}

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mt-1">
                            <Terminal className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                {messages.length === 1 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => { setInput(s); }}
                                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-400 hover:text-white transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
