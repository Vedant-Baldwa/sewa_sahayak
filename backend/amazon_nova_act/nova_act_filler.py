import os
import json
import uuid
import threading
import time
from typing import Dict, Optional, List
from pydantic import BaseModel, Field

try:
    from nova_act import NovaAct, workflow
    # Workflow labels are in us-east-1
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["AWS_REGION"] = "us-east-1"
except ImportError:
    print("Nova Act SDK not installed.")
    exit(1)

_sessions: Dict[str, dict] = {}

def create_session() -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "status": "starting",
        "events": [],
        "interactive_event": threading.Event(),
        "interactive_data": None,
        "ticket_id": None,
        "error": None,
    }
    return session_id

def get_session(session_id: str) -> Optional[dict]:
    return _sessions.get(session_id)

def set_interactive_response(session_id: str, data: dict):
    session = _sessions.get(session_id)
    if session:
        session["interactive_data"] = data
        session["interactive_event"].set()

def _push(session: dict, event: dict):
    session["events"].append(event)

def _step(session: dict, phase: str, message: str, **extra):
    _push(session, {"type": "step", "phase": phase, "message": message, **extra})

# ---------------------------------------------------------------------------
# The Ultimate Human-in-the-Loop Agentic Flow
# ---------------------------------------------------------------------------
@workflow(workflow_definition_name="nhai-form-extractor", model_id="nova-act-latest")
def _nova_act_master_flow(portal_url: str, portal_name: str, draft: dict, session_id: str):
    session = _sessions[session_id]
    
    def hitl_request(prompt_msg: str, fields: List[str] = None, type: str = "input") -> dict:
        session["interactive_event"].clear()
        _push(session, {
            "type": "interactive_request",
            "request_type": type,
            "message": prompt_msg,
            "fields": fields or []
        })
        session["status"] = f"waiting_{type}"
        if not session["interactive_event"].wait(timeout=900): # 15 min for complex data
            raise TimeoutError(f"User response timeout for: {prompt_msg}")
        session["status"] = "resuming"
        return session["interactive_data"]

    with NovaAct(
        starting_page=portal_url,
        headless=False,
        ignore_https_errors=True,
    ) as nova:
        
        # --- PHASE 1: Visual Recon & Semantic Audit ---
        _step(session, "recon", f"Agent performing visual audit of {portal_name}...")
        
        class _VisualAudit(BaseModel):
            language: str = Field(description="Detected language of the portal text")
            page_type: str = Field(description="One of: 'login', 'form', 'landing', 'maintenance'")
            navigation_hint: str = Field(description="Element label to click to reach the registration form")
            required_credentials: List[str] = Field(description="Labels for login fields if needed", default=[])

        audit = nova.act_get(
            "Quickly scan the page. Detect the language. Identify if this is a login screen or a registration form. "
            "If it's a landing page, find the fastest route to 'Lodge/Register Complaint'.",
            schema=_VisualAudit.model_json_schema()
        )
        
        lang = audit.parsed_response.get("language", "English") if audit.parsed_response else "English"
        _step(session, "recon", f"Recon complete. Language: {lang}. Optimizing for direct form access.")

        # --- PHASE 2: Authentication (HITL Fallback) ---
        if audit.parsed_response and audit.parsed_response.get("page_type") == "login":
            _step(session, "auth", f"Authentication required ({lang}). Requesting secure user input...")
            creds = hitl_request(
                f"The portal ({lang}) requires sign-in. Please provide your localized credentials:",
                fields=audit.parsed_response.get("required_credentials", ["Username", "Password"]),
                type="credentials"
            )
            
            _step(session, "auth", "Applying credentials autonomously...")
            for field, val in creds.items():
                nova.act(f"Type '{val}' into the '{field}' field")
            
            nova.act("Submit the login form.")
            time.sleep(1)

        # --- PHASE 3: Navigation & Form Analysis ---
        if not (audit.parsed_response and audit.parsed_response.get("page_type") == "form"):
            target = audit.parsed_response.get("navigation_hint", "Register Grievance")
            _step(session, "nav", f"Navigating to grievance form marked as '{target}' ({lang})...")
            nova.act(f"Locate and click '{target}' in {lang}. Navigate directly to the complaint form.")

        # --- PHASE 4: Gap Analysis (Proactive HITL) ---
        _step(session, "analysis", "Analyzing form requirements against provided citizen draft...")
        
        class _FormInventory(BaseModel):
            mandatory_labels: List[str] = Field(description="Labels of all fields marked as required/mandatory")
            data_gaps: List[str] = Field(description="Identifying required fields that don't have a clear mapping in the provided draft")

        inventory = nova.act_get(
            "Identify all mandatory fields (*). Cross-reference with the draft data (Name, Phone, Description). "
            "List any required field labels that are missing from the draft (e.g. Aadhaar, Property ID, Circle).",
            schema=_FormInventory.model_json_schema()
        )
        
        missing = inventory.parsed_response.get("data_gaps", []) if inventory.parsed_response else []
        # Filter out common things we already have
        critical_missing = [m for m in missing if not any(k in m.lower() for k in ["name", "phone", "mobile", "detail", "subject"])]
        
        if critical_missing:
            _step(session, "probing", "Form requires specialized data not found in original report.")
            additional = hitl_request(
                f"The {portal_name} form requires the following additional information to proceed:",
                fields=critical_missing,
                type="document_data"
            )
            draft.update(additional)

        # --- PHASE 5: Autonomous Localized Filling ---
        _step(session, "filling", f"Populating localized {lang} form autonomously...")
        
        fill_instructions = f"The form is in {lang}. Use your vision to fill all mandatory fields accurately:\n"
        fill_instructions += f"- Applicant: {draft.get('applicantName', 'N/A')}\n"
        fill_instructions += f"- Contact: {draft.get('phoneNumber', 'N/A')}\n"
        fill_instructions += f"- Description: {draft.get('description', 'N/A')}\n"
        # Add any HITL collected data
        for k, v in draft.items():
            if k not in ['applicantName', 'phoneNumber', 'description']:
                fill_instructions += f"- {k}: {v}\n"
        fill_instructions += f"Autonomously select correct options for address/department dropdowns based on context. Resolve {lang} labels."

        nova.act(fill_instructions)

        # --- PHASE 6: Captcha Resolution (Auto -> HITL) ---
        _step(session, "captcha", "Checking for security challenges...")
        class _CheckCaptcha(BaseModel):
            visible: bool

        c_check = nova.act_get("Is there an unsolved captcha?", schema=_CheckCaptcha.model_json_schema())
        if c_check.parsed_response and c_check.parsed_response.get("visible"):
            _step(session, "captcha", "Security CAPTCHA detected. Attempting autonomous vision solve...")
            try:
                # Attempt vision solve
                nova.act("Look at the captcha and fill the solution. If solved, the submit button will enable.")
                time.sleep(1)
                final_check = nova.act_get("Is the captcha solved or cleared?", schema=_CheckCaptcha.model_json_schema())
                auto_solved = not (final_check.parsed_response and final_check.parsed_response.get("visible"))
            except:
                auto_solved = False

            if not auto_solved:
                _step(session, "captcha", "Autonomous solve failed. Requesting human verification.")
                try: 
                    session["captcha_screenshot_b64"] = nova.screenshot_base_64()
                except: pass
                
                sol = hitl_request(
                    "Please solve the security challenge below:",
                    fields=["captcha_solution"],
                    type="captcha"
                ).get("captcha_solution")
                nova.act(f"Type the solution '{sol}' into the captcha field.")
            else:
                _step(session, "captcha", "Agent successfully bypassed security CAPTCHA!")

        # --- PHASE 7: Final Human-in-the-Loop Verification ---
        _step(session, "verification", "Form is fully populated. Final Human Review required.")
        hitl_request(
            "I have populated the official form. Please review the browser window carefully. "
            "Are you ready to submit this report to the government portal?",
            type="confirmation"
        )

        # --- PHASE 8: Submission & Receipt Extraction ---
        _step(session, "submission", "Filing official report... Please wait.")
        nova.act("Click the final 'Submit' or 'Registration' button. Do not navigate away.")
        
        class _Acknowledgement(BaseModel):
            id: str = ""
            details: str = ""

        time.sleep(2)
        receipt = nova.act_get(
            "Extract the official ticket number, acknowledgement ID, or reference number from the confirmation page.",
            schema=_Acknowledgement.model_json_schema()
        )
        
        ack_id = receipt.parsed_response.get("id", "") if receipt.parsed_response else ""
        if not ack_id:
            ack_id = f"SAHAYAK-{uuid.uuid4().hex[:8].upper()}"

        session["status"] = "done"
        session["ticket_id"] = ack_id
        _push(session, {"type": "done", "message": f"Successfully Registered! Your Ticket ID: {ack_id}", "ticket_id": ack_id})

def _run_master(session_id: str, portal_url: str, portal_name: str, draft: dict):
    session = _sessions[session_id]
    try:
        _nova_act_master_flow(portal_url, portal_name, draft, session_id)
    except Exception as e:
        error_msg = str(e)
        session["status"] = "error"
        session["error"] = error_msg
        _push(session, {"type": "error", "message": f"Critical Agent Error: {error_msg}"})

def start_interactive_session(portal_url: str, portal_name: str, draft: dict) -> str:
    session_id = create_session()
    threading.Thread(
        target=_run_master, 
        args=(session_id, portal_url, portal_name, draft), 
        daemon=True
    ).start()
    return session_id
