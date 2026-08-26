import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Code2, Play, Terminal, Copy, Download, LogOut, Check, Trash2, X } from "lucide-react";

// Supported languages
const LANGUAGES = [
  { id: "python3", name: "Python 3", ext: "py" },
  { id: "nodejs", name: "JavaScript", ext: "js" },
  { id: "cpp", name: "C++", ext: "cpp" },
  { id: "java", name: "Java", ext: "java" },
  { id: "c", name: "C", ext: "c" },
  { id: "go", name: "Go", ext: "go" },
  { id: "rust", name: "Rust", ext: "rs" },
  { id: "ruby", name: "Ruby", ext: "rb" },
  { id: "php", name: "PHP", ext: "php" },
  { id: "bash", name: "Bash", ext: "sh" },
  { id: "sql", name: "SQL", ext: "sql" },
  { id: "csharp", name: "C#", ext: "cs" },
  { id: "swift", name: "Swift", ext: "swift" },
  { id: "scala", name: "Scala", ext: "scala" },
  { id: "pascal", name: "Pascal", ext: "pas" },
  { id: "r", name: "R", ext: "r" },
];

const LANGUAGE_EXTENSIONS = {
  python3: "py",
  nodejs: "js",
  cpp: "cpp",
  java: "java",
  c: "c",
  go: "go",
  rust: "rs",
  ruby: "rb",
  php: "php",
  bash: "sh",
  sql: "sql",
  csharp: "cs",
  swift: "swift",
  scala: "scala",
  pascal: "pas",
  r: "r",
};

