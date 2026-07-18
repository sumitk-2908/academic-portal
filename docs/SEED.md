# Test Seed Data Setup

For local testing, avoid committing actual credentials.
Create a `.env.test.local` with:
`TEST_ADMIN_EMAIL=admin@example.com`
`TEST_ADMIN_PASSWORD=strongpassword123`

To seed the database:
1. Start local Supabase.
2. Sign up a new user via the UI.
3. Manually insert their `user_id` into the `admins` table.
4. You can now test the admin workflow.
