import { FormField } from '../types';

export const classSectionFields: FormField[] = [
    { name: 'name', label: 'Section Label', required: true, helpText: 'e.g. A, B, C' },
    { name: 'program', label: 'Program ID', required: true, type: 'number' },
    { name: 'academic_year', label: 'Year ID', required: true, type: 'number' },
    { name: 'semester_number', label: 'Semester', type: 'number', required: true },
    { name: 'max_strength', label: 'Max Capacity', type: 'number' }
];

export const teacherAssignmentFields: FormField[] = [
    { name: 'employee_id', label: 'Faculty Selection', required: true, fullWidth: true },
    { name: 'subject', label: 'Subject ID', required: true, type: 'number' },
    { name: 'section', label: 'Section ID', type: 'number' },
    { name: 'academic_year', label: 'Year ID', required: true, type: 'number' },
    { name: 'semester', label: 'Semester ID', type: 'number' },
    { name: 'is_primary', label: 'Primary Faculty', type: 'checkbox', checkboxLabel: 'Set as Lead', fullWidth: true }
];

export const studentEnrollmentFields: FormField[] = [
    { name: 'roll_number', label: 'Student Selection', required: true, fullWidth: true },
    { name: 'subject', label: 'Subject ID', required: true, type: 'number' },
    { name: 'section', label: 'Section ID', type: 'number' },
    { name: 'semester', label: 'Semester ID', required: true, type: 'number' }
];

export const attendanceLogFields: FormField[] = [
    { name: 'subject', label: 'Subject ID', required: true, type: 'number' },
    { name: 'employee_id', label: 'Faculty ID', required: true },
    { name: 'session_date', label: 'Date', type: 'date', required: true },
    {
        name: 'session_type',
        label: 'Type',
        type: 'select',
        options: [
            { label: 'Lecture', value: 'LECTURE' },
            { label: 'Lab', value: 'LAB' },
            { label: 'Tutorial', value: 'TUTORIAL' }
        ]
    },
    { name: 'topic_covered', label: 'Topic', fullWidth: true }
];

export const internalMarkFields: FormField[] = [
    { name: 'roll_number', label: 'Roll Number', required: true },
    { name: 'subject', label: 'Subject ID', required: true, type: 'number' },
    { name: 'semester', label: 'Semester ID', required: true, type: 'number' },
    {
        name: 'assessment_type',
        label: 'Assessment',
        type: 'select',
        options: [
            { label: 'CIA 1', value: 'CIA1' },
            { label: 'CIA 2', value: 'CIA2' },
            { label: 'Mid-Term', value: 'MID' },
            { label: 'Assignment', value: 'ASSIGNMENT' },
            { label: 'Lab Record', value: 'LAB' },
            { label: 'Viva', value: 'VIVA' },
            { label: 'Project', value: 'PROJECT' },
            { label: 'Final Exam', value: 'FINAL' }
        ]
    },
    { name: 'marks_obtained', label: 'Marks', type: 'number', required: true },
    { name: 'max_marks', label: 'Max Marks', type: 'number', required: true }
];
