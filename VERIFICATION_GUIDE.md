# AUIP Platform - Manual Verification Guide

This guide outlines the steps to verify the **Premium UI Revolution** and the **Institutional Control Hub**.

## 1. Resolve Local Environment Issues
If your IDE (VS Code) shows errors like "Cannot find module 'lucide-react'" or "Unknown at rule @tailwind", follow these steps:

### A. Project Directory & TS Server
Multi-project repositories (with both backend/frontend) can confuse VS Code. 

1. **Delete Redundant Configs**: I have already deleted `tsconfig.app.json` and `tsconfig.node.json` to reduce confusion.
2. **Direct Folder Opening**: It is highly recommended to open the `c:\Manohar\AUIP\AUIP-Platform\frontend` folder **directly** as its own workspace in VS Code.
3. **Sync Dependencies**: Run `npm install` in that terminal.
4. **Restart TS Server**: Press `Ctrl+Shift+P` -> **"TypeScript: Restart TS Server"**. I have simplified the `tsconfig.json` to a single-file structure which is much more robust for IDE discovery.

### B. "Problems loading reference" Warning (getaddrinfo ENOTFOUND)
If you see a yellow/white warning about "Unable to load schema from https://www.schemastore.org/tsconfig":
- **Why**: This is a **VS Code network error**, NOT a project error. It happens when the IDE tries to download a data-validation file from the internet but fails (often due to no internet or firewall).
- **Solution**: You can safely ignore this. It does not affect the build or the premium UI.

### B. Silence CSS Warnings
Tailwind's `@tailwind` and `@apply` rules are not standard CSS. To remove the yellow warnings in VS Code:
1. Create a file at `.vscode/settings.json` in the root (if it doesn't exist).
2. Add the following:
   ```json
   {
     "css.customData": [".vscode/tailwind.json"],
     "css.lint.unknownAtRules": "ignore"
   }
   ```
   *Note: Alternatively, install the **Tailwind CSS IntelliSense** extension in VS Code.*

---

## 2. Start the Platform
Ensure both backend and frontend are running:
1. From the root directory:
   ```powershell
   docker-compose up -d --build
   ```
2. Frontend should be accessible at: [http://localhost:3000](http://localhost:3000)
3. Backend (API) should be at: [http://localhost:8000](http://localhost:8000)

---

## 3. Verification Scenarios

### Scenario A: Super Admin Entrance
1. Navigate to [http://localhost:3000/login](http://localhost:3000/login).
2. Select **Administrator / Educator** from the portal tabs.
3. Login with:
   - **Email**: `admin@auip-platform.com`
   - **Password**: `Admin@123`
4. **Verification Points**:
   - [ ] Do you see the "Obsidian & Cobalt" dark theme?
   - [ ] Is there a "Glassmorphism" effect on the login card?
   - [ ] Does the sidebar show "Institutions" on the left?

### Scenario B: Institutional Hub (Super Admin Only)
1. Click **Institutions** in the sidebar.
2. **Verification Points**:
   - [ ] Do you see the "Institutional Hub" header?
   - [ ] Can you see the "Register University" button?
   - [ ] Verify if any existing institutions (if any) are displayed in the grid cards.

### Scenario C: Student Management (Admin/Inst Admin)
1. Navigate to **Dashboard** and find the "Explore Hub" button or click a relevant management link.
2. **Verification Points**:
   - [ ] Check the student list in `Core Student Admin`.
   - [ ] Verify the "Stat Cards" (Total Students, Active Users, etc.) have the new premium glass look.
   - [ ] Toggle between **Grid** and **List** views.

---

## 4. Troubleshooting
- **Turnstile Error**: If Turnstile fails, ensure you have a stable internet connection or check the `TURNSTILE_SITE_KEY` in `backend/.env`.
- **API Errors**: Check the backend logs: `docker-compose logs -f backend`.
- **Blank Screen**: Ensure the port 3000 is correctly mapped. Check `frontend` logs: `docker-compose logs -f frontend`.
