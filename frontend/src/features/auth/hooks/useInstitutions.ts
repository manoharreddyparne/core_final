import { useState, useEffect } from 'react';
import { v2AuthApi, Institution } from '../api/v2AuthApi';
import { toast } from 'react-hot-toast';

export function useInstitutions() {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchInstitutions = async () => {
            setIsLoading(true);
            try {
                const data = await v2AuthApi.getInstitutions();
                setInstitutions(data);
            } catch (error) {
                console.error('Failed to fetch institutions', error);
                toast.error('Failed to load institution list');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInstitutions();
    }, []);

    const handleSelect = (inst: Institution | null) => {
        setSelectedInstitution(inst);
    };

    return {
        institutions,
        selectedInstitution,
        setSelectedInstitution: handleSelect,
        isLoading
    };
}
