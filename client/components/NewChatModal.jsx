import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
const API_URL = process.env.REACT_APP_API_URL ;
const FALLBACK_AVATAR = process.env.REACT_APP_FALLBACK_AVATAR ;

const NewChatModal = ({ onClose, onSelectChat }) => {
  const [ setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registeredContacts, setRegisteredContacts] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile (simple check based on window width)
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    // On mount, load device contacts and check which are registered.
    loadDeviceContacts();
  }, []);

  const loadDeviceContacts = async () => {
    try {
      setLoading(true);
      // Pseudo-function: Get contacts from device.
      const deviceContacts = await getContactsFromDevice(); // Replace with real implementation on mobile
      setContacts(deviceContacts);

      // Check which contacts are registered.
      const phoneNumbers = deviceContacts.map((c) => c.phoneNumber);
      const token = localStorage.getItem('userToken'); //user token
      const response = await axios.post(
        `${API_URL}/api/checkContacts`,
        { phoneNumbers },
        { headers: {Authorization: `Bearer ${token}`  //user token
 } }
      );
      setRegisteredContacts(response.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render NewChatModal only on mobile devices.
  if (!isMobile) return null;

  const handleSelectContact = (user) => {
    if (onSelectChat) {
      onSelectChat({
        id: 'new-chat', // Replace with actual chat ID from backend if available
        chat_partner: user.name,
        profile_image: user.profile_image,
      });
    }
    onClose();
  };
return (
  <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] w-full max-w-md p-6 rounded-2xl shadow-2xl relative text-white">
      <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-400 transition">
        ✕
      </button>

      <h2 className="text-xl font-bold mb-4">Start New Chat</h2>

      {loading ? (
        <p className="text-center text-white/70">Loading contacts...</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-3">
          {registeredContacts.length === 0 ? (
            <p className="text-center text-white/60">No registered contacts found.</p>
          ) : (
            registeredContacts.map((user) => (
              <button
                key={user.userId}
                className="flex items-center p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-all w-full text-left shadow"
                onClick={() => handleSelectContact(user)}
              >
                <img
                  src={user.profile_image || FALLBACK_AVATAR}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border border-white/20 mr-4"
                />
                <div>
                  <p className="font-semibold text-white">{user.name}</p>
                  <p className="text-sm text-white/60">{user.phone}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  </div>
);

};
NewChatModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSelectChat: PropTypes.func.isRequired,
};

// Pseudo-function: Replace with an actual implementation for mobile contacts retrieval.
async function getContactsFromDevice() {
  // For an actual mobile app, use a proper contacts plugin.
  return [
    { name: 'Alice', phoneNumber: '+1234567890' },
    { name: 'Bob', phoneNumber: '+0987654321' },
  ];
}

export default NewChatModal;
