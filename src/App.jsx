import InteractionForm from "./interaction/InteractionForm";
import ChatAssistant from "./interaction/ChatAssistant";
import InteractionList from "./interaction/InteractionList";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="app-header-left">
          <h1>🔬 AI-First CRM — HCP Interaction</h1>
          <p>Sales representative dashboard for logging and analyzing medical conversations</p>
        </div>
      </header>

      {/* Main Grid: Form + Chat Sidebar */}
      <main className="dashboard-grid">
        <InteractionForm />
        <ChatAssistant />
      </main>

      {/* History Log */}
      <InteractionList />
    </div>
  );
}

export default App;

