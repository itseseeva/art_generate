"""add_is_public_to_user_voices

Revision ID: ghi789jkl012
Revises: def456ghi789
Create Date: 2026-01-21 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ghi789jkl012'
down_revision: Union[str, Sequence[str], None] = 'def456ghi789'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Проверяем существование колонки перед добавлением
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('user_voices')]
    
    if 'is_public' not in columns:
        op.add_column('user_voices', sa.Column('is_public', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('user_voices')]
    
    if 'is_public' in columns:
        op.drop_column('user_voices', 'is_public')
