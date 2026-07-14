from typing import TypedDict, Optional, Any

class AgentState(TypedDict):
    user_input: str
    current_form: Optional[Any]
    intent: Optional[str]
    result: Optional[Any]
