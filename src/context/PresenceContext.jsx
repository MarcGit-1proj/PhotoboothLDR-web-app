import { useEffect } from "react";
import { supabase } from "../supabaseClient";

// How often the current user "checks in" by touching their own
// profiles.last_seen. Must match (or be looser than) the staleness
// threshold used in ChatThread's online check, or everyone will look
// unavailable most of the time.
const HEARTBEAT_INTERVAL_MS = 15000;

// Mount this once, above the router, in App.jsx. While userId is set,
// it pings the touch_online_status() RPC every ~15s so the user's
// last_seen stays fresh for as long as they're logged in and the tab
// is open — on ANY page, not just Messages. Logging out (userId
// becomes null) simply stops the heartbeat; after ~25s of silence
// their last_seen goes stale and anyone viewing their chat sees them
// flip to "Unavailable" on its own, no manual offline signal needed.
export function PresenceProvider({ userId, children }) {
  useEffect(() => {
    if (!userId) return;

    async function heartbeat() {
      const { error } = await supabase.rpc("touch_online_status");
      if (error) console.error("Online-status heartbeat failed:", error.message);
    }

    heartbeat();
    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userId]);

  return children;
}