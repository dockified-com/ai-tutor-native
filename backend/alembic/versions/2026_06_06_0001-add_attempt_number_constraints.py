"""add attempt number unique constraints

Revision ID: add_attempt_constraints
Revises: c730b822296a
Create Date: 2026-06-06 17:30:00.000000
"""
from alembic import op

revision: str = 'add_attempt_constraints'
down_revision: str | None = 'c730b822296a'
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_understanding_attempts_enrollment_block_number',
        'understanding_check_attempts',
        ['enrollment_id', 'block_id', 'attempt_number']
    )
    op.create_unique_constraint(
        'uq_concept_attempts_enrollment_block_number',
        'concept_check_attempts',
        ['enrollment_id', 'block_id', 'attempt_number']
    )
    op.create_unique_constraint(
        'uq_code_submissions_enrollment_block_number',
        'code_submissions',
        ['enrollment_id', 'block_id', 'attempt_number']
    )


def downgrade() -> None:
    op.drop_constraint('uq_code_submissions_enrollment_block_number', 'code_submissions')
    op.drop_constraint('uq_concept_attempts_enrollment_block_number', 'concept_check_attempts')
    op.drop_constraint('uq_understanding_attempts_enrollment_block_number', 'understanding_check_attempts')
