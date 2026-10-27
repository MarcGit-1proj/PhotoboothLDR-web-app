import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import "../style/ChatThread.css";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
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
      setMessages(data || []);
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
            setMessages((prev) => [...prev, msg]);
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

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: contact.id,
      content: trimmed,
    });

    if (error) {
      console.error("Failed to send message:", error.message);
    }
  }

  // Groups consecutive bubbles from the same sender so we don't repeat
  // the timestamp on every single message.
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
        <span className="chat-avatar">{initialOf(contact.nickname)}</span>
        <span className="chat-contact-name">{contact.nickname}</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`chat-bubble-row ${
                msg.sender_id === user.id ? "sent" : "received"
              }`}
            >
              <span className="chat-bubble">{msg.content}</span>
              {shouldShowTimestamp(i) && (
                <span className="chat-timestamp">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          ))
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