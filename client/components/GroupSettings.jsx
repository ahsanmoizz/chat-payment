import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, UserPlus, ShieldCheck, Users } from "lucide-react"; // ShieldCheck for Admin badge
import GroupMessagingToggle from "./GroupMessagingToggle"; // Adjust the path as needed

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const FALLBACK_AVATAR = process.env.REACT_APP_FALLBACK_AVATAR || "https://via.placeholder.com/40";

const GroupSettings = ({ groupId, onClose, userToken }) => {
  const [groupData, setGroupData] = useState(null);
  const [members, setMembers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState("");

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      const token = userToken || localStorage.getItem("userToken");
      const response = await axios.get(`${API_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Save full group data for toggling messaging mode
      setGroupData(response.data);
      setMembers(response.data.member_ids || []);
      setAdmins(response.data.admin_ids || []);
    } catch (error) {
      console.error("Error fetching group data:", error);
    } finally {
      setLoading(false);
    }
  };

  const assignAdmin = async () => {
    if (!selectedAdmin) {
      alert("Please select a member to assign as admin.");
      return;
    }

    try {
      const token = userToken || localStorage.getItem("userToken");
      await axios.post(
        `${API_URL}/api/groups/assignAdmin`,
        { groupId, newAdminId: selectedAdmin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdmins([...admins, selectedAdmin]); // Update UI
      alert("Admin assigned successfully.");
    } catch (error) {
      console.error("Error assigning admin:", error);
      alert("Failed to assign admin.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-800">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users size={24} className="text-purple-500" /> Group Settings
        </h2>

        {/* Admins Section */}
        <h3 className="text-lg font-semibold mt-4">Admins</h3>
        <div className="border p-3 rounded-lg mb-4">
          {admins.length === 0 ? (
            <p>No admins assigned.</p>
          ) : (
            admins.map((adminId) => (
              <div key={adminId} className="flex items-center gap-2 p-2">
                <ShieldCheck size={16} className="text-green-500" />
                <span className="font-medium">{adminId}</span>
              </div>
            ))
          )}
        </div>

        {/* New Admin Assignment */}
        <h3 className="text-lg font-semibold">Assign New Admin</h3>
        <select
          className="w-full p-2 border rounded-lg mb-4"
          value={selectedAdmin}
          onChange={(e) => setSelectedAdmin(e.target.value)}
        >
          <option value="">Select a member</option>
          {members
            .filter((id) => !admins.includes(id))
            .map((memberId) => (
              <option key={memberId} value={memberId}>
                {memberId}
              </option>
            ))}
        </select>

        <button
          onClick={assignAdmin}
          className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={20} /> Assign Admin
        </button>

        {/* Group Messaging Toggle */}
        {groupData && (
          <div className="mt-6">
            <GroupMessagingToggle
              groupId={groupId}
              currentMode={groupData.only_admin_can_message}
              userToken={userToken}
              onModeChange={(newMode) => {
                // Update groupData with new messaging mode
                setGroupData({ ...groupData, only_admin_can_message: newMode });
                console.log("New messaging mode:", newMode);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSettings;
