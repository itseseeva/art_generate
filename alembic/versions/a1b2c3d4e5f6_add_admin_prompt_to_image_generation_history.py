"""add admin_prompt to image_generation_history

Revision ID: a1b2c3d4e5f6
Revises: 7c5db3cee085
Create Date: 2026-01-11 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7c5db3cee085'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add admin_prompt column to image_generation_history table."""
    # Проверяем существование колонки перед добавлением
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('image_generation_history')]
    
    if 'admin_prompt' not in columns:
        op.add_column('image_generation_history', sa.Column('admin_prompt', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove admin_prompt column from image_generation_history table."""
    # Проверяем существование колонки перед удалением
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('image_generation_history')]
    
    if 'admin_prompt' in columns:
        op.drop_column('image_generation_history', 'admin_prompt')
