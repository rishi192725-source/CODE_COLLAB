import React from "react";
import Avatar from "react-avatar";

function Client({ username }) {
  const displayName = username ? String(username) : "Anonymous";

  return (
    <div className="client-item">
      <div className="position-relative">
        <Avatar name={displayName} size="32" round="6px" />
        <span className="client-online-dot"></span>
      </div>
      <span className="client-name text-truncate" title={displayName}>
        {displayName}
      </span>
    </div>
  );
}

export default Client;
