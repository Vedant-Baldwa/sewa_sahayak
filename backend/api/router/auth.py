import time
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from core.config import Config, users_table

router = APIRouter(tags=["Authentication"])
oauth = OAuth()
oauth.register(
    name='cognito',
    client_id=Config.COGNITO_CLIENT_ID,
    client_secret=Config.COGNITO_CLIENT_SECRET,
    server_metadata_url=f"https://cognito-idp.{Config.AWS_REGION}.amazonaws.com/{Config.COGNITO_USER_POOL_ID}/.well-known/openid-configuration",
    client_kwargs={'scope': 'email openid phone'}
)

@router.get("/login")
async def login(request: Request):
    redirect_uri = f"{Config.BACKEND_URL}/authorize"
    return await oauth.cognito.authorize_redirect(request, redirect_uri)

@router.get("/authorize")
async def authorize(request: Request):
    try:
        token = await oauth.cognito.authorize_access_token(request)
        user = token.get('userinfo')
        if user:
            request.session['user'] = user
            # User DB logic
            uid = user.get('sub')
            if users_table:
                try:
                    res = users_table.get_item(Key={'userId': uid})
                    if not res.get('Item'):
                        users_table.put_item(Item={'userId': uid, 'email': user.get('email'), 'createdAt': str(int(time.time()))})
                except: pass
            return RedirectResponse(url=f"{Config.FRONTEND_URL}/")
    except:
        return RedirectResponse(url=f"{Config.FRONTEND_URL}/")

@router.get("/api/auth/me")
async def get_me(request: Request):
    user = request.session.get('user')
    if not user: raise HTTPException(status_code=401)
    return {"user": user}

@router.post("/api/auth/logout")
async def logout(request: Request):
    request.session.pop('user', None)
    return {"message": "Logged out"}
