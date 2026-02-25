## Band-Based Pay Model Migration

### Goal Description
Replaced the Tailor percentage uplift payment logic with a Band-based pay model (Band A / Band B). Eliminated runtime percentage-based uplifts and bonuses, driving pay purely from static band tiers initialized in the Rate Card and mapped to each Tailor. Added snapshot records to Task items tracking the exact Band and Pay rate used at assignment time for immutable payroll generation.

### Proposed Changes

#### [MODIFY] `src/services/mockData.js`
- Added `band` (A or B) property to Tailor mock data, nullified legacy percentage and special task configs.
- Swapped RateCard `base_fee` array objects with `band_a_fee` and `band_b_fee` columns.

#### [MODIFY] `src/services/db.js`
- Deprecated percentage math rules from the creation logic for `createTailor`, mapping `band` correctly.
- Removed legacy math for percentage additions within `createTask`, directly assigning the correct `band_a_fee` or `band_b_fee` mapped from the matching Tailor selection.
- Stamped `pay_band_snapshot`, `rate_snapshot`, and standard `task_pay` onto tasks for payroll tracking.
- Simplified `getWeeklyPayroll` iterator to omit bonus calculations.

#### [MODIFY] `src/pages/Admin/Tailors.jsx`
- Transformed Tailors UI, swapping percentages for Band settings. 
- Removed all UI components connected to "Manage Special Pay".

#### [MODIFY] `src/pages/Admin/TaskTypes.jsx`
- Upgraded Admin Task Types components to intake and render distinct Band A and Band B flat rates per record.

#### [MODIFY] `src/pages/QC/ManageItemTasks.jsx`
- Upgraded the QC Item assignment UI form out of the dynamic percentage calculator to specifically reference and render the Tailor Band format matching the user’s updated request.

#### [MODIFY] `src/pages/Dashboard/Dashboard.jsx` (Hotfix)
- Removed `.toLocaleString()` payload mapping applied explicitly to the deprecated `weekly_bonus_amount` to prevent React render crashing.

### Verification Plan
- Used automated Browser test subagent navigating Admin views to capture verification screenshots (added to Walkthrough logic) that verified distinct A/B mapping on rates and tailors workflows without console errors.
