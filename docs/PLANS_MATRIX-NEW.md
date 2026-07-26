# Plans & Feature Matrix

## Plan Names

| Tier | Arabic Name | English | Tagline |
|------|-------------|---------|---------|
| 1 | **مبتدئ** | Beginner | مجانية — ابدأ رحلتك التعليمية |
| 2 | **محترف** | Professional | أساسية — ارتقِ بتجربتك |
| 3 | **خبير** | Expert | متقدمة — تميز بلا حدود |
| 4 | **حوت** | Whale | كبرى — السيطرة الكاملة |

---

## Feature Matrix

| # | Feature | 🔵 محترف | 🟡 خبير | 🔴 حوت |
|---|---------|:---:|:---:|:---:|
| | **Resource Limits** | | | | |
| 1 | Groups |3 |10 | 30 |
| 2 | Students (total) |150 |400 | 1000 |
| 7 | File storage |50 GB | 200 GB | 500 GB |
| | **Feature Flags** | | | | |
| 9 | White-label branding |✓ |✓ | ✓ |
| 10 | Custom domain | ✓ | ✓| ✓ |
| 11 | Payment management (teacher collects) |  ✓| ✓| ✓ |
| 13 | AI agent | ✗| ✓| ✓ |
| 15 | Bulk CSV import/export | ✓ |✓ | ✓ |
| 16 | Curriculum (videos, files, rich content) |  ✓| ✓| ✓ |
| 18 | Live chat | ✓ | ✓| ✓ |
| 19 | Session notifications (WhatsApp) | ✓ | ✓| ✓ |

---

## Pricing

| Plan | Monthly | Half-Yearly | Yearly |
|------|:-------:|:-----------:|:------:|
| مبتدئ | مجاني | مجاني | مجاني |
| محترف | 350 | 1995 | 3780 |
| خبير | 550 | 3135 | 5940 |
| حوت | 950 | 5415 | 10260 |

Discounts:
- Half-Yearly = 5% Discount
- Yearly = 10% Discount

*(Fill in prices)*

---

## Upgrade Rules

- **Upgrade**: Teacher pays → admin manually changes tier → all `INACTIVE` students auto-activated
- **Downgrade**: Existing data preserved; resource limits enforced going forward; over-limit students become `INACTIVE` on next write
- **Expiry**: Tier has an expiry date — once passed, behaviour TBD (the students became INACTIVE, and the teacher's dashboared will lock till he renew the plan, no data lose at all, or downgrade plans)
