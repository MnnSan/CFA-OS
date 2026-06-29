# REVISION ENGINE: CFA Level III Operating System

This document outlines the design and mathematical specifications of the **Revision Engine**.

---

## 1. Engine Overview

The **Revision Engine** implements algorithmic spaced repetition to prevent memory decay of CFA Level III concepts. Instead of forcing candidates to choose what to review, it compiles a daily dynamic "Due for Revision" queue based on active study performance.

---

## 2. Core Scheduling Algorithm: Modified SM-2

We implement an adaptation of the **SuperMemo-2 (SM-2)** scheduling algorithm. It updates the **Easiness Factor (EF)** and calculates the next review interval in days based on the candidate's post-session qualitative confidence rating ($q$).

### 1. Variables:
* $q$: Confidence rating ($1$ to $5$ scale, where $1 = \text{complete blackout}$, $5 = \text{effortless recall}$).
* $n$: Consecutive successful repetitions (count of reviews where $q \ge 3$).
* $EF$: Easiness factor (starting default value $= 2.5$).
* $I$: Interval in days before the next review.

### 2. Formulas:

#### Step A: Calculate Easiness Factor (EF)
When the student logs a confidence score $q \ge 3$, the Easiness Factor is adjusted:
$$EF' = \max\left(1.3, \; EF + \left(0.1 - (5 - q) \times \left(0.08 + (5 - q) \times 0.02\right)\right)\right)$$

If the candidate scores $q < 3$, indicating memory lapse, the Easiness Factor ($EF$) is preserved, but the repetition count ($n$) resets.

#### Step B: Calculate Review Interval ($I$) in days
The number of days to wait before the next review session ($I$) is determined by the repetition count ($n$):

$$
I = \begin{cases} 
1 & \text{for } n = 1 \\ 
6 & \text{for } n = 2 \\ 
\text{round}(I_{\text{previous}} \times EF) & \text{for } n > 2 
\end{cases}
$$

If $q < 3$ (failed recall):
* The repetition count resets to $n = 0$.
* The review interval resets to $I = 1$ day.
* The next review date is scheduled for tomorrow.

---

## 3. Leitner Box System

To simplify visual progress, the 5 confidence levels and review intervals map directly to a **Leitner Box System**:

| Box Number | Target Interval | Scheduling Target | Meaning |
| :--- | :--- | :--- | :--- |
| **Box 1** | 1 Day | `nextReview = Today + 1 day` | Unstable memory / New cards |
| **Box 2** | 3 Days | `nextReview = Today + 3 days` | Early retention / Shaking concepts |
| **Box 3** | 7 Days | `nextReview = Today + 7 days` | Intermediate memory |
| **Box 4** | 14 Days | `nextReview = Today + 14 days` | High retention |
| **Box 5** | 30 Days | `nextReview = Today + 30 days` | Long-term memory / Mastered |

### Box Transition Rules:
* **Successful Recall ($q \ge 4$)**: The item moves up one box (e.g., Box 2 $\rightarrow$ Box 3), increasing the interval.
* **Neutral Recall ($q = 3$)**: The item remains in its current Box, but its interval is updated using the $EF$ multiplier.
* **Lapse ($q \le 2$)**: The item drops immediately back to **Box 1** (interval $= 1$ day) regardless of its previous box tier.

---

## 4. Daily Revision Queue Logic

At dashboard initialization, the Revision Engine executes the following filtering query to build the active revision queue:

$$\text{Filter LOS items where } \texttt{nextReview} \le \text{Current Date} \quad \text{OR} \quad (\texttt{status} = \text{'Completed'} \text{ AND } \texttt{nextReview} \text{ is undefined})$$

This list is ordered by urgency:
1. **Lapsed Items**: Box 1 items overdue.
2. **Older Reviews**: Items with the oldest `lastReviewed` timestamps.
3. **Weight-Based Priority**: Items linked to subjects with higher exam weightings (e.g., Portfolio Management).
