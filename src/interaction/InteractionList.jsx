import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchInteractions } from "./interactionSlice";

export default function InteractionList() {
  const dispatch = useDispatch();
  const interactions = useSelector((state) => state.interaction.interactions);
  const loading = useSelector((state) => state.interaction.loading);

  useEffect(() => {
    dispatch(fetchInteractions());
  }, [dispatch]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card history-section">
      <h2 className="card-title">
        <span>📋 Logged Interactions History</span>
        <span style={{ fontSize: "13px", fontWeight: "normal", color: "var(--text-muted)" }}>
          {interactions.length} entries
        </span>
      </h2>

      {loading && interactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
          Loading logged interactions...
        </div>
      ) : interactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "14px" }}>
          No interactions logged yet. Describe an interaction in the AI Assistant or fill out the form above to log your first interaction.
        </div>
      ) : (
        <div className="history-grid">
          {interactions.map((item) => (
            <div key={item.id} className="history-card">
              <div className="history-card-header">
                <div>
                  <div className="history-hcp">{item.hcpName}</div>
                  <div className="history-meta">
                    <span>{item.interactionType}</span>
                    <span>•</span>
                    <span>{formatDate(item.date)} at {item.time}</span>
                  </div>
                </div>
                <span className={`sentiment-badge ${item.sentiment || "Neutral"}`}>
                  {item.sentiment || "Neutral"}
                </span>
              </div>

              <div className="history-body">
                {item.summary && (
                  <div className="history-field">
                    <div className="history-field-label">Summary / Notes</div>
                    <div>{item.summary}</div>
                  </div>
                )}

                {item.topics && (
                  <div className="history-field">
                    <div className="history-field-label">Topics Discussed</div>
                    <div style={{ fontStyle: "italic", color: "#475569" }}>"{item.topics}"</div>
                  </div>
                )}

                {item.product && (
                  <div className="history-field">
                    <div className="history-field-label">Materials & Samples</div>
                    <div>{item.product}</div>
                  </div>
                )}

                {item.outcomes && (
                  <div className="history-field">
                    <div className="history-field-label">Outcomes</div>
                    <div>{item.outcomes}</div>
                  </div>
                )}

                {item.followupActions && (
                  <div className="history-field">
                    <div className="history-field-label">Follow-up Actions</div>
                    <div style={{ color: "var(--primary)", fontWeight: "500" }}>{item.followupActions}</div>
                  </div>
                )}
              </div>

              <div className="history-card-footer">
                <span>ID: #{item.id}</span>
                {item.attendees && (
                  <span>Attendees: {item.attendees}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
