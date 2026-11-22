# TalentAI Assessment Methodology & Competency Framework

## 1. Five-Tier Evidence Hierarchy

TalentAI does not treat resume keyword mentions as verified competency. All skills and achievements are partitioned into 5 deterministic evidence tiers:

| Tier | Classification | Weight | Description |
| :--- | :--- | :---: | :--- |
| **Tier 1** | `claimed` | 0.10 | Self-asserted by candidate in a profile or uncontextualized skills list. |
| **Tier 2** | `extracted` | 0.20 | Mentioned within employment history, responsibilities, or bullet points. |
| **Tier 3** | `project_supported` | 0.40 | Corroborated by architectural descriptions, git repositories, or open-source commits. |
| **Tier 4** | `verified` | 0.70 | Authenticated independently via third-party registrars, certifications, or employment verifiers. |
| **Tier 5** | `assessed` | 1.00 | Demonstrated live via deterministic coding sandbox test cases or rubric-scored technical interviews. |

---

## 2. Multi-Dimensional Competency Model

Every engineering competency distinguishes:
1. **Claimed Score**: Baseline assertion (e.g. 50%).
2. **Demonstrated Score**: Evidence-weighted formula across tiers:
   $$\text{Demonstrated Score} = \frac{\sum (S_i \times W_i)}{\sum W_i}$$
3. **Verification State**: `unverified` | `partially_verified` | `verified` | `refuted`.
4. **Evidence Coverage**: Percentage of the 5 tiers with concrete evidence (0% to 100%).
5. **Confidence & Uncertainty**: Higher confidence (and lower uncertainty) is awarded when verified and assessed tiers corroborate lower-tier claims.
6. **Competency Status**: Distinguishes unassessed competencies (`unassessed_claimed`) from assessed weaknesses (`assessed_weak`), ensuring recruiters see missing evidence rather than concealed gaps.

---

## 3. 16-Role Engineering Taxonomy

The platform standardizes benchmarks across 16 primary engineering disciplines:
1. Software Engineer
2. Frontend Engineer
3. Backend Engineer
4. Full-Stack Engineer
5. AI Engineer
6. Machine Learning Engineer
7. Data Scientist
8. Data Engineer
9. Computer Vision Engineer
10. NLP Engineer
11. DevOps Engineer
12. Cloud Engineer
13. MLOps Engineer
14. Cybersecurity Engineer
15. QA Automation Engineer
16. Site Reliability Engineer

Each role evaluates weighted mandatory requirements, candidate coverage scores, compatibility percentages, and actionable growth pathways.
