import  { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { IoCallEnd, IoMic, IoMicOff, IoVideocam, IoVideocamOff } from 'react-icons/io5';
import { addCallLog } from './callmanager'; // Adjust the path as needed
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
// Helper function to modify SDP if needed (you can adjust as necessary)
function modifySDP(sdp) {
  const lines = sdp.split('\r\n');
  let mVideoLineIndex = -1;
  let mAudioLineIndex = -1;
  lines.forEach((line, index) => {
    if (line.startsWith('m=video')) mVideoLineIndex = index;
    if (line.startsWith('m=audio')) mAudioLineIndex = index;
  });
  // For video: Prefer AV1 if available.
  // Prioritize AV1 for video
if (mVideoLineIndex !== -1) {
    const parts = lines[mVideoLineIndex].split(' ');
    const header = parts.slice(0, 3).join(' ');
    let payloads = parts.slice(3);
    const av1Payloads = [];
    const otherPayloads = [];

    payloads.forEach((pt) => {
        const rtpmapLine = lines.find((l) => l.startsWith(`a=rtpmap:${pt} `));
        if (rtpmapLine?.toLowerCase().includes('av01')) {
            av1Payloads.push(pt);
        } else {
            otherPayloads.push(pt);
        }
    });

    payloads = [...av1Payloads, ...otherPayloads];
    lines[mVideoLineIndex] = `${header} ${payloads.join(' ')}`;
}

  // For audio: Prioritize Opus.
 // Prioritize AV1 for video
// Prioritize Opus for audio
if (mAudioLineIndex !== -1) {
    const parts = lines[mAudioLineIndex].split(' ');
    const header = parts.slice(0, 3).join(' ');
    let payloads = parts.slice(3);
    const opusPayloads = [];
    const otherAudioPayloads = [];

    payloads.forEach((pt) => {
        const rtpmapLine = lines.find((l) => l.startsWith(`a=rtpmap:${pt} `));
        if (rtpmapLine?.toLowerCase().includes('opus')) {
            opusPayloads.push(pt);
        } else {
            otherAudioPayloads.push(pt);
        }
    });

    payloads = [...opusPayloads, ...otherAudioPayloads];
    lines[mAudioLineIndex] = `${header} ${payloads.join(' ')}`;
}

  return lines.join('\r\n');
}

const ConferenceCall = ({ roomId, onEndCall, isAdmin, userId, callType = "video", chat }) => {
  const [ setSocket] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const localVideoRef = useRef(null);
  // Use a ref to store peer connections keyed by socket id.
  const peersRef = useRef({});
  // Ref to store call start time
  const callStartTimeRef = useRef(null);

  // New function to handle call end with call log integration.
  const handleEndCallWrapper = async () => {
    // Stop all local tracks
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    // Close all peer connections
    Object.values(peersRef.current).forEach((pc) => pc.close());
    console.log('Call ended');
  
    // Calculate call duration in seconds
    const callEndTime = Date.now();
    const durationSeconds = Math.floor((callEndTime - callStartTimeRef.current) / 1000);
  
    // Gather participant IDs from the current peer connections.
    const participantIds = Object.keys(peersRef.current);
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }
  
    // Determine the final call type
let finalCallType;
if (participantIds.length > 2) {
    finalCallType = 'Group';
} else {
    finalCallType = callType === 'video' ? 'Video' : 'Voice';
}

  
    const callLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      roomId,                      // Actual room ID from props
      groupName: chat?.group_name || roomId,  // Use real group name if available
      participants: participantIds, // Array of participant IDs
      callType: finalCallType,      // Determined dynamically
      duration: durationSeconds,    // Calculated duration in seconds
      status: 'completed',
      isGroupCall: true
    };

    try {
      await addCallLog(callLog);
    } catch (error) {
      console.error('Error adding call log:', error);
    }
  
    if (onEndCall) {
      onEndCall();
    }
  };

