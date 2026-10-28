import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const PresenceContext = createContext(new Set());

// Any component can call this to get the live Set of user ids that are
// currently online (have the app open and are logged in, anywhere —
// Main page, Photobooth, Messages, etc).
export function usePresence() {
  return useContext(PresenceContext);
}

// Mount this once, near the top of the app, above the router. As long as
// userId is set, the current user is tracked in a shared Supabase Realtime
// presence channel for the entire time they're logged in — not just while
// a specific page (like Messages) happens to be open. Closing the tab,
// logging out, or losing connection drops them automatically; Supabase
// handles that cleanup, nothing to do manually here.
export function PresenceProvider({ userId, children }) {
  const [onlineIds, setOnlineIds] = useState(new Set());

  useEffect(() => {
    if (!userId) {
      setOnlineIds(new Set());
      return;
    }

    const channel = supabase.channel("snapsync-presence", {
      config: { presence: { key: userId } },
    });

    function syncOnlineIds() {
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    }

    channel
      .on("presence", { event: "sync" }, syncOnlineIds)
      .on("presence", { event: "join" }, syncOnlineIds)
      .on("presence", { event: "leave" }, syncOnlineIds)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <PresenceContext.Provider value={onlineIds}>
      {children}
    </PresenceContext.Provider>
  );
}