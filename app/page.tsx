'use client'

import React, { useState, useRef, useEffect } from 'react';
import { FaBars, FaPaperPlane, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import TextareaAutosize from 'react-textarea-autosize';
import { streamMessage, ChatMessage, Chat } from '../actions/stream-message';
import { readStreamableValue } from 'ai/rsc';

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats); 
        setChats(parsedChats);
        // Set the latest chat as the current chat
        if (parsedChats.length > 0) {
          setCurrentChat(parsedChats[parsedChats.length - 1]);
        }
      } catch (error) {
        console.error('Error parsing saved chats:', error);
      }
    }
  }, []);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('chats', JSON.stringify(chats));
    }
  }, [chats]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: `Chat ${chats.length + 1}`,
      messages: []
    };
    setChats(prevChats => {
      const updatedChats = [...prevChats, newChat];
      localStorage.setItem('chats', JSON.stringify(updatedChats));
      return updatedChats;
    });
    setCurrentChat(newChat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming || !currentChat) return;

    const newUserMessage: ChatMessage = { id: currentChat.messages.length, role: 'user', content: input };
    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, newUserMessage]
    };
    setCurrentChat(updatedChat);
    setChats(chats.map(chat => chat.id === updatedChat.id ? updatedChat : chat));
    setInput('');
    setStreaming(true);

    const { output } = await streamMessage(updatedChat.messages);

    const newAssistantMessage: ChatMessage = { id: updatedChat.messages.length + 1, role: 'assistant', content: '' };
    let finalChat = {
      ...updatedChat,
      messages: [...updatedChat.messages, newAssistantMessage]
    };

    for await (const delta of readStreamableValue(output)) {
      finalChat = {
        ...finalChat,
        messages: [
          ...finalChat.messages.slice(0, -1),
          { ...finalChat.messages[finalChat.messages.length - 1], content: finalChat.messages[finalChat.messages.length - 1].content + delta }
        ]
      };
      setCurrentChat(finalChat);
      setChats(chats.map(chat => chat.id === finalChat.id ? finalChat : chat));
    }

    setStreaming(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const renameChat = (chatId: string, newName: string) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, name: newName.trim() || chat.name } : chat
      )
    );
    setCurrentChat(prevChat => 
      prevChat && prevChat.id === chatId 
        ? { ...prevChat, name: newName.trim() || prevChat.name } 
        : prevChat
    );
    setEditingChatId(null);
  };

  const deleteChat = (chatId: string) => {
    setChats(prevChats => {
      const updatedChats = prevChats.filter(chat => chat.id !== chatId);
      if (currentChat?.id === chatId) {
        // If the deleted chat was the current one, set the new current chat
        const newCurrentChat = updatedChats[updatedChats.length - 1] || null;
        setCurrentChat(newCurrentChat);
      }
      return updatedChats;
    });
  };

  const clearAllChats = () => {
    setChats([]);
    setCurrentChat(null);
    localStorage.removeItem('chats');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800">
      {(sidebarOpen || !isMobile) && (
        <aside className={`${isMobile ? 'fixed inset-0 z-50 sidebar-animation' : 'w-1/4'} bg-gray-200 p-4`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Previous Chats</h2>
            <div>
              <button
                onClick={createNewChat}
                className="text-gray-600 hover:text-gray-800 mr-2"
              >
                <FaPlus />
              </button>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          {chats.map(chat => (
            <div 
              key={chat.id} 
              className="p-2 hover:bg-gray-300 cursor-pointer text-gray-800 flex justify-between items-center"
              onClick={() => setCurrentChat(chat)}
            >
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  defaultValue={chat.name}
                  autoFocus
                  onBlur={(e) => renameChat(chat.id, e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && renameChat(chat.id, e.currentTarget.value)}
                  className="bg-white text-black px-1 rounded"
                  onClick={(e) => e.stopPropagation()} // Prevent triggering parent onClick
                />
              ) : (
                <span>{chat.name}</span>
              )}
              <div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingChatId(chat.id);
                  }} 
                  className="mr-2"
                >
                  <FaEdit />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
          <div className="mt-4">
            <button
              onClick={clearAllChats}
              className="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
            >
              Clear All Chats
            </button>
          </div>
        </aside>
      )}
      {(!sidebarOpen && isMobile) && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 text-gray-800"
        >
          <FaBars size={24} />
        </button>
      )}
      <main className="flex-1 flex flex-col p-4">
        <h2 className="text-2xl font-bold text-center mb-4">
          {currentChat ? currentChat.name : 'New Chat'}
        </h2>
        <div className="flex-1 bg-gray-800 border rounded-lg p-4 overflow-y-auto">
          {currentChat?.messages.map((message) => (
            <div key={message.id} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-2 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-300 text-gray-900' 
                  : 'bg-gray-600 text-gray-100'
              }`}>
                {message.content}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="mt-4 relative">
          <TextareaAutosize
            className="border rounded-lg w-full p-2 pr-10 resize-none text-black bg-white"
            placeholder="Type your message..."
            minRows={1}
            maxRows={isMobile ? 3 : 5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming || !currentChat}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
            disabled={streaming || !currentChat}
          >
            <FaPaperPlane />
          </button>
        </form>
      </main>
    </div>
  );
}
