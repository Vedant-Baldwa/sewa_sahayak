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
