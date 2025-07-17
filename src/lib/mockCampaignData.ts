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
  'Campagne EIDF - Ventilation Professionnelle',
  'Summer Sale 2024',
  'New Product Launch',
  'Customer Appreciation Week',
  'Black Friday Deals',
  'Welcome Series',
  'Monthly Newsletter',
  'Abandoned Cart Recovery',
  'Holiday Special Offers',
  'Flash Sale Alert',
  'VIP Exclusive Access'
];

const emailSubjects = [
  'Solutions sur-mesure en ventilation professionnelle – {{nom_entreprise}} à votre service',
  '🌟 Exclusive Offer Just for You!',
  'Don\'t Miss Out: 50% Off Everything',
  'Your Cart is Waiting...',
  'Welcome to Our Community!',
  'Limited Time: Free Shipping Today',
  '🎁 A Special Gift Inside',
  'Last Chance to Save Big',
  'New Arrivals You\'ll Love',
  'Thank You for Being Amazing',
  'Flash Sale: 3 Hours Only!'
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
🌐 https://eco-industrie-france.com`,
  
  `<h2>Special Offer Just for You!</h2>
<p>Dear Valued Customer,</p>
<p>We're excited to offer you an exclusive discount on our latest collection. Use code <strong>SAVE20</strong> at checkout.</p>
<button style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer;">Shop Now</button>`,
  
  `<h2>Your Items are Waiting!</h2>
<p>Hi there,</p>
<p>You left some amazing items in your cart. Complete your purchase now and enjoy free shipping!</p>
<button style="background-color: #2196F3; color: white; padding: 10px 20px; border: none; cursor: pointer;">Complete Purchase</button>`,
  
  `<h2>Welcome to Our Family!</h2>
<p>Thank you for joining us!</p>
<p>As a welcome gift, here's 15% off your first purchase. Your journey with us starts now!</p>
<button style="background-color: #FF9800; color: white; padding: 10px 20px; border: none; cursor: pointer;">Start Shopping</button>`
];

export function generateMockCampaign(index: number): Campaign {
  const now = new Date();
  const createdDays = Math.floor(Math.random() * 30) + 1;
  const createdAt = new Date(now.getTime() - createdDays * 24 * 60 * 60 * 1000);
  
  const isEidfCampaign = index === 0; // Premier élément = campagne EIDF
  
  let recipientCount: number;
  if (isEidfCampaign) {
    // Campagne EIDF : exactement 290 emails (comme demandé)
    recipientCount = 290;
  } else {
    const baseEmails = 290;
    const variance = Math.floor(Math.random() * 100) - 50;
    recipientCount = baseEmails + variance;
  }
  
  const stats = generateCampaignStats(recipientCount, isEidfCampaign);
  
  const statuses: Campaign['status'][] = ['draft', 'scheduled', 'sending', 'sent', 'paused'];
  const status = index < 5 ? 'sent' : statuses[Math.floor(Math.random() * statuses.length)];
  
  let subject = emailSubjects[index % emailSubjects.length];
  let body = emailBodies[index % emailBodies.length];
  
  // Substitution des variables pour la campagne EIDF
  if (isEidfCampaign) {
    const randomEntreprise = eidfVariables.entreprises[Math.floor(Math.random() * eidfVariables.entreprises.length)];
    const randomPrenom = eidfVariables.prenoms[Math.floor(Math.random() * eidfVariables.prenoms.length)];
    const randomNom = eidfVariables.noms[Math.floor(Math.random() * eidfVariables.noms.length)];
    const randomVille = eidfVariables.villes[Math.floor(Math.random() * eidfVariables.villes.length)];
    const randomRegion = eidfVariables.regions[Math.floor(Math.random() * eidfVariables.regions.length)];
    const randomSurface = eidfVariables.surfaces[Math.floor(Math.random() * eidfVariables.surfaces.length)];
    
    subject = subject.replace('{{nom_entreprise}}', randomEntreprise);
    body = body
      .replace(/\{\{nom_entreprise\}\}/g, randomEntreprise)
      .replace(/\{\{prenom_contact\}\}/g, randomPrenom)
      .replace(/\{\{nom_contact\}\}/g, randomNom)
      .replace(/\{\{ville\}\}/g, randomVille)
      .replace(/\{\{region\}\}/g, randomRegion)
      .replace(/\{\{surface_atelier\}\}/g, randomSurface);
  }
  
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
    stats
  };
}

