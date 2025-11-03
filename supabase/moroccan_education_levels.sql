-- Moroccan Education System Structure - Complete Levels
-- Populate study_levels table with Moroccan education levels

-- First, ensure we have a unique constraint on name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'study_levels'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%name%'
  ) THEN
    ALTER TABLE study_levels ADD CONSTRAINT study_levels_name_unique UNIQUE (name);
    RAISE NOTICE 'Added unique constraint on study_levels.name';
  END IF;
END $$;

-- Insert complete Moroccan education levels
INSERT INTO study_levels (name, description, order_index) VALUES
('7ème Année - السنة السابعة', '7ème année - 1ère année collège / السنة الأولى إعدادي', 1),
('8ème Année - السنة الثامنة', '8ème année - 2ème année collège / السنة الثانية إعدادي', 2),
('9ème Année - السنة التاسعة', '9ème année - 3ème année collège / السنة الثالثة إعدادي', 3),
('Tronc Commun - الجذع المشترك', 'Tronc Commun - Common Core / الجذع المشترك', 4),
('1ère Année Bac - السنة الأولى بكالوريا', '1ère Année Baccalauréat / السنة الأولى بكالوريا', 5),
('2ème Année Bac - السنة الثانية بكالوريا', '2ème Année Baccalauréat / السنة الثانية بكالوريا', 6),
('Bac Libre - البكالوريا الحرة', 'Baccalauréat Libre - Free Candidate / البكالوريا الحرة', 7)

ON CONFLICT (name) DO NOTHING;

-- Display the inserted data
SELECT name, description, order_index
FROM study_levels
ORDER BY order_index;