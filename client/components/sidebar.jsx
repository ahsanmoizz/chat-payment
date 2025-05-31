import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Call from './main pages/Call';
import NewChatModal from './NewChatModal';
import NewGroupModal from './NewGroupModal';
import CallLogs from './main pages/CallLogs';
import { useTracker } from 'meteor/react-meteor-data';
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import PropTypes from 'prop-types';
const API_URL = process.env.REACT_APP_API_URL ;
const Sidebar = ({ onSelectChat }) => {
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isCallLogsModalOpen, setIsCallLogsModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: 'My Profile', profile_image: process.env.REACT_APP_FALLBACK_AVATAR });

  // Use Meteor's reactive hook to get the current user details.
  const user = useTracker(() => Meteor.user(), []);
  const navigate = useNavigate();

  // API URL from environment variables for production use.
  

  // Fetch individual chats.
  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('userToken'); //user token
      const response = await axios.get( `${API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Mark each individual chat with a type "single"
      const chatsData = response.data.map((chat) => ({ ...chat, type: 'single' }));
      setChats(chatsData);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  // Fetch group chats.
  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('userToken'); //user token
      const response = await axios.get(` ${API_URL}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Mark each group chat with type "group"
      const groupsData = response.data.map((group) => ({ ...group, type: 'group' }));
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    // Fetch chats and groups on initial load
    fetchChats();
    fetchGroups();

    // Set user profile if user is available
    if (user) {
        setUserProfile({
            name: user.profile?.name || 'My Profile',
            profile_image: user.profile?.profile_image || process.env.REACT_APP_FALLBACK_AVATAR || 'https://via.placeholder.com/40',
        });
    }
}, [user]);

