export const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
};

export const deleteCookie = (name: string, path: string = "/", domain?: string) => {
    if (getCookie(name)) {
        document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ""}`;
    }
};
