import os
import glob

def audit(root, exts, excludes):
    results = []
    for ext in exts:
        for f in glob.glob(os.path.join(root, '**', f'*.{ext}'), recursive=True):
            skip = any(ex in f.replace('\\', '/') for ex in excludes)
            if skip:
                continue
            try:
                with open(f, 'r', encoding='utf-8', errors='ignore') as fh:
                    lines = len(fh.readlines())
                results.append((lines, f))
            except Exception:
                pass
    return sorted(results, reverse=True)

excludes_backend = ['/migrations/', '.venv', '__pycache__', 'node_modules']
excludes_frontend = ['node_modules', '.next', 'dist', '.vite']

print("=== BACKEND (Top 20) ===")
for lines, f in audit(r'c:\Manohar\AUIP\AUIP-Platform\backend', ['py'], excludes_backend)[:20]:
    print(f"  {lines:>5} {f.replace(chr(92), '/').split('AUIP-Platform/')[-1]}")

print("\n=== FRONTEND (Top 20) ===")
for lines, f in audit(r'c:\Manohar\AUIP\AUIP-Platform\frontend\src', ['tsx', 'ts'], excludes_frontend)[:20]:
    print(f"  {lines:>5} {f.replace(chr(92), '/').split('AUIP-Platform/')[-1]}")
