-- Moroccan Education System Structure (Bilingual)
-- Populate study_levels table with Moroccan education levels in Arabic and French

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM study_levels;

-- Insert Moroccan education levels with bilingual names
INSERT INTO study_levels (name, description, order_index) VALUES
-- Pre-school (Préscolaire / الروض)
('Petite Section - الروض الأولى', 'Petite Section (3 سنوات) - Jardin d''enfants / روض الأطفال', 1),
('Moyenne Section - الروض الثانية', 'Moyenne Section (4 سنوات) - Jardin d''enfants / روض الأطفال', 2),
('Grande Section - الروض الثالثة', 'Grande Section (5 سنوات) - Jardin d''enfants / روض الأطفال', 3),

-- Primary School (Enseignement primaire / التعليم الابتدائي)
('1ère Année Primaire - السنة الأولى ابتدائي', '1ère année primaire - Cours préparatoire / السنة التحضيرية', 4),
('2ème Année Primaire - السنة الثانية ابتدائي', '2ème année primaire - Cours élémentaire 1ère année / الدورة الابتدائية السنة الأولى', 5),
('3ème Année Primaire - السنة الثالثة ابتدائي', '3ème année primaire - Cours élémentaire 2ème année / الدورة الابتدائية السنة الثانية', 6),
('4ème Année Primaire - السنة الرابعة ابتدائي', '4ème année primaire - Cours moyen 1ère année / الدورة المتوسطة السنة الأولى', 7),
('5ème Année Primaire - السنة الخامسة ابتدائي', '5ème année primaire - Cours moyen 2ème année / الدورة المتوسطة السنة الثانية', 8),
('6ème Année Primaire - السنة السادسة ابتدائي', '6ème année primaire - Cours moyen 3ème année / الدورة المتوسطة السنة الثالثة', 9),

-- Middle School (Collège / الإعدادي)
('7ème Année - السنة السابعة', '7ème année - 1ère année collège / السنة الأولى إعدادي', 10),
('8ème Année - السنة الثامنة', '8ème année - 2ème année collège / السنة الثانية إعدادي', 11),
('9ème Année - السنة التاسعة', '9ème année - 3ème année collège / السنة الثالثة إعدادي', 12),

-- High School (Lycée / الثانوي)
('10ème Année - السنة العاشرة', '10ème année - 1ère année lycée / السنة الأولى ثانوي', 13),
('11ème Année - السنة الحادية عشرة', '11ème année - 2ème année lycée / السنة الثانية ثانوي', 14),
('12ème Année - السنة الثانية عشرة', '12ème année - Terminale / السنة النهائية', 15),

-- Baccalaureate (Baccalauréat / البكالوريا)
('Baccalauréat Scientifique - بكالوريا علمي', 'Baccalauréat Sciences Mathématiques A / البكالوريا الرياضيات والعلوم', 16),
('Baccalauréat Littéraire - بكالوريا أدبي', 'Baccalauréat Lettres et Sciences Humaines / البكالوريا الأدبي والعلوم الإنسانية', 17),
('Baccalauréat Économique - بكالوريا اقتصادي', 'Baccalauréat Sciences Économiques et Sociales / البكالوريا الاقتصادي والاجتماعي', 18),
('Baccalauréat Technique - بكالوريا تقني', 'Baccalauréat Sciences et Technologies / البكالوريا التقني', 19)

ON CONFLICT (name) DO NOTHING;

-- Display the inserted data
SELECT name, description, order_index
FROM study_levels
ORDER BY order_index;