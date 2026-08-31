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
- Automated payslip affordability using a 40% minimum basic-salary retention rule.
- Reverse calculation of the maximum affordable loan from the available payroll-deduction capacity, selected term, interest and fees.
- Payroll deduction enforced as the repayment method for every newly approved loan.
- Civil-service employee number required on every new application.
- Required NRC front, NRC back and recent payslip upload to the administrator's private Google Drive through the supplied Apps Script receiver.
- Automatic Firestore application-record creation immediately after a verified document upload, with an on-page retry if the record write fails.
- A visible 48-hour approval-review notice after submission and on pending borrower records.
- Administrator document-review/download button and KYC gate before loan approval.
- Safer Firestore rules and output escaping.

## Important prototype limits

1. `loan-utils.js` uses a **temporary 2% monthly rate and zero fees** only as test data. Replace it with the client-approved credit policy.
2. The Key Facts Statement, loan contract and User Care pages contain bracketed placeholders. The client and a qualified reviewer must approve the final wording.
3. Supporting documents are stored in the administrator's private Google Drive, not Firebase Storage. This release already has the deployed Apps Script `/exec` URL connected in `config.js`.
4. Payment-provider integration is not included. An administrator records payments manually.
5. Existing loans created by the earlier version may not have instalment arrays. Test the new workflow with a fresh application before migrating old records.
6. Digital acceptance is a **prototype audit record**, not a substitute for the client’s approved legal wording or professional review. Increase `CONTRACT_VERSION` in `loan-utils.js` whenever approved contract wording changes.
7. The current affordability policy assumes that the borrower must retain 40% of basic salary after existing deductions and the highest proposed loan instalment. The client must confirm exactly which payslip deductions are included before real approvals are processed.

## Affordability calculation

```text
Minimum salary remaining = Basic salary × 40%
Maximum total deductions = Basic salary × 60%
Available new payroll deduction = Maximum total deductions − Existing deductions
```

The calculator then works backwards through the selected term, monthly rate and fees to find the largest loan whose every scheduled instalment fits within the available new payroll deduction. The administrator cannot save an approval above that ceiling.

## Firebase setup

1. In Firebase Authentication, enable Google as a sign-in provider.
2. Add `9cm1.github.io` to the Firebase Authentication authorised domains.
3. Deploy `firestore.rules` before entering real customer information. `storage.rules` remains deny-all because Firebase Storage is not used by this version.
4. Sign in once with the intended administrator account.
5. In Firestore, find that account under `users/{uid}` and change `role` from `user` to `admin` using the Firebase console. Never add a public “make me admin” button.
6. The administrator's private Drive folder and document receiver are already set up for this release. Keep the Drive folder restricted.
7. Restrict the Firebase web API key to the approved Money Tree domains in Google Cloud Console.

If the Firebase CLI is configured for the correct project, Firestore rules can be deployed with:

```bash
firebase deploy --only firestore:rules
```

## Test the contract-acceptance workflow

1. Confirm the configured Apps Script deployment is active and the private Drive folder remains restricted.
2. Sign in with a separate borrower Google account and complete every application field and consent confirmation.
3. Upload NRC front, NRC back and a recent payslip; the verified upload automatically submits the fresh loan application.
4. Sign in with the administrator account, open `admin.html`, click **Open private documents**, review all three files, then mark KYC verified.
5. Enter the verified basic salary and existing total deductions, then set the amount to receive, proposed terms and first payment date.
6. Confirm that the calculator reports **Within the 40% retention limit**. The approval action is blocked if documents/KYC are incomplete or the proposed amount exceeds the calculated maximum affordable loan.
7. Return to the borrower account, open the loan in Order Center, then open **Review and accept loan contract**.
8. Review the Key Facts Statement, payroll-affordability summary and repayment plan, select every confirmation, type the borrower name exactly as displayed, and submit the prototype acceptance.
9. Return to `admin.html`. The acceptance receipt appears and **Mark disbursed** becomes available.
10. Confirm disbursement. The stored payment schedule remains the same schedule the borrower accepted.

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
- `google-apps-script/Code.gs` — authenticated private Google Drive receiver
- `google-apps-script/Index.html` — embedded NRC/payslip upload interface
- `google-apps-script/SETUP.md` — no-billing Drive setup and deployment steps

## Required client information before launch

- Official interest calculation and approved APR method
- Confirmation that “total deductions” includes all payslip deductions, and whether statutory deductions are included
- Confirmation that the 40% retention test is based on basic salary exactly as stated by the client
- Approved rounding, minimum-loan and maximum-loan rules for the affordability ceiling
- Arrangement, administration, late and default fees
- Minimum and maximum loan amounts and repayment periods
- Early-settlement and rescheduling policies
- Payment channels and reconciliation process
- Registered legal entity, licence details and office address
- Customer-care phone, email and operating hours
- Complaint and escalation procedure
- Approved privacy notice, Key Facts wording, contract and permissions
- Named administrator access list, document-retention period and secure deletion procedure for NRCs and payslips
