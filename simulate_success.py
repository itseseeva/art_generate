import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.db import async_session_maker
from app.models.payment_transaction import PaymentTransaction
from app.services.profit_activate import ProfitActivateService
from app.models.user import Users

async def main():
    async with async_session_maker() as db:
        # get latest transaction
        result = await db.execute(select(PaymentTransaction).order_by(PaymentTransaction.id.desc()).limit(1))
        tx = result.scalar_one_or_none()
        if not tx:
            print("No transaction found")
            return
            
        print(f"Found transaction order_id={tx.operation_id} for user_id={tx.user_id}, plan={tx.subscription_type}")
        
        if tx.processed:
            print("Transaction already processed! We will simulate processing anyway to print bonuses.")
            
        service = ProfitActivateService(db)
        
        # ACTIVATE
        if tx.payment_type == "subscription" and tx.subscription_type:
            print("Activating subscription...")
            # We don't check for failure here, just call the service as the webhook does
            sub = await service.activate_subscription(tx.user_id, tx.subscription_type, months=tx.months)
            
            tx.processed = True
            await db.commit()
            
            sub_stats = await service.get_subscription_stats(tx.user_id)
            
            # Print table
            print("\n" + "="*50)
            print("УСПЕШНАЯ ПОКУПКА - НАЧИСЛЕННЫЕ ПРИВИЛЕГИИ:")
            print("="*50)
            print(f"План подписки          = {sub_stats.get('subscription_type', '').upper()}")
            
            msg = "Безлимит" if sub_stats.get("monthly_messages") == 0 else str(sub_stats.get("monthly_messages"))
            print(f"Текстовые сообщения    = {msg}")
            print(f"Генерации фото         = {sub_stats.get('images_limit')} / мес")
            print(f"Голосовые сообщения    = {sub_stats.get('voice_limit')} / мес")
            
            char_lim = "Безлимит" if sub_stats.get("characters_limit") is None else str(sub_stats.get("characters_limit"))
            print(f"Лимит персонажей       = {char_lim}")
            print(f"Длина сообщения        = до {sub_stats.get('max_message_length')} символов")
            print("="*50 + "\n")
        else:
            print("Transaction is not a subscription or missing plan.")

if __name__ == "__main__":
    asyncio.run(main())
