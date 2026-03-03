"""fix_chat_messages_session_id_cascade

Добавляет ON DELETE CASCADE к FK chat_messages.session_id -> chat_sessions.id.
Без этого удаление персонажей (каскад characters -> chat_sessions) ломается:
FK chat_messages_session_id_fkey мешает удалить chat_sessions.

Revision ID: c9f3a2b1d8e7
Revises: b1c2d3e4f5a6
Create Date: 2026-03-03 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9f3a2b1d8e7'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Добавляем ON DELETE CASCADE к chat_messages.session_id."""
    # Удаляем старый FK без CASCADE
    op.drop_constraint(
        'chat_messages_session_id_fkey',
        'chat_messages',
        type_='foreignkey'
    )
    # Создаём новый FK с ON DELETE CASCADE
    op.create_foreign_key(
        'chat_messages_session_id_fkey',
        'chat_messages',
        'chat_sessions',
        ['session_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Откатываем: убираем CASCADE."""
    op.drop_constraint(
        'chat_messages_session_id_fkey',
        'chat_messages',
        type_='foreignkey'
    )
    op.create_foreign_key(
        'chat_messages_session_id_fkey',
        'chat_messages',
        'chat_sessions',
        ['session_id'],
        ['id']
    )
