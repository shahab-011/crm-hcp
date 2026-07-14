import json
from backend.database import SessionLocal
from backend.models import Interaction
from backend.llm.groq_client import call_llm

def summarize_interactions_tool():
    db = SessionLocal()
    interactions = db.query(Interaction).all()
    db.close()

    if not interactions:
        return "It looks like you haven't logged any interactions yet. Go ahead and log your first meeting using the AI Assistant, and I'll be happy to summarize your activities!"

    data_list = []
    for item in interactions:
        data_list.append({
            "hcpName": item.hcpName,
            "interactionType": item.interactionType,
            "date": item.date,
            "product": item.product,
            "sentiment": item.sentiment,
            "summary": item.summary
        })

    prompt = f"""
    You are a warm, supportive AI sales assistant for a pharmaceutical sales representative.
    Here is a list of recent HCP interactions logged in the database:
    {json.dumps(data_list, indent=2)}
    
    Generate a natural, human-like summary of these activities. 
    Summarize key trends, mention specific doctors and their sentiments, and highlight products discussed. Keep the tone warm, encouraging, and professional. Limit to 3-4 sentences.
    """

    try:
        response = call_llm(prompt)
        return response.strip()
    except Exception as e:
        count = len(interactions)
        positive = sum(1 for item in interactions if item.sentiment == 'Positive')
        return f"I gathered your interaction log! You have logged {count} total interactions so far, with {positive} positive sentiment visits. It's looking great, keep it up!"

