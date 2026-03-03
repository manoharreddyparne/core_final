import { FormField } from '../types';

export const departmentFields: FormField[] = [
    { name: 'name', label: 'Department Name', required: true, fullWidth: true },
    { name: 'code', label: 'Code', required: true, helpText: 'Short code like CSE, ECE' },
    { name: 'head_email', label: 'HOD Email', type: 'email' },
    { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
    { name: 'is_active', label: 'Status', type: 'checkbox', checkboxLabel: 'Active' }
];

export const academicProgramFields: FormField[] = [
    { name: 'name', label: 'Program Name', required: true, fullWidth: true },
    { name: 'code', label: 'Program Code', required: true, helpText: 'e.g. BTECH-CSE' },
    { name: 'department', label: 'Department ID', required: true, type: 'number' },
    {
        name: 'degree_type',
        label: 'Degree Type',
        type: 'select',
        options: [
            { label: 'B.Tech', value: 'B.Tech' },
            { label: 'M.Tech', value: 'M.Tech' },
            { label: 'MBA', value: 'MBA' },
            { label: 'MCA', value: 'MCA' },
            { label: 'BCA', value: 'BCA' }
        ]
    },
    { name: 'duration_years', label: 'Duration (Years)', type: 'number' },
    { name: 'total_semesters', label: 'Total Semesters', type: 'number' },
    { name: 'is_active', label: 'Status', type: 'checkbox', checkboxLabel: 'Active' }
];

export const academicYearFields: FormField[] = [
    { name: 'label', label: 'Year Label', required: true, helpText: 'e.g. 2024-25' },
    { name: 'is_current', label: 'Current Year', type: 'checkbox', checkboxLabel: 'Set as Active Year' },
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true }
];

export const semesterFields: FormField[] = [
    { name: 'label', label: 'Semester Label', fullWidth: true, helpText: 'e.g. Odd 2024' },
    { name: 'program', label: 'Program ID', required: true, type: 'number' },
    { name: 'academic_year', label: 'Year ID', required: true, type: 'number' },
    { name: 'semester_number', label: 'Sem Number', type: 'number', required: true, helpText: '1 to 8' },
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
            { label: 'Upcoming', value: 'UPCOMING' },
            { label: 'Ongoing', value: 'ONGOING' },
            { label: 'Completed', value: 'COMPLETED' }
        ]
    }
];
