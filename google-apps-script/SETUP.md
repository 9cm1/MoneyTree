# Money Tree private document receiver

This receiver stores NRC images and payslips in a restricted Google Drive folder owned by the administrator. Firebase Storage is not used.

## 1. Create the receiver

1. Sign in to the Google account that should own the loan documents.
2. Open [script.new](https://script.new) and name the project `Money Tree Document Receiver`.
3. Replace the default `Code.gs` with the supplied `Code.gs`.
4. Add a new HTML file named exactly `Index` and paste the supplied `Index.html` into it.
5. In Project Settings, enable **Show "appsscript.json" manifest file in editor**, then replace that manifest with the supplied `appsscript.json`.
6. Save the project.

## 2. Create the private Drive folder

1. Select `setupMoneyTreeDrive_` from the function list in the Apps Script editor.
2. Click **Run** and approve the requested Google Drive and external-request permissions.
3. The script creates `Money Tree - Private Loan Documents` in that account's Drive.
4. Open Google Drive and confirm the folder's General access is **Restricted**.
5. If other administrators require access, share the folder only with their named Google accounts. Never select **Anyone with the link**.

## 3. Deploy the receiver

1. In Apps Script, choose **Deploy > New deployment**.
2. Select **Web app**.
3. Set **Execute as** to **Me** (the document-folder owner).
4. Set **Who has access** to **Anyone**. The supplied code separately verifies the borrower's Firebase login token and approved Money Tree website origin before accepting files.
5. Deploy and copy the URL ending in `/exec`. Do not use the `/dev` testing URL.

## 4. Connect Money Tree

Open `config.js` and replace:

```js
webAppUrl: "PASTE_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE"
```

with the copied `/exec` URL. Keep the quotation marks.

Upload the updated website files to the GitHub repository root, then publish the supplied `firestore.rules` separately in Firebase Console under **Firestore Database > Rules**.

## 5. Test before client use

1. Apply using a separate borrower Google account.
2. Enter a civil-service employee number and upload NRC front, NRC back and a recent payslip.
3. Submit the application.
4. Sign in as admin and confirm the application shows **Documents received**.
5. Click **Open private documents** and confirm the administrator can view/download all three files.
6. Confirm another borrower account cannot open that Drive folder.
7. Mark KYC verified, then test the existing 40% salary-retention calculation and approval flow.

## Important operating limits

- No Firebase Storage billing account is required, but the files consume the administrator's Google Drive storage quota.
- Google Apps Script has daily quotas and execution limits. This approach is suitable for a controlled prototype or modest application volume, not unlimited production traffic.
- Use only the private Drive folder for these records. Establish an approved privacy notice, access list, retention period and deletion process before collecting real NRCs or payslips.
- If the website moves away from `https://9cm1.github.io`, update `ALLOWED_PARENT_ORIGINS` in Apps Script Project Settings before accepting uploads from the new domain.
