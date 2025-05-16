import React, { useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";

const GroupMessagingToggle = ({ groupId, currentMode, userToken, onModeChange }) => {
  const [onlyAdminCanMessage, setOnlyAdminCanMessage] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  const toggleMode = async () => {
    setLoading(true);
    try {
      const token = userToken || localStorage.getItem("userToken");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "https://dummy-api.com"}/api/groups/toggleMessaging`,
        { groupId, onlyAdminCanMessage: !onlyAdminCanMessage },
        { headers: {Authorization: `Bearer dummy_token` } }
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

GroupMessagingToggle.propTypes = {
  groupId: PropTypes.string.isRequired,
  currentMode: PropTypes.bool.isRequired,
  userToken: PropTypes.string,
  onModeChange: PropTypes.func,
};

export default GroupMessagingToggle;
