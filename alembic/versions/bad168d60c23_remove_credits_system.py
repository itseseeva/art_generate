"""remove credits system and convert remaining credits to coins

Revision ID: bad168d60c23
Revises: 341f6431cb52
Create Date: 2026-02-09 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'bad168d60c23'
down_revision: Union[str, None] = '341f6431cb52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Конвертируем остатки кредитов в монеты пользователя
    # Кредиты = monthly_credits - used_credits
    # Мы добавляем это значение к user.coins
    # Используем COALESCE для обработки NULL значений
    op.execute("""
        UPDATE users
        SET coins = coins + sub.credits_to_transfer
        FROM (
            SELECT user_id, (COALESCE(monthly_credits, 0) - COALESCE(used_credits, 0)) as credits_to_transfer
            FROM user_subscriptions
            WHERE COALESCE(monthly_credits, 0) > COALESCE(used_credits, 0)
        ) as sub
        WHERE users.id = sub.user_id
    """)

    # 2. Удаляем колонки из user_subscriptions
    op.drop_column('user_subscriptions', 'used_credits')
    op.drop_column('user_subscriptions', 'monthly_credits')


def downgrade() -> None:
    # Возвращаем колонки
    op.add_column('user_subscriptions', sa.Column('monthly_credits', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_subscriptions', sa.Column('used_credits', sa.Integer(), nullable=False, server_default='0'))
