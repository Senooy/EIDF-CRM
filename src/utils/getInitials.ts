// Helper function to get initials from a name
export const getInitials = (firstName?: string, lastName?: string): string => {
    const firstInitial = firstName ? firstName[0] : '';
    const lastInitial = lastName ? lastName[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '?'; // Return '?' if no initials
}; 