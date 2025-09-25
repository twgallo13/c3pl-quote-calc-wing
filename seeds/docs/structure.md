### **Software Design Document: C3PL Quote Calculator (Project "Momentum")**

|  |  |
| --- | --- |
| **Document Title:** | C3PL Quote Calculator - Software Design Document |
| **Project Name:** | Project "Momentum" |
| **Version:** | **3.0 (Build-Ready)** |
| **Status:** | **Final** |
| **Date:** | September 24, 2025 |
| **Author:** | Gemini AI |

Document Control

| Version | Date | Changes |

| :--- | :--- | :--- |

| 2.0 | Sep 24, 2025 | Finalized core logic and module specifications. |

| 3.0 | Sep 24, 2025 | Incorporated all formal audit resolutions (MOM-1 to MOM-8). Locked in final data schemas, logic, and non-functional requirements. This version is cleared for build. |

---

### **Table of Contents**

1. **Introduction**
2. **System Architecture & Design**
3. **Core Business Logic (Final)**
4. **Data Schema & Models (Final)**
5. **User Workflows**
6. **Feature Specifications**
7. **Non-Functional Requirements**
8. **Testing & Acceptance Criteria**

---

### **1. Introduction**

### **1.1. Purpose**

This document provides the complete technical blueprint for the C3PL Quote Calculator, Version 3.0. It is the single source of truth for an efficient and error-free build.

### **1.2. Project Vision: "Simple but Levelled Up"**

The platform will be simple and fast for the sales team while being exceptionally powerful and strategic for management. It will accelerate the sales cycle, ensure pricing accuracy, and provide critical business intelligence.

---

### **2. System Architecture & Design**

### **2.1. Architectural Overview**

The system is a modern web application with a clear separation of concerns: a React/TypeScript frontend, a Node.js/Express.js backend, a pure TypeScript calculation engine, and a PostgreSQL database.

### **2.2. Design Principles**

- **Deterministic Math:** All financial calculations will use integer cents to prevent floating-point errors.
- **Configurability:** Pricing data (`RateCards`) is strictly separate from the calculation logic, allowing for adjustments without code changes.
- **Auditability:** All quotes are version-locked to their specific `RateCard` and version.

---

### **3. Core Business Logic (Final)**

This section defines the non-negotiable rules for the calculation engine.

### **3.1. Rounding and Precision Rule**

- **MOM-3 RESOLVED:** All intermediate financial calculations that may produce fractional cents (e.g., multiplying by a percentage) **must be rounded half-up to the nearest integer cent** immediately following the operation. Subsequent operations (e.g., `max()`) will use these post-rounded values.

### **3.2. Fulfillment Logic**

- **MOM-2 RESOLVED:** Fulfillment cost is calculated **per order** and is independent of product size. The official formula for the "Base branch" is: `baseFeeCents + (perAdditionalUnitCents * (UTP - 1))`. The final cost is `max(AOV_branch, Base_branch)`.

### **3.3. Shipping & Handling (S&H) Logic**

- **MOM-1 RESOLVED:** S&H cost is calculated **per package** based on the client's outgoing order profile, conditional on the selected `shippingModel`. The system will standardize on **`customerAccount`** (camelCase) for all data models and logic.
- **Process:**
    1. Check `ScopeInput.shippingModel`.
    2. If `'customerAccount'`, select rates from `RateCard.prices.shippingAndHandling.customerAccount`. Otherwise, use `standard`.
    3. Calculate the **Blended Average S&H Cost Per Order** using a weighted average based on `ScopeInput.shippingSizeMix`.

---

### **4. Data Schema & Models (Final)**

### **4.1. TypeScript Interfaces (v3.0)**

TypeScript

# 

