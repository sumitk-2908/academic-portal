-- 1. Create the mock Student user in the Auth schema
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

-- 2. Create the mock Admin user in the Auth schema
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.com', crypt('adminPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

-- 3. Assign the Admin role in your custom public tables (adjust based on your actual table structures)
INSERT INTO public.user_roles (user_id, role)
VALUES 
('11111111-1111-1111-1111-111111111111', 'student'),
('22222222-2222-2222-2222-222222222222', 'admin');

-- 4. Add the Admin to the 'admins' table so they pass the /portal-admin middleware check
INSERT INTO public.admins (user_id, email)
VALUES 
('22222222-2222-2222-2222-222222222222', 'admin@test.com');