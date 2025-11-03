-- Add remaining Moroccan education levels (Lycée)
-- Run this in Supabase SQL Editor to add the lycée levels

-- First, update existing entries to have proper bilingual names
UPDATE study_levels
SET name = 'Tronc Commun - الجذع المشترك',
    description = 'Tronc Commun - Common Core / الجذع المشترك',
    order_index = 4
WHERE name = 'Tronc Commun';

UPDATE study_levels
SET name = '2ème Année Bac - السنة الثانية بكالوريا',
    description = '2ème Année Baccalauréat / السنة الثانية بكالوريا',
    order_index = 6
WHERE name = '2eme annee bac';

-- Then insert new lycée levels (these will be added if they don't exist)
INSERT INTO study_levels (name, description, order_index) VALUES
('1ère Année Bac - السنة الأولى بكالوريا', '1ère Année Baccalauréat / السنة الأولى بكالوريا', 5),
('Bac Libre - البكالوريا الحرة', 'Baccalauréat Libre - Free Candidate / البكالوريا الحرة', 7)

ON CONFLICT (name) DO NOTHING;

-- Display all study levels ordered by index
SELECT name, description, order_index
FROM study_levels
ORDER BY order_index;