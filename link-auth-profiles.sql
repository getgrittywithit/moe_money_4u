-- Function to link new auth users to existing profiles
CREATE OR REPLACE FUNCTION link_auth_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find existing profile with same email
  UPDATE profiles 
  SET user_id = NEW.id 
  WHERE email = NEW.email AND user_id IS NULL;
  
  -- If no existing profile was found, this was a new user
  -- (In your case, you probably want to prevent new signups)
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to run after user signup
DROP TRIGGER IF EXISTS link_user_to_profile_trigger ON auth.users;
CREATE TRIGGER link_user_to_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_auth_user_to_profile();

-- Manual linking function (if needed)
CREATE OR REPLACE FUNCTION manually_link_user_to_profile(user_email TEXT, auth_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE profiles 
  SET user_id = auth_user_id 
  WHERE email = user_email AND user_id IS NULL;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$ language 'plpgsql';