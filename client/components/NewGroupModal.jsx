import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode'; // For decoding JWT tokens
import { X, UserPlus, Users } from 'lucide-react'; // SVG icons
// Set your API URL and fallback avatar from environment variables.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const FALLBACK_AVATAR = process.env.REACT_APP_FALLBACK_AVATAR || 'https://via.placeholder.com/40';

const NewGroupModal = ({ onClose, onGroupCreated, userToken }) => {
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch contacts from the backend API (which returns all registered users)
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const token = userToken || localStorage.getItem('userToken');
        const response = await axios.get(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setContacts(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [userToken]);

  const handleContactSelect = (contactId) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleGroupIconChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setGroupIcon(e.target.files[0]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedContacts.length === 0) {
      alert('Please enter a group name and select at least one contact.');
      return;
    }
    setLoading(true);
    try {
      // Convert groupIcon to Base64 if provided
      let groupIconData = null;
      if (groupIcon) {
        groupIconData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(groupIcon);
        });
      }
      // Decode the token to get the current user’s ID for admin role.
      const token = userToken || localStorage.getItem('userToken');
      const decoded = jwtDecode(token);
      const adminId = decoded.id;
      // Ensure the admin is included in the group members.
      let memberIds = [...selectedContacts];
      if (!memberIds.includes(adminId)) {
        memberIds.push(adminId);
      }
      const groupData = {
        groupName,
        groupIcon: groupIconData,
        memberIds,
        adminId,
      };
      const response = await axios.post(`${API_URL}/api/groups`, groupData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Notify parent component that a new group has been created.
      onGroupCreated(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

 

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-800">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users size={24} className="text-purple-500" /> Create Group
        </h2>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-purple-500"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleGroupIconChange}
          className="mb-4 p-2 border rounded-lg w-full cursor-pointer"
        />
        <div className="max-h-64 overflow-y-auto border p-2 mb-4 rounded-lg">
          {loading ? (
            <p className="text-gray-600">Loading contacts...</p>
          ) : contacts.length === 0 ? (
            <p className="text-gray-600">No contacts found.</p>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedContacts.includes(contact.id) ? 'bg-purple-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleContactSelect(contact.id)}
              >
                <img
                  src={contact.profile_image || FALLBACK_AVATAR}
                  alt={contact.name}
                  className="w-10 h-10 rounded-full mr-3 border"
                />
                <span className="text-gray-700 font-medium">{contact.name}</span>
              </div>
            ))
          )}
        </div>
        <button
          onClick={createGroup}
          className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? 'Creating...' : <><UserPlus size={20} /> Create Group</>}
        </button>
      </div>
    </div>
  );
};

export default NewGroupModal;
