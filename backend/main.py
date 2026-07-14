from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from backend.database import SessionLocal, engine, Base
from backend.models import Interaction as DBInteraction
from backend.agent.graph import agent

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-First CRM – HCP Interaction Module",
    description="FastAPI + LangGraph backend supporting manual logging, compliance, summaries, and AI auto-fill",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- REQUEST & RESPONSE SCHEMAS ----
class InteractionCreate(BaseModel):
    hcpName: str
    interactionType: str
    date: str
    time: str
    attendees: str
    topics: str
    product: str
    summary: str
    sentiment: Optional[str] = "Neutral"
    outcomes: Optional[str] = ""
    followupActions: Optional[str] = ""

class ChatInput(BaseModel):
    message: str

# ---- DB HELPER ----
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- ENDPOINTS ----

@app.get("/")
def health_check():
    return {"status": "API is running", "db_connected": True}

@app.get("/interactions")
def get_interactions():
    db = SessionLocal()
    try:
        items = db.query(DBInteraction).order_by(DBInteraction.id.desc()).all()
        result = []
        for item in items:
            result.append({
                "id": item.id,
                "hcpName": item.hcpName,
                "interactionType": item.interactionType,
                "date": item.date,
                "time": item.time,
                "attendees": item.attendees,
                "topics": item.topics,
                "product": item.product,
                "summary": item.summary,
                "sentiment": item.sentiment,
                "outcomes": item.outcomes,
                "followupActions": item.followupActions
            })
        return result
    finally:
        db.close()

@app.post("/interactions")
def create_interaction(data: InteractionCreate):
    db = SessionLocal()
    try:
        interaction = DBInteraction(
            hcpName=data.hcpName,
            interactionType=data.interactionType,
            date=data.date,
            time=data.time,
            attendees=data.attendees,
            topics=data.topics,
            product=data.product,
            summary=data.summary,
            sentiment=data.sentiment or "Neutral",
            outcomes=data.outcomes or "",
            followupActions=data.followupActions or ""
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        
        return {
            "success": True,
            "data": {
                "id": interaction.id,
                "hcpName": interaction.hcpName,
                "interactionType": interaction.interactionType,
                "date": interaction.date,
                "time": interaction.time,
                "attendees": interaction.attendees,
                "topics": interaction.topics,
                "product": interaction.product,
                "summary": interaction.summary,
                "sentiment": interaction.sentiment,
                "outcomes": interaction.outcomes,
                "followupActions": interaction.followupActions
            }
        }
    finally:
        db.close()

@app.post("/interaction/chat")
def chat_interaction(data: ChatInput):
    user_input = data.message.strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="Empty message")

    try:
        # Invoke LangGraph agent
        result = agent.invoke({"user_input": user_input})
        intent = result.get("intent", "log")
        agent_result = result.get("result", {})

        if intent == "log":
            # agent_result contains {"status": "logged", "data": {...}}
            log_data = agent_result.get("data", {})
            hcp = log_data.get("hcpName", "Doctor")
            prod = log_data.get("product", "product")
            sentiment = log_data.get("sentiment", "Neutral")
            followup = log_data.get("followupActions", "")

            # Formulate friendly feedback
            bot_message = f"🤖 AI parsed and logged interaction details!\n\n" \
                          f"• HCP: {hcp}\n" \
                          f"• Product: {prod}\n" \
                          f"• Sentiment: {sentiment}\n" \
                          f"• Summary: {log_data.get('summary', '')}"
            if followup:
                bot_message += f"\n• Suggested Follow-up: {followup}"

            return {
                "intent": "log",
                "message": bot_message,
                "extracted_data": log_data
            }
            
        elif intent == "compliance":
            return {
                "intent": "compliance",
                "message": f"🤖 Compliance Check Assessment:\n\n{agent_result}"
            }
            
        elif intent == "summary":
            return {
                "intent": "summary",
                "message": f"🤖 Interactions Summary:\n\n{agent_result}"
            }
            
        elif intent == "followup":
            return {
                "intent": "followup",
                "message": f"🤖 Follow-up Actions Recommended:\n\n{agent_result}"
            }
            
        else: # e.g. edit or other
            msg = agent_result.get("status", "processed") if isinstance(agent_result, dict) else str(agent_result)
            return {
                "intent": intent,
                "message": f"🤖 Agent Action ({intent}): {msg}"
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Agent invocation failed: {str(e)}")
