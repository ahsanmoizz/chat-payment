import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

const CALL_LOGS_KEY = 'call_logs';

export const getCallLogs = async () => {
  const logs = await localforage.getItem(CALL_LOGS_KEY);
  return logs || [];
};

export const addCallLog = async (log) => {
  const logs = await getCallLogs();
  // Ensure the log has a unique id
  const newLog = { id: uuidv4(), ...log };
  const updatedLogs = [...logs, newLog];
  await localforage.setItem(CALL_LOGS_KEY, updatedLogs);
};

export const clearCallLogs = async () => {
  await localforage.removeItem(CALL_LOGS_KEY);
};
