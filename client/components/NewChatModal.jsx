import  { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
const API_URL = process.env.REACT_APP_API_URL || 'https://dummy-api.com';
const FALLBACK_AVATAR = process.env.REACT_APP_FALLBACK_AVATAR || 'https://via.placeholder.com/40';

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
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `${API_URL}/api/checkContacts`,
        { phoneNumbers },
        { headers: {Authorization: `Bearer dummy_token`
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-xl relative">
        {/* Close Button */}
        {loading ? (
  <p className="text-center text-gray-500">Loading contacts...</p>
) : (
  <div className="max-h-64 overflow-y-auto">
    {registeredContacts.length === 0 ? (
      <p className="text-center text-gray-500">No registered contacts found.</p>
    ) : (
      registeredContacts.map((user) => (
        <button
          key={user.userId}
          className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer transition-transform transform hover:scale-105 text-left w-full"
          onClick={() => handleSelectContact(user)}
        >
          {/* User Avatar */}
          <img
            src={user.profile_image || FALLBACK_AVATAR}
            alt={user.name}
            className="w-12 h-12 rounded-full border border-gray-300 mr-4"
          />
          <div>
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.phone}</p>
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
