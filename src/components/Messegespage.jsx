import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import ChatThread from "./ChatThread";
import EmptyChatState from "./EmptyChatState";
import "../style/Messegespage.css";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

const LAST_READ_KEY = "snapsync_last_read_v1";

function getLastReadMap() {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY)) || {};
  } catch {
    return {};
  }
}

function setLastRead(contactId) {
  const map = getLastReadMap();
  map[contactId] = new Date().toISOString();
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
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
  const activeContactRef = useRef(null);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  useEffect(() => {
    if (user) loadContacts();
  }, [user]);

  // Live-updates unread counts and last-message previews when a new
  // message arrives, without needing a full page refresh.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`sidebar-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new;

          setContacts((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.sender_id);
            if (idx === -1) return prev;

            const isActive = activeContactRef.current?.id === msg.sender_id;
            if (isActive) setLastRead(msg.sender_id);

            const updated = {
              ...prev[idx],
              lastMessage: msg.content,
              lastMessageAt: msg.created_at,
              lastMessageMine: false,
              unreadCount: isActive ? 0 : (prev[idx].unreadCount || 0) + 1,
            };

            const next = [...prev];
            next.splice(idx, 1);
            return [updated, ...next];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Alisin ang isang contact sa sidebar list kapag na-disconnect (galing
  // sa "Disconnect" sa ViewProfileModal via ChatThread), isara ang chat
  // kung ito yung bukas, at tanggalin sa Supabase ang connection mismo.
  async function handleDisconnectContact(contact) {
    const wasActive = activeContactRef.current?.id === contact.id;

    // Optimistic update: agad na alisin sa listahan at isara ang chat
    // kung ito ang bukas, hindi na hinihintay ang response ng server.
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    if (wasActive) setActiveContact(null);

    const { error } = await supabase.rpc("remove_connection", {
      p_other_user_id: contact.id,
    });

    if (error) {
      console.error("Failed to disconnect:", error.message);
      // Mag-fail man, ibalik sa listahan (hindi natin siya tinanggal sa
      // database kung mag-eerror ang request).
      setContacts((prev) =>
        prev.some((c) => c.id === contact.id) ? prev : [...prev, contact]
      );
      if (wasActive) setActiveContact(contact);
    }
  }

  async function loadContacts() {
    setLoading(true);

    // Same source as "My Connections": only accepted connections.
    const { data: connections, error } = await supabase.rpc("list_my_connections");

    if (error) {
      console.error("Failed to load connections:", error.message);
      setLoading(false);
      return;
    }

    const lastReadMap = getLastReadMap();

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

        const lastRead = lastReadMap[c.id] || "1970-01-01T00:00:00.000Z";
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", c.id)
          .eq("receiver_id", user.id)
          .gt("created_at", lastRead);

        return {
          ...c,
          lastMessage: lastMsg?.content || null,
          lastMessageAt: lastMsg?.created_at || null,
          lastMessageMine: lastMsg?.sender_id === user.id,
          unreadCount: unreadCount || 0,
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

  function handleSelectContact(c) {
    setActiveContact(c);
    setLastRead(c.id);
    setContacts((prev) =>
      prev.map((p) => (p.id === c.id ? { ...p, unreadCount: 0 } : p))
    );
  }

  if (loading) {
    return (
      <div className="messages-page messages-page-loading">
        <div className="messages-loading">
          <span className="loading-spinner" aria-hidden="true" />
          <p>Loading messages...</p>
        </div>
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
                  } ${c.lastMessage ? "has-chatted" : ""} ${
                    c.unreadCount > 0 ? "has-unread" : ""
                  }`}
                  onClick={() => handleSelectContact(c)}
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
                    <span className="contact-bottom-row">
                      <span className="contact-last-message">
                        {c.lastMessage
                          ? `${c.lastMessageMine ? "You: " : ""}${c.lastMessage}`
                          : "No messages yet"}
                      </span>
                      {c.unreadCount > 0 && (
                        <span
                          className="unread-badge"
                          aria-label={`${c.unreadCount} unread messages`}
                        >
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                  {activeContact?.id === c.id && (
                    <svg
                      className="contact-active-arrow"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  )}
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
            onDisconnect={handleDisconnectContact}
          />
        ) : (
          <EmptyChatState />
        )}
      </section>
    </div>
  );
}