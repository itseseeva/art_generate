"""Add registration_ip and country to users table

Revision ID: add_registration_ip_country
Revises: ea1368fac628
Create Date: 2026-01-08 22:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ffdf3646ff2a'
down_revision: Union[str, Sequence[str], None] = 'ea1368fac628'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add registration_ip and country columns to users table."""
    # Добавляем столбец registration_ip
    op.add_column('users', sa.Column('registration_ip', sa.String(length=255), nullable=True))
    
    # Добавляем столбец country
    op.add_column('users', sa.Column('country', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Remove registration_ip and country columns from users table."""
    op.drop_column('users', 'country')
    op.drop_column('users', 'registration_ip')
