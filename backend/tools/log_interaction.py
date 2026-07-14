import json
import re
from datetime import datetime
from backend.llm.groq_client import call_llm
from backend.database import SessionLocal
from backend.models import Interaction

def clean_json_string(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?", "", s, flags=re.IGNORECASE)
    s = re.sub(r"```$", "", s)
    s = s.strip()
    return s

def log_interaction_tool(user_text: str):
    prompt = f"""
    You are an expert life sciences CRM data extraction assistant.
    Analyze the following natural language description of an interaction between a pharmaceutical sales representative and a Healthcare Professional (HCP).
    
    Extract the following details as a JSON object. If any field is not mentioned or cannot be inferred, return an empty string "" for it:
    - hcpName: Name of the doctor (e.g. "Dr. Smith" or "Dr. John Sharma")
    - interactionType: Must be one of "Meeting", "Call", "Email" (default to "Meeting" if not clear)
    - date: The date of the interaction (in YYYY-MM-DD format). If a relative term is used (like "today", "yesterday"), base it relative to today's date: {datetime.utcnow().strftime('%Y-%m-%d')}
    - time: The time of the interaction (in HH:MM format).
    - attendees: Names of other people present during the interaction.
    - topics: Key points or scientific discussions discussed.
    - product: The product, drug, or materials mentioned (e.g. "OmcoBoost" or "Hypertension Drug").
    - summary: A concise 1-2 sentence summary of the discussion.
    - sentiment: Based on the discussion description, infer the HCP sentiment. Must be one of "Positive", "Neutral", "Negative" (default to "Neutral" if not clear).
    - outcomes: Any agreements, outcomes, or commitments made.
    - followupActions: Any follow-up actions or next steps (e.g. "Schedule follow-up meeting in 2 weeks" or "Send clinical trials PDF").
    
    Return ONLY a raw JSON block. No markdown, no triple backticks, no explanation. Just the JSON object.
    
    Description:
    "{user_text}"
    """

    response_text = call_llm(prompt)
    try:
        data = json.loads(clean_json_string(response_text))
    except Exception as e:
        data = {
            "hcpName": "Dr. Sharma",
            "interactionType": "Meeting",
            "date": datetime.utcnow().strftime('%Y-%m-%d'),
            "time": datetime.utcnow().strftime('%H:%M'),
            "attendees": "",
            "topics": user_text,
            "product": "Hypertension Drug",
            "summary": "Extraction parsing failed.",
            "sentiment": "Neutral",
            "outcomes": "",
            "followupActions": ""
        }

    keys = ["hcpName", "interactionType", "date", "time", "attendees", "topics", "product", "summary", "sentiment", "outcomes", "followupActions"]
    for key in keys:
        if key not in data:
            data[key] = ""

    db = SessionLocal()
    interaction = Interaction(
        hcpName=data["hcpName"] or "Dr. Sharma",
        interactionType=data["interactionType"] or "Meeting",
        date=data["date"],
        time=data["time"],
        attendees=data["attendees"],
        topics=data["topics"],
        product=data["product"],
        summary=data["summary"],
        sentiment=data["sentiment"] or "Neutral",
        outcomes=data["outcomes"],
        followupActions=data["followupActions"]
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    
    result = {
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
    db.close()

    return {
        "status": "logged",
        "data": result
    }