`// --- Core Pricing Structures within a Rate Card ---
export interface FulfillmentPricing {
  aovPercentage: number;
  baseFeeCents: number;
  perAdditionalUnitCents: number;
}

export interface StoragePricing {
  smallUnitCents: number;
  mediumUnitCents: number;
  largeUnitCents: number;
  palletCents: number;
}

// FINALIZED: Holds both standard and customer-account S&H rates
export interface SandHPricing {
  standard: {
    smallPackageCents: number;
    mediumPackageCents: number;
    largePackageCents: number;
  };
  customerAccount: { // MOM-1 RESOLVED: Standardized to camelCase
    smallPackageCents: number;
    mediumPackageCents: number;
    largePackageCents: number;
  };
}

// --- Main Rate Card Structure ---
export interface RateCard {
  id: string;
  name: string;
  version: string;
  monthly_minimum_cents: number;
  prices: {
    fulfillment: FulfillmentPricing;
    storage: StoragePricing;
    shippingAndHandling: SandHPricing;
  };
  // ... other prices and surcharges
}

// --- User Input Structure ---
export interface ScopeInput {
  monthlyOrders: number;
  averageUnitsPerOrder: number; // UTP
  averageOrderValue: number; // AOV, in dollars
  shippingModel: 'standard' | 'customerAccount'; // MOM-1 RESOLVED: Standardized to camelCase
  shippingSizeMix: { small: number, medium: number, large: number }; // percentages
  // ... other scope details
}`

### **4.2. Physical Database Schema (SQL)**

The `RateCards` table will contain a `prices` JSONB column. The structure of this JSONB object must strictly match the `prices` object defined in the `RateCard` TypeScript interface above. All other tables (`Scenarios`, `Quotes`, etc.) follow the previously defined structure.

---

### **5. User Workflows**

- **Sales Representative:** Rapidly generates quotes using presets, "What-If" sliders, and the refined S&H model toggle.
- **Sales Manager:** Uses the robust **Client Harmonization Tool** and monitors team performance via **Analytics**.
- **Administrator:** Manages all pricing models via the dedicated **Rate Card Management** module.

---

### **6. Feature Specifications**

### **6.1. Rate Card Management Module (CUD)**

A permission-gated admin section for full Create, Update, and Delete management of all `RateCard` objects.

- **MOM-5 Related:** When updating a `RateCard`, the system will prompt for "Version Notes" (e.g., "v1.2: Increased small S&H by 10c"). This creates a new, immutable version.

### **6.2. Client Harmonization Tool (Extremely Robust)**

A strategic tool for migrating clients.

- **Interactive Tuning Dashboard:** With side-by-side comparison, warning flags, and precision discounting controls.
- **MOM-6 RESOLVED:** The "High Discount Warning" threshold is configurable in **Admin -> Settings -> Pricing Policy**, with support for a global default and per-category overrides.
- **Outputs:** Generates a new, client-specific `RateCard` and a **Harmonization Summary Report (PDF)** for audit purposes.

### **6.3. Quote Viewing Interface**

- **MOM-5 RESOLVED:** When viewing a saved quote, a **"Version-Locked" banner** will be displayed: *“This quote is locked to Rate Card: [Name] v[Version] (as of [Date]).”* A "Preview with Newer Rates" button will appear if a newer version exists.

---

### **7. Non-Functional Requirements**

### **7.1. Performance**

- **MOM-7 RESOLVED:** The following performance targets are required:
    - **Initial Dashboard Load:** < 3.0s cold / < 1.5s warm.
    - **UI Interactions (P95):** < 300ms.
    - **Slider Recalculation:** Render new totals within 16ms.

### **7.2. Accessibility**

- **MOM-8 RESOLVED:** The following success criteria are required for an accessibility pass:
    - Visible focus states for all interactive elements.
    - Key metrics that update in real-time must use `aria-live="polite"`.
    - All UI panels must be closeable via the `ESC` key.
    - The application must be fully operable via keyboard.
    - Color contrast will meet WCAG 2.2 AA standards.

---

### **8. Testing & Acceptance Criteria**

- The calculation engine must be 100% covered by unit tests, including tests for the rounding rule.
- **MOM-4 RESOLVED:** The UI must accept `shippingSizeMix` inputs that sum to between 99.5% and 100.5%, auto-normalize them, and display a non-blocking hint to the user.
- The Harmonization Tool must generate a `RateCard` that produces a quote matching the target price within 1 cent.
- The `shippingModel` toggle must correctly select and apply the `standard` or `customerAccount` rate set in the S&H calculation.