// Handles socket events for new users, signaling, and user disconnection
const initializeSocketConnection = (s, stream, setRemoteStreams, peersRef) => {
  // New user joined the room
  s.on('user-joined', (socketId) => {
      console.log('User joined:', socketId);
      createPeerConnection(socketId, stream, s, peersRef, setRemoteStreams);
  });

  // Handle incoming signaling messages
  s.on('signal', async (data) => {
      const { from, sdp, candidate } = data;
      const pc = peersRef.current[from];
      try {
          if (sdp) await handleSDPMessage(pc, sdp, s, from);
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
          console.error('Error processing signaling message:', err);
      }
  });

  // Handle user leaving
  s.on('user-left', (socketId) => {
      console.log('User left:', socketId);
      if (peersRef.current[socketId]) {
          peersRef.current[socketId].close();
          delete peersRef.current[socketId];
          setRemoteStreams((prev) => prev.filter((r) => r.id !== socketId));
      }
  });
};
 

// Handles SDP (Session Description Protocol) messages
const handleSDPMessage = async (pc, sdp, s, from) => {
  if (!pc) return;
  try {
      if (sdp.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          s.emit('signal', { to: from, sdp: answer });
      } else if (sdp.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
  } catch (err) {
      console.error('Error handling SDP message:', err);
  }
};


useEffect(() => {
  // Record call start time
  callStartTimeRef.current = Date.now();
  const signalingServer = process.env.REACT_APP_SIGNALING_SERVER_URL || 'https://dummy-signaling-server.com';
  const s = io(signalingServer, { query: { token: 'dummy-auth-token', room: roomId }, secure: true });
  setSocket(s);

  // Get local media and set up socket events
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
          }
          s.emit('join', roomId);
          initializeSocketConnection(s, stream, setRemoteStreams, peersRef);
      })
      .catch((err) => console.error('Error accessing local media:', err));

  // Cleanup on component unmount
  return () => {
      if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
      }
      Object.values(peersRef.current).forEach((pc) => pc.close());
      s.disconnect();
  };
}, [roomId]);


  const createPeerConnection = (socketId, stream, s, peersRef, setRemoteStreams) => {
    const pc = new RTCPeerConnection();
    peersRef.current[socketId] = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            s.emit('signal', { to: socketId, candidate: event.candidate });
        }
    };

    pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
            if (!prev.some((r) => r.id === socketId)) {
                return [...prev, { id: socketId, stream: event.streams[0] }];
            }
            return prev;
        });
    };

    pc.onnegotiationneeded = async () => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            s.emit('signal', { to: socketId, sdp: offer });
        } catch (err) {
            console.error('Error during negotiation:', err);
        }
    };
};
const toggleMic = () => {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setMicEnabled((prev) => !prev);
  });
};

const toggleCamera = () => {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setCameraEnabled((prev) => !prev);
  });
};

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* Video Grid: Remote streams and Local Preview */}
      <div className="flex flex-wrap flex-grow p-4 overflow-auto">
        {remoteStreams.map((rs) => (
          <video
            key={rs.id}
            autoPlay
            playsInline
            className="w-1/3 h-1/3 m-1 object-cover"
            ref={(el) => {
              if (el && rs.stream) {
                el.srcObject = rs.stream;
              }
            }}
          />
        ))}
        <div className="w-1/3 m-1">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      {/* Controls */}
      <div className="p-4 border-t flex justify-around">
        <button onClick={toggleMic} className="bg-gray-800 p-3 rounded-full">
          {micEnabled ? <IoMic className="w-6 h-6" /> : <IoMicOff className="w-6 h-6" />}
        </button>
        <button onClick={toggleCamera} className="bg-gray-800 p-3 rounded-full">
          {cameraEnabled ? <IoVideocam className="w-6 h-6" /> : <IoVideocamOff className="w-6 h-6" />}
        </button>
        <button onClick={handleEndCallWrapper} className="bg-red-600 p-3 rounded-full">
          <IoCallEnd className="w-6 h-6 text-white" />
        </button>
      </div>
      <button
        onClick={() => console.log('Start call triggered')}
        className="mt-4 bg-green-600 px-4 py-2 rounded hover:bg-green-500"
      >
        Start {callType === "video" ? "Video" : "Voice"} Call
      </button>
    </div>
  );
};
ConferenceCall.propTypes = {
    roomId: PropTypes.string.isRequired,
    onEndCall: PropTypes.func,
    isAdmin: PropTypes.bool,
    userId: PropTypes.string.isRequired,
    callType: PropTypes.oneOf(['video', 'voice']),
    chat: PropTypes.shape({
        group_name: PropTypes.string,
        group_icon: PropTypes.string,
        admin_id: PropTypes.string,
    }),
};
export default ConferenceCall;
