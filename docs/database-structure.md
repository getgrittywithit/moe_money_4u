# Moe Money 4U - Database Structure

## Overview
This document outlines the database structure for the Moe Money 4U expense tracking application built on Supabase PostgreSQL.

## Tables

### `categories`
Stores expense categories for each user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `name` | VARCHAR(100) | Category name (e.g., "Food & Dining") |
| `description` | TEXT | Optional description |
| `color` | VARCHAR(7) | Hex color code for UI |
| `rules` | JSONB | AI categorization rules/keywords |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `expenses`
Main table for tracking all user expenses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `category_id` | UUID | Foreign key to categories (nullable) |
| `amount` | DECIMAL(12,2) | Expense amount |
| `description` | TEXT | Expense description |
| `merchant` | VARCHAR(255) | Merchant/vendor name |
| `date` | DATE | Expense date |
| `payment_method` | VARCHAR(50) | Payment method used |
| `csv_import_id` | UUID | Links to CSV import batch |
| `ai_categorized` | BOOLEAN | Whether AI categorized this expense |
| `ai_confidence` | DECIMAL(3,2) | AI categorization confidence (0-1) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `csv_imports`
Tracks CSV file uploads and processing status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `filename` | VARCHAR(255) | Original filename |
| `total_rows` | INTEGER | Total rows in CSV |
| `processed_rows` | INTEGER | Rows processed so far |
| `successful_rows` | INTEGER | Successfully imported rows |
| `failed_rows` | INTEGER | Failed import rows |
| `status` | VARCHAR(20) | processing/completed/failed |
| `error_log` | JSONB | Error details |
| `created_at` | TIMESTAMPTZ | Upload timestamp |
| `completed_at` | TIMESTAMPTZ | Processing completion time |

### `user_preferences`
User-specific settings and preferences.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users (unique) |
| `currency` | VARCHAR(3) | Currency code (default: USD) |
| `date_format` | VARCHAR(20) | Preferred date format |
| `default_category_id` | UUID | Default category for new expenses |
| `ai_auto_categorize` | BOOLEAN | Enable automatic AI categorization |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring users can only access their own data:

- **SELECT**: Users can only view their own records
- **INSERT**: Users can only create records assigned to their user_id
- **UPDATE**: Users can only modify their own records
- **DELETE**: Users can only delete their own records

### Default Data
When a new user signs up, the system automatically creates:
- 7 default expense categories (Food, Transportation, Shopping, etc.)
- User preferences record with default settings

## Indexes
Performance indexes are created on:
- `expenses.user_id`
- `expenses.date`
- `expenses.category_id`
- `categories.user_id`
- `csv_imports.user_id`

## Triggers
- **Updated At**: Automatically updates `updated_at` timestamps
- **New User Setup**: Creates default categories and preferences for new users

## Relationships
```
auth.users (Supabase Auth)
├── categories (1:many)
├── expenses (1:many)
├── csv_imports (1:many)
└── user_preferences (1:1)

categories
└── expenses (1:many)

csv_imports
└── expenses (1:many)
```