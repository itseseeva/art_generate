"""add slug to character_available_tags

Revision ID: 4c28f296d5f3
Revises: vwx123yz4567
Create Date: 2026-02-03 12:19:34.581361

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c28f296d5f3'
down_revision: Union[str, Sequence[str], None] = 'vwx123yz4567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from slugify import slugify

def upgrade() -> None:
    """Upgrade schema."""
    # Add slug column
    op.add_column('character_available_tags', sa.Column('slug', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_character_available_tags_slug'), 'character_available_tags', ['slug'], unique=True)
    
    # Populate slug for existing tags
    connection = op.get_bind()
    result = connection.execute(sa.text("SELECT id, name FROM character_available_tags"))
    for row in result:
        tag_id = row[0]
        tag_name = row[1]
        tag_slug = slugify(tag_name)
        connection.execute(
            sa.text("UPDATE character_available_tags SET slug = :slug WHERE id = :id"),
            {"slug": tag_slug, "id": tag_id}
        )

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_character_available_tags_slug'), table_name='character_available_tags')
    op.drop_column('character_available_tags', 'slug')
