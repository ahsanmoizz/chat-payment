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
import PropTypes from 'prop-types';

// Use environment variables for API URL and fallback images.
const API_URL = process.env.REACT_APP_API_URL ;
const DEFAULT_PROFILE_IMAGE = process.env.REACT_APP_DEFAULT_PROFILE_IMAGE ;
const DEFAULT_GROUP_ICON = process.env.REACT_APP_DEFAULT_GROUP_ICON ;

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

      const token = localStorage.getItem('user_token');
      axios
        .get(API_URL, {
          headers: {  Authorization: `Bearer ${process.env.REACT_APP_USER_TOKEN }` || token },
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
         const response = await fetch(process.env.REACT_APP_CHAT_API_URL  + chat.id);
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
   let attachmentData = null;
let messageType = 'text';

if (audioData) {
    attachmentData = audioData;
    messageType = 'audio';
} else if (attachment) {
    attachmentData = await convertFileToBase64(attachment);
    messageType = attachment.type.startsWith('image') ? 'image' : 'file';
}

const newMessage = {
    id: uuidv4(),
    text: sanitizedText,
    timestamp: new Date(),
        userId: process.env.REACT_APP_USER_ID ,
    attachment: attachmentData,
    type: messageType,
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
        const token = process.env.REACT_APP_USER_TOKEN ;
        await axios.post(
               process.env.REACT_APP_CHAT_API_URL ,
            { 
                userId: newMessage.userId,
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
  <div className="flex flex-col h-full bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white relative font-sans">
    {/* Multi-select Header */}
    {isSelectionMode && (
      <div className="absolute top-0 left-0 right-0 bg-white/10 backdrop-blur-md p-2 z-10 flex items-center justify-between shadow rounded-b-lg">
        <span className="font-semibold text-white">{selectedMessages.length} selected</span>
        <div className="flex space-x-2">
          <button onClick={handleCopySelected} className="bg-blue-500 px-3 py-1 rounded hover:bg-blue-600 shadow">Copy</button>
          <button onClick={handleForwardSelected} className="bg-green-500 px-3 py-1 rounded hover:bg-green-600 shadow">Forward</button>
          <button onClick={handleDeleteSelected} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 shadow">Delete</button>
          <button onClick={cancelSelection} className="bg-gray-500 px-3 py-1 rounded hover:bg-gray-600 shadow">Cancel</button>
        </div>
      </div>
    )}

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-sm shadow border-b border-white/10">
      <div className="flex items-center space-x-3">
        <img
          src={isGroupChat ? chat.group_icon || DEFAULT_GROUP_ICON : chat.profile_image || DEFAULT_PROFILE_IMAGE}
          alt="chat partner"
          className="w-10 h-10 rounded-full border-2 border-white"
        />
        <div className="flex items-center space-x-2">
          <span className="font-bold text-white">{isGroupChat ? chat.group_name : chat.chat_partner}</span>
          <span className={`w-2 h-2 rounded-full ${chat.isOnline ? "bg-green-400" : "bg-gray-500"}`}></span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isGroupChat && isAdmin && (
          <button onClick={() => setIsGroupSettingsOpen(true)} className="text-sm px-3 py-1 rounded border border-white/20 hover:bg-white/10 transition">
            Group Settings
          </button>
        )}
        {isGroupChat ? (
          <button onClick={openGroupCall} className="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600">Group Call</button>
        ) : (
          <>
            <button onClick={() => openCall("audio")} className="hover:text-green-400">Call</button>
            <button onClick={() => openCall("video")} className="hover:text-pink-400">Video</button>
          </>
        )}
        <button onClick={() => setIsBackupModalOpen(true)} className="text-sm px-3 py-1 border border-white/20 hover:bg-white/10 rounded">
          Backup
        </button>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="hover:text-gray-300">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white text-gray-800 rounded-lg shadow-lg p-2 z-20">
              <button onClick={handleClearChat} className="w-full text-left px-4 py-2 hover:bg-red-100 rounded">Clear Chat</button>
              <button onClick={() => setMenuOpen(false)} className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Messages */}
    <div className="flex-grow px-4 py-3 overflow-y-auto" ref={messagesContainerRef} onScroll={handleScroll}>
      <div className="max-w-2xl mx-auto space-y-2">
        {loading ? <p>Loading messages...</p> : messages.length === 0 ? (
          <p className="text-center text-white/60">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} role="button" tabIndex="0" onClick={() => handleMessageLongPress(msg.id)} onKeyPress={(e) => e.key === 'Enter' && handleMessageLongPress(msg.id)} className={`flex ${msg.userId === userId ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-xl px-4 py-2 shadow max-w-[75%] ${msg.userId === userId ? "bg-gradient-to-br from-green-400 to-green-600 text-white" : "bg-white/20 text-white backdrop-blur-sm"}`}>
                {msg.text || `[${msg.type} message]`}
                {msg.type === "image" && <img src={msg.attachment} alt="sent" className="rounded mt-2 max-w-xs" />}
                {msg.type === "audio" && <audio controls src={msg.attachment} className="w-full mt-2" />}
                {!["text", "image", "audio"].includes(msg.type) && <a href={msg.attachment} download className="underline text-blue-200">Download</a>}
              </div>
            </div>
          ))
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>

    {showScrollDown && (
      <button onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-4 right-4 bg-green-500 hover:bg-green-600 p-3 rounded-full text-white shadow-lg">
        ↓
      </button>
    )}

    {/* Message Input */}
    {canSendMessage ? (
      <div className="p-4 border-t bg-white/10 backdrop-blur-md flex flex-col space-y-2">
        <div className="flex items-center space-x-3">
          <input type="file" ref={fileInputRef} onChange={handleAttachmentChange} className="hidden" />
          <button onClick={() => setShowAttachOptions(!showAttachOptions)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full">
            📎
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow px-4 py-2 rounded-full bg-white/20 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          {!text.trim() && !attachment ? (
            !isRecording ? (
              <button onClick={startRecording} className="p-2 bg-red-500 hover:bg-red-600 rounded-full">🎙</button>
            ) : (
              <button onClick={stopRecording} className="p-2 bg-green-500 hover:bg-green-600 rounded-full">⏹</button>
            )
          ) : (
            <button onClick={handleSend} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-full shadow text-white">Send</button>
          )}
        </div>
        {showAttachOptions && (
          <div className="bg-white text-black rounded-lg shadow-lg p-3 space-y-2">
            {["Gallery", "Document", "Audio", "Camera"].map(option => (
              <button key={option} onClick={() => handleAttachOption(option)} className="block w-full text-left hover:bg-gray-100 px-3 py-1 rounded">{option}</button>
            ))}
            <button onClick={() => setShowAttachOptions(false)} className="block w-full text-left hover:bg-gray-100 px-3 py-1 rounded">Cancel</button>
          </div>
        )}
      </div>
    ) : (
      <div className="p-3 text-center text-white/70">Only admins can send messages.</div>
    )}

    {/* Modals */}
    {isCallModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded-xl relative w-full max-w-md shadow-lg">
          <button onClick={closeCall} className="absolute top-2 right-2 text-white">✕</button>
          <Call callType={callType} />
        </div>
      </div>
    )}

    {isGroupCallModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-white text-black p-6 rounded-xl w-full max-w-md shadow-xl relative">
          <button onClick={closeGroupCall} className="absolute top-2 right-2">✕</button>
          <h2 className="text-lg font-semibold mb-3">Group Call - {chat.group_name}</h2>
          <ConferenceCall roomId={chat.id} onEndCall={closeGroupCall} isAdmin={isAdmin} />
        </div>
      </div>
    )}

    {isCameraOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-white text-black p-4 rounded-lg max-w-md w-full shadow">
          <button onClick={closeCamera} className="absolute top-2 right-2">✕</button>
          <video ref={videoRef} autoPlay muted playsInline className="w-full bg-black" />
          <canvas ref={canvasRef} className="hidden" />
          {!capturedImage ? (
            <button onClick={handleCapture} className="w-full mt-3 bg-blue-600 text-white py-2 rounded">Capture</button>
          ) : (
            <>
              <img src={capturedImage} alt="Preview" className="mt-2 rounded" />
              <button onClick={handleUsePhoto} className="w-full mt-3 bg-green-600 text-white py-2 rounded">Use Photo</button>
            </>
          )}
        </div>
      </div>
    )}

    {isForwardModalOpen && (
      <ForwardModal onClose={() => setIsForwardModalOpen(false)} selectedMessageIds={forwardMessageIds} messages={messages} userId={userId} onForwardComplete={() => setForwardMessageIds([])} />
    )}

    {isBackupModalOpen && (
      <BackupOptions onClose={() => setIsBackupModalOpen(false)} />
    )}

    {isGroupSettingsOpen && (
      <GroupSettings groupId={chat.id} onClose={() => setIsGroupSettingsOpen(false)} userToken={localStorage.getItem("userToken")} />
    )}
  </div>
);

}
ChatWindow.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['group', 'single']).isRequired,
    admin_id: PropTypes.string,
    onlyAdminCanMessage: PropTypes.bool,
    group_icon: PropTypes.string,
    group_name: PropTypes.string,
    profile_image: PropTypes.string,
    chat_partner: PropTypes.string,
    isOnline: PropTypes.bool,
  }).isRequired,
  userId: PropTypes.string.isRequired,
};

