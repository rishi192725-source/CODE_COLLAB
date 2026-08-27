import { io } from "socket.io-client";

export const initSocket = async () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  const options = {
    "force new connection": true,
    reconnectionAttempts: "Infinity",
    timeout: 60000,
    transports: ["websocket", "polling"],
  };
  return io(backendUrl, options);
};
