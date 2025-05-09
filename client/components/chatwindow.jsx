import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import Call from './main pages/Call';
import ConferenceCall from './main pages/ConferenceCall';
import ForwardModal from './ForwardModal';
import BackupOptions from './BackupOptions'; 
import { showNotification, requestNotificationPermission } from './notificationManager';
import GroupSettings from './GroupSettings';

// Use environment variables for API URL and fallback images.
const API_URL = process.env.REACT_APP_API_URL || 'https://api.yourdomain.com/api/chats';
const DEFAULT_PROFILE_IMAGE = process.env.REACT_APP_DEFAULT_PROFILE_IMAGE || '/images/default_profile.png';
const DEFAULT_GROUP_ICON = process.env.REACT_APP_DEFAULT_GROUP_ICON || '/images/default_group.png';

export default function ChatWindow({ chat, userId }) {
  // Determine if this is a group chat and permissions for sending messages.
  const isGroupChat = chat && chat.type === 'group';
  const isAdmin = isGroupChat && chat.admin_id === userId; // assume chat.admin_id exists
  const canSendMessage = !isGroupChat || (isGroupChat && (!chat.onlyAdminCanMessage || isAdmin));

  // Message and input states
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState(null);

  // Call modal state and call type ("video" or "audio") for individual calls
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState('video');

  // Group Call modal state (for conference calls)
  const [isGroupCallModalOpen, setIsGroupCallModalOpen] = useState(false);

  // Attachment menu state
  const [showAttachOptions, setShowAttachOptions] = useState(false);

  // Multi-select state for messages
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Menu state for header options (e.g. Clear Chat)
  const [menuOpen, setMenuOpen] = useState(false);
  // For Forward modal
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardMessageIds, setForwardMessageIds] = useState([]);
//Backup functionality 
const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
//Notification functionality
const [isWindowFocused, setIsWindowFocused] = useState(true);
const prevMessagesRef = useRef([]);
// Group settings modal state 
const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);

  // CAMERA-specific states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Voice chat refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // LocalForage helpers
  const loadMessages = async (chatId) => {
    const stored = await localforage.getItem(chatId);
    return stored || [];
  };

  const saveMessageLocally = async (chatId, message) => {
    const current = await loadMessages(chatId);
    const updated = [...current, message];
    await localforage.setItem(chatId, updated);
    return updated;
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load messages when chat changes.
  useEffect(() => {
    let isMounted = true;
    if (chat) {
      setLoading(true);
      loadMessages(chat.id)
        .then((msgs) => {
          if (isMounted) setMessages(msgs);
        })
        .catch((error) => console.error('Error loading messages:', error))
        .finally(() => setLoading(false));

      const token = localStorage.getItem('userToken');
      axios
        .get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
          params: { userId, chat_partner: chat.chat_partner },
        })
        .catch((error) => console.error('Error fetching messages:', error));
    }
    return () => {
      isMounted = false;
    };
  }, [chat, userId]);
