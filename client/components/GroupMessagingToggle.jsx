import React, { useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";

const GroupMessagingToggle = ({ groupId, currentMode, userToken, onModeChange }) => {
  const [onlyAdminCanMessage, setOnlyAdminCanMessage] = useState(currentMode);
  const [loading, setLoading] = useState(false);

  const toggleMode = async () => {
    setLoading(true);
    try {
      const token =  localStorage.getItem("userToken");//usertoken 
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL }/api/groups/toggleMessaging`,
        { groupId, onlyAdminCanMessage: !onlyAdminCanMessage },
        { headers: {Authorization: `${token}` } }
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
  <div className="flex items-center justify-between bg-white/10 backdrop-blur-lg px-4 py-2 rounded-lg shadow-inner text-white w-full">
    <span className="font-medium">Only admins can send messages:</span>
    <button
      onClick={toggleMode}
      disabled={loading}
      className={`px-4 py-1 rounded-full transition text-sm font-semibold shadow ${
        onlyAdminCanMessage
          ? "bg-green-500 hover:bg-green-600"
          : "bg-red-500 hover:bg-red-600"
      }`}
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
