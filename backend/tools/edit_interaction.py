import json
import re
from backend.llm.groq_client import call_llm

def clean_json_string(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```(?:json)?", "", s, flags=re.IGNORECASE)
    s = re.sub(r"```$", "", s)
    s = s.strip()
    return s

def edit_interaction_tool(user_text: str, current_form: dict):
    if not current_form:
        current_form = {}

    prompt = f"""
    You are an expert pharmaceutical CRM data editor.
    You are given the current form state of an HCP interaction as a JSON object, and a correction message from the sales representative.
    
    Current Form State:
    {json.dumps(current_form, indent=2)}
    
    Correction Message:
    "{user_text}"
    
    Apply the requested changes to the form state. Only update the fields that are explicitly corrected or modified in the correction message. Keep all other fields exactly the same.
    Do NOT change keys. The keys must remain: hcpName, interactionType, date, time, attendees, topics, product, summary, sentiment, outcomes, followupActions.
    If the name is changed, update hcpName. If the sentiment is changed, update sentiment (must be Positive, Neutral, or Negative).
    
    Return the updated form state as a single JSON object containing all the same keys. Return ONLY a raw JSON block. No markdown, no triple backticks, no extra text.
    """

    response_text = call_llm(prompt)
    try:
        updated_data = json.loads(clean_json_string(response_text))
    except Exception as e:
        updated_data = current_form

    # Ensure all keys from current_form exist in updated_data
    for key in current_form:
        if key not in updated_data:
            updated_data[key] = current_form[key]

    return {
        "status": "updated",
        "data": updated_data
    }

