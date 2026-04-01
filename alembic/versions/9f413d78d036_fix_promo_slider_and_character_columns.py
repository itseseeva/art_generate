"""fix_promo_slider_and_character_columns

Revision ID: 9f413d78d036
Revises: 03b8c12ee63f
Create Date: 2026-04-01 20:35:32.996359

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f413d78d036'
down_revision: Union[str, Sequence[str], None] = '03b8c12ee63f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
