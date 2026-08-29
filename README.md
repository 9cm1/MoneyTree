# Money Tree v2

Money Tree v2 is a mobile-first loan application prototype built with static HTML, CSS, JavaScript, Firebase Authentication and Cloud Firestore. It is ready for GitHub Pages after the Firebase setup steps below.

## What was added

- Order Center with loan status, period, amount received, planned repayment, total paid, remaining balance and instalment progress.
- Dynamic repayment plan with payment dates, principal, interest, fees and payment status.
- Key Facts Statement containing the requested six sections.
- Draft loan-contract view.
- User Care sections for company information, complaints, rights and responsibilities, and fraud protection.
- Admin approval form for amount, term, rate, fees and repayment method.
- Automatic repayment-schedule generation at disbursement.
- Admin payment recording with automatic balance and instalment updates.
- KYC verification control.
- Borrower contract review with separate confirmations and typed-name acceptance.
- Immutable acceptance receipts visible to both the borrower and administrator.
- Administrator disbursement lock until the matching contract terms are accepted.
- Safer Firestore rules and output escaping.

## Important prototype limits

1. `loan-utils.js` uses a **temporary 2% monthly rate and zero fees** only as test data. Replace it with the client-approved credit policy.
2. The Key Facts Statement, loan contract and User Care pages contain bracketed placeholders. The client and a qualified reviewer must approve the final wording.
3. Supporting documents are not uploaded. The file picker only shows the selected filename on the borrower’s device. Storage rules deny every upload until a secure document process is designed.
4. Payment-provider integration is not included. An administrator records payments manually.
5. Existing loans created by the earlier version may not have instalment arrays. Test the new workflow with a fresh application before migrating old records.
6. Digital acceptance is a **prototype audit record**, not a substitute for the client’s approved legal wording or professional review. Increase `CONTRACT_VERSION` in `loan-utils.js` whenever approved contract wording changes.

## Firebase setup

1. In Firebase Authentication, enable Google as a sign-in provider.
2. Add `9cm1.github.io` to the Firebase Authentication authorised domains.
3. Deploy `firestore.rules` and `storage.rules` before entering real customer information.
4. Sign in once with the intended administrator account.
5. In Firestore, find that account under `users/{uid}` and change `role` from `user` to `admin` using the Firebase console. Never add a public “make me admin” button.
6. Restrict the Firebase web API key to the approved Money Tree domains in Google Cloud Console.

If the Firebase CLI is configured for the correct project, the rules can be deployed with:

```bash
firebase deploy --only firestore:rules,storage
```

Without an active Storage bucket, deploy only Firestore:

```bash
firebase deploy --only firestore:rules
```

## Test the contract-acceptance workflow

1. Sign in with a separate borrower Google account and submit a fresh application.
2. Sign in with the administrator account, open `admin.html`, approve the loan, and set the amount to receive, final proposed terms and first payment date.
3. Return to the borrower account, open the loan in Order Center, then open **Review and accept loan contract**.
4. Review the Key Facts Statement and repayment plan, select every confirmation, type the borrower name exactly as displayed, and submit the prototype acceptance.
5. Return to `admin.html`. The acceptance receipt appears and **Mark disbursed** becomes available.
6. Confirm disbursement. The stored payment schedule remains the same schedule the borrower accepted.

Contract acceptances are stored as read-only documents at `loanAcceptances/{loanId}`. The supplied Firestore rules allow only the loan owner to create the matching record, allow administrators to read it, prevent edits and deletion, and prevent accepted financial terms from being changed.

## GitHub Pages deployment

Upload every project file to the existing `MoneyTree` repository root. The landing page must be named exactly `index.html`. GitHub Pages is case-sensitive, so keep all filenames and links unchanged.

## Main files

- `index.html` — Google sign-in
- `dashboard.html` — borrower dashboard
- `apply.html` — loan application
- `order.html` — Order Center
- `repayment-plan.html` — detailed schedule
- `key-facts.html` — Key Facts Statement
- `loan-contract.html` — draft contract
- `repay.html` — upcoming repayment information
- `profile.html` — customer profile
- `user-care.html` — support, complaints, rights and fraud guidance
- `admin.html` — approval, disbursement, KYC and payments
- `loan-utils.js` — calculations and shared formatting
- `config.js` — Firebase connection

## Required client information before launch

- Official interest calculation and approved APR method
- Arrangement, administration, late and default fees
- Minimum and maximum loan amounts and repayment periods
- Early-settlement and rescheduling policies
- Payment channels and reconciliation process
- Registered legal entity, licence details and office address
- Customer-care phone, email and operating hours
- Complaint and escalation procedure
- Approved privacy notice, Key Facts wording, contract and permissions
