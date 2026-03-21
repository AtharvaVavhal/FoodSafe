"""create all tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('users',
        sa.Column('id',         sa.String(), primary_key=True),
        sa.Column('name',       sa.String(), nullable=False),
        sa.Column('email',      sa.String(), unique=True, index=True),
        sa.Column('hashed_pw',  sa.String()),
        sa.Column('city',       sa.String(), default=''),
        sa.Column('state',      sa.String(), default='Maharashtra'),
        sa.Column('lang',       sa.String(), default='en'),
        sa.Column('created_at', sa.DateTime()),
    )
    op.create_table('family_members',
        sa.Column('id',           sa.String(), primary_key=True),
        sa.Column('user_id',      sa.String(), sa.ForeignKey('users.id')),
        sa.Column('name',         sa.String(), nullable=False),
        sa.Column('age',          sa.Integer()),
        sa.Column('conditions',   sa.JSON()),
        sa.Column('avatar_color', sa.String(), default='green'),
    )
    op.create_table('scan_records',
        sa.Column('id',           sa.String(), primary_key=True),
        sa.Column('user_id',      sa.String(), sa.ForeignKey('users.id')),
        sa.Column('member_id',    sa.String()),
        sa.Column('food_name',    sa.String(), nullable=False),
        sa.Column('risk_level',   sa.String()),
        sa.Column('safety_score', sa.Integer()),
        sa.Column('result_json',  sa.JSON()),
        sa.Column('scan_type',    sa.String(), default='text'),
        sa.Column('city',         sa.String()),
        sa.Column('created_at',   sa.DateTime()),
    )
    op.create_table('community_reports',
        sa.Column('id',          sa.String(), primary_key=True),
        sa.Column('food_name',   sa.String(), nullable=False),
        sa.Column('brand',       sa.String()),
        sa.Column('city',        sa.String(), nullable=False),
        sa.Column('state',       sa.String()),
        sa.Column('description', sa.Text()),
        sa.Column('verified',    sa.Boolean(), default=False),
        sa.Column('upvotes',     sa.Integer(), default=0),
        sa.Column('lat',         sa.Float()),
        sa.Column('lng',         sa.Float()),
        sa.Column('created_at',  sa.DateTime()),
    )
    op.create_table('fssai_violations',
        sa.Column('id',          sa.String(), primary_key=True),
        sa.Column('brand',       sa.String()),
        sa.Column('product',     sa.String()),
        sa.Column('violation',   sa.Text()),
        sa.Column('state',       sa.String()),
        sa.Column('date',        sa.DateTime()),
        sa.Column('source_url',  sa.String()),
        sa.Column('raw_text',    sa.Text()),
        sa.Column('created_at',  sa.DateTime()),
    )
    op.create_table('safe_brands',
        sa.Column('id',            sa.String(), primary_key=True),
        sa.Column('food_category', sa.String(), index=True),
        sa.Column('brand_name',    sa.String()),
        sa.Column('safety_score',  sa.Integer()),
        sa.Column('fssai_license', sa.String()),
        sa.Column('verified',      sa.Boolean(), default=False),
        sa.Column('price_range',   sa.String()),
        sa.Column('notes',         sa.Text()),
    )

def downgrade() -> None:
    for tbl in ['safe_brands','fssai_violations','community_reports','scan_records','family_members','users']:
        op.drop_table(tbl)
