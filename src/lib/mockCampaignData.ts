import { Campaign, CampaignStats, EmailTemplate, CampaignTimelineData } from '@/types/campaign';


const campaignNames = [
  'Campagne EIDF - Ventilation Professionnelle'
];

const emailSubjects = [
  'Solutions sur-mesure en ventilation professionnelle – {{nom_entreprise}} à votre service'
];

const emailBodies = [
  `Bonjour {{prenom_contact}} {{nom_contact}},

Je me permets de vous contacter au nom de {{nom_entreprise}}, fabricant français de gaines de ventilation sur mesure, basé à {{ville}}.

Nous accompagnons les professionnels comme vous dans leurs projets CVC les plus exigeants, grâce à :

✅ La fabrication sur mesure de gaines et accessoires aérauliques
✅ Un atelier de plus de {{surface_atelier}} en {{region}}
✅ Des délais réactifs et une équipe expérimentée

Que ce soit pour des besoins ponctuels ou des projets réguliers, nous vous proposons des solutions techniques fiables, durables et éco-responsables.

👉 Vous pouvez également effectuer une demande de devis directement ici :
https://eco-industrie-france.com/demande-de-devis/

N'hésitez pas à me contacter, je reste à votre disposition.

Bien cordialement,

Mounir Ben Jaffal
Chargé d'affaires – EIDF
📞 01 84 74 85 80
📧 marketing@eco-industrie.fr
🌐 https://eco-industrie-france.com`
];

// Statistiques initiales - tout part de 0 et évolue progressivement
const initialStats = {
  sent: 0, // Commence à 0, évolue vers 290
  delivered: 0,
  opened: 0,
  clicked: 0,
  converted: 0,
  bounced: 0,
  unsubscribed: 0,
  spamReported: 0,
  revenue: 0,
  lastUpdated: new Date().toISOString()
};

export function generateMockCampaign(index: number): Campaign {
  const now = new Date();
  const createdDays = Math.floor(Math.random() * 30) + 1;
  const createdAt = new Date(now.getTime() - createdDays * 24 * 60 * 60 * 1000);
  
  // Campagne EIDF : exactement 6233 emails (comme demandé)
  const recipientCount = 6233;
  
  // Force toujours le statut 'sent' pour afficher les statistiques
  const status: Campaign['status'] = 'sent';
  
  let subject = emailSubjects[index % emailSubjects.length];
  let body = emailBodies[index % emailBodies.length];
  
  // Variables fixes pour éviter les changements constants
  const fixedVariables = {
    entreprise: 'Climatech Pro',
    prenom: 'Jean',
    nom: 'Dupont',
    ville: 'Lyon',
    region: 'Rhône-Alpes',
    surface: '2000 m²'
  };
  
  subject = subject.replace('{{nom_entreprise}}', fixedVariables.entreprise);
  body = body
    .replace(/\{\{nom_entreprise\}\}/g, fixedVariables.entreprise)
    .replace(/\{\{prenom_contact\}\}/g, fixedVariables.prenom)
    .replace(/\{\{nom_contact\}\}/g, fixedVariables.nom)
    .replace(/\{\{ville\}\}/g, fixedVariables.ville)
    .replace(/\{\{region\}\}/g, fixedVariables.region)
    .replace(/\{\{surface_atelier\}\}/g, fixedVariables.surface);
  
  return {
    id: `campaign-${index + 1}`,
    name: campaignNames[index % campaignNames.length],
    subject,
    body,
    status,
    scheduledDate: status === 'scheduled' ? new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    sentDate: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-1',
    recipientCount,
    stats: status === 'sent' ? generateCampaignStats(recipientCount) : { ...initialStats }
  };
}

function generateCampaignStats(recipientCount: number): CampaignStats {
  const sent = recipientCount;
  const deliveryRate = 0.98; // Très bon taux de delivery
  const delivered = Math.floor(sent * deliveryRate);
  
  // Statistiques exactes demandées
  const opened = 250; // 0.2% d'ouverture sur 6233 emails ≈ 250
  const clicked = Math.floor(opened * 0.1); // 0.1% de clics par rapport aux ouvertures
  
  const converted = 0; // Pas de conversions
  
  const bounceRate = 0.02; // 2% de bounce
  const bounced = Math.floor(sent * bounceRate);
  
  const unsubscribeRate = 0.001; // 0.1% de désabonnements
  const unsubscribed = Math.floor(delivered * unsubscribeRate);
  
  const spamRate = 0.0005; // 0.05% de spam
  const spamReported = Math.floor(delivered * spamRate);
  
  const revenue = 0; // Pas de revenus
  
  return {
    sent,
    delivered,
    opened,
    clicked,
    converted,
    bounced,
    unsubscribed,
    spamReported,
    revenue,
    lastUpdated: new Date().toISOString()
  };
}

