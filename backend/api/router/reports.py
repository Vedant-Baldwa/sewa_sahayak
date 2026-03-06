from fastapi import APIRouter, HTTPException, Request
from api.schemas import ReportCreate
from core.config import reports_table

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.post("/save")
async def save_report(data: ReportCreate, request: Request):
    try:
        item = data.dict()
        # Ensure lat/lng are strings for DynamoDB index if needed
        if item.get('lat'): item['lat'] = str(item['lat'])
        if item.get('lng'): item['lng'] = str(item['lng'])
        
        # Link to user session if available
        user_session = request.session.get('user')
        if user_session:
            item['userId'] = user_session.get('email')

        reports_table.put_item(Item=item)
        return {"message": "Report saved encrypted at rest", "ticketId": item.get("ticketId")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from api.schemas import DraftCreate
from boto3.dynamodb.conditions import Key, Attr

@router.post("/drafts")
async def save_draft(data: DraftCreate, request: Request):
    try:
        user_session = request.session.get('user')
        if not user_session:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        item = data.dict()
        item['userId'] = user_session.get('email', 'unknown_user')
        # We need a primary key for DynamoDB. 
        # By convention in tickets/reports, we might use ticketId as PK. 
        # Using CaptureId or a generated draftId as PK to fit schema
        if not item.get('ticketId') and item.get('id'):
            item['ticketId'] = f"DRAFT-{item['id']}"  # Use DRAFT prefix for PK
            
        reports_table.put_item(Item=item)
        return {"message": "Draft saved successfully", "draftId": item.get("ticketId")}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error saving draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drafts")
async def get_drafts(request: Request):
    try:
        user_session = request.session.get('user')
        if not user_session:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        user_email = user_session.get('email')
        
        # Scan for drafts belonging to the user
        # Note: A GSI on userId would be more optimal, but we use scan here with a filter
        # since it's a DRAFT status specifically
        response = reports_table.scan(
            FilterExpression=Attr('userId').eq(user_email) & Attr('status').eq('DRAFT')
        )
        items = response.get('Items', [])
        return {"drafts": items}
    except Exception as e:
        print(f"Error getting drafts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
