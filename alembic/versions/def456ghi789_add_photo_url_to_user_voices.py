"""add_photo_url_to_user_voices

Revision ID: def456ghi789
Revises: abc123def456
Create Date: 2026-01-21 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'def456ghi789'
down_revision: Union[str, Sequence[str], None] = 'abc123def456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Проверяем существование колонки перед добавлением
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('user_voices')]
    
    if 'photo_url' not in columns:
        op.add_column('user_voices', sa.Column('photo_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('user_voices')]
    
    if 'photo_url' in columns:
        op.drop_column('user_voices', 'photo_url')
