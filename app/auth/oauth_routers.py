"""
OAuth роутеры для аутентификации через внешние провайдеры.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db_depends import get_db
from app.auth.oauth_utils import (
    generate_state, generate_oauth_url, exchange_code_for_token,
    get_user_info, get_or_create_oauth_user, create_oauth_tokens
)
from app.auth.utils import get_token_expiry
from app.auth.rate_limiter import get_rate_limiter, RateLimiter
from datetime import datetime
from urllib.parse import urlparse
import logging
import json

from app.config.settings import settings

logger = logging.getLogger(__name__)

oauth_router = APIRouter()

@oauth_router.get("/auth/google/", name="google_login")
async def google_login(
    request: Request,
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """Инициация входа через Google."""
    client_ip = request.client.host
    
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )
    
    # Считываем режим (popup или redirect)
    mode = request.query_params.get("mode", "redirect")
    
    # Генерируем состояние для защиты от CSRF
    state = generate_state()
    
    # Сохраняем state в сессии
    request.session["oauth_state"] = state
    request.session["oauth_ip"] = client_ip
    request.session["oauth_timestamp"] = datetime.now().isoformat()
    request.session["oauth_mode"] = mode
    
    # Генерируем URL для редиректа на Google
    auth_url = generate_oauth_url("google", state)
    
    return RedirectResponse(url=auth_url)


@oauth_router.get("/auth/google/callback/", name="google_callback")
async def google_callback(
    request: Request,
    code: str = None,
    state: str = None,
    error: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Обработка callback от Google OAuth."""
    
    if error:
        logger.error(f"[ERROR] Google OAuth error: {error}")
        raise HTTPException(
            status_code=400,
            detail=f"OAuth authorization failed: {error}"
        )
    
    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="Missing authorization code or state"
        )
    
    # Проверяем состояние из сессии
    session_state = request.session.get("oauth_state")
    if not session_state or session_state != state:
        logger.error(f"[ERROR] Invalid state: session={session_state}, received={state}")
        raise HTTPException(
            status_code=400,
            detail="Invalid state parameter"
        )
    
    # Удаляем использованное состояние из сессии
    request.session.pop("oauth_state", None)
    request.session.pop("oauth_ip", None)
    request.session.pop("oauth_timestamp", None)
    oauth_mode = request.session.pop("oauth_mode", "redirect")
    
    try:
        logger.info(f"Starting OAuth callback with code: {code[:10]}...")
        
        # Обмениваем код на токен
        token_data = await exchange_code_for_token("google", code)
        logger.info(f"Token exchange successful: {list(token_data.keys())}")
        
        access_token = token_data.get("access_token")
        if not access_token:
            logger.error(f"No access token in response: {token_data}")
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Получаем информацию о пользователе
        logger.info(f"Getting user info with access token: {access_token[:20]}...")
        user_info = await get_user_info("google", access_token)
        logger.info(f"User info received: {user_info}")
        
        # Создаем или получаем пользователя
        user = await get_or_create_oauth_user("google", user_info, db)
        
        # Создаем токены для нашего API
        tokens = create_oauth_tokens(user)
        
        # Сохраняем refresh token в базе
        from app.models.user import RefreshToken
        from app.auth.utils import hash_token
        
        refresh_token_hash = hash_token(tokens["refresh_token"])
        refresh_expires = get_token_expiry(days=7)
        
        db_refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=refresh_token_hash,
            expires_at=refresh_expires
        )
        db.add(db_refresh_token)
        await db.commit()
        
        logger.info(f"Google OAuth login successful for user: {user.email}")
        
        # Проверяем, есть ли username
        needs_username = not user.username
        
        frontend_base = settings.FRONTEND_URL.rstrip("/")
        
        if oauth_mode == "popup":
            parsed = urlparse(frontend_base)
            target_origin = f"{parsed.scheme}://{parsed.netloc}"
            logger.info(f"[OAUTH POPUP] Target origin: {target_origin}")
            payload = {
                "type": "oauth-success",
                "accessToken": tokens["access_token"],
                "refreshToken": tokens.get("refresh_token"),
                "needsUsername": needs_username
            }
            logger.info(f"[OAUTH POPUP] Sending payload to popup opener")
            html_content = f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Авторизация...</title>
  </head>
  <body>
    <script>
      (function() {{
        const payload = {json.dumps(payload)};
        const targetOrigin = "{target_origin}";
        console.log('[OAUTH POPUP] Sending message to:', targetOrigin);
        console.log('[OAUTH POPUP] Payload:', payload);
        if (window.opener) {{
          try {{
            window.opener.postMessage(payload, targetOrigin);
            console.log('[OAUTH POPUP] Message sent successfully');
            setTimeout(() => {{
              window.close();
            }}, 100);
          }} catch (error) {{
            console.error('[OAUTH POPUP] Error sending message:', error);
            document.body.innerHTML = '<p>Ошибка отправки сообщения. Можно закрыть это окно.</p>';
          }}
        }} else {{
          console.log('[OAUTH POPUP] No window.opener found');
          document.body.innerHTML = '<p>Авторизация завершена. Можно закрыть это окно.</p>';
        }}
      }})();
    </script>
  </body>
</html>
"""
            return HTMLResponse(content=html_content)
        
        # Редиректим на фронтенд с токенами
        redirect_url = f"{frontend_base}?access_token={tokens['access_token']}&refresh_token={tokens['refresh_token']}"
        
        if needs_username:
            redirect_url += "&needs_username=true"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        if oauth_mode == "popup":
            parsed = urlparse(settings.FRONTEND_URL.rstrip("/"))
            target_origin = f"{parsed.scheme}://{parsed.netloc}"
            payload = {
                "type": "oauth-error",
                "message": "OAuth authentication failed"
            }
            html_content = f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Ошибка авторизации</title>
  </head>
  <body>
    <script>
      (function() {{
        const payload = {json.dumps(payload)};
        const targetOrigin = "{target_origin}";
        if (window.opener && !window.opener.closed) {{
          window.opener.postMessage(payload, targetOrigin);
          window.close();
        }} else {{
          document.body.innerHTML = '<p>Произошла ошибка авторизации. Вы можете закрыть это окно.</p>';
        }}
      }})();
    </script>
  </body>
</html>
"""
            return HTMLResponse(status_code=500, content=html_content)
        
        raise HTTPException(
            status_code=500,
            detail="OAuth authentication failed"
        )


@oauth_router.get("/auth/oauth/providers/")
async def get_oauth_providers():
    """Возвращает список доступных OAuth провайдеров."""
    return {
        "providers": [
            {
                "name": "google",
                "display_name": "Google",
                "login_url": "/auth/google/",
                "icon": "https://developers.google.com/identity/images/g-logo.png"
            }
        ]
    }
