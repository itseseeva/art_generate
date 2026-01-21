"""add_user_voices_table

Revision ID: abc123def456
Revises: 7c5db3cee085
Create Date: 2026-01-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'abc123def456'
down_revision: Union[str, Sequence[str], None] = 'e8f9a0b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Проверяем существование таблицы перед созданием
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()
    
    if 'user_voices' not in tables:
        op.create_table(
            'user_voices',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('voice_name', sa.String(length=200), nullable=False, server_default='Мой Голос'),
            sa.Column('voice_url', sa.String(length=500), nullable=False),
            sa.Column('preview_url', sa.String(length=500), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_user_voices_user_id'), 'user_voices', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()
    
    if 'user_voices' in tables:
        op.drop_index(op.f('ix_user_voices_user_id'), table_name='user_voices')
        op.drop_table('user_voices')
