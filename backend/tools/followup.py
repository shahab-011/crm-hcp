from backend.llm.groq_client import call_llm

def followup_recommendation_tool(text: str = ""):
    if not text:
        return "Recommended follow-up in 2 weeks with product samples."
        
    prompt = f"""
    You are a life sciences sales CRM assistant.
    Based on the following description of a sales meeting with a doctor, suggest 2-3 specific, actionable follow-up tasks for the sales representative (e.g. scheduling follow-up meetings, sending clinical brochures, adding to mailing lists, or providing specific drug samples).
    
    Return a list of suggestions separated by semi-colons (;) on a single line. Do not include numbered lists or introductory text.
    Example: Schedule follow-up meeting in 2 weeks; Send OmcoBoost Phase III clinical results PDF; Add doctor to advisory board invite list
    
    Description:
    "{text}"
    """
    try:
        response = call_llm(prompt)
        return response.strip()
    except Exception:
        return "Schedule follow-up meeting in 2 weeks; Provide product brochures; Send drug samples."

