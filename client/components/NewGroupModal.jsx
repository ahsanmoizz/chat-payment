import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode'; // For decoding JWT tokens
import { X, UserPlus, Users } from 'lucide-react'; // SVG icons
import PropTypes from 'prop-types';
// Set your API URL and fallback avatar from environment variables.
const API_URL = process.env.REACT_APP_API_URL;
const FALLBACK_AVATAR = process.env.REACT_APP_FALLBACK_AVATAR ;

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
          headers: { Authorization: `Bearer ${token}`  //user token
 },
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
  if (e.target.files?.[0]) 
 {
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
      const token =  localStorage.getItem('userToken');//user token
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
      const response = await axios.post( `${API_URL}/api/groups`, groupData, {
        headers: { Authorization: `Bearer ${token}`  //user token
 },
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
  <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-400 transition">
        ✕
      </button>

      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Users size={24} className="text-pink-500" /> Create Group
      </h2>

      <input
        type="text"
        placeholder="Group Name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-pink-500 transition mb-4"
      />

      <input
        type="file"
        accept="image/*"
        onChange={handleGroupIconChange}
        className="w-full bg-white/10 border border-white/20 text-white file:text-white file:bg-pink-500 file:border-none rounded-lg cursor-pointer p-2 mb-4"
      />

      <div className="max-h-64 overflow-y-auto border border-white/10 p-2 mb-4 rounded-lg bg-white/5 backdrop-blur-sm">
        {loading && <p className="text-white/60">Loading contacts...</p>}
        {!loading && contacts.length === 0 && <p className="text-white/60">No contacts found.</p>}
        {!loading && contacts.map((contact) => (
          <button
            key={contact.id}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left hover:bg-white/10 ${
              selectedContacts.includes(contact.id) ? 'bg-white/20' : ''
            }`}
            onClick={() => handleContactSelect(contact.id)}
          >
            <img
              src={contact.profile_image || FALLBACK_AVATAR}
              alt={contact.name}
              className="w-10 h-10 rounded-full mr-3 border border-white/20"
            />
            <span className="text-white">{contact.name}</span>
          </button>
        ))}
      </div>

      <button
        onClick={createGroup}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? 'Creating...' : (<><UserPlus size={20} /> Create Group</>)}
      </button>
    </div>
  </div>
);

};

NewGroupModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onGroupCreated: PropTypes.func.isRequired,
  userToken: PropTypes.string,
};
export default NewGroupModal;
