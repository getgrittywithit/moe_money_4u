# Moe Money 4U - AI Financial Buddy

## Project Overview
Expense tracking application with AI-powered receipt processing and categorization. Built with Next.js 15, Supabase, and multiple AI services.

## Current Architecture
- **Frontend:** Next.js 15.4.2 with TypeScript
- **Database:** Supabase PostgreSQL with Row Level Security
- **Authentication:** Supabase Auth with profile-based system
- **Deployment:** Vercel
- **Storage:** Supabase Storage for receipt images

## AI Integration - Phase 1: Transaction Categorizer

### Purpose
Automatically process receipt images, extract line items, categorize transactions using existing categories, and handle receipt splitting for multi-category purchases.

### Technology Stack
- **OCR:** Google Cloud Vision API
- **AI Categorization:** OpenAI GPT-4
- **Email Processing:** Gmail API
- **Image Storage:** Supabase Storage

### Environment Variables Required
```
# Google Cloud APIs
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key
GOOGLE_CLOUD_PROJECT_ID=moe-money
GOOGLE_OAUTH_CLIENT_ID=your_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_oauth_client_secret

# OpenAI
OPENAI_API_KEY=your_openai_key

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Database Schema Extensions

#### Expenses Table Updates
```sql
-- Add fields for receipt processing and splitting
ALTER TABLE expenses ADD COLUMN parent_transaction_id UUID REFERENCES expenses(id);
ALTER TABLE expenses ADD COLUMN is_split_transaction BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN receipt_image_url TEXT;
ALTER TABLE expenses ADD COLUMN split_line_items JSONB;
ALTER TABLE expenses ADD COLUMN ai_confidence_score INTEGER;
```

### Expense Categories (Static List)
The AI categorizer must use ONLY these existing categories:
1. Food & Dining
2. Gas & Fuel
3. Groceries
4. Shopping
5. Entertainment
6. Bills & Utilities
7. Healthcare
8. Travel
9. Education
10. Personal Care
11. Home Improvement
12. Automotive
13. Insurance
14. Taxes
15. Investments
16. Gifts & Donations
17. Business Expenses
18. Pet Care
19. Subscriptions
20. Banking Fees
21. Legal
22. Childcare
23. Clothing
24. Electronics
25. Books & Supplies
26. Fitness & Recreation
27. Beauty & Spa
28. Online Shopping
29. Cash & ATM
30. Transfer
31. Income
32. Refund
33. Other
34. Uncategorized

### Business Classes
For expense_type classification:
- `triton` - Triton business
- `grit_collective` - Grit Collective business  
- `mermaid` - Mermaid business
- `pantrypal_pro` - PantryPal Pro business
- `boernes_handy_hub` - Boerne's Handy Hub business
- `null` - Personal expenses

### API Endpoints to Implement

#### 1. Receipt Upload & Processing
- `POST /api/receipts/upload` - Upload receipt image to Supabase Storage
- `POST /api/receipts/process` - OCR processing with Google Vision API
- `POST /api/receipts/categorize` - AI categorization with OpenAI

#### 2. Transaction Management  
- `POST /api/receipts/approve` - User approval of AI-suggested categorizations
- `GET /api/receipts/pending` - Get pending transactions awaiting approval
- `POST /api/receipts/split` - Create split transactions with parent-child relationships

#### 3. Gmail Integration
- `POST /api/gmail/scan` - Scan Gmail for new receipt emails
- `POST /api/gmail/process` - Process receipt attachments from emails

### AI Categorizer Instructions
```
You are a transaction categorizer for expense tracking. Your job is to:

1. Analyze receipt text or transaction descriptions
2. Categorize each line item using ONLY the provided category list
3. For receipts with multiple categories, split line by line
4. Assign confidence scores (0-100) for each categorization
5. NEVER create new categories - use "Uncategorized" if uncertain
6. For split receipts, ensure line item totals match parent transaction total
7. Leave business_class assignment to user (don't auto-assign)

Input: Receipt text + transaction amount + category list
Output: Array of categorized line items with amounts and confidence scores
```

### Receipt Splitting Example
```
Parent Transaction: WALMART #1234 - $127.43
├── Child 1: Groceries - $67.23 (milk, bread, eggs)
├── Child 2: Household Items - $35.15 (detergent, paper towels)
└── Child 3: Electronics - $25.05 (USB cable)
```

### Processing Flow
1. **Upload:** User uploads receipt image or system detects from Gmail
2. **OCR:** Google Vision extracts text from receipt
3. **AI Analysis:** OpenAI categorizes line items using static category list
4. **Review:** User sees suggested categorizations with confidence scores
5. **Approval:** User approves/modifies categories, assigns business class
6. **Storage:** Create parent transaction and child splits in database
7. **Display:** Show in General Ledger with expandable parent-child view

### UI Components Required
- Receipt upload interface in Import/Export tab
- Transaction approval queue showing AI suggestions  
- Split transaction editor for multi-category receipts
- Parent-child transaction display in General Ledger with expand/collapse
- Confidence score indicators for AI suggestions

### Security Considerations
- Gmail OAuth requires user consent for email access
- Receipt images stored securely in Supabase Storage with RLS
- API keys restricted to specific services only
- User can only access their own transactions via RLS policies

### Testing Commands
```bash
# Build and test
npm run build
npm run lint
npm run typecheck

# Local development
npm run dev
```

### Deployment Notes
- All environment variables configured in Vercel
- OAuth redirect URIs configured for production domain
- Google Cloud APIs enabled with proper restrictions
- Supabase RLS policies ensure data isolation per user

---

## Development Status
- ✅ Core expense tracking system
- ✅ Left navigation with General Ledger
- ✅ Inline expense entry
- ✅ Business class tracking
- 🚧 Phase 1: AI Transaction Categorizer (in progress)
- ⏳ Phase 2: Financial Coach Chat
- ⏳ Phase 3: Quick Assistant

## User Profile
- Email: mosestx2008@gmail.com
- Profile ID: Links to existing family management database
- Business tracking for 5 different businesses
- Processes weekly expense CSVs and email receipts