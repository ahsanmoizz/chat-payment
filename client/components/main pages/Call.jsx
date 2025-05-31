import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { IoCallEnd, IoVideocam, IoVideocamOff, IoMic, IoMicOff } from 'react-icons/io5';
import { addCallLog } from './callmanager';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';

// Helper function to modify SDP for codec preferences.
function modifySDP(sdp) {
  const lines = sdp.split('\r\n');
  let mVideoLineIndex = -1;
  let mAudioLineIndex = -1;
  lines.forEach((line, index) => {
    if (line.startsWith('m=video')) mVideoLineIndex = index;
    if (line.startsWith('m=audio')) mAudioLineIndex = index;
  });

  // For video: Prefer AV1 if available.
 if (mVideoLineIndex !== -1) {
    const parts = lines[mVideoLineIndex].split(' ');
    const header = parts.slice(0, 3).join(' ');
    let payloads = parts.slice(3);
    const av1Payloads = [];
    const otherPayloads = [];

    payloads.forEach((pt) => {
        const rtpmapLine = lines.find((l) => l.startsWith(`a=rtpmap:${pt} `));
        // Use optional chaining for cleaner checks
        if (rtpmapLine?.toLowerCase().includes('av01')) {
            av1Payloads.push(pt);
        } else {
            otherPayloads.push(pt);
        }
    });

    // Rebuild the line with AV1 prioritized
    lines[mVideoLineIndex] = `${header} ${[...av1Payloads, ...otherPayloads].join(' ')}`;
}

  // For audio: Ensure Opus is prioritized.
if (mAudioLineIndex !== -1) {
    const parts = lines[mAudioLineIndex].split(' ');
    const header = parts.slice(0, 3).join(' ');
    let payloads = parts.slice(3);
    const opusPayloads = [];
    const otherAudioPayloads = [];

    // Use optional chaining for cleaner and safer RTP line checks
    payloads.forEach((pt) => {
        const rtpmapLine = lines.find((l) => l.startsWith(`a=rtpmap:${pt} `));
        if (rtpmapLine?.toLowerCase().includes('opus')) {
            opusPayloads.push(pt);
        } else {
            otherAudioPayloads.push(pt);
        }
    });

    // Rebuild the line with Opus prioritized
    lines[mAudioLineIndex] = `${header} ${[...opusPayloads, ...otherAudioPayloads].join(' ')}`;
}

  return lines.join('\r\n');
}

const Call = ({ callType = "video" }) => { // callType prop determines call mode
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(callType === "video");
  
  // Ref to store call start time
  const callStartTimeRef = useRef(null);

  useEffect(() => {
    // Record call start time when component mounts
    callStartTimeRef.current = Date.now();

    // Establish a secure Socket.io connection (replace URL/token as needed)
    const s =  io(process.env.REACT_APP_SIGNALING_URL, { query: { token: process.env.REACT_APP_AUTH_TOKEN }, secure: true });

  

    setSocket(s);

    // Create a new RTCPeerConnection.
    const pc = new RTCPeerConnection();
    setPeerConnection(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        s.emit('signal', { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Use constraints based on callType: video + audio if "video", else only audio.
    const constraints = { video: callType === "video", audio: true };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        if (callType === "video" && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((error) => console.error('Error accessing media devices.', error));

    s.on('signal', async (data) => {
      try {
        if (data.sdp) {
          const modifiedSDP = modifySDP(data.sdp.sdp);
          const remoteDesc = new RTCSessionDescription({ type: data.sdp.type, sdp: modifiedSDP });
          await pc.setRemoteDescription(remoteDesc);
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            answer.sdp = modifySDP(answer.sdp);
            await pc.setLocalDescription(answer);
            s.emit('signal', { sdp: answer });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error handling signaling data.', error);
      }
    });

    return () => {
      s.disconnect();
      pc.close();
    };
  }, [callType]);

  const startCall = async () => {
    if (peerConnection && socket) {
      try {
        const offer = await peerConnection.createOffer();
        offer.sdp = modifySDP(offer.sdp);
        await peerConnection.setLocalDescription(offer);
        socket.emit('signal', { sdp: offer });
      } catch (error) {
        console.error('Error starting call.', error);
      }
    }
  };

  const handleToggleMic = () => {
    if (!localVideoRef.current?.srcObject) return;
    const audioTrack = localVideoRef.current.srcObject.getTracks().find(track => track.kind === 'audio');
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicEnabled(audioTrack.enabled);
    }
  };

  const handleToggleCamera = () => {
    if (callType === "audio") return;
    if (!localVideoRef.current?.srcObject) return;
    const videoTrack = localVideoRef.current.srcObject.getTracks().find(track => track.kind === 'video');
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraEnabled(videoTrack.enabled);
    }
  };

  const handleEndCall = async () => {
    // Stop all media tracks and close peer connection.
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection) peerConnection.close();
    console.log('Call ended');

    // Calculate call duration in seconds
    const callEndTime = Date.now();
    const durationSeconds = Math.floor((callEndTime - callStartTimeRef.current) / 1000);

    // Create a call log entry.
    const callLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      caller: userId, // current user id
      callee: chat.chat_partner_id || chat.chat_partner, // Use callee's id or name from the chat object
      callType: callType === 'video' ? 'Video' : 'Voice',
      duration: durationSeconds, // Calculated duration
      status: 'completed'
    };
    try {
      await addCallLog(callLog);
    } catch (error) {
      console.error('Error adding call log:', error);
    }
  };

  return (
   <div className="relative w-full h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex flex-col items-center justify-center">
  {callType === "video" && (
    <video
      ref={remoteVideoRef}
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-cover opacity-70"
    />
  )}

  <div className="relative z-10 flex flex-col items-center space-y-6 backdrop-blur-md p-6 rounded-xl bg-white/10 border border-white/10 shadow-xl">
    {callType === "video" && (
      <div className="w-24 h-24 rounded-full overflow-hidden border border-white/30 shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>
    )}

    <h2 className="text-lg font-medium text-white/90">🔒 End-to-end encrypted</h2>

    <div className="flex items-center space-x-4">
      <button
        onClick={handleToggleMic}
        className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition"
      >
        {micEnabled ? (
          <IoMic className="text-white w-6 h-6" />
        ) : (
          <IoMicOff className="text-red-400 w-6 h-6" />
        )}
      </button>

      {callType === "video" && (
        <button
          onClick={handleToggleCamera}
          className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          {cameraEnabled ? (
            <IoVideocam className="text-white w-6 h-6" />
          ) : (
            <IoVideocamOff className="text-red-400 w-6 h-6" />
          )}
        </button>
      )}

      <button
        onClick={handleEndCall}
        className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition"
      >
        <IoCallEnd className="text-white w-6 h-6" />
      </button>
    </div>

    <button
      onClick={startCall}
      className="mt-6 px-6 py-2 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-full transition"
    >
      Start {callType === "video" ? "Video" : "Voice"} Call
    </button>
  </div>
</div>

  );
};
Call.propTypes = {
  callType: PropTypes.oneOf(['video', 'audio']).isRequired,
};
export default Call;