export function generateMockEmailTemplates(): EmailTemplate[] {
  const templates: EmailTemplate[] = [
    {
      id: 'template-eidf',
      name: 'EIDF - Ventilation Professionnelle',
      subject: 'Solutions sur-mesure en ventilation professionnelle – {{nom_entreprise}} à votre service',
      body: emailBodies[0],
      category: 'promotional',
      thumbnailUrl: 'https://via.placeholder.com/300x200/007BFF/FFFFFF?text=EIDF+Template',
      variables: ['nom_entreprise', 'prenom_contact', 'nom_contact', 'ville', 'region', 'surface_atelier'],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  return templates;
}

export function generateCampaignTimelineData(campaign: Campaign): CampaignTimelineData[] {
  if (campaign.status !== 'sent') return [];
  
  const data: CampaignTimelineData[] = [];
  const startDate = new Date(campaign.sentDate!);
  const hours = 72;
  
  let cumulativeSent = 0;
  let cumulativeOpened = 0;
  let cumulativeClicked = 0;
  let cumulativeConverted = 0;
  
  for (let i = 0; i <= hours; i += 3) {
    const timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);
    
    const progress = i / hours;
    const sendProgress = Math.min(1, progress * 3);
    const openProgress = Math.min(1, Math.max(0, (progress - 0.1) * 2));
    const clickProgress = Math.min(1, Math.max(0, (progress - 0.2) * 1.5));
    const convertProgress = Math.min(1, Math.max(0, (progress - 0.3) * 1.2));
    
    cumulativeSent = Math.floor(campaign.stats.sent * sendProgress);
    cumulativeOpened = Math.floor(campaign.stats.opened * openProgress);
    cumulativeClicked = Math.floor(campaign.stats.clicked * clickProgress);
    cumulativeConverted = Math.floor(campaign.stats.converted * convertProgress);
    
    data.push({
      timestamp: timestamp.toISOString(),
      sent: cumulativeSent,
      opened: cumulativeOpened,
      clicked: cumulativeClicked,
      converted: cumulativeConverted
    });
  }
  
  return data;
}

export function generateMockCampaigns(count: number = 1): Campaign[] {
  return Array.from({ length: count }, (_, i) => generateMockCampaign(i));
}

let campaignUpdateInterval: NodeJS.Timeout | null = null;

export function startCampaignUpdates(updateCallback: (campaigns: Campaign[]) => void) {
  const campaigns = generateMockCampaigns(1);
  
  campaignUpdateInterval = setInterval(() => {
    campaigns.forEach((campaign) => {
      if (campaign.status === 'sent') {
        const stats = campaign.stats;
        const targetSent = 6233; // Objectif : 6233 emails
        
        // Phase 1: Envoi des emails (rapide au début)
        if (stats.sent < targetSent) {
          const remaining = targetSent - stats.sent;
          let increment = Math.min(
            Math.floor(Math.random() * 8) + 2, // 2-10 emails par update
            remaining
          );
          
          // Ralentir vers la fin
          if (remaining < 20) {
            increment = Math.min(Math.floor(Math.random() * 3) + 1, remaining);
          }
          
          stats.sent += increment;
          
          // Calcul automatique des delivered/bounced
          const newDelivered = Math.floor(stats.sent * (0.95 + Math.random() * 0.03));
          const newBounced = stats.sent - newDelivered;
          
          stats.delivered = newDelivered;
          stats.bounced = newBounced;
        }
        
        // Phase 2: Ouvertures (après delivery) - exactement 250 ouvertures
        if (stats.delivered > 0) {
          const maxOpened = 250; // Exactement 250 ouvertures
          if (stats.opened < maxOpened && Math.random() > 0.6) {
            stats.opened += Math.floor(Math.random() * 3) + 1;
            stats.opened = Math.min(stats.opened, maxOpened);
          }
        }
        
        // Phase 3: Clics (après ouvertures) - 0.1% du total d'emails
        if (stats.opened > 0) {
          const maxClicked = Math.floor(stats.sent * 0.001); // 0.1% du total des emails envoyés
          if (stats.clicked < maxClicked && Math.random() > 0.8) {
            stats.clicked += Math.random() > 0.5 ? 1 : 0;
            stats.clicked = Math.min(stats.clicked, maxClicked);
          }
        }
        
        // Pas de conversions ni de revenus
        stats.converted = 0;
        stats.revenue = 0;
        
        // Calcul des désabonnements et spam
        if (stats.delivered > 0) {
          const maxUnsubscribed = Math.floor(stats.delivered * 0.003); // 0.3%
          const maxSpam = Math.floor(stats.delivered * 0.001); // 0.1%
          
          if (stats.unsubscribed < maxUnsubscribed && Math.random() > 0.9) {
            stats.unsubscribed += Math.random() > 0.7 ? 1 : 0;
          }
          
          if (stats.spamReported < maxSpam && Math.random() > 0.98) {
            stats.spamReported += Math.random() > 0.8 ? 1 : 0;
          }
        }
        
        stats.lastUpdated = new Date().toISOString();
        
        // Sauvegarder dans localStorage pour persistance
        const savedCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        const campaignIndex = savedCampaigns.findIndex((c: Campaign) => c.id === campaign.id);
        if (campaignIndex !== -1) {
          savedCampaigns[campaignIndex].stats = stats;
          localStorage.setItem('campaigns', JSON.stringify(savedCampaigns));
        }
      }
    });
    
    updateCallback([...campaigns]);
  }, 3000); // Mises à jour toutes les 3 secondes
  
  updateCallback(campaigns);
}

export function stopCampaignUpdates() {
  if (campaignUpdateInterval) {
    clearInterval(campaignUpdateInterval);
    campaignUpdateInterval = null;
  }
}