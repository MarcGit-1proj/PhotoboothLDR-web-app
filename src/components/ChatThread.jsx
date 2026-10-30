import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import ChatCallMenu from "./ChatCallMenu";
import ViewProfileModal from "./ViewProfileModal";
import "../style/ChatThread.css";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

const ONLINE_THRESHOLD_MS = 25000;

function isFresh(lastSeen) {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

function useOnlineStatus(contactId, initialLastSeen) {
  const [lastSeen, setLastSeen] = useState(initialLastSeen || null);
  const [isOnline, setIsOnline] = useState(isFresh(initialLastSeen));

  useEffect(() => {
    setLastSeen(initialLastSeen || null);
  }, [contactId, initialLastSeen]);

  useEffect(() => {
    if (!contactId) return;

    const channel = supabase
      .channel(`online-status-${contactId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${contactId}` },
        (payload) => setLastSeen(payload.new.last_seen)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId]);

  useEffect(() => {
    setIsOnline(isFresh(lastSeen));
    const interval = setInterval(() => setIsOnline(isFresh(lastSeen)), 5000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  return isOnline;
}

function Avatar({ src, name, className }) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        className={className}
        src={src}
        alt={name || "User"}
        onError={() => setBroken(true)}
      />
    );
  }

  return <span className={className}>{initialOf(name)}</span>;
}

function StatusIcon({ status }) {
  const gradientId = useId();

  if (status === "sending") {
    return (
      <svg className="status-icon sending" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg className="status-icon failed" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    );
  }
  return (
    <svg
      className="status-icon sent"
      width="16"
      height="12"
      viewBox="0 0 24 18"
      fill="none"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <polyline points="1 10 6 15 14 4" stroke={`url(#${gradientId})`} />
      <polyline points="9 10 14 15 23 3" stroke={`url(#${gradientId})`} />
    </svg>
  );
}

export default function ChatThread({ user, contact, onBack, onDisconnect }) {
  const isOnline = useOnlineStatus(contact.id, contact.last_seen);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user && contact) {
      loadMessages();
      const channel = subscribeToMessages();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [contact]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load messages:", error.message);
    } else {
      setMessages((data || []).map((m) => ({ ...m, status: "sent" })));
    }

    setLoading(false);
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`messages-${user.id}-${contact.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          const isRelevant =
            (msg.sender_id === user.id && msg.receiver_id === contact.id) ||
            (msg.sender_id === contact.id && msg.receiver_id === user.id);

          if (isRelevant) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, { ...msg, status: "sent" }];
            });
          }
        }
      )
      .subscribe();

    return channel;
  }

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      sender_id: user.id,
      receiver_id: contact.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: contact.id,
        content: trimmed,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to send message:", error.message);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...data, status: "sent" } : m))
    );
  }

  function shouldShowTimestamp(index) {
    const next = messages[index + 1];
    if (!next) return true;
    return next.sender_id !== messages[index].sender_id;
  }

  // --- 3-dot menu handlers -------------------------------------------

  async function handleClearChat() {
    const ok = window.confirm(`Clear all messages with ${contact.nickname}? This can't be undone.`);
    if (!ok) return;

    const { error } = await supabase
      .from("messages")
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`
      );

    if (error) {
      console.error("Failed to clear chat:", error.message);
      // NOTE: if this fails, your "messages" table's RLS policies most
      // likely don't have a DELETE rule yet — ask me to write one.
      return;
    }

    setMessages([]);
  }

  async function handleDeleteChat() {
    const ok = window.confirm(`Delete this conversation with ${contact.nickname}?`);
    if (!ok) return;

    const { error } = await supabase
      .from("messages")
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`
      );

    if (error) {
      console.error("Failed to delete chat:", error.message);
      return;
    }

    setMessages([]);
    if (onBack) onBack();
  }

  function handleMute() {
    // TODO: no "muted" column/table wired yet — tell me if you want this
    // functional and I'll write the SQL + the toggle logic.
    console.log("Mute Notifications tapped for", contact.id);
  }

  function handleBlock() {
    // TODO: no "blocked_users" table yet — tell me if you want this
    // functional and I'll write the SQL + the toggle logic.
    console.log("Block tapped for", contact.id);
  }

  async function handleDisconnect() {
    const ok = window.confirm(`Disconnect from ${contact.nickname}?`);
    if (!ok) return;

    if (onDisconnect) {
      // Let the parent (e.g. Messegespage.jsx) handle it if it already has
      // a remove-connection implementation wired to your connections list.
      onDisconnect(contact);
      setShowProfile(false);
      return;
    }

    // Fallback — matches your "remove_connection" SQL function's actual
    // parameter name: p_other_user_id.
    const { error } = await supabase.rpc("remove_connection", {
      p_other_user_id: contact.id,
    });

    if (error) {
      console.error("Failed to disconnect:", error.message);
      return;
    }

    setShowProfile(false);
    if (onBack) onBack();
  }

  if (loading) {
    return <div className="chat-loading">Loading conversation...</div>;
  }

  // Profile fields are read straight off `contact`. If your
  // list-my-connections()/profiles data uses different column names
  // for these, adjust the mapping below.
  const profileData = {
    name: contact.nickname,
    avatarUrl: contact.avatar_url,
    codeId: contact.code_id,
    isPrivate: contact.is_private,
    bio: contact.bio,
    contact: contact.contact_info,
  };

  return (
    <div className="chat-thread">
      <div className="chat-header">
        {onBack && (
          <button className="chat-back-btn" aria-label="Back to conversations" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <Avatar src={contact.avatar_url} name={contact.nickname} className="chat-avatar" />
        <div className="chat-header-info">
          <span className="chat-contact-name">{contact.nickname}</span>
          <span className="chat-status">
            <span className={`chat-status-dot ${isOnline ? "online" : "offline"}`} />
            {isOnline ? "Available" : "Unavailable"}
          </span>
        </div>

        <div className="chat-header-menu">
          <ChatCallMenu
            onViewProfile={() => setShowProfile(true)}
            onMute={handleMute}
            onBlock={handleBlock}
            onClearChat={handleClearChat}
            onDeleteChat={handleDeleteChat}
          />
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === user.id;
            const showAvatar = !isMine && shouldShowTimestamp(i);
            const showTimestamp = shouldShowTimestamp(i);

            return (
              <div
                key={msg.id}
                className={`chat-bubble-row ${isMine ? "sent" : "received"}`}
              >
                {!isMine && (
                  <span className="bubble-avatar-slot">
                    {showAvatar && (
                      <Avatar
                        src={contact.avatar_url}
                        name={contact.nickname}
                        className="bubble-avatar"
                      />
                    )}
                  </span>
                )}

                <div className="bubble-col">
                  <span className="chat-bubble">{msg.content}</span>
                  {showTimestamp && (
                    <span className="chat-timestamp">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                {isMine && (
                  <span className="bubble-status-slot" title={msg.status}>
                    <StatusIcon status={msg.status || "sent"} />
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <input
          id="chat-input"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>

      <ViewProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        onDisconnect={handleDisconnect}
        profile={profileData}
      />
    </div>
  );
}