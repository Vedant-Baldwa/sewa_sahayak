from pydantic import BaseModel
from typing import List, Optional

class DraftRequest(BaseModel):
    analysis: Optional[dict] = None
    transcription: Optional[dict] = None
    locationData: Optional[dict] = None
    jurisdiction: Optional[dict] = None
    form_schema: Optional[dict] = {}

class RouteRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None

class AgenticStartRequest(BaseModel):
    draft: dict
    form_schema: dict = {}
    portal_url: str = ""
    portal_name: str = ""

class CaptchaSolutionRequest(BaseModel):
    solution: str

class ComplaintFormField(BaseModel):
    field_name: str
    field_type: str
    is_mandatory: bool
    options: Optional[List[str]] = None

class ComplaintFormSchema(BaseModel):
    portal_url: str
    portal_name: str
    fields: List[ComplaintFormField]

class ReportCreate(BaseModel):
    ticketId: str
    timestamp: int
    jurisdiction: Optional[str] = None
    damageType: Optional[str] = None
    severity: Optional[str] = None
    status: str = "SUBMITTED"
    captureId: Optional[str] = None
    userId: Optional[str] = None
    description: Optional[str] = None
    lat: Optional[str] = None
    lng: Optional[str] = None

