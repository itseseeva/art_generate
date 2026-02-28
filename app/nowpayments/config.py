from typing import Dict, Any
from app.config.settings import settings

def get_nowpayments_config(test_mode: bool = False) -> Dict[str, Any]:
    """
    Возвращает конфигурацию для NOWPayments.
    
    В production:
    api_url = https://api.nowpayments.io/v1
    
    В test (sandbox):
    api_url = https://api-sandbox.nowpayments.io/v1
    """
    if test_mode:
        api_key = settings.NOWPAYMENTS_API_KEY_TEST
        ipn_secret = settings.NOWPAYMENTS_API_PUBLIC_KEY_TEST
        base_url = "https://api-sandbox.nowpayments.io/v1"
    else:
        api_key = settings.NOWPAYMENTS_API_KEY
        ipn_secret = settings.NOWPAYMENTS_API_PUBLIC_KEY
        base_url = "https://api.nowpayments.io/v1"
    
    if not api_key:
        raise ValueError(f"NOWPAYMENTS_API_KEY{'_TEST' if test_mode else ''} is not set in environment variables")
        
    return {
        "api_key": api_key,
        "ipn_secret": ipn_secret,
        "base_url": base_url,
    }
