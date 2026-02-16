import React, { useState, useRef, useEffect } from 'react';
import { Message, Story } from '../types';
import StoryBible from './StoryBible';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  chapterTitle: string;
  story?: Story; // Optional story data for Bible
}

type PanelTab = 'cowriter' | 'bible';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isTyping, chapterTitle, story }) => {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<PanelTab>('cowriter');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-surface border-r border-dark-border">
      {/* Tab Header */}
      <div className="flex border-b border-dark-border bg-dark-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('cowriter')}
          className={`flex-1 px-6 py-4 text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'cowriter'
              ? 'text-cobalt border-b-2 border-cobalt bg-dark-surface'
              : 'text-text-muted hover:text-text-main hover:bg-dark-surface/50'
            }`}
        >
          Co-Writer
        </button>
        <button
          onClick={() => setActiveTab('bible')}
          className={`flex-1 px-6 py-4 text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'bible'
              ? 'text-cobalt border-b-2 border-cobalt bg-dark-surface'
              : 'text-text-muted hover:text-text-main hover:bg-dark-surface/50'
            }`}
        >
          Story Bible
        </button>
      </div>

      {activeTab === 'cowriter' ? (
        <>
          {/* Co-Writer Focus Header */}
          <div className="px-6 py-3 border-b border-dark-border bg-dark-surface/50">
            <p className="text-sm font-sans text-zinc-400 truncate">
              Focus: <span className="text-cobalt font-medium">{chapterTitle}</span>
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed font-sans transition-all duration-300
                    ${msg.role === 'user'
                      ? 'bg-zinc-800 text-text-main shadow-sm rounded-br-none border border-zinc-700'
                      : 'bg-transparent text-text-main border-l-2 border-cobalt pl-4 rounded-none'}`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-zinc-600 mt-1 px-1 uppercase tracking-wider">
                  {msg.role === 'user' ? 'You' : 'Architect'}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="bg-transparent text-cobalt border-l-2 border-cobalt pl-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cobalt rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-cobalt rounded-full animate-pulse delay-75" />
                    <span className="w-1.5 h-1.5 bg-cobalt rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-dark-surface">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type instructions or 'Write a scene where...'"
                className="w-full bg-zinc-800/50 border border-dark-border rounded-xl py-3 pl-4 pr-12 text-sm font-sans text-text-main placeholder-zinc-600 focus:outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt transition-all shadow-sm"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-cobalt disabled:text-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {/* Quick Prompts */}
              {['Describe the setting', 'Add dialogue', 'Make it tense'].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className="whitespace-nowrap px-3 py-1 bg-zinc-800/50 border border-dark-border rounded-full text-xs text-zinc-400 hover:border-cobalt hover:text-cobalt transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Story Bible View */
        story ? (
          <StoryBible story={story} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <p className="font-serif italic">No story data available</p>
          </div>
        )
      )}
    </div>
  );
};

export default ChatInterface;

