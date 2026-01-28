"""add_character_available_tags_and_tags

Revision ID: hij890klm123
Revises: b438299be885
Create Date: 2026-01-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'hij890klm123'
down_revision: Union[str, Sequence[str], None] = 'b438299be885'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_TAGS = [
    'Фэнтези',
    'Киберпанк',
    'Слуга',
    'Учитель',
    'Незнакомец',
    'NSFW',
    'SFW',
    'Original',
    'Босс',
    'Доминирование',
]


def upgrade() -> None:
    """Создаёт таблицу доступных тегов и колонку tags в characters."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    if 'character_available_tags' not in tables:
        op.create_table(
            'character_available_tags',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('name', name='uq_character_available_tags_name')
        )
        op.create_index(
            op.f('ix_character_available_tags_name'),
            'character_available_tags',
            ['name'],
            unique=True
        )
        for i, tag_name in enumerate(DEFAULT_TAGS, start=1):
            op.execute(
                sa.text(
                    "INSERT INTO character_available_tags (id, name) VALUES (:id, :name)"
                ).bindparams(id=i, name=tag_name)
            )

    if 'characters' in tables:
        cols = [c['name'] for c in inspector.get_columns('characters')]
        if 'tags' not in cols:
            op.add_column(
                'characters',
                sa.Column('tags', sa.JSON(), nullable=True)
            )


def downgrade() -> None:
    """Удаляет колонку tags и таблицу character_available_tags."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    if 'characters' in tables:
        cols = [c['name'] for c in inspector.get_columns('characters')]
        if 'tags' in cols:
            op.drop_column('characters', 'tags')

    if 'character_available_tags' in tables:
        op.drop_index(op.f('ix_character_available_tags_name'), table_name='character_available_tags')
        op.drop_table('character_available_tags')
