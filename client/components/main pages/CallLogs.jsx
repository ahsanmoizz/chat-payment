import React, { useState, useEffect } from "react";
import { getCallLogs, clearCallLogs } from "./callmanager.js";

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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg relative">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
  
        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">📞 Call Logs</h2>
  
        {/* Clear Button */}
        <button
          onClick={handleClearLogs}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h3l1-2h4l1 2h3a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          Clear Call Logs
        </button>
  
        {/* Logs */}
        {logs.length === 0 ? (
          <p className="text-center text-gray-500 mt-4">No call logs available.</p>
        ) : (
          <ul className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 mt-4">
            {logs.map((log, index) => (
              <li key={index} className="bg-gray-100 p-4 rounded-lg shadow flex flex-col gap-2 border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v10l8-5-8-5z" />
                  </svg>
                  <strong>Time:</strong> {new Date(log.timestamp).toLocaleString()}
                </div>
  
                {log.isGroupCall ? (
                  <>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m5-9l5 5m0 0l-5 5m5-5H9" />
                      </svg>
                      {log.groupName}
                    </div>
                    <div className="text-sm text-gray-600">⏳ Duration: {log.duration} sec</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-4.553A2 2 0 0018.553 3H5.447a2 2 0 00-1.447 3.447L8 10M4 18h16" />
                      </svg>
                      {log.caller} → {log.callee}
                    </div>
                    <div className="text-sm text-gray-600">⏳ Duration: {log.duration} sec</div>
                  </>
                )}
  
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M9 21V3m12 18h-6m6-9h-6m6-9h-6" />
                  </svg>
                  <strong>Call Type:</strong> {log.callType}
                </div>
  
                <div
                  className={`text-sm font-medium flex items-center gap-2 ${
                    log.status === "Completed" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <strong>Status:</strong> {log.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
export default CallLogs;
