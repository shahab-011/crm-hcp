from backend.llm.groq_client import call_llm

def compliance_check_tool(text: str):
    # Call LLM for real compliance analysis
    prompt = f"""
    You are an expert pharmaceutical compliance officer. 
    Analyze the following sales interaction description for compliance risks.
    Identify any potential issues such as:
    - Off-label marketing/promotion (promoting drugs for unapproved indications)
    - Inappropriate gifts, meals, or financial inducements (anti-kickback)
    - Minimizing side effects or safety risks
    - Making unsubstated claims
    
    Provide a very brief 1-sentence assessment. If no issue, reply exactly with: "No compliance issues detected."
    
    Description:
    "{text}"
    """
    try:
        response = call_llm(prompt)
        return response.strip()
    except Exception:
        # Fallback to local rule
        if "off-label" in text.lower() or "gift" in text.lower() or "bribe" in text.lower():
            return "⚠️ Potential compliance issue detected: Discussion mentions potential off-label promotion or inducements."
        return "No compliance issues detected."

