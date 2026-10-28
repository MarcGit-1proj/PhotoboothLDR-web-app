import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import ChatThread from "./ChatThread";
import "../style/Messegespage.css";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

// Shows the real profile photo when one exists; falls back to the
// initial-letter circle if there's no avatar_url or the image fails to load.
function Avatar({ src, name, className = "contact-avatar" }) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        className={className}
        src={src}
        alt={name || "Contact"}
        onError={() => setBroken(true)}
      />
    );
  }

  return <span className={className}>{initialOf(name)}</span>;
}

export default function MessagesPage({ user }) {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadContacts();
  }, [user]);

  async function loadContacts() {
    setLoading(true);

    // Same source as "My Connections": only accepted connections.
    const { data: connections, error } = await supabase.rpc("list_my_connections");

    if (error) {
      console.error("Failed to load connections:", error.message);
      setLoading(false);
      return;
    }

    const withLastMessage = await Promise.all(
      (connections || []).map(async (c) => {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${c.id}),and(sender_id.eq.${c.id},receiver_id.eq.${user.id})`
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...c,
          lastMessage: lastMsg?.content || null,
          lastMessageAt: lastMsg?.created_at || null,
          lastMessageMine: lastMsg?.sender_id === user.id,
        };
      })
    );

    // Sort by most recent message first
    withLastMessage.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    setContacts(withLastMessage);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="messages-page">
        <p className="messages-loading">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className={`messages-page ${activeContact ? "chat-open" : ""}`}>
      <aside className="messages-sidebar">
        <h2>Messages</h2>
        {contacts.length === 0 ? (
          <p className="no-contacts">No connections yet.</p>
        ) : (
          <ul className="contacts-list">
            {contacts.map((c) => (
              <li key={c.id}>
                <button
                  className={`contact-item ${
                    activeContact?.id === c.id ? "active" : ""
                  } ${c.lastMessage ? "has-chatted" : ""}`}
                  onClick={() => setActiveContact(c)}
                >
                  <Avatar src={c.avatar_url} name={c.nickname} className="contact-avatar" />
                  <span className="contact-main">
                    <span className="contact-top-row">
                      <span className="contact-nickname">{c.nickname}</span>
                      {c.lastMessageAt && (
                        <span className="contact-time">
                          {new Date(c.lastMessageAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </span>
                    <span className="contact-last-message">
                      {c.lastMessage
                        ? `${c.lastMessageMine ? "You: " : ""}${c.lastMessage}`
                        : "No messages yet"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="messages-chat">
        {activeContact ? (
          <ChatThread
            user={user}
            contact={activeContact}
            onBack={() => setActiveContact(null)}
          />
        ) : (
          <div className="no-chat-selected">
            <p>Select a conversation to start chatting.</p>
          </div>
        )}
      </section>
    </div>
  );
}