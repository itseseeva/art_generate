"""Clear voice_url when voice_id is set

Revision ID: e8f9a0b1c2d3
Revises: da77f1653522
Create Date: 2026-01-20 18:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e8f9a0b1c2d3'
down_revision = 'da77f1653522'
branch_labels = None
depends_on = None


def upgrade():
    """
    Очищает voice_url для всех персонажей, у которых установлен voice_id.
    Это нужно для того, чтобы использовался новый voice_id из папки default_character_voices,
    а не старый внешний URL.
    """
    # Обновляем персонажей, у которых есть voice_id
    op.execute(
        """
        UPDATE characters 
        SET voice_url = NULL 
        WHERE voice_id IS NOT NULL AND voice_id != ''
        """
    )


def downgrade():
    """
    Откат не требуется, так как мы не можем восстановить старые voice_url.
    """
    pass
