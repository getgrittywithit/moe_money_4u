# Existing Database Structure - Moe Money 4U

## Overview
Your Supabase database is already a family management system with chores, allowances, grocery lists, and network access. I've now integrated expense tracking tables that work with your existing structure.

## Existing Tables (Family Management)

### `profiles`
Core user profiles for family members.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `email` | TEXT | User email (unique) |
| `first_name` | TEXT | User's first name |
| `role` | user_role | 'parent' or 'child' |
| `color_theme` | TEXT | UI color theme (default: '#3B82F6') |
| `avatar_url` | TEXT | Profile picture URL |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `chores`
Family chore management system.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Chore title |
| `description` | TEXT | Chore description |
| `assigned_to` | UUID | Foreign key to profiles |
| `assigned_by` | UUID | Foreign key to profiles |
| `payment_amount` | DECIMAL(10,2) | Payment for completion |
| `status` | chore_status | 'assigned', 'completed', 'approved' |
| `due_date` | DATE | Due date |
| `completed_at` | TIMESTAMPTZ | Completion timestamp |
| `approved_at` | TIMESTAMPTZ | Approval timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `allowances`
Tracks payments for completed chores.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `child_id` | UUID | Foreign key to profiles |
| `chore_id` | UUID | Foreign key to chores |
| `amount` | DECIMAL(10,2) | Payment amount |
| `earned_at` | TIMESTAMPTZ | When earned |
| `paid_out` | BOOLEAN | Whether paid out |
| `paid_out_at` | TIMESTAMPTZ | When paid out |

### `grocery_items`
Family grocery list management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `item_name` | TEXT | Grocery item name |
| `category` | TEXT | Item category (default: 'other') |
| `added_by` | UUID | Foreign key to profiles |
| `completed` | BOOLEAN | Item purchased |
| `completed_by` | UUID | Foreign key to profiles |
| `completed_at` | TIMESTAMPTZ | Purchase timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `network_access`
Family network/device access control.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | Foreign key to profiles |
| `device_name` | TEXT | Device name |
| `mac_address` | TEXT | Device MAC address |
| `access_enabled` | BOOLEAN | Access allowed |
| `auto_restore_enabled` | BOOLEAN | Auto-restore access |
| `last_updated` | TIMESTAMPTZ | Last update timestamp |
| `updated_by` | UUID | Foreign key to profiles |

## New Tables (Expense Tracking)

### `expense_categories`
Expense categories for each profile.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | Foreign key to profiles |
| `name` | VARCHAR(100) | Category name |
| `description` | TEXT | Category description |
| `color` | VARCHAR(7) | Hex color code |
| `rules` | JSONB | AI categorization rules |
| `is_default` | BOOLEAN | System-created category |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `expenses`
Main expense tracking table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | Foreign key to profiles |
| `category_id` | UUID | Foreign key to expense_categories |
| `amount` | DECIMAL(12,2) | Expense amount |
| `description` | TEXT | Expense description |
| `merchant` | VARCHAR(255) | Merchant/vendor |
| `expense_date` | DATE | Expense date |
| `payment_method` | VARCHAR(50) | Payment method |
| `csv_import_id` | UUID | Links to CSV import |
| `ai_categorized` | BOOLEAN | AI categorized |
| `ai_confidence` | DECIMAL(3,2) | AI confidence (0-1) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `csv_imports`
Tracks CSV file uploads.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | Foreign key to profiles |
| `filename` | VARCHAR(255) | Original filename |
| `total_rows` | INTEGER | Total CSV rows |
| `processed_rows` | INTEGER | Processed rows |
| `successful_rows` | INTEGER | Successfully imported |
| `failed_rows` | INTEGER | Failed imports |
| `status` | VARCHAR(20) | processing/completed/failed |
| `error_log` | JSONB | Error details |
| `created_at` | TIMESTAMPTZ | Upload timestamp |
| `completed_at` | TIMESTAMPTZ | Processing completion |

### `expense_preferences`
User expense preferences.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | Foreign key to profiles (unique) |
| `currency` | VARCHAR(3) | Currency code (default: USD) |
| `date_format` | VARCHAR(20) | Date format preference |
| `default_category_id` | UUID | Default expense category |
| `ai_auto_categorize` | BOOLEAN | Enable AI categorization |
| `budget_alerts_enabled` | BOOLEAN | Enable budget alerts |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `category_budgets`
Monthly budgets per category.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | Foreign key to profiles |
| `category_id` | UUID | Foreign key to expense_categories |
| `budget_amount` | DECIMAL(12,2) | Budget amount |
| `month_year` | DATE | First day of budget month |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Custom Types

### `user_role` ENUM
- `parent`
- `child`

### `chore_status` ENUM
- `assigned`
- `completed`
- `approved`

## Current Data
- **8 profiles** with default expense categories created
- **8 expense categories per profile** (Food, Transportation, Shopping, Entertainment, Bills, Healthcare, Allowances, Other)
- All profiles have expense preferences initialized

## Integration Points
1. **Profiles**: Central to both family management and expense tracking
2. **Allowances**: Could link to expense tracking for family spending
3. **Role-based access**: Parents/children have different permissions
4. **Color themes**: Expense categories inherit profile color patterns

## Security
All tables have Row Level Security enabled with policies ensuring users can only access data for their own profile or family.