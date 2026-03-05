"""add_name_ru_en_to_characters

Revision ID: abc456def789
Revises: d4e5f6a7b8c9
Create Date: 2026-03-04 06:13:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc456def789'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Добавляем колонки name_ru и name_en для хранения переводов имён персонажей."""
    op.add_column('characters', sa.Column('name_ru', sa.String(200), nullable=True))
    op.add_column('characters', sa.Column('name_en', sa.String(200), nullable=True))


def downgrade() -> None:
    """Откат: удаляем колонки name_ru и name_en."""
    op.drop_column('characters', 'name_en')
    op.drop_column('characters', 'name_ru')
