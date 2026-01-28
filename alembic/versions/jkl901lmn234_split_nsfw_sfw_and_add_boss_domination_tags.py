"""split_nsfw_sfw_and_add_boss_domination_tags

Разделяет тег NSFW / SFW на NSFW и SFW, добавляет теги Босс и Доминирование.

Revision ID: jkl901lmn234
Revises: hij890klm123
Create Date: 2026-01-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'jkl901lmn234'
down_revision: Union[str, Sequence[str], None] = 'hij890klm123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Заменяет тег NSFW / SFW на NSFW и SFW, добавляет Босс и Доминирование."""
    conn = op.get_bind()
    dialect_name = conn.engine.dialect.name

    op.execute(sa.text("DELETE FROM character_available_tags WHERE name = 'NSFW / SFW'"))

    for name in ('NSFW', 'SFW', 'Босс', 'Доминирование'):
        if dialect_name == 'sqlite':
            op.execute(sa.text(
                "INSERT INTO character_available_tags (id, name) "
                "SELECT (SELECT COALESCE(MAX(id),0)+1 FROM character_available_tags), :n "
                "WHERE NOT EXISTS (SELECT 1 FROM character_available_tags WHERE name = :n)"
            ).bindparams(n=name))
        elif dialect_name == 'postgresql':
            op.execute(sa.text(
                "INSERT INTO character_available_tags (id, name) "
                "SELECT COALESCE(MAX(id),0)+1, :n FROM character_available_tags "
                "ON CONFLICT (name) DO NOTHING"
            ).bindparams(n=name))
        else:
            op.execute(sa.text(
                "INSERT INTO character_available_tags (id, name) "
                "SELECT COALESCE(MAX(id),0)+1, :n FROM character_available_tags "
                "WHERE NOT EXISTS (SELECT 1 FROM character_available_tags WHERE name = :n)"
            ).bindparams(n=name))


def downgrade() -> None:
    """Удаляет NSFW, SFW, Босс, Доминирование и возвращает тег NSFW / SFW."""
    conn = op.get_bind()
    for name in ('Доминирование', 'Босс', 'SFW', 'NSFW'):
        op.execute(sa.text("DELETE FROM character_available_tags WHERE name = :name").bindparams(name=name))
    op.execute(sa.text(
        "INSERT INTO character_available_tags (id, name) "
        "SELECT COALESCE(MAX(id),0)+1, 'NSFW / SFW' FROM character_available_tags"
    ))
