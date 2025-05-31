import React, { useState, useEffect } from "react";
import { getCallLogs, clearCallLogs } from "./callmanager.js";
import PropTypes from "prop-types";
const CallLogs = ({ onClose }) => {
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    const storedLogs = await getCallLogs();
    setLogs(storedLogs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = async () => {
    await clearCallLogs();
    setLogs([]);
  };

  return (
   <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-white/10 text-white backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl w-full max-w-lg relative">
    
    {/* ❌ Close Button */}
    <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white transition">
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <h2 className="text-2xl font-semibold text-white mb-4 text-center">📞 Call Logs</h2>

    <button
      onClick={handleClearLogs}
      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
    >
      🗑️ Clear Call Logs
    </button>

    {logs.length === 0 ? (
      <p className="text-center text-white/70 mt-4">No call logs available.</p>
    ) : (
      <ul className="space-y-3 max-h-64 overflow-y-auto mt-4 scrollbar-thin scrollbar-thumb-gray-400">
        {logs.map((log) => (
          <li
            key={log.id || log.timestamp}
            className="bg-white/10 p-4 rounded-lg border-l-4 border-blue-400 text-white shadow-sm"
          >
            <div className="text-sm mb-1">🕒 {new Date(log.timestamp).toLocaleString()}</div>
            <div className="font-medium">
              {log.isGroupCall ? (
                <>👥 Group: {log.groupName}</>
              ) : (
                <>📱 {log.caller} → {log.callee}</>
              )}
            </div>
            <div className="text-sm">⏱ Duration: {log.duration} sec</div>
            <div className="text-sm">📡 Call Type: {log.callType}</div>
            <div className={`text-sm font-medium ${log.status === 'Completed' ? 'text-green-400' : 'text-red-400'}`}>
              {log.status === 'Completed' ? '✅ Completed' : '❌ Missed / Rejected'}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
</div>

  );
};
CallLogs.propTypes = {
  onClose: PropTypes.func.isRequired,
};
export default CallLogs;
