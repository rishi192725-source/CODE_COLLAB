import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Code2 } from "lucide-react";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const generateRoomId = (e) => {
    if (e) e.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("New Room ID created!");
  };

  const joinRoom = () => {
    const trimmedRoomId = roomId.trim();
    const trimmedUsername = username.trim();

    if (!trimmedRoomId || !trimmedUsername) {
      toast.error("Please enter both Room ID and Username");
      return;
    }

    navigate(`/editor/${trimmedRoomId}`, {
      state: {
        username: trimmedUsername,
      },
    });
  };

  const handleInputEnter = (e) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="home-wrapper">
      <div className="home-card">
        {/* Logo & Header */}
        <div className="text-center mb-4">
          <div className="brand-icon-wrapper mb-2">
            <Code2 size={24} color="#10b981" />
          </div>
          <h2 className="brand-title mb-1">
            &lt;Code<span className="text-white">Collab /&gt;</span>
          </h2>
          <p className="text-muted small mb-0">Real-Time Code Collaboration</p>
        </div>

        {/* Room ID Input */}
        <div className="form-group mb-3">
          <label className="input-label">ROOM ID</label>
          <div className="input-box">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Paste or generate Room ID"
              onKeyUp={handleInputEnter}
              className="simple-input"
            />
            <button
              type="button"
              onClick={generateRoomId}
              className="generate-btn"
              title="Generate new Room ID"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Username Input */}
        <div className="form-group mb-4">
          <label className="input-label">YOUR USERNAME</label>
          <div className="input-box">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              onKeyUp={handleInputEnter}
              className="simple-input"
            />
          </div>
        </div>

        {/* Join Button */}
        <button onClick={joinRoom} className="join-btn mb-3">
          JOIN ROOM
        </button>

        {/* Quick Link */}
        <div className="text-center">
          <span className="text-muted small">Don't have a room? </span>
          <button
            type="button"
            onClick={generateRoomId}
            className="link-btn"
          >
            Create New Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
