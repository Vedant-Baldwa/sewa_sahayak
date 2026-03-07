from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import json
import asyncio
from api.schemas import AgenticStartRequest
from amazon_nova_act.nova_act_filler import (
    get_session, 
    set_interactive_response, 
    start_interactive_session
)

router = APIRouter(prefix="/api/agentic", tags=["Agentic Submission"])

@router.post("/start")
async def agentic_start(req: AgenticStartRequest):
    portal_url = req.portal_url or req.draft.get("portal_url")
    portal_name = req.portal_name or req.draft.get("portal_name", "Portal")
    
    if not portal_url:
        raise HTTPException(status_code=400, detail="portal_url missing")

    # Start the interactive session
    session_id = start_interactive_session(portal_url, portal_name, req.draft)
    
    return {
        "session_id": session_id,
        "status": "started",
        "portal_name": portal_name,
    }

@router.get("/{session_id}/status")
async def agentic_status(session_id: str):
    session = get_session(session_id)
    if not session: 
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_stream():
        last_idx = 0
        while True:
            s = get_session(session_id)
            if not s: break
            while last_idx < len(s["events"]):
                yield f"data: {json.dumps(s['events'][last_idx])}\n\n"
                last_idx += 1
            if s["status"] in ("done", "error"): break
            await asyncio.sleep(0.5)

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.post("/{session_id}/respond")
async def agentic_respond(session_id: str, request: Request):
    """
    Generic endpoint to respond to any interactive request from the agent.
    Includes CAPTCHA solutions, credentials, or confirmations.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session["status"].startswith("waiting_"):
        raise HTTPException(status_code=400, detail="Agent is not waiting for input")
    
    data = await request.json()
    set_interactive_response(session_id, data)
    return {"message": "Response accepted"}

@router.post("/{session_id}/captcha")
async def legacy_captcha(session_id: str, req: Request):
    # Maintain compatibility for existing frontend calls if necessary, 
    # but route to the new respond endpoint logic
    data = await req.json()
    # If the frontend sends { solution: "..." }, transform it to the expected format
    if "solution" in data and "captcha_solution" not in data:
        data = {"captcha_solution": data["solution"]}
    
    set_interactive_response(session_id, data)
    return {"message": "Accepted"}
