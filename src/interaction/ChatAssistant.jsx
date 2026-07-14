import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sendChatMessage } from "./interactionSlice";

export default function ChatAssistant() {
  const dispatch = useDispatch();
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  // Redux state
  const messages = useSelector((state) => state.interaction.messages);
  const chatLoading = useSelector((state) => state.interaction.chatLoading);
  const formData = useSelector((state) => state.interaction.formData);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

  const handleSend = (e) => {
    e.preventDefault();
    const clean = input.trim();
    if (!clean || chatLoading) return;

    // Add user message to chat immediately
    dispatch({
      type: "interaction/addChatMessage",
      payload: { role: "user", content: clean }
    });
    
    setInput("");

    // Dispatch API call with current form context
    dispatch(sendChatMessage({ message: clean, current_form: formData }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSend(e);
    }
  };

  return (
    <div className="glass-card chat-assistant-panel">
      <h3 className="card-title">
        <span>🤖 AI Assistant</span>
        {chatLoading && <span style={{ fontSize: "12px", color: "var(--primary)" }}>Analyzing...</span>}
      </h3>

      {/* Chat Messages Log */}
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {chatLoading && (
          <div className="chat-loading-bubble">
            <span className="chat-loading-dot"></span>
            <span className="chat-loading-dot"></span>
            <span className="chat-loading-dot"></span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Area */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <textarea
          className="chat-textarea"
          placeholder="Describe interaction (e.g. 'Met Dr. Jones yesterday about OmcoBoost, positive sentiment, follow up next week')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button type="submit" className="chat-send-btn" disabled={!input.trim() || chatLoading}>
          ⚡ Log
        </button>
      </form>
    </div>
  );
}
