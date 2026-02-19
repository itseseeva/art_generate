import sys
import os
import asyncio

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app.chat_history.services.chat_history_service import ChatHistoryService
    print("Successfully imported ChatHistoryService")
    
    # Check if method exists
    if hasattr(ChatHistoryService, 'get_user_characters_with_history'):
        print("Method get_user_characters_with_history exists")
    else:
        print("ERROR: Method get_user_characters_with_history NOT found")
        sys.exit(1)

    print("Syntax check passed")
except Exception as e:
    print(f"Syntax error or import error: {e}")
    sys.exit(1)
