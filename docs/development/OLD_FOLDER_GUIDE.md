# Handling the Old exam_portal Folder

## ⚠️ IMPORTANT: DO NOT DELETE YET!

The old `exam_portal` folder should be **kept as a backup** until you've fully validated the new AUIP-Platform structure.

---

## Recommended Approach

### Option 1: Rename as Backup (Recommended)

```powershell
# Rename the old folder
Rename-Item -Path "c:\Manohar\AUIP\exam_portal" -NewName "exam_portal_BACKUP_2026-02-10"
```

**Benefits:**
- ✅ Keeps original code safe
- ✅ Easy to reference if needed
- ✅ Can compare old vs new structure
- ✅ Can restore if something goes wrong

---

### Option 2: Archive to ZIP

```powershell
# Create a ZIP archive
Compress-Archive -Path "c:\Manohar\AUIP\exam_portal" -DestinationPath "c:\Manohar\AUIP\exam_portal_backup_2026-02-10.zip"

# After verifying ZIP, you can delete the folder
Remove-Item -Path "c:\Manohar\AUIP\exam_portal" -Recurse -Force
```

**Benefits:**
- ✅ Saves disk space
- ✅ Complete backup preserved
- ✅ Clean workspace

---

## When Can You Safely Delete?

You can delete/archive the old `exam_portal` folder ONLY after:

### ✅ Validation Checklist

- [ ] **Backend Runs**: `python manage.py check` passes
- [ ] **Frontend Runs**: `npm run dev` works
- [ ] **Database Migrations**: All migrations run successfully
- [ ] **Tests Pass**: `pytest` runs without errors
- [ ] **Login Works**: You can login to the application
- [ ] **All Features Tested**: Core functionality verified
- [ ] **Data Migrated**: If needed, database data copied
- [ ] **Git Committed**: All changes in AUIP-Platform are committed
- [ ] **Deployed to Dev/Staging**: New structure tested in deployment

**Recommended Timeline**: Keep backup for **2-4 weeks** after deployment.

---

## What to Copy (if needed)

Some files may need to be copied from old to new structure:

### 1. Environment Variables
```powershell
# Copy .env if it contains production secrets
Copy-Item "c:\Manohar\AUIP\exam_portal\.env" -Destination "c:\Manohar\AUIP\AUIP-Platform\backend\.env"
```

### 2. Media Files (User Uploads)
```powershell
# If you have user-uploaded files
robocopy "c:\Manohar\AUIP\exam_portal\media" "c:\Manohar\AUIP\AUIP-Platform\backend\media" /E
```

### 3. Database (if using SQLite)
```powershell
# Copy database file
Copy-Item "c:\Manohar\AUIP\exam_portal\db.sqlite3" -Destination "c:\Manohar\AUIP\AUIP-Platform\backend\db.sqlite3"
```

**For PostgreSQL**: Use `pg_dump` and `pg_restore` to migrate data.

---

## Files You DON'T Need

Do NOT copy these from old folder:

- ❌ `__pycache__/` - Python cache
- ❌ `.pytest_cache/` - Test cache
- ❌ `*.pyc` - Compiled Python
- ❌ `node_modules/` - Node packages
- ❌ `.git/` - Old git history (you have new repo)
- ❌ `*.log` - Old log files

---

## Recommended Workflow

### Week 1: Parallel Running
- Keep both `exam_portal` and `AUIP-Platform`
- Work in AUIP-Platform
- Reference exam_portal if needed

### Week 2-3: Testing & Validation
- Test all features in AUIP-Platform
- Fix any issues
- Migrate data if needed

### Week 4: Archive
- Create ZIP backup of exam_portal
- Delete original folder
- Keep ZIP for 6 months

---

## If Something Goes Wrong

### Restore from Backup
```powershell
# If you renamed
Rename-Item -Path "c:\Manohar\AUIP\exam_portal_BACKUP_2026-02-10" -NewName "exam_portal"

# If you archived
Expand-Archive -Path "c:\Manohar\AUIP\exam_portal_backup_2026-02-10.zip" -DestinationPath "c:\Manohar\AUIP\exam_portal"
```

---

## Final Recommendation

**DO THIS NOW:**
```powershell
# Step 1: Rename old folder as backup
Rename-Item -Path "c:\Manohar\AUIP\exam_portal" -NewName "exam_portal_BACKUP"

# Step 2: Verify new structure works
cd c:\Manohar\AUIP\AUIP-Platform
docker-compose up -d

# Step 3: Test thoroughly for 2-3 weeks

# Step 4: After validation, create final archive
Compress-Archive -Path "c:\Manohar\AUIP\exam_portal_BACKUP" -DestinationPath "c:\Manohar\AUIP\Archives\exam_portal_final_backup_2026-02-10.zip"

# Step 5: Store ZIP safely, delete folder
```

---

**Your old code is safe! Don't rush to delete. Take time to validate the new structure. 🚀**
