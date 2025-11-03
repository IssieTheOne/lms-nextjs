# 🇲🇦 Moroccan Education Structure — LMS Data Blueprint

## 🎯 Purpose
This document defines the **Moroccan educational structure** to seed your LMS database.  
It includes **study levels (niveaux d’études)**, **languages**, **specialties**, and **courses**, aligned with Morocco’s official education system from **Collège** to **Lycée**, including **BIOF** bilingual programs.

---

## 🧱 Hierarchy Overview
```
Study Level → Language → Specialty → Course → Section → Lesson → Quiz
```

| Entity | Description |
|--------|--------------|
| **Study Level** | Equivalent to “Niveau d’Études.” Examples: Tronc Commun, 1st BAC, 2nd BAC. Not a time period (e.g. not 2024–2025). |
| **Language** | Teaching track (Arabic, BIOF, or English). |
| **Specialty** | Academic focus (e.g., Sciences Physiques, Lettres Modernes). |
| **Course** | Subject taught in a specialty (Physics, Math, Economics…). |

---

## 🏫 Moroccan Education Levels

| # | Study Level (EN) | French Equivalent |
|--|-------------------|------------------|
| 1 | Middle School Year 1 | Collège 1ère année |
| 2 | Middle School Year 2 | Collège 2ème année |
| 3 | Middle School Year 3 | Collège 3ème année |
| 4 | Common Core | Tronc Commun |
| 5 | 1st Year Baccalaureate | 1ère Année Bac |
| 6 | 2nd Year Baccalaureate | 2ème Année Bac |
| 7 | Free Candidate | Bac Libre |

---

## 🗣️ Languages

| Code | Name | Description |
|------|------|--------------|
| `ar` | Arabic | Standard Moroccan program in Arabic |
| `biof` | BIOF | “Bilingue Option Français” — bilingual French science program |
| `en` | English | English bilingual track |

---

## 🎓 Specialties per Level

| Level | Languages | Specialties |
|--------|------------|-------------|
| Collège (1–3 years) | Arabic / BIOF | General Education |
| Tronc Commun | Arabic / BIOF | Common Core Science, Common Core Letters |
| 1ère Année Bac | Arabic / BIOF | Sciences Physiques, Sciences Math A, Sciences Économiques, Lettres et Humanités |
| 2ème Année Bac | Arabic / BIOF | Sciences Physiques, Math A, Math B, SVT, Éco, Lettres Modernes, Philosophie |
| Bac Libre | Arabic / BIOF | All above |

---

## 📚 Courses by Specialty

### Common Core Science
- Mathematics  
- Physics & Chemistry  
- Biology  
- History & Geography

### Common Core Letters
- Arabic Language  
- French Language  
- English Language  
- History & Geography  
- Islamic Education

### Sciences Physiques
- Physics  
- Chemistry  
- Mathematics  

### Sciences Math A
- Advanced Mathematics  
- Physics  
- Informatics  

### Sciences Économiques
- Economics  
- Management Accounting  
- Law  
- Statistics  

### Lettres et Humanités
- Arabic Literature  
- French Literature  
- English Language  
- History & Geography  
- Philosophy  

---

## 🌍 Language Mapping

| Course | Arabic | BIOF |
|---------|---------|------|
| Physics | الفيزياء | Physique |
| Mathematics | الرياضيات | Mathématiques |
| Economics | الاقتصاد | Économie |
| History | التاريخ | Histoire |

---

## 💾 Supabase SQL Seeding Script

```sql
-- STUDY LEVELS
insert into study_levels (name, description) values
('Middle School Year 1', 'First year of collège in Morocco'),
('Middle School Year 2', 'Second year of collège in Morocco'),
('Middle School Year 3', 'Third year of collège in Morocco'),
('Common Core', 'Tronc Commun level'),
('1st Year Baccalaureate', 'First year of lycée'),
('2nd Year Baccalaureate', 'Second year of lycée'),
('Free Candidate', 'Independent study program');

-- LANGUAGES
insert into languages (name, code) values
('Arabic', 'ar'),
('BIOF', 'biof'),
('English', 'en');

-- SPECIALTIES
insert into specialties (name, language_id)
select 'Sciences Physiques', id from languages where code = 'biof';
insert into specialties (name, language_id)
select 'Sciences Math A', id from languages where code = 'biof';
insert into specialties (name, language_id)
select 'Sciences Économiques', id from languages where code = 'biof';
insert into specialties (name, language_id)
select 'Lettres et Humanités', id from languages where code = 'ar';
insert into specialties (name, language_id)
select 'Common Core Science', id from languages where code = 'ar';
insert into specialties (name, language_id)
select 'Common Core Letters', id from languages where code = 'ar';
```

---

## 🧭 Developer Notes

- Use **English** table and field names for backend clarity.  
- Display **localized names** (Arabic/French) on frontend.  
- “Study Level” (`study_levels`) represents **Niveau d’Études**, not a school year like “2024–2025.”  
- Keep course–specialty relationships **many-to-many** for flexibility.  
- Use this file as your **initial seed dataset** for Supabase after your first push.

---

## ✅ Outcome

- Admin dashboard shows the full Moroccan education tree.  
- Students auto-enrolled based on study level and specialty.  
- Parents and teachers can track progress by real Moroccan curriculum.  
- AI and analytics modules can contextualize learning per level and specialty.

