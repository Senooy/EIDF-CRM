// Utilitaires de développement pour réinitialiser les données
export const developmentUtils = {
  clearCampaignCache(): void {
    localStorage.removeItem('campaigns');
    console.log('Cache des campagnes vidé');
    window.location.reload();
  },

  logCurrentCampaigns(): void {
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    console.log('Campagnes actuelles:', campaigns);
  }
};

// Exposer globalement en développement
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).devUtils = developmentUtils;
}