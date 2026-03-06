import pandas as pd
import re

def safe_float(val):
    """Extract the first number from a value like '78.4(CBSE)' or return 0.0."""
    if pd.isna(val):
        return 0.0
    s = str(val).strip()
    m = re.search(r'[\d.]+', s)
    if not m:
        return 0.0
    v = float(m.group())
    # Smart scale fix for fractional percentages in source excel (e.g. 0.88 instead of 88)
    if 0.0 < v < 1.0:
        v = v * 100
    return round(v, 2)

# Load Excel (real ground truth data)
xlsx = pd.read_excel(r'c:\Manohar\AUIP\AUIP-Platform\R22 IV Yr-I  Placement Data_Zero Backlogs.xlsx', header=3)
xlsx.columns = [c.strip().replace('\n', ' ') for c in xlsx.columns]
xlsx['Registration Id'] = xlsx['Registration Id'].astype(str).str.strip()

# Load existing CSV (has all the other fields like email, DOB, personal info)
csv_df = pd.read_csv(r'c:\Manohar\AUIP\AUIP-Platform\student_dataset_final_structured.csv')
csv_df['roll_number'] = csv_df['roll_number'].astype(str).str.strip()

print(f"Excel rows: {len(xlsx)}, CSV rows: {len(csv_df)}")

# Show comparison for verification
sample_roll = '2211CS010005'
xrow = xlsx[xlsx['Registration Id'] == sample_roll]
crow = csv_df[csv_df['roll_number'] == sample_roll]
if len(xrow) and len(crow):
    x = xrow.iloc[0]
    c = crow.iloc[0]
    print(f"\n=== SAMPLE {sample_roll} ===")
    print(f"  SSC %  : Excel={x['SSC %']}   | CSV 10th_percent={c['10th_percent']}  <-- WRONG (GPA scale)")
    print(f"  Inter %: Excel={x['Inter %']}   | CSV 12th_percent={c['12th_percent']}  <-- WRONG (GPA scale)")
    print(f"  B.Tech%: Excel={x['B.Tech %']}  | CSV cgpa={c['cgpa']}  (CGPA ok)")

# Build corrected CSV by merging
# Keep all columns from CSV, just replace 10th and 12th from Excel
xlsx_map = xlsx[['Registration Id', 'SSC %', 'Inter %']].copy()
xlsx_map.columns = ['roll_number', 'ssc_real', 'inter_real']

merged = csv_df.merge(xlsx_map, on='roll_number', how='left')

fixed_count = 0
no_match = []

for idx, row in merged.iterrows():
    if pd.notna(row.get('ssc_real')) and str(row.get('ssc_real', '')) not in ('nan', ''):
        merged.at[idx, '10th_percent'] = safe_float(row['ssc_real'])
        merged.at[idx, '12th_percent'] = safe_float(row['inter_real'])
        fixed_count += 1
    else:
        no_match.append(row['roll_number'])

print(f"\nFixed {fixed_count} students with real SSC/Inter percentages")
if no_match:
    print(f"WARNING: No Excel match for {len(no_match)} rolls: {no_match[:5]}")

# Drop temp columns
merged.drop(columns=['ssc_real', 'inter_real'], inplace=True)

# Save
out_path = r'c:\Manohar\AUIP\AUIP-Platform\student_dataset_corrected.csv'
merged.to_csv(out_path, index=False)
print(f"\nSaved: {out_path}")

# Verify sample
verify = pd.read_csv(out_path)
vrow = verify[verify['roll_number'] == sample_roll].iloc[0]
print(f"\nVERIFICATION {sample_roll}:")
print(f"  10th_percent: {vrow['10th_percent']}  (should be ~95.0)")
print(f"  12th_percent: {vrow['12th_percent']}  (should be ~93.6)")
print(f"  cgpa: {vrow['cgpa']}")

# Show value range stats
print(f"\nSTATS in corrected CSV:")
print(f"  10th_percent: min={verify['10th_percent'].min()}, max={verify['10th_percent'].max()}, mean={verify['10th_percent'].mean():.1f}")
print(f"  12th_percent: min={verify['12th_percent'].min()}, max={verify['12th_percent'].max()}, mean={verify['12th_percent'].mean():.1f}")
print(f"  cgpa: min={verify['cgpa'].min()}, max={verify['cgpa'].max()}, mean={verify['cgpa'].mean():.2f}")
