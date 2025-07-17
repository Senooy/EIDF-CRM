import { Campaign, CampaignStats, EmailTemplate, CampaignRecipient, CampaignActivity, CampaignTimelineData } from '@/types/campaign';

// Données spécifiques EIDF pour les variables
const eidfVariables = {
  entreprises: ['Climatech Pro', 'Ventilation Expert', 'AirFlow Solutions', 'CVC Technique', 'Aéraulique Plus'],
  prenoms: ['Jean', 'Marie', 'Pierre', 'Sophie', 'Alain', 'Claire', 'Michel', 'Isabelle', 'Laurent', 'Nathalie'],
  noms: ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Moreau', 'Simon', 'Laurent', 'Leroy', 'Roux', 'David'],
  villes: ['Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes'],
  regions: ['Rhône-Alpes', 'PACA', 'Occitanie', 'Nouvelle-Aquitaine', 'Hauts-de-France', 'Bretagne', 'Grand Est'],
  surfaces: ['2000 m²', '1500 m²', '2500 m²', '1800 m²', '3000 m²', '1200 m²', '2200 m²']
};

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
  
  const isEidfCampaign = true; // Seulement campagne EIDF
  
  // Campagne EIDF : exactement 290 emails (comme demandé)
  const recipientCount = 290;
  
  const statuses: Campaign['status'][] = ['draft', 'scheduled', 'sending', 'sent', 'paused'];
  const status = index < 5 ? 'sent' : statuses[Math.floor(Math.random() * statuses.length)];
  
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
    sentDate: status === 'sent' ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined,
    createdAt: createdAt.toISOString(),
    updatedAt: new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'user-1',
    recipientCount,
    stats: { ...initialStats }
  };
}

function generateCampaignStats(recipientCount: number, isEidf: boolean = false): CampaignStats {
  const sent = recipientCount;
  const deliveryRate = 0.95 + Math.random() * 0.03;
  const delivered = Math.floor(sent * deliveryRate);
  
  // Statistiques spécifiques EIDF (BtoB ventilation)
  const openRate = 0.25 + Math.random() * 0.10; // 25-35% (BtoB plus élevé)
  const opened = Math.floor(delivered * openRate);
  
  const clickRate = 0.02 + Math.random() * 0.02; // 2-4% (BtoB spécialisé)
  const clicked = Math.floor(opened * clickRate);
  
  const conversionRate = 0.08 + Math.random() * 0.04; // 8-12% (demandes de devis)
  const converted = Math.floor(clicked * conversionRate);
  
  const bounceRate = 0.01 + Math.random() * 0.02; // Taux plus bas (listes BtoB)
  const bounced = Math.floor(sent * bounceRate);
  
  const unsubscribeRate = 0.001 + Math.random() * 0.002; // Très bas (BtoB)
  const unsubscribed = Math.floor(delivered * unsubscribeRate);
  
  const spamRate = 0.0005 + Math.random() * 0.0005; // Très bas (BtoB)
  const spamReported = Math.floor(delivered * spamRate);
  
  const avgOrderValue = 15000 + Math.random() * 30000; // 15-45k€ par projet
  const revenue = converted * avgOrderValue;
  
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
        const targetSent = 290; // Objectif : 290 emails
        
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
        
        // Phase 2: Ouvertures (après delivery)
        if (stats.delivered > 0) {
          const maxOpened = Math.floor(stats.delivered * (0.25 + Math.random() * 0.10)); // 25-35%
          if (stats.opened < maxOpened && Math.random() > 0.6) {
            stats.opened += Math.floor(Math.random() * 3) + 1;
            stats.opened = Math.min(stats.opened, maxOpened);
          }
        }
        
        // Phase 3: Clics (après ouvertures)
        if (stats.opened > 0) {
          const maxClicked = Math.floor(stats.opened * (0.02 + Math.random() * 0.03)); // 2-5%
          if (stats.clicked < maxClicked && Math.random() > 0.8) {
            stats.clicked += Math.random() > 0.5 ? 1 : 0;
            stats.clicked = Math.min(stats.clicked, maxClicked);
          }
        }
        
        // Phase 4: Conversions (après clics)
        if (stats.clicked > 0) {
          const maxConverted = Math.floor(stats.clicked * (0.08 + Math.random() * 0.07)); // 8-15%
          if (stats.converted < maxConverted && Math.random() > 0.95) {
            stats.converted += 1;
            stats.revenue += (15000 + Math.random() * 30000); // 15-45k€ par projet
            stats.converted = Math.min(stats.converted, maxConverted);
          }
        }
        
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