"""add monthly_messages and used_messages to user_subscriptions

Revision ID: pqr567stu890
Revises: mno012nop345
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "pqr567stu890"
down_revision: Union[str, Sequence[str], None] = "mno012nop345"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Добавляет monthly_messages и used_messages в user_subscriptions."""
    from sqlalchemy import inspect

    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("user_subscriptions")]

    if "monthly_messages" not in columns:
        op.add_column(
            "user_subscriptions",
            sa.Column("monthly_messages", sa.Integer(), nullable=False, server_default="0"),
        )
    if "used_messages" not in columns:
        op.add_column(
            "user_subscriptions",
            sa.Column("used_messages", sa.Integer(), nullable=False, server_default="0"),
        )

    op.execute(
        sa.text(
            "UPDATE user_subscriptions SET monthly_messages = 10 "
            "WHERE subscription_type::text IN ('BASE', 'FREE')"
        )
    )


def downgrade() -> None:
    """Удаляет monthly_messages и used_messages из user_subscriptions."""
    from sqlalchemy import inspect

    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("user_subscriptions")]

    if "used_messages" in columns:
        op.drop_column("user_subscriptions", "used_messages")
    if "monthly_messages" in columns:
        op.drop_column("user_subscriptions", "monthly_messages")
