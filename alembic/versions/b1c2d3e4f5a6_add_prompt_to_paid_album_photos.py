"""add prompt to paid_album_photos

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-03-02 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add prompt column to paid_album_photos table."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('paid_album_photos')]

    if 'prompt' not in columns:
        op.add_column('paid_album_photos', sa.Column('prompt', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove prompt column from paid_album_photos table."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('paid_album_photos')]

    if 'prompt' in columns:
        op.drop_column('paid_album_photos', 'prompt')