---

### **Software Design Document: C3PL Quote Calculator (Project "Momentum")**

|  |  |
| --- | --- |
| **Document Title:** | C3PL Quote Calculator - Software Design Document |
| **Project Name:** | Project "Momentum" |
| **Version:** | **3.0 (Build-Ready with Sample Data)** |
| **Status:** | **Final** |
| **Date:** | September 24, 2025 |
| **Author:** | Gemini AI |

Document Control

| Version | Date | Changes |

| :--- | :--- | :--- |

| 2.0 | Sep 24, 2025 | Finalized core logic and module specifications. |

| 3.0 | Sep 24, 2025 | Incorporated all formal audit resolutions (MOM-1 to MOM-8) and added Appendix A with sample Rate Card data for initial database seeding. |

---

## *Sections 1-8 remain the same as the previous version, defining the full scope, logic, and features. The new addition is Appendix A.*

### **Appendix A: Sample Rate Card Data**

This appendix provides sample JSON objects for three distinct Rate Cards. These can be used to seed the `RateCards` table in the database to provide immediate, functional examples for all users.

### **1. Startup Plan (rc-startup-2025)**

*Designed for new businesses with lower volume. Features a low monthly minimum with slightly higher per-unit costs.*

JSON

# 

`{
  "id": "rc-startup-2025",
  "name": "Startup Plan 2025",
  "version": "v1.0.0",
  "monthly_minimum_cents": 150000,
  "prices": {
    "fulfillment": {
      "aovPercentage": 0.05,
      "baseFeeCents": 275,
      "perAdditionalUnitCents": 95
    },
    "storage": {
      "smallUnitCents": 80,
      "mediumUnitCents": 160,
      "largeUnitCents": 275,
      "palletCents": 8500
    },
    "shippingAndHandling": {
      "standard": {
        "smallPackageCents": 325,
        "mediumPackageCents": 650,
        "largePackageCents": 1250
      },
      "customerAccount": {
        "smallPackageCents": 100,
        "mediumPackageCents": 150,
        "largePackageCents": 275
      }
    }
  }
}`

### **2. Growth Plan (rc-growth-2025)**

*The standard, balanced plan for established businesses with steady volume. This should be the default for most quotes.*

JSON

# 

`{
  "id": "rc-growth-2025",
  "name": "Growth Plan 2025",
  "version": "v1.0.0",
  "monthly_minimum_cents": 300000,
  "prices": {
    "fulfillment": {
      "aovPercentage": 0.05,
      "baseFeeCents": 250,
      "perAdditionalUnitCents": 75
    },
    "storage": {
      "smallUnitCents": 75,
      "mediumUnitCents": 150,
      "largeUnitCents": 250,
      "palletCents": 7500
    },
    "shippingAndHandling": {
      "standard": {
        "smallPackageCents": 300,
        "mediumPackageCents": 600,
        "largePackageCents": 1200
      },
      "customerAccount": {
        "smallPackageCents": 75,
        "mediumPackageCents": 125,
        "largePackageCents": 250
      }
    }
  }
}`

### **3. Enterprise Plan (rc-enterprise-2025)**

*Designed for high-volume clients. Features a higher monthly minimum in exchange for significantly lower per-unit costs.*

JSON

# 

`{
  "id": "rc-enterprise-2025",
  "name": "Enterprise Plan 2025",
  "version": "v1.0.0",
  "monthly_minimum_cents": 750000,
  "prices": {
    "fulfillment": {
      "aovPercentage": 0.04,
      "baseFeeCents": 200,
      "perAdditionalUnitCents": 50
    },
    "storage": {
      "smallUnitCents": 60,
      "mediumUnitCents": 120,
      "largeUnitCents": 200,
      "palletCents": 6000
    },
    "shippingAndHandling": {
      "standard": {
        "smallPackageCents": 285,
        "mediumPackageCents": 585,
        "largePackageCents": 1185
      },
      "customerAccount": {
        "smallPackageCents": 50,
        "mediumPackageCents": 100,
        "largePackageCents": 225
      }
    }
  }
}`