"""add_voice_url_to_characters

Revision ID: 1a266a2c85fa
Revises: a1b2c3d4e5f6
Create Date: 2026-01-20 09:16:57.933358

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a266a2c85fa'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Добавляем только столбец voice_url в таблицу characters
    op.add_column('characters', sa.Column('voice_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Удаляем столбец voice_url из таблицы characters
    op.drop_column('characters', 'voice_url')
