import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// --- Async Thunks ---

// Fetch logged interactions
export const fetchInteractions = createAsyncThunk(
  "interaction/fetchInteractions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/interactions`);
      if (!response.ok) {
        throw new Error("Failed to fetch interactions");
      }
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Submit manual form interaction
export const submitInteraction = createAsyncThunk(
  "interaction/submitInteraction",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error("Failed to save interaction");
      }
      const data = await response.json();
      return data.data; // returns saved interaction object
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Send message to AI Assistant
export const sendChatMessage = createAsyncThunk(
  "interaction/sendChatMessage",
  async ({ message, current_form }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/interaction/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, current_form }),
      });
      if (!response.ok) {
        throw new Error("Failed to send message to AI");
      }
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialFormState = {
  hcpName: "",
  interactionType: "Meeting",
  date: "",
  time: "",
  attendees: "",
  topics: "",
  product: "",
  summary: "",
  sentiment: "Neutral",
  outcomes: "",
  followupActions: "",
};

const initialState = {
  formData: initialFormState,
  interactions: [],
  messages: [
    {
      role: "assistant",
      content: "Log interaction details here (e.g. 'Met Dr. Smith today about OmcoBoost, neutral sentiment, follow-up in 2 weeks') or ask me to check compliance / summarize.",
    },
  ],
  suggestedFollowups: [],
  loading: false,
  chatLoading: false,
  error: null,
  isRecording: false,
};

const interactionSlice = createSlice({
  name: "interaction",
  initialState,
  reducers: {
    updateFormField(state, action) {
      const { field, value } = action.payload;
      state.formData[field] = value;
    },
    setFormData(state, action) {
      state.formData = { ...state.formData, ...action.payload };
    },
    clearForm(state) {
      state.formData = initialFormState;
      state.suggestedFollowups = [];
    },
    setRecordingState(state, action) {
      state.isRecording = action.payload;
    },
    addChatMessage(state, action) {
      state.messages.push(action.payload);
    },
    addSuggestedFollowup(state, action) {
      if (!state.suggestedFollowups.includes(action.payload)) {
        state.suggestedFollowups.push(action.payload);
      }
    },
    appendFollowupAction(state, action) {
      const current = state.formData.followupActions;
      state.formData.followupActions = current
        ? `${current}; ${action.payload}`
        : action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch interactions
      .addCase(fetchInteractions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Submit interaction
      .addCase(submitInteraction.pending, (state) => {
        state.loading = true;
      })
      .addCase(submitInteraction.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions.unshift(action.payload);
        state.formData = initialFormState;
        state.suggestedFollowups = [];
      })
      .addCase(submitInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // AI Chat Message
      .addCase(sendChatMessage.pending, (state) => {
        state.chatLoading = true;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatLoading = false;
        const { intent, message, extracted_data } = action.payload;
        
        // Add bot message to chat
        state.messages.push({
          role: "assistant",
          content: message,
        });

        // If intent is log or edit, auto-fill form and set suggested follow-ups
        if ((intent === "log" || intent === "edit") && extracted_data) {
          state.formData = {
            ...state.formData,
            hcpName: extracted_data.hcpName || state.formData.hcpName,
            interactionType: extracted_data.interactionType || state.formData.interactionType,
            date: extracted_data.date || state.formData.date,
            time: extracted_data.time || state.formData.time,
            attendees: extracted_data.attendees || state.formData.attendees,
            topics: extracted_data.topics || state.formData.topics,
            product: extracted_data.product || state.formData.product,
            summary: extracted_data.summary || state.formData.summary,
            sentiment: extracted_data.sentiment || state.formData.sentiment,
            outcomes: extracted_data.outcomes || state.formData.outcomes,
            followupActions: extracted_data.followupActions || state.formData.followupActions,
          };

          // Parse suggested follow-ups
          if (extracted_data.followupActions) {
            const list = extracted_data.followupActions
              .split(";")
              .map((s) => s.trim())
              .filter(Boolean);
            state.suggestedFollowups = list;
          }
        }
        
        // If intent is followup, parse suggested followups as well
        if (intent === "followup") {
          const rawSuggestions = action.payload.message.replace("🤖 Follow-up Actions Recommended:\n\n", "");
          const list = rawSuggestions
            .split(";")
            .map((s) => s.trim().replace(/^•\s*/, "").replace(/^-\s*/, ""))
            .filter(Boolean);
          state.suggestedFollowups = list;
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.chatLoading = false;
        state.messages.push({
          role: "assistant",
          content: `⚠️ Sorry, I encountered an error: ${action.payload}`,
        });
      });
  },
});

export const {
  updateFormField,
  setFormData,
  clearForm,
  setRecordingState,
  addChatMessage,
  addSuggestedFollowup,
  appendFollowupAction,
} = interactionSlice.actions;

export default interactionSlice.reducer;
