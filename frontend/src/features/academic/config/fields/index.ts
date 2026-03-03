import { departmentFields, academicProgramFields, academicYearFields, semesterFields } from './foundation';
import { subjectFields, syllabusUnitFields, legacyCourseFields, legacyBatchFields } from './curriculum';
import { classSectionFields, teacherAssignmentFields, studentEnrollmentFields, attendanceLogFields, internalMarkFields } from './classroom';
import { FormField } from '../types';

export const academicFormConfig: Record<string, FormField[]> = {
    'departments': departmentFields,
    'programs': academicProgramFields,
    'academic-years': academicYearFields,
    'semesters': semesterFields,
    'subjects': subjectFields,
    'syllabus-units': syllabusUnitFields,
    'sections': classSectionFields,
    'teacher-assignments': teacherAssignmentFields,
    'enrollments': studentEnrollmentFields,
    'attendance': attendanceLogFields,
    'marks': internalMarkFields,
    'courses': legacyCourseFields,
    'batches': legacyBatchFields
};

export * from '../types';
