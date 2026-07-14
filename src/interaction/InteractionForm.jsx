import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  updateFormField,
  submitInteraction,
  setRecordingState,
  appendFollowupAction
} from "./interactionSlice";

// Mock data for search suggestions
const AVAILABLE_MATERIALS = [
  "OmcoBoost Brochure",
  "OmcoBoost Phase III Trial PDF",
  "Hypertension Drug Flyer",
  "Cardiology Insights Q3",
  "Patient Support Guide"
];

const AVAILABLE_SAMPLES = [
  "OmcoBoost 10mg Samples",
  "OmcoBoost 20mg Starter Pack",
  "CardioRx Starter Vial",
  "Hypertens 50mg Tablets"
];

export default function InteractionForm() {
  const dispatch = useDispatch();
  
  // Get state from Redux
  const formData = useSelector((state) => state.interaction.formData);
  const loading = useSelector((state) => state.interaction.loading);
  const isRecording = useSelector((state) => state.interaction.isRecording);
  const suggestedFollowups = useSelector((state) => state.interaction.suggestedFollowups);

  // Local state for searchable tags
  const [materialInput, setMaterialInput] = useState("");
  const [sampleInput, setSampleInput] = useState("");
  const [materialsList, setMaterialsList] = useState([]);
  const [samplesList, setSamplesList] = useState([]);
  
  // Enforce AI-First CRM Rule: manual edits disabled by default
  const [allowManualEdit, setAllowManualEdit] = useState(false);

  // Auto-set Date and Time if empty on mount
  useEffect(() => {
    if (!formData.date || !formData.time) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      
      if (!formData.date) {
        dispatch(updateFormField({ field: "date", value: `${yyyy}-${mm}-${dd}` }));
      }
      if (!formData.time) {
        dispatch(updateFormField({ field: "time", value: `${hh}:${min}` }));
      }
    }
  }, [dispatch, formData.date, formData.time]);

  // Sync materials/samples lists to formData.product field
  useEffect(() => {
    const combined = [
      ...materialsList.map(m => `[Material] ${m}`),
      ...samplesList.map(s => `[Sample] ${s}`)
    ].join("; ");
    dispatch(updateFormField({ field: "product", value: combined }));
  }, [materialsList, samplesList, dispatch]);

  // Sync state.formData.product back to materials/samples list (for AI auto-fill/edits)
  useEffect(() => {
    if (formData.product) {
      const items = formData.product.split(";").map(s => s.trim()).filter(Boolean);
      const mats = [];
      const samps = [];
      items.forEach(item => {
        if (item.startsWith("[Material]")) {
          mats.push(item.replace("[Material]", "").trim());
        } else if (item.startsWith("[Sample]")) {
          samps.push(item.replace("[Sample]", "").trim());
        } else if (item) {
          mats.push(item);
        }
      });
      
      // Update lists if they differ to avoid infinite loops
      if (JSON.stringify(mats) !== JSON.stringify(materialsList)) {
        setMaterialsList(mats);
      }
      if (JSON.stringify(samps) !== JSON.stringify(samplesList)) {
        setSamplesList(samps);
      }
    } else {
      if (materialsList.length > 0) setMaterialsList([]);
      if (samplesList.length > 0) setSamplesList([]);
    }
  }, [formData.product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch(updateFormField({ field: name, value }));
  };

  // Add material tag
  const handleAddMaterial = (e) => {
    e.preventDefault();
    const clean = materialInput.trim();
    if (clean && !materialsList.includes(clean)) {
      setMaterialsList([...materialsList, clean]);
      setMaterialInput("");
      toast.success(`Added material: ${clean}`);
    }
  };

  // Add sample tag
  const handleAddSample = (e) => {
    e.preventDefault();
    const clean = sampleInput.trim();
    if (clean && !samplesList.includes(clean)) {
      setSamplesList([...samplesList, clean]);
      setSampleInput("");
      toast.success(`Added sample: ${clean}`);
    }
  };

  // Remove tag
  const removeMaterial = (item) => {
    setMaterialsList(materialsList.filter(m => m !== item));
  };

  const removeSample = (item) => {
    setSamplesList(samplesList.filter(s => s !== item));
  };

  // Voice Note speech recognition
  const handleSpeechRecognition = (e) => {
    e.preventDefault();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      dispatch(setRecordingState(true));
      toast.success("Listening... Speak now!");
    };
    
    recognition.onend = () => {
      dispatch(setRecordingState(false));
    };
    
    recognition.onerror = () => {
      dispatch(setRecordingState(false));
      toast.error("Speech recognition failed or denied.");
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const currentTopics = formData.topics;
      const updatedTopics = currentTopics 
        ? `${currentTopics} ${transcript}` 
        : transcript;
      dispatch(updateFormField({ field: "topics", value: updatedTopics }));
      toast.success("Voice note transcribed successfully!");
    };
    
    recognition.start();
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hcpName.trim()) {
      toast.error("Please enter HCP Name");
      return;
    }

    try {
      await dispatch(submitInteraction(formData)).unwrap();
      toast.success("HCP Interaction logged successfully!");
      setMaterialsList([]);
      setSamplesList([]);
    } catch (err) {
      toast.error(`Failed to log interaction: ${err}`);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="card-title">📝 Interaction Details</h2>
      
      <form className="hcp-form" onSubmit={handleSubmit}>
        
        {/* Enforce AI-First CRM Rule Lock */}
        <div style={{
          gridColumn: "span 2",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: allowManualEdit ? "#fffbeb" : "#f8fafc",
          padding: "10px 14px",
          borderRadius: "8px",
          border: allowManualEdit ? "1px solid #fef3c7" : "1px solid #e2e8f0",
          marginBottom: "6px"
        }}>
          <input
            type="checkbox"
            id="allowManualEdit"
            checked={allowManualEdit}
            onChange={(e) => {
              setAllowManualEdit(e.target.checked);
              if (e.target.checked) {
                toast("Manual editing unlocked. Please use AI Assistant primarily!");
              } else {
                toast("Form locked. Fill or update using AI Assistant on the right!");
              }
            }}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label 
            htmlFor="allowManualEdit" 
            style={{ 
              textTransform: "none", 
              fontSize: "12.5px", 
              color: allowManualEdit ? "#b45309" : "#475569", 
              cursor: "pointer", 
              fontWeight: "600",
              margin: 0,
              letterSpacing: "normal"
            }}
          >
            {allowManualEdit 
              ? "⚠️ Manual Override Enabled (Click to Lock Form and Enforce AI Control)" 
              : "🔒 Form is Locked by Default (Utilize AI Assistant on the right to fill/edit)"}
          </label>
        </div>

        {/* HCP Name & Interaction Type */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hcpName">HCP Name</label>
            <input
              id="hcpName"
              name="hcpName"
              className="input-control"
              placeholder={allowManualEdit ? "Search or select HCP..." : "Populated by AI Assistant..."}
              value={formData.hcpName}
              onChange={handleChange}
              readOnly={!allowManualEdit}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="interactionType">Interaction Type</label>
            <select
              id="interactionType"
              name="interactionType"
              className="input-control"
              value={formData.interactionType}
              onChange={handleChange}
              disabled={!allowManualEdit}
            >
              <option value="Meeting">Meeting</option>
              <option value="Call">Call</option>
              <option value="Email">Email</option>
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              name="date"
              className="input-control"
              value={formData.date}
              onChange={handleChange}
              readOnly={!allowManualEdit}
            />
          </div>
          <div className="form-group">
            <label htmlFor="time">Time</label>
            <input
              id="time"
              type="time"
              name="time"
              className="input-control"
              value={formData.time}
              onChange={handleChange}
              readOnly={!allowManualEdit}
            />
          </div>
        </div>

        {/* Attendees */}
        <div className="form-group">
          <label htmlFor="attendees">Attendees</label>
          <input
            id="attendees"
            name="attendees"
            className="input-control"
            placeholder={allowManualEdit ? "Enter names..." : "Populated by AI..."}
            value={formData.attendees}
            onChange={handleChange}
            readOnly={!allowManualEdit}
          />
        </div>

        {/* Topics Discussed */}
        <div className="form-group">
          <label htmlFor="topics">Topics Discussed</label>
          <div className="textarea-wrapper">
            <textarea
              id="topics"
              name="topics"
              className="input-control textarea-control"
              placeholder={allowManualEdit ? "Enter key points..." : "Describe interaction to AI to populate..."}
              value={formData.topics}
              onChange={handleChange}
              readOnly={!allowManualEdit}
            />
            <button
              className={`mic-button-inline ${isRecording ? "recording" : ""}`}
              onClick={handleSpeechRecognition}
              title={isRecording ? "Stop recording" : "Record voice note"}
              disabled={!allowManualEdit}
            >
              🎙️
            </button>
          </div>
          <button 
            type="button" 
            className="btn-secondary-light"
            onClick={handleSpeechRecognition}
            style={{ marginTop: "4px" }}
            disabled={!allowManualEdit}
          >
            🗣️ Summarize from Voice Note (Requires Consent)
          </button>
        </div>

        {/* Materials Shared */}
        <div className="form-group">
          <label>Materials Shared / Samples Distributed</label>
          <div className="dynamic-tag-group" style={{ marginTop: "6px" }}>
            <div className="input-with-button">
              <input
                className="input-control"
                placeholder={allowManualEdit ? "Search or add materials..." : "Populated by AI..."}
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                list="materials-datalist"
                readOnly={!allowManualEdit}
              />
              <datalist id="materials-datalist">
                {AVAILABLE_MATERIALS.map(m => <option key={m} value={m} />)}
              </datalist>
              <button onClick={handleAddMaterial} disabled={!allowManualEdit}>🔍 Search/Add</button>
            </div>
            
            <div className="tags-container">
              {materialsList.map(item => (
                <span key={item} className="tag-pill">
                  📄 {item}
                  <button 
                    type="button" 
                    onClick={() => allowManualEdit && removeMaterial(item)}
                    disabled={!allowManualEdit}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Samples Distributed */}
        <div className="form-group">
          <div className="dynamic-tag-group">
            <div className="input-with-button">
              <input
                className="input-control"
                placeholder={allowManualEdit ? "Search or add samples..." : "Populated by AI..."}
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                list="samples-datalist"
                readOnly={!allowManualEdit}
              />
              <datalist id="samples-datalist">
                {AVAILABLE_SAMPLES.map(s => <option key={s} value={s} />)}
              </datalist>
              <button onClick={handleAddSample} disabled={!allowManualEdit}>💊 Add Sample</button>
            </div>
            
            <div className="tags-container">
              {samplesList.map(item => (
                <span key={item} className="tag-pill">
                  🧬 {item}
                  <button 
                    type="button" 
                    onClick={() => allowManualEdit && removeSample(item)}
                    disabled={!allowManualEdit}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Observed Sentiment */}
        <div className="form-group">
          <label>Observed/Inferred HCP Sentiment</label>
          <div className="sentiment-group">
            {["Positive", "Neutral", "Negative"].map((s) => (
              <label key={s} className="sentiment-label">
                <input
                  type="radio"
                  name="sentiment"
                  value={s}
                  checked={formData.sentiment === s}
                  onChange={handleChange}
                  disabled={!allowManualEdit}
                />
                <span className="sentiment-card">{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="form-group">
          <label htmlFor="outcomes">Outcomes</label>
          <textarea
            id="outcomes"
            name="outcomes"
            className="input-control"
            placeholder={allowManualEdit ? "Key outcomes..." : "Populated by AI..."}
            value={formData.outcomes}
            onChange={handleChange}
            readOnly={!allowManualEdit}
            style={{ minHeight: "60px" }}
          />
        </div>

        {/* Follow-up Actions */}
        <div className="form-group">
          <label htmlFor="followupActions">Follow-up Actions</label>
          <textarea
            id="followupActions"
            name="followupActions"
            className="input-control"
            placeholder={allowManualEdit ? "Enter next steps..." : "Populated by AI..."}
            value={formData.followupActions}
            onChange={handleChange}
            readOnly={!allowManualEdit}
            style={{ minHeight: "60px" }}
          />

          {/* AI Suggested Follow-ups Box */}
          {suggestedFollowups.length > 0 && (
            <div className="ai-suggestions-box">
              <div className="ai-suggestions-box-title">
                ✨ AI Suggested Follow-ups:
              </div>
              <div className="suggestions-list">
                {suggestedFollowups.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-item-btn"
                    onClick={() => {
                      dispatch(appendFollowupAction(suggestion));
                      toast.success("Added suggestion to follow-up actions!");
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Submit Interaction"}
          </button>
        </div>

      </form>
    </div>
  );
}
