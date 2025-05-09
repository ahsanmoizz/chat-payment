import React, { useState } from "react";
import axios from "axios";

const GroupMessagingToggle = ({ groupId, currentMode, userToken, onModeChange }) => {
  const [onlyAdminCanMessage, setOnlyAdminCanMessage] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  const toggleMode = async () => {
    setLoading(true);
    try {
      const token = userToken || localStorage.getItem("userToken");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/groups/toggleMessaging`,
        { groupId, onlyAdminCanMessage: !onlyAdminCanMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOnlyAdminCanMessage(response.data.onlyAdminCanMessage);
      if (onModeChange) onModeChange(response.data.onlyAdminCanMessage);
    } catch (error) {
      console.error("Error toggling messaging mode:", error);
      alert("Failed to update group messaging mode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="font-medium">Only admins can send messages:</span>
      <button
        onClick={toggleMode}
        disabled={loading}
        className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
      >
        {onlyAdminCanMessage ? "Yes" : "No"}
      </button>
    </div>
  );
};

export default GroupMessagingToggle;