const STARTER_TEMPLATES = {
  python3: `# Python 3\ndef main():\n    print("Hello from CodeCollab!")\n\nif __name__ == "__main__":\n    main()\n`,
  nodejs: `// JavaScript (Node.js)\nconsole.log("Hello from CodeCollab!");\n`,
  cpp: `// C++\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from CodeCollab!" << endl;\n    return 0;\n}\n`,
  java: `// Java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CodeCollab!");\n    }\n}\n`,
  c: `// C\n#include <stdio.h>\n\nint main() {\n    printf("Hello from CodeCollab!\\n");\n    return 0;\n}\n`,
  go: `// Go\npackage main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from CodeCollab!")\n}\n`,
  rust: `// Rust\nfn main() {\n    println!("Hello from CodeCollab!");\n}\n`,
  ruby: `# Ruby\nputs "Hello from CodeCollab!"\n`,
  php: `<?php\n// PHP\necho "Hello from CodeCollab!";\n?>\n`,
  bash: `#!/bin/bash\n# Bash\necho "Hello from CodeCollab!"\n`,
  sql: `-- SQL\nSELECT "Hello from CodeCollab!" AS message;\n`,
  csharp: `// C#\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello from CodeCollab!");\n    }\n}\n`,
  swift: `// Swift\nimport Foundation\n\nprint("Hello from CodeCollab!")\n`,
  scala: `// Scala\nobject Main extends App {\n    println("Hello from CodeCollab!")\n}\n`,
  pascal: `// Pascal\nprogram Hello;\nbegin\n    writeln('Hello from CodeCollab!');\nend.\n`,
  r: `# R\ncat("Hello from CodeCollab!\\n")\n`,
};

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [activeTab, setActiveTab] = useState("output"); // "output" | "input"
  const [execMeta, setExecMeta] = useState(null);
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [copiedCode, setCopiedCode] = useState(false);

  const codeRef = useRef(STARTER_TEMPLATES["python3"] || "");
  const editorRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      socketRef.current = await initSocket();

      const handleErrors = (err) => {
        console.error("Socket error:", err);
        toast.error("Socket connection failed. Please try again.");
        navigate("/");
      };

      socketRef.current.on("connect_error", handleErrors);
      socketRef.current.on("connect_failed", handleErrors);

      // Join room
      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // Member joined
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (!isMounted) return;

          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);

          // Sync existing code & language to new member
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            language: selectedLanguage,
            socketId,
          });
        }
      );

      // Incoming code changes from other room members
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (!isMounted) return;
        if (code !== null && code !== undefined) {
          codeRef.current = code;
          if (editorRef.current) {
            const currentVal = editorRef.current.getValue();
            if (currentVal !== code) {
              editorRef.current.setValue(code);
            }
          }
        }
      });

      // Language change incoming from another user
      socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
        if (!isMounted) return;
        setSelectedLanguage(language);
        toast(`Language set to ${language.toUpperCase()}`);
      });

      // Member disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        if (!isMounted) return;
        toast(`${username} left the room.`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });
    };

    if (location.state?.username) {
      init();
    }

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
      }
    };
  }, [location.state?.username, navigate, roomId, selectedLanguage]);

  if (!location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomId);
      }
      toast.success("Room ID copied!");
    } catch (error) {
      toast.error("Failed to copy Room ID");
    }
  };

  const copyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeRef.current);
      }
      setCopiedCode(true);
      toast.success("Code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const downloadCode = () => {
    const ext = LANGUAGE_EXTENSIONS[selectedLanguage] || "txt";
    const blob = new Blob([codeRef.current], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `code_${roomId.slice(0, 6)}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded code.${ext}`);
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
        roomId,
        language: newLang,
      });
    }
  };

  const leaveRoom = () => {
    navigate("/");
  };

  const runCode = async () => {
    setIsCompiling(true);
    setIsCompileWindowOpen(true);
    setActiveTab("output");
    setExecMeta(null);

    try {
      const response = await axios.post(`${backendUrl}/compile`, {
        code: codeRef.current,
        language: selectedLanguage,
        input: customInput,
      });
      setOutput(response.data.output || "No output generated");
      if (response.data.time || response.data.memory || response.data.status) {
        setExecMeta({
          time: response.data.time,
          memory: response.data.memory,
          status: response.data.status?.description || response.data.status,
        });
      }
    } catch (error) {
      console.error("Error compiling code:", error);
      setOutput(error.response?.data?.error || "Failed to execute code");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="editor-page-wrapper">
      {/* Sidebar */}
      <aside className="editor-sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="d-flex align-items-center gap-2">
            <Code2 size={20} color="#10b981" />
            <span className="brand-text">
              &lt;Code<span className="text-white">Collab /&gt;</span>
            </span>
          </div>
          <span className="brand-sub">Real-Time IDE</span>
        </div>

        {/* Members Header */}
        <div className="sidebar-members-header">
          <span className="members-title">ACTIVE MEMBERS</span>
          <span className="members-count">{clients.length} online</span>
        </div>

        {/* Members List */}
        <div className="sidebar-members-list">
          {clients.map((client) => (
            <Client key={client.socketId} username={client.username} />
          ))}
        </div>

        {/* Sidebar Actions */}
        <div className="sidebar-footer">
          <button onClick={copyRoomId} className="sidebar-btn copy-btn mb-2">
            <Copy size={14} />
            <span>Copy Room ID</span>
          </button>
          <button onClick={leaveRoom} className="sidebar-btn leave-btn">
            <LogOut size={14} />
            <span>Leave Room</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="editor-main">
        {/* Top Navbar */}
        <header className="editor-topbar">
          <div className="d-flex align-items-center gap-2">
            <span className="room-pill">
              Room: <strong className="text-white">{roomId.slice(0, 8)}...</strong>
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Language Select */}
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="lang-select"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>

            {/* Copy Code */}
            <button onClick={copyCode} className="topbar-btn" title="Copy code">
              {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>Copy</span>
            </button>

            {/* Download Code */}
            <button onClick={downloadCode} className="topbar-btn" title="Download code">
              <Download size={14} />
              <span>Export</span>
            </button>

            {/* Run Code */}
            <button
              onClick={runCode}
              disabled={isCompiling}
              className="run-btn"
              title="Run code (Ctrl + Enter)"
            >
              {isCompiling ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="#ffffff" />
                  <span>Run Code</span>
                </>
              )}
            </button>

            {/* Toggle Console */}
            <button
              onClick={() => setIsCompileWindowOpen(!isCompileWindowOpen)}
              className={`topbar-btn ${isCompileWindowOpen ? "active" : ""}`}
            >
              <Terminal size={14} />
              <span>Console</span>
            </button>
          </div>
        </header>

        {/* Code Editor */}
        <div className="editor-view">
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            selectedLanguage={selectedLanguage}
            initialCode={STARTER_TEMPLATES[selectedLanguage] || STARTER_TEMPLATES["python3"]}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
            onRunCode={runCode}
            editorRef={editorRef}
          />
        </div>

        {/* Terminal Console Bottom Drawer */}
        {isCompileWindowOpen && (
          <div className="terminal-drawer">
            {/* Header */}
            <div className="terminal-drawer-header">
              <div className="d-flex align-items-center gap-2">
                <button
                  className={`terminal-tab ${activeTab === "output" ? "active" : ""}`}
                  onClick={() => setActiveTab("output")}
                >
                  Output
                </button>
                <button
                  className={`terminal-tab ${activeTab === "input" ? "active" : ""}`}
                  onClick={() => setActiveTab("input")}
                >
                  Input (stdin)
                </button>

                {execMeta?.time && (
                  <span className="terminal-stat">
                    ⏱ {execMeta.time}s
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                {activeTab === "output" && (
                  <button
                    onClick={() => {
                      setOutput("");
                      setExecMeta(null);
                    }}
                    className="terminal-action-btn"
                    title="Clear output"
                  >
                    <Trash2 size={14} />
                    <span>Clear</span>
                  </button>
                )}
                {activeTab === "input" && (
                  <button
                    onClick={() => setCustomInput("")}
                    className="terminal-action-btn"
                    title="Clear input"
                  >
                    <Trash2 size={14} />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  onClick={() => setIsCompileWindowOpen(false)}
                  className="terminal-action-btn"
                  title="Close console"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="terminal-drawer-body">
              {activeTab === "output" ? (
                <pre className="terminal-output">
                  {output ||
                    (isCompiling
                      ? "Executing code on server..."
                      : "Output will appear here after clicking 'Run Code' (or press Ctrl + Enter).")}
                </pre>
              ) : (
                <textarea
                  className="terminal-input"
                  placeholder="Enter standard input (stdin) for your program here before clicking 'Run'..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorPage;
