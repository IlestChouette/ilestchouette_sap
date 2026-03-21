"use client";

import { logout } from "./actions";

export default function LogoutButton() {
  return (
    <div className="no-print" style={{ position: "fixed", top: 20, left: 20, zIndex: 100 }}>
      <form action={logout}>
        <button
          type="submit"
          style={{
            background: "rgba(0,0,0,0.6)",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: "8px 16px",
            fontSize: 13,
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          ← Déconnexion
        </button>
      </form>
    </div>
  );
}
