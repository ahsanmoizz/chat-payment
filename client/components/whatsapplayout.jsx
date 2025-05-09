import React, { useState } from 'react';
import Sidebar from './sidebar';
import ChatWindow from './chatwindow';

export default function WhatsAppLayout() {
  const [selectedChat, setSelectedChat] = useState(null); // Store the active chat

  // Function to handle selection from Sidebar
  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  return (
    <div className="h-screen flex">
      {/* Left sidebar: chat list */}
      <div className="w-1/3 md:w-1/4 border-r border-gray-300 bg-gray-50">
        <Sidebar onSelectChat={handleSelectChat} />
      </div>

      {/* Right side: chat content */}
      <div className="flex-grow bg-white">
        {selectedChat ? (
          <ChatWindow chat={selectedChat} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
