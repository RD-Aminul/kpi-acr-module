# Enterprise KPI & Performance Appraisal (ACR) Specification

## 1. Domain Problem & Business Context
In mid-to-large enterprises, employee performance evaluation is frequently hindered by disconnected spreadsheets, subjective scoring, and lack of audit trails. 

This module provides an **end-to-end, multi-stage Annual Confidential Report (ACR) and Key Performance Indicator (KPI) lifecycle management system**, integrating self-evaluations, multi-tier supervisory reviews, and administrative finalization into an auditable transactional workflow.

---

## 2. Multi-Stage Appraisal Workflow

```
[Phase 1: Target & Self-Evaluation]
     │
     ▼
1. Employee fills Annual Appraisal Form:
   - Key Activities / Major Tasks (Weights, Achievements %, Self-Rating)
   - Core Behavioral & Job Competencies
   - Training & Development Needs
   - Next Year Target Formulations
     │
     ▼
[Phase 2: Supervisory Evaluation]
     │
     ▼
2. 1st Supervisor / Appraiser:
   - Reviews employee achievements against weighted KPIs
   - Scores competencies & provides objective marks
   - Recommends training needs & future roadmap
     │
     ▼
[Phase 3: Multi-Tier Review]
     │
     ▼
3. Reviewing Authority / 2nd Appraiser:
   - Validates supervisor scores
   - Provides moderator remarks
     │
     ▼
[Phase 4: HR Finalization]
     │
     ▼
4. HR & Executive Approval:
   - Final review & composite score aggregation
   - Status updated to 'FINALIZED'
   - Feeds into annual increment, grade progression, and promotion workflows
```

---

## 3. Data Integrity & Validation Rules

1. **Weight Distribution Guard:**
   - Total weights for Key Activities must sum to exactly 100%.
   - Empty achievements or invalid percentage ranges (outside 0-100) are prevented at both the React UI level and database stored procedure level.

2. **Step Completion Enforcement:**
   - Submissions cannot proceed to the next reviewer until all required ratings and mandatory commentary fields are populated.

3. **Atomic Transactional Saves:**
   - Multi-tab modifications are committed atomically within PostgreSQL stored procedures to eliminate partial state corruption upon network failure.

---

## 4. Key Performance Formulas

- **Weighted Task Score:**
  $$\text{Score} = \sum_{i=1}^{n} \left( \frac{\text{Weight}_i}{100} \times \text{Achievement}_i \right)$$

- **Overall Appraisal Grade:**
  Mapped via dynamic scale in `kpi_reference` table (e.g., Outstanding $\ge 90\%$, Exceeds Expectations $\ge 80\%$, Meets Expectations $\ge 70\%$, Needs Improvement $< 70\%$).
