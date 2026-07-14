from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from backend.database import Base

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcpName = Column(String, nullable=False)
    interactionType = Column(String)
    date = Column(String)
    time = Column(String)
    attendees = Column(String)
    topics = Column(String)
    product = Column(String)
    summary = Column(String)
    sentiment = Column(String)
    outcomes = Column(String)
    followupActions = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