//logic to tell whether person is offline/online
useEffect(() => {
  const fetchChatDetails = async () => {
    try {
      const response = await fetch(`/api/chats/${chat.id}`);
      const data = await response.json();
      if (typeof setChat === 'function') {
        setChat((prevChat) => ({ ...prevChat, isOnline: data.isOnline }));
      }
      
    } catch (error) {
      console.error("Failed to fetch chat details:", error);
    }
  };

  if (chat) {
    fetchChatDetails();

    // Poll every 10 seconds to update online status
    const interval = setInterval(fetchChatDetails, 10000);

    return () => clearInterval(interval);
  }
}, [chat?.id]);




  // Convert file to Base64 string with basic file validation
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      // Example: Limit file size to 5MB (adjust as needed)
      if (file.size > 5 * 1024 * 1024) {
        return reject(new Error('File is too large.'));
      }
      // Accept only specific file types if needed.
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'audio/webm', 'audio/mp3'];
      if (!allowedTypes.includes(file.type)) {
        alert('Unsupported file type. Please upload an image or audio file.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Detect window focus/blur changes
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // When new messages are added, show a notification if the window is not focused.
  useEffect(() => {
    if (!isWindowFocused && messages.length > prevMessagesRef.current.length) {
      const newMsg = messages[messages.length - 1];
      const title = newMsg.userId === userId ? 'You sent a message' : 'New message received';
      const options = { body: newMsg.text || 'You have a new message.' };
      showNotification(title, options);
    }
    prevMessagesRef.current = messages;
  }, [messages, isWindowFocused, userId]);


  // Handle file selection.
  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onloadend = () => {
      const type = file.type.startsWith('audio') ? 'audio' : 'image';
      setAttachment({ data: reader.result, type });
    };
    reader.readAsDataURL(file);
  };
  

  // Recording functions (audio)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioData(reader.result); // Stores audio as base64
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };

  // Send message handler.
  const handleSend = async () => {
    if (!chat) return;

    // Sanitize text if needed
    const sanitizedText = text; 

    // Prepare the message
    const newMessage = {
        id: uuidv4(),
        text: sanitizedText,
        timestamp: new Date(),
        userId,
        attachment: audioData
            ? audioData  // Directly use recorded audio data if available
            : attachment
            ? await convertFileToBase64(attachment)  // Convert file to base64 if attachment is present
            : null,
        type: audioData
            ? 'audio'
            : attachment
            ? (attachment.type.startsWith('image') ? 'image' : 'file')  // Better handling for non-image files
            : 'text',
        conversationId: chat.id,
    };

    try {
        // Save message locally
        const updatedMessages = await saveMessageLocally(chat.id, newMessage);
        setMessages(updatedMessages);

        // Reset input fields
        setText('');
        setAttachment(null);
        setAudioData(null);

        // Send to server (if needed)
        const token = localStorage.getItem('userToken');
        await axios.post(
            API_URL,
            { 
                userId, 
                chat_partner: chat.chat_partner, 
                message: sanitizedText, 
                attachment: newMessage.attachment,
                type: newMessage.type
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message.');
    }
};


  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // ========== CALL MODAL HANDLERS (Individual Calls) ==========
  const openCall = (type = 'video') => {
    setCallType(type);
    setIsCallModalOpen(true);
  };
  const closeCall = () => {
    setIsCallModalOpen(false);
  };

  // ========== GROUP CALL HANDLERS ==========
  const openGroupCall = () => {
    setIsGroupCallModalOpen(true);
  };
  const closeGroupCall = () => {
    setIsGroupCallModalOpen(false);
  };

  // ========== MULTI-SELECT HANDLERS ==========
  const handleMessageClick = (msgId) => {
    if (isSelectionMode) {
      setSelectedMessages((prev) =>
        prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
      );
    }
  };

  const handleMessageLongPress = (msgId) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedMessages([msgId]);
    } else {
      handleMessageClick(msgId);
    }
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm('Are you sure you want to delete the selected messages?')) return;
    try {
      const current = await loadMessages(chat.id);
      const updated = current.filter((msg) => !selectedMessages.includes(msg.id));
      await localforage.setItem(chat.id, updated);
      setMessages(updated);
      cancelSelection();
    } catch (error) {
      console.error('Error deleting messages:', error);
    }
  };

  const handleCopySelected = async () => {
    const texts = messages
      .filter((msg) => selectedMessages.includes(msg.id))
      .map((msg) => msg.text)
      .join('\n');
    try {
      await navigator.clipboard.writeText(texts);
      alert('Messages copied to clipboard!');
      cancelSelection();
    } catch (error) {
      console.error('Error copying messages:', error);
    }
  };

  const handleForwardSelected = (selectedIds) => {
    setForwardMessageIds(selectedIds);
    setIsForwardModalOpen(true);
  };

  // ========== CLEAR CHAT ==========
  const handleClearChat = () => {
    if (!window.confirm('Are you sure you want to clear the chat?')) return;
    localforage
      .removeItem(chat.id)
      .then(() => {
        setMessages([]);
      })
      .catch((err) => console.error('Error clearing chat:', err));
    setMenuOpen(false);
  };

  // ========== ATTACHMENT MENU ==========
  const handleAttachOption = (option) => {
    setShowAttachOptions(false);
    if (option === 'Camera') {
      openCamera();
    } else {
      let acceptValue = '';
      if (option === 'Gallery') {
        acceptValue = 'image/*';
      } else if (option === 'Document') {
        acceptValue = '.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (option === 'Audio') {
        acceptValue = 'audio/*';
      }
      if (fileInputRef.current) {
        fileInputRef.current.accept = acceptValue;
        fileInputRef.current.click();
      }
    }
  };

  // ========== CAMERA LOGIC ==========
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error('Error opening camera:', err);
      alert('Unable to access camera.');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/png');
    setCapturedImage(dataURL);
  };

  const handleUsePhoto = () => {
    if (!capturedImage) return;
    setAttachment(capturedImage);
    closeCamera();
  };

  // For scrolling (if needed)
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollDown(scrollHeight - scrollTop > clientHeight + 100);
    }
  };

  if (!chat) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Multi-select Header Overlay */}
      {isSelectionMode && (
        <div className="absolute top-0 left-0 right-0 bg-gray-200 p-2 z-10 flex items-center justify-between shadow-md rounded-b-lg">
          <span className="font-semibold text-gray-800">{selectedMessages.length} selected</span>
          <div className="flex space-x-2">
            <button onClick={handleCopySelected} className="bg-blue-500 text-white px-4 py-1 rounded shadow hover:bg-blue-600 transition duration-200">
              Copy
            </button>
            <button onClick={handleForwardSelected} className="bg-green-500 text-white px-4 py-1 rounded shadow hover:bg-green-600 transition duration-200">
              Forward
            </button>
            <button onClick={handleDeleteSelected} className="bg-red-500 text-white px-4 py-1 rounded shadow hover:bg-red-600 transition duration-200">
              Delete
            </button>
            <button onClick={cancelSelection} className="bg-gray-500 text-white px-4 py-1 rounded shadow hover:bg-gray-600 transition duration-200">
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-100">
        <div className="flex items-center space-x-2">
          {isGroupChat ? (
            <>
              <img
                src={chat.group_icon || DEFAULT_GROUP_ICON}
                alt={chat.group_name}
                className="w-8 h-8 rounded-full"
              />
              <span className="font-semibold">{chat.group_name}</span>
            </>
          ) : (
            <>
              <img
                src={chat.profile_image || DEFAULT_PROFILE_IMAGE}
                alt={chat.chat_partner}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex items-center space-x-2">
  <span className="font-semibold">{chat.chat_partner}</span>
  {chat.isOnline ? (
    <span className="w-2 h-2 bg-green-500 rounded-full"></span> // Online indicator
  ) : (
    <span className="w-2 h-2 bg-gray-400 rounded-full"></span> // Offline indicator
  )}
</div>

            </>
          )}
        </div>
        <div className="flex items-center space-x-4 text-gray-600">
        {isGroupChat && isAdmin && (
  <button
    onClick={() => setIsGroupSettingsOpen(true)}
    className="hover:text-gray-800 px-2 py-1 border rounded"
  >
    Group Settings
  </button>
)}
          <div className="flex space-x-2">
            {isGroupChat ? (
              <button
                onClick={openGroupCall}
                className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Group Call
              </button>
            ) : (
              <>
                <button onClick={() => openCall('audio')} className="hover:text-gray-800">
                  Call
                </button>
                <button onClick={() => openCall('video')} className="hover:text-gray-800">
                  Video
                </button>
              </>
            )}
          </div>
          <button 
            onClick={() => setIsBackupModalOpen(true)} 
            className="hover:text-gray-800 text-sm px-2 py-1 border rounded"
          >
            Backup Chats
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20">
                <button onClick={handleClearChat} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100 rounded">
                  Clear Chat
                </button>
                <button onClick={() => setMenuOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow p-4 overflow-y-auto relative" ref={messagesContainerRef} onScroll={handleScroll}>
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <p>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex mb-2 ${msg.userId === userId ? 'justify-end' : 'justify-start'}`} 
                onClick={() => handleMessageLongPress(msg.id)}
              >
                <div 
                  className={`rounded px-3 py-2 shadow whitespace-pre-wrap break-words max-w-[75%] ${
                    msg.userId === userId ? 'bg-green-500 text-white ml-12' : 'bg-white text-black mr-12'
                  }`}
                >
                  {/* Text Messages */}
                  {msg.text || `[${msg.type} message]`}
                  {/* Image Messages */}
                  {msg.type === 'image' && (
                    <img src={msg.attachment} alt="sent" className="max-w-xs rounded" />
                  )}
            
                  {/* Audio Messages */}
                  {msg.type === 'audio' && (
                    <audio controls src={msg.attachment} className="max-w-xs" />
                  )}
            
                  {/* Fallback for Unknown Attachments */}
                  {!['text', 'image', 'audio'].includes(msg.type) && (
                    <a href={msg.attachment} download className="text-blue-500 underline">
                      Download Attachment
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>
      {showScrollDown && (
        <button className="absolute bottom-4 right-4 bg-green-500 text-white p-2 rounded-full shadow" onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}>;
        
          ↓
        </button>
      )}
      {/* Message Input / Permissions */}
      {canSendMessage ? (
        <div className="p-4 border-t bg-gray-50 flex flex-col relative">
          <div className="flex items-center space-x-3 relative">
            {/* File input remains hidden */}
            <input type="file" ref={fileInputRef} onChange={handleAttachmentChange} className="hidden" />

            {/* Attachment Button */}
            <button
             aria-label="Add Attachment"
              onClick={() => setShowAttachOptions(!showAttachOptions)}
              className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <input
              type="text"
              placeholder="Type a message"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {/* Audio Recording Controls */}
            {(!text.trim() && !attachment) && (
              <>
                {!isRecording ? (
                  <button onClick={startRecording} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-6m0 0V6m0 6H6m6 0h6" />
                    </svg>
                  </button>
                ) : (
                  <button onClick={stopRecording} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </>
            )}
            <button onClick={handleSend} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow">
              Send
            </button>
          </div>
          {/* Attachment Options Menu */}
          {showAttachOptions && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20">
              <button
                onClick={() => handleAttachOption('Gallery')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Gallery
              </button>
              <button
                onClick={() => handleAttachOption('Document')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Document
              </button>
              <button
                onClick={() => handleAttachOption('Audio')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Audio
              </button>
              <button
                onClick={() => handleAttachOption('Camera')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Camera
              </button>
              <button
                onClick={() => setShowAttachOptions(false)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 border-t bg-gray-100 text-center text-gray-600">
          Only admins can send messages.
        </div>
      )}

      {/* Call Modal (Individual Calls) */}
      {isCallModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative bg-gray-900 p-4 rounded shadow-lg w-full max-w-md">
            <button onClick={closeCall} className="absolute top-2 right-2 text-white hover:text-gray-300">
              X
            </button>
            <Call callType={callType} />
          </div>
        </div>
      )}

      {/* Group (Conference) Call Modal */}
      {isGroupCallModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
            <button onClick={closeGroupCall} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
              X
            </button>
            <h2 className="mb-4 text-xl font-bold">
              Group Call - {chat.group_name}
            </h2>
            <ConferenceCall roomId={chat.id} onEndCall={closeGroupCall} isAdmin={isAdmin} />
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative bg-white p-4 rounded shadow-lg w-full max-w-md text-black">
            <button onClick={closeCamera} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
              X
            </button>
            <div className="flex flex-col items-center space-y-2">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full bg-gray-200"
                onCanPlay={() => {
                  if (videoRef.current && cameraStream) {
                    videoRef.current.srcObject = cameraStream;
                  }
                }}
              />
              <canvas ref={canvasRef} className="hidden" />
              {!capturedImage ? (
                <button onClick={handleCapture} className="px-4 py-2 bg-blue-500 text-white rounded">
                  Capture
                </button>
              ) : (
                <img src={capturedImage} alt="captured" className="max-w-full max-h-64 object-contain" />
              )}
              {capturedImage && (
                <button onClick={handleUsePhoto} className="px-4 py-2 bg-green-500 text-white rounded">
                  Use Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {isForwardModalOpen && (
        <ForwardModal
          onClose={() => setIsForwardModalOpen(false)}
          selectedMessageIds={forwardMessageIds}
          messages={messages}
          userId={userId}
          onForwardComplete={() => {
            // Optionally add any callback actions here after forwarding
            setForwardMessageIds([]);
          }}
        />
      )}
      {isBackupModalOpen && (
        <BackupOptions onClose={() => setIsBackupModalOpen(false)} />
      )}
      {isGroupSettingsOpen && (
  <GroupSettings
    groupId={chat.id}  // Assuming chat.id represents the current group’s ID
    onClose={() => setIsGroupSettingsOpen(false)}
    userToken={localStorage.getItem('userToken')} // or pass the token if available via props
  />
)}
    </div>
  );
}
