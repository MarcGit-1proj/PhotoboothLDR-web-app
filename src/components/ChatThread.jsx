import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import "../style/ChatThread.css";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

// Shows the real profile photo when one exists; falls back to the
// initial-letter circle if there's no avatar_url or the image fails to load.
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

// sending = optimistic, just fired, waiting for the DB insert to confirm
// sent    = confirmed, saved in the messages table
// failed  = insert errored out
function StatusIcon({ status }) {
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
    <svg className="status-icon sent" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ChatThread({ user, contact, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
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
      // Anything already persisted in the DB counts as "sent".
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
              // Avoid duplicating a message we already added optimistically
              // (matched by real id) when our own insert echoes back.
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

  // Groups consecutive bubbles from the same sender so we don't repeat
  // the timestamp (and the avatar) on every single message.
  function shouldShowTimestamp(index) {
    const next = messages[index + 1];
    if (!next) return true;
    return next.sender_id !== messages[index].sender_id;
  }

  if (loading) {
    return <div className="chat-loading">Loading conversation...</div>;
  }

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
        <span className="chat-contact-name">{contact.nickname}</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === user.id;
            const showAvatar = !isMine && shouldShowTimestamp(i);
            const showTimestamp = shouldShowTimestamp(i);

            // One flat row per message: [avatar?] [bubble + its own
            // timestamp, stacked] [status?]. Every row gets the same,
            // fixed margin-bottom below — spacing never depends on
            // whether a neighboring bubble is one line or three, so
            // short and tall messages never crowd or overlap each other.
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
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}