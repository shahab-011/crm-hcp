from backend.database import SessionLocal
from backend.models import Interaction

def summarize_interactions_tool():
    db = SessionLocal()
    count = db.query(Interaction).count()
    positive = db.query(Interaction).filter(Interaction.sentiment == 'Positive').count()
    db.close()
    return f"Logged interactions: {count} total ({positive} positive sentiment)."
