"""add_audio_url_to_chat_messages

Revision ID: b438299be885
Revises: ghi789jkl012
Create Date: 2026-01-21 21:30:08.964164

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b438299be885'
down_revision: Union[str, Sequence[str], None] = 'ghi789jkl012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Проверяем существование колонки перед добавлением
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('chat_messages')]
    
    if 'audio_url' not in columns:
        op.add_column('chat_messages', sa.Column('audio_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('chat_messages')]
    
    if 'audio_url' in columns:
        op.drop_column('chat_messages', 'audio_url')
