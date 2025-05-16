import  { useEffect, useState } from 'react';
import axios from 'axios';
import Call from './main pages/Call';
import NewChatModal from './NewChatModal';
import NewGroupModal from './NewGroupModal';
import CallLogs from './main pages/CallLogs';
import { useTracker } from 'meteor/react-meteor-data';
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
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
  const [userProfile, setUserProfile] = useState({ name: 'My Profile', profile_image: process.env.REACT_APP_FALLBACK_AVATAR || 'https://via.placeholder.com/40' });

  // Use Meteor's reactive hook to get the current user details.
  const user = useTracker(() => Meteor.user(), []);
  const navigate = useNavigate();

  // API URL from environment variables for production use.
  const API_URL = process.env.REACT_APP_API_URL || 'https://dummy-api.com';

  // Fetch individual chats.
  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('dummy_user_token');
      const response = await axios.get(`https://dummy-api.com/api/chats`, {
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
      const token = localStorage.getItem('dummy_user_token');
      const response = await axios.get(`https://dummy-api.com/api/groups`, {
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
    const userId = Meteor.userId() || localStorage.getItem("dummy_user_id");
    if (!userId) return;
    
    axios.get(`https://dummy-api.com/api/subscription-check/${userId}`)
        .then((res) => {
            if (res.data.expired) {
                alert("🚨 Your subscription expired. Please renew to continue using features.");
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
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top Bar with User Info */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-lg">
        <div className="flex items-center space-x-3">
          <img
            src={userProfile.profile_image}
            alt={userProfile.name}
            className="w-12 h-12 rounded-full border-2 border-white shadow-md"
          />
          <span className="font-bold text-lg">{userProfile.name}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b">
        <input
          type="text"
          placeholder="Search or start new chat"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all shadow-sm"
        />
      </div>

      {/* Chat List */}
      <div className="flex-grow overflow-y-auto">
     {loadingChats || loadingGroups ? (
    <div className="p-4 text-center text-gray-600">Loading chats...</div>
  ) : (
    <>
      {filteredChats.length === 0 ? (
        <div className="p-4 text-center text-gray-600">No chats found.</div>
      ) : (
        filteredChats.map((chat) => (
          <button
            key={chat.id}
            className="flex items-center justify-between px-4 py-3 w-full text-left cursor-pointer hover:bg-gray-200 transition-colors rounded-lg"
            onClick={() => handleChatClick(chat)}
            role="button"
            tabIndex="0"
          >
            <div className="flex items-center space-x-3">
              <img
                src={
                  chat.type === 'group'
                    ? chat.group_icon || process.env.REACT_APP_FALLBACK_AVATAR || 'https://via.placeholder.com/40'
                    : chat.profile_image || process.env.REACT_APP_FALLBACK_AVATAR || 'https://via.placeholder.com/40'
                }
                alt={chat.type === 'group' ? chat.group_name : chat.chat_partner}
                className="w-12 h-12 rounded-full border border-gray-300 shadow-sm object-cover"
              />
              <div>
                <div className="font-semibold text-base">
                  {chat.type === 'group' ? chat.group_name : chat.chat_partner}
                </div>
                <div className="text-sm text-gray-600 truncate max-w-xs">
                  {chat.last_message}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(chat.updated_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCallClick(chat);
              }}
              className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 transition text-white rounded-full shadow-md"
            >
              Call
            </button>
          </button>
        ))
      )}
    </>
  )}
      </div>

      {/* Bottom Buttons */}
      <div className="p-4 border-t bg-white flex items-center justify-around shadow-inner">
      <button onClick={() => navigate("/payment-entry")} style={{ marginTop: "10px" }}>
  💳 Payments
</button>

        <button
          onClick={handleNewChat}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full transition shadow-md"
        >
          New Chat
        </button>
        <button
          onClick={openGroupModal}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-full transition shadow-md"
        >
          Create Group
        </button>
        <button
          onClick={openCallLogsModal}
          className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-full transition shadow-md"
        >
          Call Logs
        </button>
        <Link to="/subscription" className="text-sm text-blue-600 ml-4 hover:underline">
  Upgrade Plan
</Link>
      </div>
      <button
  onClick={() => navigate("/subscription")}
  className="px-4 py-2 my-2 text-left text-sm hover:bg-gray-100 w-full"
>
  💼 Subscription Plans
</button>

      {/* New Chat Modal */}
      {isNewChatModalOpen && (
        <NewChatModal onClose={closeNewChatModal} onSelectChat={onSelectChat} />
      )}

      {/* New Group Modal */}
      {isGroupModalOpen && (
        <NewGroupModal
          onClose={closeGroupModal}
          onGroupCreated={handleGroupCreated}
          userToken={localStorage.getItem('userToken')}
        />
      )}

      {/* Call Modal */}
      {isCallModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <button
              onClick={closeCallModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 transition"
            >
              X
            </button>
            <h2 className="mb-4 text-xl font-bold">
              Calling {selectedChat && (selectedChat.type === 'group' ? selectedChat.group_name : selectedChat.chat_partner)}
            </h2>
            <Call chatPartner={selectedChat} />
          </div>
        </div>
      )}

      {/* Call Logs Modal */}
      {isCallLogsModalOpen && (
        <CallLogs onClose={closeCallLogsModal} />
      )}
    </div>
  );
};
Sidebar.prototypes = {
  onSelectChat: PropTypes.func,
};
export default Sidebar;