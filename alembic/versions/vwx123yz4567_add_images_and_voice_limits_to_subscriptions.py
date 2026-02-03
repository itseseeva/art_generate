"""add_images_and_voice_limits_to_subscriptions

Revision ID: vwx123yz4567
Revises: pqr567stu890
Create Date: 2026-02-02 00:16:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'vwx123yz4567'
down_revision = 'pqr567stu890'
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем новые колонки для лимитов изображений и голоса
    op.add_column('user_subscriptions', sa.Column('images_limit', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_subscriptions', sa.Column('images_used', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_subscriptions', sa.Column('voice_limit', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_subscriptions', sa.Column('voice_used', sa.Integer(), nullable=False, server_default='0'))
    
    # Устанавливаем лимиты для FREE/BASE пользователей
    op.execute("""
        UPDATE user_subscriptions 
        SET images_limit = 5, voice_limit = 0 
        WHERE subscription_type = 'BASE'
    """)
    
    # Устанавливаем лимиты для STANDARD пользователей
    op.execute("""
        UPDATE user_subscriptions 
        SET images_limit = 100, voice_limit = 100 
        WHERE subscription_type = 'STANDARD'
    """)
    
    # Устанавливаем лимиты для PREMIUM пользователей
    op.execute("""
        UPDATE user_subscriptions 
        SET images_limit = 500, voice_limit = 300 
        WHERE subscription_type = 'PREMIUM'
    """)


def downgrade():
    # Удаляем добавленные колонки
    op.drop_column('user_subscriptions', 'voice_used')
    op.drop_column('user_subscriptions', 'voice_limit')
    op.drop_column('user_subscriptions', 'images_used')
    op.drop_column('user_subscriptions', 'images_limit')
