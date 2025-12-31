"""Add bug_reports and bug_comments tables with status

Revision ID: 329a528b2d56
Revises: e2a96dc3cea2
Create Date: 2025-12-31 08:39:38.813796

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '329a528b2d56'
down_revision: Union[str, Sequence[str], None] = 'e2a96dc3cea2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create bug_reports table
    op.create_table('bug_reports',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('title', sa.String(length=500), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('location', sa.String(length=500), nullable=True),
    sa.Column('status', sa.Enum('PENDING', 'IN_PROGRESS', 'COMPLETED', name='bugstatus', create_type=True), nullable=False, server_default=sa.text("'PENDING'")),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bug_reports_user_id'), 'bug_reports', ['user_id'], unique=False)
    
    # Create bug_comments table
    op.create_table('bug_comments',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('bug_report_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['bug_report_id'], ['bug_reports.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bug_comments_bug_report_id'), 'bug_comments', ['bug_report_id'], unique=False)
    op.create_index(op.f('ix_bug_comments_user_id'), 'bug_comments', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop bug_comments table
    op.drop_index(op.f('ix_bug_comments_user_id'), table_name='bug_comments')
    op.drop_index(op.f('ix_bug_comments_bug_report_id'), table_name='bug_comments')
    op.drop_table('bug_comments')
    
    # Drop bug_reports table
    op.drop_index(op.f('ix_bug_reports_user_id'), table_name='bug_reports')
    op.drop_table('bug_reports')
