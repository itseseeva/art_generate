"""add_seo_description_to_tags

Revision ID: 9e87a5afdbf7
Revises: 814bdf670c72
Create Date: 2026-02-05 15:07:39.398823

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e87a5afdbf7'
down_revision: Union[str, Sequence[str], None] = '814bdf670c72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(sa.text("ALTER TABLE character_available_tags ADD COLUMN IF NOT EXISTS seo_description TEXT"))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(sa.text("ALTER TABLE character_available_tags DROP COLUMN IF EXISTS seo_description"))