function generateCampaignStats(recipientCount: number, isEidf: boolean = false): CampaignStats {
  const sent = recipientCount;
  const deliveryRate = 0.95 + Math.random() * 0.03;
  const delivered = Math.floor(sent * deliveryRate);
  
  if (isEidf) {
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
  
  // Statistiques par défaut pour les autres campagnes
  const openRate = 0.15 + Math.random() * 0.10;
  const opened = Math.floor(delivered * openRate);
  
  const clickRate = 0.001 + Math.random() * 0.001;
  const clicked = Math.floor(opened * clickRate);
  
  const conversionRate = 0.0002 + Math.random() * 0.0003;
  const converted = Math.floor(clicked * 10 * conversionRate);
  
  const bounceRate = 0.02 + Math.random() * 0.03;
  const bounced = Math.floor(sent * bounceRate);
  
  const unsubscribeRate = 0.005 + Math.random() * 0.005;
  const unsubscribed = Math.floor(delivered * unsubscribeRate);
  
  const spamRate = 0.001 + Math.random() * 0.001;
  const spamReported = Math.floor(delivered * spamRate);
  
  const avgOrderValue = 75 + Math.random() * 150;
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
    },
    {
      id: 'template-1',
      name: 'Summer Sale Template',
      subject: '☀️ Summer Sale - Up to 50% Off!',
      body: emailBodies[1],
      category: 'promotional',
      thumbnailUrl: 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=Summer+Sale',
      variables: ['customer_name', 'discount_code'],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-2',
      name: 'Welcome Email',
      subject: 'Welcome to {{company_name}}!',
      body: emailBodies[2],
      category: 'welcome',
      thumbnailUrl: 'https://via.placeholder.com/300x200/2196F3/FFFFFF?text=Welcome',
      variables: ['customer_name', 'company_name'],
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-3',
      name: 'Abandoned Cart',
      subject: 'You left something behind...',
      body: emailBodies[1],
      category: 'transactional',
      thumbnailUrl: 'https://via.placeholder.com/300x200/FF9800/FFFFFF?text=Cart+Recovery',
      variables: ['customer_name', 'cart_items', 'cart_total'],
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-4',
      name: 'Monthly Newsletter',
      subject: '📰 {{month}} Newsletter',
      body: `<h2>Monthly Updates</h2><p>Here's what's new this month...</p>`,
      category: 'newsletter',
      thumbnailUrl: 'https://via.placeholder.com/300x200/9C27B0/FFFFFF?text=Newsletter',
      variables: ['month', 'featured_products'],
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
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

export function generateMockCampaigns(count: number = 10): Campaign[] {
  return Array.from({ length: count }, (_, i) => generateMockCampaign(i));
}

let campaignUpdateInterval: NodeJS.Timeout | null = null;

export function startCampaignUpdates(updateCallback: (campaigns: Campaign[]) => void) {
  const campaigns = generateMockCampaigns(10);
  
  campaignUpdateInterval = setInterval(() => {
    campaigns.forEach((campaign, index) => {
      if (campaign.status === 'sent' && Math.random() > 0.7) {
        const stats = campaign.stats;
        const isEidfCampaign = index === 0;
        
        if (isEidfCampaign) {
          // Évolution spécifique EIDF (BtoB)
          const maxOpenRate = 0.35; // 35% max
          const maxClickRate = 0.04; // 4% max
          const maxConversionRate = 0.12; // 12% max
          
          // Ouvertures progressives (BtoB plus lent)
          if (Math.random() > 0.6 && stats.opened < stats.delivered * maxOpenRate) {
            stats.opened += Math.floor(Math.random() * 2) + 1;
          }
          
          // Clics sur demande de devis
          if (Math.random() > 0.85 && stats.clicked < stats.opened * maxClickRate) {
            stats.clicked += 1;
          }
          
          // Conversions (demandes de devis)
          if (Math.random() > 0.95 && stats.converted < stats.clicked * maxConversionRate) {
            stats.converted += 1;
            stats.revenue += (15000 + Math.random() * 30000); // 15-45k€ par projet
          }
        } else {
          // Évolution standard pour les autres campagnes
          if (Math.random() > 0.5 && stats.opened < stats.delivered * 0.3) {
            stats.opened += Math.floor(Math.random() * 3) + 1;
          }
          
          if (Math.random() > 0.95 && stats.clicked < stats.opened * 0.02) {
            stats.clicked += 1;
          }
          
          if (Math.random() > 0.99 && stats.converted < stats.clicked * 0.5) {
            stats.converted += 1;
            stats.revenue += (75 + Math.random() * 150);
          }
        }
        
        stats.lastUpdated = new Date().toISOString();
      }
    });
    
    updateCallback([...campaigns]);
  }, 5000);
  
  updateCallback(campaigns);
}

export function stopCampaignUpdates() {
  if (campaignUpdateInterval) {
    clearInterval(campaignUpdateInterval);
    campaignUpdateInterval = null;
  }
}