INSERT INTO public.user_profiles (id, email, full_name, role, department)
VALUES (
  'f1968eae-31d8-4d3e-8378-851d3dee6754',
  'gtclements1993@gmail.com',
  'Gary Clements',
  'associate',
  'both'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'associate', 
    department = 'both',
    full_name = 'Gary Clements';
