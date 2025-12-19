import sqlite3
conn = sqlite3.connect('data.db')
tables = [t[0] for t in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", tables)

for table in tables:
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    print(f"\n{table}: {[c[1] for c in cols]}")