useEffect(() => {
   const userId = Meteor.userId() || localStorage.getItem("userId") || process.env.REACT_APP_USER_ID;

    if (!userId) return;
    
    axios.get(`${API_URL}/api/subscription-check/${userId}`)
        .then((res) => {
          if (res.data.isExpired) {
  alert("🚨 Your subscription expired. Please renew...");

            }
        })
        .catch((err) => console.error("Subscription check failed", err));
}, []);


  // Merge chats and groups into a single list.
  const combinedChats = [...chats, ...groups];

  // Filter chats based on the search query.
  const filteredChats = combinedChats.filter((chat) => {
    if (chat.type === 'group') {
      return chat.group_name.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      return chat.chat_partner.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  const handleChatClick = (chat) => {
    if (onSelectChat) {
      onSelectChat(chat);
    }
  };

  const handleCallClick = (chat) => {
    setSelectedChat(chat);
    setIsCallModalOpen(true);
  };

  const closeCallModal = () => {
    setIsCallModalOpen(false);
    setSelectedChat(null);
  };

  // Handle New Chat modal.
  const handleNewChat = () => {
    setIsNewChatModalOpen(true);
  };

  const closeNewChatModal = () => {
    setIsNewChatModalOpen(false);
  };

  // Group modal handlers.
  const openGroupModal = () => {
    setIsGroupModalOpen(true);
  };

  const closeGroupModal = () => {
    setIsGroupModalOpen(false);
  };

  // Call Logs modal handlers.
  const openCallLogsModal = () => {
    setIsCallLogsModalOpen(true);
  };

  const closeCallLogsModal = () => {
    setIsCallLogsModalOpen(false);
  };

  // When a new group is created, update your chat list.
  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, { ...group, type: 'group' }]);
  };

  
  return (
   <div className="flex flex-col h-full bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
  {/* 🌟 Top Bar */}
  <div className="flex items-center justify-between px-6 py-4 bg-white/10 backdrop-blur border-b border-white/20 shadow-lg">
    <div className="flex items-center space-x-3">
      <img
        src={userProfile.profile_image}
        alt={userProfile.name}
        className="w-12 h-12 rounded-full border-2 border-white shadow-md"
      />
      <span className="font-bold text-lg tracking-wide">{userProfile.name}</span>
    </div>
  </div>

  {/* 🔍 Search Bar */}
  <div className="px-4 py-3 border-b border-white/10 bg-white/5">
    <input
      type="text"
      placeholder="Search or start new chat"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full px-4 py-3 rounded-full bg-white/10 text-white border border-white/20 placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#00ffe0] transition-all shadow-sm"
    />
  </div>

  {/* 💬 Chat List */}
  <div className="flex-grow overflow-y-auto px-2 py-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
    {loadingChats || loadingGroups ? (
      <div className="text-center text-white/70">Loading chats...</div>
    ) : filteredChats.length === 0 ? (
      <div className="text-center text-white/50">No chats found.</div>
    ) : (
      filteredChats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => handleChatClick(chat)}
          className="flex items-center justify-between bg-white/10 hover:bg-white/20 transition-all rounded-xl px-4 py-3 mb-3 cursor-pointer shadow-inner"
        >
          <div className="flex items-center space-x-3">
            <img
              src={
                chat.type === 'group'
                  ? chat.group_icon || 'https://via.placeholder.com/40'
                  : chat.profile_image || 'https://via.placeholder.com/40'
              }
              alt={chat.type === 'group' ? chat.group_name : chat.chat_partner}
              className="w-12 h-12 rounded-full border border-white/30 object-cover shadow-sm"
            />
            <div>
              <div className="font-semibold text-base text-white">
                {chat.type === 'group' ? chat.group_name : chat.chat_partner}
              </div>
              <div className="text-sm text-white/60 truncate max-w-xs">
                {chat.last_message}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1">
            <span className="text-xs text-white/50">
              {new Date(chat.updated_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCallClick(chat);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm shadow-lg hover:scale-105 transition"
            >
              📞 Call
            </button>
          </div>
        </div>
      ))
    )}
  </div>

  {/* 🚀 Bottom Buttons */}
  <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur flex flex-wrap gap-3 justify-center shadow-inner">
    <button
      onClick={() => navigate("/payment-entry")}
      className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:scale-105 transition"
    >
      💳 Payments
    </button>
    <button
      onClick={handleNewChat}
      className="bg-gradient-to-r from-green-400 to-teal-500 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:scale-105 transition"
    >
      ➕ New Chat
    </button>
    <button
      onClick={openGroupModal}
      className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:scale-105 transition"
    >
      👥 Create Group
    </button>
    <button
      onClick={openCallLogsModal}
      className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-4 py-2 rounded-full font-medium shadow-lg hover:scale-105 transition"
    >
      📜 Call Logs
    </button>
    <Link
      to="/subscription"
      className="text-sm text-blue-400 hover:text-blue-300 underline mt-2"
    >
      🔓 Upgrade Plan
    </Link>
  </div>

  {/* 💼 Subscription Plans Shortcut */}
  <button
    onClick={() => navigate("/subscription")}
    className="px-4 py-3 text-sm text-left text-white/80 hover:bg-white/10 w-full transition"
  >
    💼 Subscription Plans
  </button>

  {/* 📦 Modals */}
  {isNewChatModalOpen && (
    <NewChatModal onClose={closeNewChatModal} onSelectChat={onSelectChat} />
  )}
  {isGroupModalOpen && (
    <NewGroupModal
      onClose={closeGroupModal}
      onGroupCreated={handleGroupCreated}
      userToken={localStorage.getItem('userToken')}
    />
  )}
  {isCallModalOpen && (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white text-black p-6 rounded-lg shadow-2xl w-full max-w-md relative">
        <button
          onClick={closeCallModal}
          className="absolute top-2 right-2 text-gray-600 hover:text-red-500 transition"
        >
          ✖️
        </button>
        <h2 className="mb-4 text-xl font-bold">
          Calling {selectedChat?.type === 'group' ? selectedChat.group_name : selectedChat.chat_partner}
        </h2>
        <Call chatPartner={selectedChat} />
      </div>
    </div>
  )}
  {isCallLogsModalOpen && <CallLogs onClose={closeCallLogsModal} />}
</div>

  );
};
Sidebar.prototypes = {
  onSelectChat: PropTypes.func,
};
export default Sidebar;