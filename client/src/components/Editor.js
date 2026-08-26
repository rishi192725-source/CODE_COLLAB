import React, { useEffect, useRef } from "react";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";

// Language modes
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/mode/ruby/ruby";
import "codemirror/mode/go/go";
import "codemirror/mode/shell/shell";
import "codemirror/mode/sql/sql";
import "codemirror/mode/pascal/pascal";
import "codemirror/mode/php/php";
import "codemirror/mode/swift/swift";
import "codemirror/mode/rust/rust";
import "codemirror/mode/r/r";

import CodeMirror from "codemirror";
import { ACTIONS } from "../Actions";

export const getCodeMirrorMode = (lang) => {
  switch (lang) {
    case "python3":
      return "python";
    case "java":
      return "text/x-java";
    case "cpp":
      return "text/x-c++src";
    case "c":
      return "text/x-csrc";
    case "csharp":
      return "text/x-csharp";
    case "scala":
      return "text/x-scala";
    case "nodejs":
      return { name: "javascript", json: true };
    case "ruby":
      return "ruby";
    case "go":
      return "go";
    case "bash":
      return "shell";
    case "sql":
      return "sql";
    case "pascal":
      return "pascal";
    case "php":
      return "php";
    case "swift":
      return "swift";
    case "rust":
      return "rust";
    case "r":
      return "r";
    default:
      return "javascript";
  }
};

function Editor({
  socketRef,
  roomId,
  onCodeChange,
  selectedLanguage,
  initialCode,
  onRunCode,
  editorRef,
}) {
  const localEditorRef = useRef(null);

  useEffect(() => {
    const textarea = document.getElementById("realtimeEditor");
    if (textarea && !localEditorRef.current) {
      const editor = CodeMirror.fromTextArea(textarea, {
        mode: getCodeMirrorMode(selectedLanguage || "python3"),
        theme: "dracula",
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
        tabSize: 4,
        indentUnit: 4,
        lineWrapping: true,
        extraKeys: {
          "Ctrl-Enter": () => {
            if (onRunCode) onRunCode();
          },
          "Cmd-Enter": () => {
            if (onRunCode) onRunCode();
          },
        },
      });

      localEditorRef.current = editor;
      if (editorRef) {
        editorRef.current = editor;
      }
      editor.setSize("100%", "100%");

      if (initialCode) {
        editor.setValue(initialCode);
        onCodeChange(initialCode);
      }

      editor.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        if (origin !== "setValue" && socketRef.current) {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localEditorRef.current) {
      localEditorRef.current.setOption("mode", getCodeMirrorMode(selectedLanguage));
    }
  }, [selectedLanguage]);

  return (
    <div className="editor-container">
      <textarea id="realtimeEditor"></textarea>
    </div>
  );
}

export default Editor;
