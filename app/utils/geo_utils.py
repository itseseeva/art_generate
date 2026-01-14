"""
Утилиты для определения географического положения по IP адресу.
"""

import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def get_country_by_ip(ip_address: str) -> Optional[str]:
    """
    Определяет страну по IP адресу через бесплатный API ip-api.com.
    
    Args:
        ip_address: IP адрес пользователя
        
    Returns:
        Название страны или None при ошибке
    """
    if not ip_address or ip_address in ['127.0.0.1', 'localhost', '::1']:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"http://ip-api.com/json/{ip_address}",
                params={"fields": "country,countryCode,status"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    country = data.get("country")
                    logger.info(
                        f"[GEO] IP {ip_address} -> {country}"
                    )
                    return country
                else:
                    logger.warning(
                        f"[GEO] Failed to get country for IP {ip_address}: "
                        f"{data.get('message', 'unknown error')}"
                    )
                    return None
            else:
                logger.warning(
                    f"[GEO] HTTP error {response.status_code} "
                    f"for IP {ip_address}"
                )
                return None
    except (httpx.ConnectError, httpx.ConnectTimeout, OSError) as e:
        # Обрабатываем DNS ошибки и сетевые ошибки без прерывания процесса
        logger.warning(f"[GEO] Network error getting country for IP {ip_address}: {e}")
        return None
    except Exception as e:
        logger.warning(f"[GEO] Error getting country for IP {ip_address}: {e}")
        return None


def get_client_ip(request) -> Optional[str]:
    """
    Извлекает IP адрес клиента из запроса.
    Учитывает прокси и заголовки X-Forwarded-For.
    
    Args:
        request: FastAPI Request объект
        
    Returns:
        IP адрес клиента или None
    """
    # Проверяем заголовки прокси
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For может содержать несколько IP (через запятую)
        # Берем первый (реальный IP клиента)
        ip = forwarded_for.split(",")[0].strip()
        return ip
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback на request.client
    if request.client and request.client.host:
        return request.client.host
    
    return None

