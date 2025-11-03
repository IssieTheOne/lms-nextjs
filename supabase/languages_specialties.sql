-- Moroccan Languages and Specialties
-- Run this in Supabase SQL Editor to populate languages and specialties tables

-- Insert languages with bilingual names
INSERT INTO languages (name, code) VALUES
('العربية - Arabic', 'ar'),
('BIOF - الفرنسية ثنائية اللغة', 'biof'),
('English - الإنجليزية', 'en')

ON CONFLICT (code) DO NOTHING;

-- Insert specialties for each language and level
-- Note: specialties are linked to languages, not directly to study levels

-- Arabic Language Specialties (العربية)
INSERT INTO specialties (name, language_id) VALUES
-- Collège/General Education
('التعليم العام - General Education', (SELECT id FROM languages WHERE code = 'ar')),

-- Tronc Commun
('العلوم المشتركة - Common Core Science', (SELECT id FROM languages WHERE code = 'ar')),
('الآداب المشتركة - Common Core Letters', (SELECT id FROM languages WHERE code = 'ar')),

-- 1ère Année Bac
('العلوم الفيزيائية - Sciences Physiques', (SELECT id FROM languages WHERE code = 'ar')),
('الرياضيات أ - Sciences Math A', (SELECT id FROM languages WHERE code = 'ar')),
('العلوم الاقتصادية - Sciences Économiques', (SELECT id FROM languages WHERE code = 'ar')),
('الآداب والعلوم الإنسانية - Lettres et Humanités', (SELECT id FROM languages WHERE code = 'ar')),

-- 2ème Année Bac (additional specialties)
('الرياضيات ب - Math B', (SELECT id FROM languages WHERE code = 'ar')),
('علوم الحياة والأرض - SVT', (SELECT id FROM languages WHERE code = 'ar')),
('الاقتصاد - Éco', (SELECT id FROM languages WHERE code = 'ar')),
('الآداب الحديثة - Lettres Modernes', (SELECT id FROM languages WHERE code = 'ar')),
('الفلسفة - Philosophie', (SELECT id FROM languages WHERE code = 'ar'))

ON CONFLICT DO NOTHING;

-- BIOF Specialties (French bilingual program)
INSERT INTO specialties (name, language_id) VALUES
-- Collège/General Education
('Enseignement Général - التعليم العام', (SELECT id FROM languages WHERE code = 'biof')),

-- Tronc Commun
('Tronc Commun Sciences - العلوم المشتركة', (SELECT id FROM languages WHERE code = 'biof')),
('Tronc Commun Lettres - الآداب المشتركة', (SELECT id FROM languages WHERE code = 'biof')),

-- 1ère Année Bac
('Sciences Physiques - العلوم الفيزيائية', (SELECT id FROM languages WHERE code = 'biof')),
('Mathématiques A - الرياضيات أ', (SELECT id FROM languages WHERE code = 'biof')),
('Sciences Économiques - العلوم الاقتصادية', (SELECT id FROM languages WHERE code = 'biof')),
('Lettres et Humanités - الآداب والعلوم الإنسانية', (SELECT id FROM languages WHERE code = 'biof')),

-- 2ème Année Bac (additional specialties)
('Mathématiques B - الرياضيات ب', (SELECT id FROM languages WHERE code = 'biof')),
('SVT - علوم الحياة والأرض', (SELECT id FROM languages WHERE code = 'biof')),
('Économie - الاقتصاد', (SELECT id FROM languages WHERE code = 'biof')),
('Lettres Modernes - الآداب الحديثة', (SELECT id FROM languages WHERE code = 'biof')),
('Philosophie - الفلسفة', (SELECT id FROM languages WHERE code = 'biof'))

ON CONFLICT DO NOTHING;

-- English Language Specialties (for bilingual English track)
INSERT INTO specialties (name, language_id) VALUES
('English Bilingual Program - البرنامج الثنائي اللغة الإنجليزية', (SELECT id FROM languages WHERE code = 'en'))

ON CONFLICT DO NOTHING;

-- Display the inserted data
SELECT
  l.name as language_name,
  l.code as language_code,
  s.name as specialty_name
FROM languages l
LEFT JOIN specialties s ON l.id = s.language_id
ORDER BY l.code, s.name;