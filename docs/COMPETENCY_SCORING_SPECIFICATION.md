# MATHEMATICAL COMPETENCY SCORING ENGINE SPECIFICATION

**Document Reference:** `DOC-ENG-003`  
**System:** TalentAI Multidimensional Competency & Evidence Aggregation Engine  
**Module:** `src/lib/competency/scoring.ts`  
**Classification:** Core Mathematical Specification  
**Status:** Validated & Production Ready

---

## 1. Foundational Axioms & Mathematical Invariants

Traditional recruitment platforms suffer from score inflation caused by self-reported skills and unverified resume parsing. The TalentAI Competency Engine implements a mathematically defensible evaluation framework based on five foundational axioms:

### Axiom 1: The Demonstration Invariant (Anti-Inflation)
$$\text{Demonstrated Score} = f(\text{Tier 3, Tier 4, Tier 5 Evidence})$$
Self-claims (Tier 1) and raw resume text extraction (Tier 2) are mathematically barred from increasing a candidate's `demonstratedScore`:
$$\forall s \in \text{Skills}, \quad \text{Tiers}(s) \subseteq \{\text{Tier 1}, \text{Tier 2}\} \implies \text{demonstratedScore}(s) = 0$$

### Axiom 2: Strict Separation of Claimed vs. Demonstrated Proficiency
Every competency maintains two distinct dimensions:
- `claimedScore`: The self-asserted or extracted proficiency baseline ($0 \le \text{claimedScore} \le 100$).
- `demonstratedScore`: The mathematically corroborated proficiency score ($0 \le \text{demonstratedScore} \le 100$).

### Axiom 3: Uncertainty Monotonicity
Uncertainty is inversely proportional to evidence corroboration across the 5-tier hierarchy:
$$\text{Uncertainty}(s) = 100 - \text{Confidence}(s)$$
Purely claimed skills exhibit $\text{Uncertainty} = 100\%$, which decreases strictly monotonically as project evidence, external credentials, and sandboxed assessments are fulfilled.

---

## 2. The 5-Tier Evidence Hierarchy

| Tier | Name | Description | Source | Demonstrated Weight | Confidence Addition |
|:---:|:---|:---|:---|:---:|:---:|
| **1** | Self-Claimed | Candidate profile declarations | Profile Form | $0.0$ (Excluded) | $+0\%$ |
| **2** | Raw Extracted | Resume keyword extraction | PDF Parser | $0.0$ (Excluded) | $+0\%$ |
| **3** | Project-Supported | Repository analysis, GitHub artifacts | Code Review / Git | $0.4$ | $+25\%$ |
| **4** | Verified External | Educational registrar, credential APIs | Third-Party APIs | $0.7$ | $+35\%$ |
| **5** | Assessed | Sandboxed coding, AI technical interviews | Platform Evaluation | $1.0$ | $+40\%$ |

---

## 3. Mathematical Formulas

### 3.1 Individual Competency Demonstrated Score
For a given skill $s$, let:
- $P_s \in [0, 100]$ be the project-supported score (weight $w_p = 0.4$)
- $V_s \in [0, 100]$ be the independently verified score (weight $w_v = 0.7$)
- $A_s \in [0, 100]$ be the rigorously assessed score (weight $w_a = 1.0$)

The demonstrated score $D_s$ is given by:
$$D_s = \begin{cases} 
\text{round}\left( \frac{\sum_{i \in \{p, v, a\}} w_i \cdot S_{i, s}}{\sum_{i \in \{p, v, a\}} w_i} \right) & \text{if } \sum w_i > 0 \\ 
0 & \text{otherwise} 
\end{cases}$$

### 3.2 Confidence Calibration & Uncertainty
Confidence $C_s \in [0, 100]$ is computed additively based on corroborating tiers present:
$$C_s = \min\left(100, \sum_{t \in \text{Tiers}(s)} \Delta C_t\right)$$
where $\Delta C_{\text{project}} = 25$, $\Delta C_{\text{verified}} = 35$, $\Delta C_{\text{assessed}} = 40$.
The calibrated uncertainty is then:
$$U_s = 100 - C_s$$

### 3.3 Competency Status Classification
Competencies are deterministically partitioned into five operational statuses:
$$\text{Status}(s) = \begin{cases}
\text{unassessed\_claimed} & \text{if } C_s = 0 \\
\text{assessed\_strong} & \text{if } D_s \ge 80 \land C_s > 0 \\
\text{assessed\_competent} & \text{if } 60 \le D_s < 80 \land C_s > 0 \\
\text{assessed\_weak} & \text{if } D_s < 60 \land C_s > 0 \\
\text{insufficient\_evidence} & \text{if } D_s = 0 \land C_s > 0
\end{cases}$$

### 3.4 Overall Profile Proficiency & Evidence Integrity
For candidate profile $P$ with $N = |S|$ skills:
- **Overall Proficiency:**
  $$\bar{D}_P = \frac{1}{N} \sum_{s \in S} D_s$$
- **Evidence Integrity Score:**
  $$I_P = \frac{1}{N} \sum_{s \in S} \text{Integrity}(s)$$
  where $\text{Integrity}(s) = 100$ if verified or assessed, $60$ if project-supported, and $10$ if purely claimed.

---

## 4. Verification & Unit Test Corroboration

The mathematical invariants are verified in `tests/unit/scoring.test.ts`:
1. **Invariant 1:** Claimed skills (`['Python', 'Docker', 'Kubernetes']`) produce $D = 0$, $C = 0$, $U = 100$, and status `'unassessed_claimed'`.
2. **Invariant 2:** Multi-tier evidence (project $77$ with weight $0.4$ + assessed $100$ with weight $1.0$) yields $D = \text{round}((30.8 + 100)/1.4) = 93$, $C = 65$, $U = 35$, and status `'assessed_strong'`.
3. **Invariant 3:** Adding verified credentials monotonically increases confidence without corrupting demonstrated score.
