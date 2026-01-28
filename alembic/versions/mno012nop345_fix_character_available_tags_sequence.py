"""fix_character_available_tags_sequence

Синхронизирует последовательность id в character_available_tags для PostgreSQL
после миграций, вставлявших строки с явным id (sequence не обновлялась).

Revision ID: mno012nop345
Revises: jkl901lmn234
Create Date: 2026-01-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'mno012nop345'
down_revision: Union[str, Sequence[str], None] = 'jkl901lmn234'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Выставляет последовательность id в значение MAX(id) для PostgreSQL."""
    conn = op.get_bind()
    if conn.engine.dialect.name == 'postgresql':
        op.execute(
            sa.text(
                "SELECT setval("
                "pg_get_serial_sequence('character_available_tags', 'id')::regclass, "
                "(SELECT COALESCE(MAX(id), 1) FROM character_available_tags)"
                ")"
            )
        )


def downgrade() -> None:
    """Ничего не откатываем — исправление sequence не меняет данные."""
    pass
