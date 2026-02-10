import { CreateStudentForm } from "../components/CreateStudentForm";

export const CreateStudent = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Students</h1>
      <CreateStudentForm />
    </div>
  );
};
