import csv
import random
import datetime

branches = ["CSE", "ECE", "IT", "EEE", "MECH"]
programs = ["B.Tech", "MBA"]
domains = ["mallareddyuniversity.ac.in", "student.auip.edu"]

def generate_csv(filename):
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["roll_number", "full_name", "program", "branch", "batch_year", "current_semester", "personal_email", "official_email", "phone_number", "date_of_birth", "admission_year", "passout_year", "cgpa", "10th_percent", "12th_percent", "active_backlogs"])
        
        # Add the specific student
        writer.writerow([
            "2211CS010446", "John Doe", "B.Tech", "CSE", 2024, 7, 
            "john.personal@gmail.com", "2211CS010446@mallareddyuniversity.ac.in", "9876543210", 
            "2002-05-15", 2020, 2024, 8.5, 92.5, 88.0, 0
        ])
        
        for i in range(1, 401):
            roll = f"2211CS{str(1000 + i).zfill(4)}"
            name = f"Student {i}"
            prog = random.choice(programs)
            br = random.choice(branches)
            batch = 2024
            sem = 7
            p_email = f"student{i}.personal@gmail.com"
            o_email = f"{roll}@{random.choice(domains)}"
            phone = f"9{random.randint(100000000, 999999999)}"
            dob = f"2002-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
            adm = 2020
            po = 2024
            cgpa = round(random.uniform(5.5, 9.8), 2)
            t_percent = round(random.uniform(60.0, 98.0), 2)
            tw_percent = round(random.uniform(60.0, 98.0), 2)
            backlogs = random.choices([0, 1, 2, 3], weights=[80, 10, 5, 5])[0]
            
            writer.writerow([roll, name, prog, br, batch, sem, p_email, o_email, phone, dob, adm, po, cgpa, t_percent, tw_percent, backlogs])

if __name__ == "__main__":
    generate_csv("/app/test_students.csv")
    print("Test students CSV generated at /app/test_students.csv")
