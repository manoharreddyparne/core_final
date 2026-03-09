import { FormField } from '../types';

export const subjectFields: FormField[] = [
    { name: 'name', label: 'Subject Name', required: true, fullWidth: true },
    { name: 'code', label: 'Subject Code', required: true },
    { name: 'department', label: 'Dept ID', required: true, type: 'number' },
    { name: 'program', label: 'Program ID', required: true, type: 'number' },
    { name: 'semester_number', label: 'Semester', type: 'number', required: true },
    {
        name: 'subject_type',
        label: 'Type',
        type: 'select',
        options: [
            { label: 'Theory', value: 'THEORY' },
            { label: 'Lab / Practical', value: 'LAB' },
            { label: 'Project', value: 'PROJECT' },
            { label: 'Elective', value: 'ELECTIVE' },
            { label: 'Audit', value: 'AUDIT' }
        ]
    },
    { name: 'credits', label: 'Credits', type: 'number' },
    { name: 'max_marks', label: 'Max marks', type: 'number' },
    { name: 'passing_marks', label: 'Passing Marks', type: 'number' },
    { name: 'is_placement_relevant', label: 'Placement Prep', type: 'checkbox', checkboxLabel: 'Relevant for Placements' },
    { name: 'placement_tags', label: 'Placement Tags', helpText: 'Comma separated tags like DSA, DBMS', fullWidth: true },
    { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
    { name: 'is_active', label: 'Status', type: 'checkbox', checkboxLabel: 'Active' }
];

export const syllabusUnitFields: FormField[] = [
    { name: 'subject', label: 'Subject ID', required: true, type: 'number' },
    { name: 'unit_number', label: 'Unit Number', type: 'number', required: true },
    { name: 'title', label: 'Unit Title', required: true, fullWidth: true },
    { name: 'hours_required', label: 'Hours', type: 'number' },
    { name: 'topics', label: 'Topics (List)', helpText: 'Comma separated like Topic 1, Topic 2', fullWidth: true },
    { name: 'ai_question_weight', label: 'AI Weight', type: 'number', helpText: '0 to 1.0' }
];

// Legacy Support
export const legacyCourseFields: FormField[] = [
    { name: 'name', label: 'Course Name', required: true, fullWidth: true },
    { name: 'code', label: 'Course Code', required: true },
    { name: 'department', label: 'Dept ID', type: 'number' },
    { name: 'program', label: 'Program ID', type: 'number' },
    { name: 'description', label: 'Description', type: 'textarea', fullWidth: true }
];

export const legacyBatchFields: FormField[] = [
    { name: 'course', label: 'Course ID', required: true, type: 'number' },
    { name: 'name', label: 'Batch Name', required: true },
    { name: 'start_date', label: 'Start Date', type: 'date', required: true },
    { name: 'end_date', label: 'End Date', type: 'date', required: true },
    { name: 'roll_numbers', label: 'Enrolled Roll Numbers (List)', helpText: 'Comma separated like ROLL-1, ROLL-2', fullWidth: true }
];
