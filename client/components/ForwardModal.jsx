import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Use environment variable for the users endpoint.
const USERS_API_URL = process.env.REACT_APP_USERS_API_URL || 'https://api.yourdomain.com/api/users';

const ForwardModal = ({ onClose, selectedMessageIds, messages, userId, onForwardComplete }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          console.error('No user token found.');
          return;
        }
        const response = await axios.get(USERS_API_URL, {
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
  }, []);

  const toggleContact = (contactId) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleForward = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      console.error('No user token found.');
      return;
    }
    // Loop over each selected contact and each selected message
    for (let contact of selectedContacts) {
      for (let msgId of selectedMessageIds) {
        const msg = messages.find((m) => m.id === msgId);
        if (msg) {
          try {
            await axios.post(
              process.env.REACT_APP_API_CHATS_URL || 'https://api.yourdomain.com/api/chats',
              {
                userId,
                chat_partner: contact,
                message: msg.text,
                media: msg.media || null,  // ✅ Added
                link: msg.link || null,    // ✅ Added
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (error) {
            console.error(`Error forwarding message ${msgId} to contact ${contact}:`, error);
          }
        }
      }
    }
    onForwardComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-lg"
        >
          ✕
        </button>

        {/* Header */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Forward to:</h2>

        {/* Contact List */}
        {loading ? (
          <p className="text-center text-gray-500">Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <p className="text-center text-gray-500">No contacts found.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedContacts.includes(contact.id) ? "bg-blue-50 border-blue-500" : "border-gray-200"
                } hover:bg-gray-100 cursor-pointer transition`}
                onClick={() => toggleContact(contact.id)}
              >
                <div>
                  <p className="font-medium text-gray-800">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.phone}</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedContacts.includes(contact.id)}
                  readOnly
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded"
                />
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Forward
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;