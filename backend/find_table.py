from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE tablename = 'exams_examattempt'")
    print(f"RESULTS: {cursor.fetchall()}")
