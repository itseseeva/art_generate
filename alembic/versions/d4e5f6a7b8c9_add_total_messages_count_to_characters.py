"""add_total_messages_count_to_characters

Добавляет поле total_messages_count в таблицу characters.
Глобальный счётчик всех сообщений — считает сообщения от всех пользователей,
никогда не уменьшается (в т.ч. при удалении истории).

Revision ID: d4e5f6a7b8c9
Revises: c9f3a2b1d8e7
Create Date: 2026-03-03 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c9f3a2b1d8e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'characters',
        sa.Column(
            'total_messages_count',
            sa.Integer(),
            nullable=False,
            server_default='0'
        )
    )


def downgrade() -> None:
    op.drop_column('characters', 'total_messages_count')
