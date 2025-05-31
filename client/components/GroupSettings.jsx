import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, UserPlus, ShieldCheck, Users } from "lucide-react"; // ShieldCheck for Admin badge
import GroupMessagingToggle from "./GroupMessagingToggle"; // Adjust the path as needed
import PropTypes from 'prop-types';
const API_URL = process.env.REACT_APP_API_URL ;
const FALLBACK_AVATAR = process.env.REACT_APP_FALLBACK_AVATAR ;

const GroupSettings = ({ groupId, onClose, userToken }) => {
  const [groupData, setGroupData] = useState(null);
  const [members, setMembers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [ setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState("");

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      const token =  localStorage.getItem("userToken");//user token
      const response = await axios.get(`${API_URL}/api/groups/${groupId}`, {
        headers: {Authorization: `Bearer ${token}`  //user token
 },
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
      const token = localStorage.getItem("userToken");//user token
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
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 rounded-2xl shadow-2xl w-full max-w-lg text-white relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-red-400 transition"
      >
        ✕
      </button>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Users size={24} className="text-pink-400" /> Group Settings
      </h2>

      <h3 className="text-lg font-semibold mb-2">👑 Admins</h3>
      <div className="bg-white/10 p-3 rounded-xl mb-4">
        {admins.length === 0 ? (
          <p className="text-white/70">No admins assigned.</p>
        ) : (
          admins.map((adminId) => (
            <div key={adminId} className="flex items-center gap-2 p-2">
              <ShieldCheck size={16} className="text-green-400" />
              <span className="font-medium">{adminId}</span>
            </div>
          ))
        )}
      </div>

      <h3 className="text-lg font-semibold mb-2">🧑 Add Admin</h3>
      <select
        className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white mb-4"
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
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:scale-[1.02] transition"
      >
        <UserPlus size={18} /> Assign Admin
      </button>

      {/* Messaging Mode Toggle */}
      {groupData && (
        <div className="mt-6">
          <GroupMessagingToggle
            groupId={groupId}
            currentMode={groupData.only_admin_can_message}
            userToken={userToken}
            onModeChange={(newMode) => {
              setGroupData({ ...groupData, only_admin_can_message: newMode });
            }}
          />
        </div>
      )}
    </div>
  </div>
);

};
GroupSettings.propTypes = {
  groupId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  userToken: PropTypes.string.isRequired,
};
export default GroupSettings;
