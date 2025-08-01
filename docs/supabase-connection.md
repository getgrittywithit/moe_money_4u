# Supabase Connection Details

## Project Information
- **Project ID**: `vhqgzgqklwrjmglaezmh`
- **Project URL**: `https://vhqgzgqklwrjmglaezmh.supabase.co`
- **Region**: US East 2 (AWS)

## Connection Strings

### Direct Connection (Primary Database)
```
postgresql://postgres:[YOUR-PASSWORD]@db.vhqgzgqklwrjmglaezmh.supabase.co:5432/postgres
```
- **Use Case**: Long-lived, persistent connections (VMs, containers)
- **IPv4 Compatible**: No (requires IPv6 or IPv4 add-on)
- **Features**: Dedicated connection to Postgres

### Transaction Pooler (Recommended for Serverless)
```
postgres://postgres:[YOUR-PASSWORD]@db.vhqgzgqklwrjmglaezmh.supabase.co:6543/postgres
```
- **Use Case**: Serverless functions (Vercel, Netlify)
- **IPv4 Compatible**: No (requires IPv6 or IPv4 add-on)
- **Features**: Pre-warmed connection pool
- **Limitation**: Does not support PREPARE statements

### Session Pooler (IPv4 Compatible)
```
postgresql://postgres.vhqgzgqklwrjmglaezmh:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres
```
- **Use Case**: IPv4-only networks
- **IPv4 Compatible**: Yes (free IPv4 proxy)
- **Note**: Only use when IPv6 is not available

## Environment Variables

### Production (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

### Local Development (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vhqgzgqklwrjmglaezmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

## API Keys

### Anonymous Key (Public)
- **Usage**: Client-side operations, frontend
- **Security**: Protected by Row Level Security policies
- **Location**: Supabase Dashboard → Settings → API

### Service Role Key (Secret)
- **Usage**: Server-side operations, admin tasks
- **Security**: Bypasses RLS - handle with care
- **Location**: Supabase Dashboard → Settings → API

## Database Credentials
- **Database**: `postgres`
- **Username**: `postgres`
- **Password**: `71jd4xNjFaBufBAA`
- **Host**: `db.vhqgzgqklwrjmglaezmh.supabase.co`
- **Port**: `5432` (direct) / `6543` (pooler)

## SSL Configuration
- **SSL Mode**: `require`
- **SSL Certificate**: Managed by Supabase

## Access Methods

### 1. Supabase Dashboard
- **URL**: https://supabase.com/dashboard/project/vhqgzgqklwrjmglaezmh
- **Features**: Table editor, SQL editor, Auth management

### 2. JavaScript Client
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vhqgzgqklwrjmglaezmh.supabase.co'
const supabaseKey = 'your-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)
```

### 3. Direct SQL Connection
Use any PostgreSQL client with the connection strings above.

## Network Requirements
- **IPv6**: Preferred for direct connections
- **IPv4**: Use session pooler or purchase IPv4 add-on
- **Ports**: 5432 (direct), 6543 (transaction pooler)

## Security Best Practices
1. Never expose service role key in frontend code
2. Always use `NEXT_PUBLIC_` prefix only for anon key and URL
3. Enable Row Level Security on all tables
4. Regularly rotate database password
5. Monitor usage in Supabase dashboard

## Troubleshooting
- **Connection Issues**: Check IPv4/IPv6 compatibility
- **Auth Errors**: Verify API keys in environment variables
- **RLS Errors**: Check table policies and user authentication
- **Performance**: Consider using appropriate pooler for your use case