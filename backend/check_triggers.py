from django.db import connection
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT tgname FROM pg_trigger JOIN pg_class ON pg_class.oid = tgrelid WHERE relname = 'identity_user'")
        triggers = cursor.fetchall()
        print(f"Triggers on identity_user: {triggers}")
except Exception as e:
    print(f"Error: {e}")
