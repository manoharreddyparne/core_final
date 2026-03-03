export interface FormField {
    name: string;
    label: string;
    type?: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'checkbox' | 'date';
    required?: boolean;
    fullWidth?: boolean;
    options?: { label: string; value: string | number }[];
    checkboxLabel?: string;
    helpText?: string;
}
