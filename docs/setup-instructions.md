# Setup Instructions

## 1. Run Database Schema

### Option A: Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/vhqgzgqklwrjmglaezmh)
2. Navigate to **SQL Editor**
3. Copy the contents of `schema.sql` 
4. Paste into the SQL Editor
5. Click **Run** to execute

### Option B: Command Line (psql)
```bash
# Using direct connection
psql "postgresql://postgres:71jd4xNjFaBufBAA@db.vhqgzgqklwrjmglaezmh.supabase.co:5432/postgres" -f schema.sql

# Or using transaction pooler
psql "postgres://postgres:71jd4xNjFaBufBAA@db.vhqgzgqklwrjmglaezmh.supabase.co:6543/postgres" -f schema.sql
```

## 2. Get API Keys
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the **anon public** key
3. Copy the **service_role secret** key (optional for now)

## 3. Configure Environment Variables

### Local Development
Update `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Vercel Deployment
Add these environment variables in Vercel dashboard:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

## 4. Test the Setup

### Start Development Server
```bash
npm run dev
```

### Test Authentication
1. Go to `http://localhost:3000`
2. Click "Get Started" → redirects to login
3. Sign up with a test email
4. Check Supabase dashboard → Authentication → Users
5. Verify default categories were created in the Categories table

## 5. Verify Database Tables
In Supabase dashboard → Table Editor, you should see:
- `categories` (with 7 default categories for new users)
- `expenses` (empty initially)
- `csv_imports` (empty initially) 
- `user_preferences` (with default settings for new users)

## 6. Next Steps
- Test user registration/login
- Implement CSV upload functionality  
- Add expense dashboard
- Integrate AI categorization

## Troubleshooting

### Common Issues
1. **Environment variables not loading**: Restart dev server after updating `.env.local`
2. **RLS errors**: Make sure you're authenticated when testing
3. **Connection errors**: Check if you need IPv4 add-on or use session pooler
4. **API key errors**: Ensure keys are correctly copied without extra spaces

### Verification Commands
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- View default categories (after user signup)
SELECT name, color FROM categories LIMIT 10;
```