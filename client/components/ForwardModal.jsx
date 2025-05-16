import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

// Use environment variable for the users endpoint.
const USERS_API_URL = process.env.REACT_APP_USERS_API_URL || 'https://dummy-api.com/api/users';

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

    try {
      for (let contact of selectedContacts) {
        for (let msgId of selectedMessageIds) {
          const msg = messages.find((m) => m.id === msgId);
          if (msg) {
            await axios.post(
              process.env.REACT_APP_API_CHATS_URL || 'https://dummy-api.com/api/chats',
              {
                userId,
                chat_partner: contact,
                message: msg.text,
                media: msg.media || null,
                link: msg.link || null,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
      }
      onForwardComplete();
      onClose();
    } catch (error) {
      console.error('Error forwarding messages:', error);
    }
  };

  const renderContacts = () => {
    if (loading) {
      return <p className="text-center text-gray-500">Loading contacts...</p>;
    }

    if (contacts.length === 0) {
      return <p className="text-center text-gray-500">No contacts found.</p>;
    }

    return (
      <div className="max-h-64 overflow-y-auto space-y-2">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            role="button"
            aria-pressed={selectedContacts.includes(contact.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border ${
              selectedContacts.includes(contact.id) ? "bg-blue-50 border-blue-500" : "border-gray-200"
            } hover:bg-gray-100 cursor-pointer transition text-left`}
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
          </button>
        ))}
      </div>
    );
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
        {renderContacts()}

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

ForwardModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  selectedMessageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
      media: PropTypes.string,
      link: PropTypes.string,
    })
  ).isRequired,
  userId: PropTypes.string.isRequired,
  onForwardComplete: PropTypes.func.isRequired,
};

export default ForwardModal;
