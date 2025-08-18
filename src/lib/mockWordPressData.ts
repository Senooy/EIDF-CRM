export interface WordPressPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: any[];
  categories: number[];
  tags: number[];
  permalink_template: string;
  generated_slug: string;
}

export interface WordPressPage {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  template: string;
  parent: number;
  menu_order: number;
}

export interface WordPressUser {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: {
    '24': string;
    '48': string;
    '96': string;
  };
  meta: any[];
  roles: string[];
}

export function generateMockPosts(count: number = 10): WordPressPost[] {
  const posts: WordPressPost[] = [];
  const baseDate = new Date();

  for (let i = 0; i < count; i++) {
    const postDate = new Date(baseDate.getTime() - (i * 24 * 60 * 60 * 1000));
    const post: WordPressPost = {
      id: i + 1,
      date: postDate.toISOString(),
      date_gmt: postDate.toISOString(),
      guid: { rendered: `https://eco-industrie-france.com/?p=${i + 1}` },
      modified: postDate.toISOString(),
      modified_gmt: postDate.toISOString(),
      slug: `article-${i + 1}`,
      status: 'publish',
      type: 'post',
      link: `https://eco-industrie-france.com/article-${i + 1}/`,
      title: { rendered: `Article ${i + 1} - Solutions de ventilation industrielle` },
      content: { 
        rendered: `<p>Contenu détaillé sur les solutions de ventilation industrielle pour l'article ${i + 1}. EIDF propose des gaines sur mesure...</p>`,
        protected: false
      },
      excerpt: { 
        rendered: `<p>Extrait de l'article ${i + 1} sur la ventilation...</p>`,
        protected: false
      },
      author: 1,
      featured_media: 0,
      comment_status: 'open',
      ping_status: 'open',
      sticky: false,
      template: '',
      format: 'standard',
      meta: [],
      categories: [1],
      tags: [],
      permalink_template: 'https://eco-industrie-france.com/%postname%/',
      generated_slug: `article-${i + 1}`
    };
    posts.push(post);
  }

  return posts;
}

export function generateMockPages(count: number = 5): WordPressPage[] {
  const pages: WordPressPage[] = [];
  const pageNames = ['Accueil', 'À propos', 'Services', 'Contact', 'Demande de devis'];

  for (let i = 0; i < Math.min(count, pageNames.length); i++) {
    const page: WordPressPage = {
      id: i + 100,
      date: new Date().toISOString(),
      date_gmt: new Date().toISOString(),
      guid: { rendered: `https://eco-industrie-france.com/?page_id=${i + 100}` },
      modified: new Date().toISOString(),
      modified_gmt: new Date().toISOString(),
      slug: pageNames[i].toLowerCase().replace(/\s+/g, '-').replace(/[àáâ]/g, 'a').replace(/[ùú]/g, 'u'),
      status: 'publish',
      type: 'page',
      link: `https://eco-industrie-france.com/${pageNames[i].toLowerCase().replace(/\s+/g, '-')}/`,
      title: { rendered: pageNames[i] },
      content: { 
        rendered: `<p>Contenu de la page ${pageNames[i]} d'EIDF...</p>`,
        protected: false
      },
      excerpt: { 
        rendered: `<p>Extrait de la page ${pageNames[i]}...</p>`,
        protected: false
      },
      author: 1,
      featured_media: 0,
      comment_status: 'closed',
      ping_status: 'closed',
      template: '',
      parent: 0,
      menu_order: i
    };
    pages.push(page);
  }

  return pages;
}

export function generateMockUsers(count: number = 3): WordPressUser[] {
  const users: WordPressUser[] = [];
  const userNames = ['Admin EIDF', 'Mounir Ben Jaffal', 'Équipe Technique'];

  for (let i = 0; i < Math.min(count, userNames.length); i++) {
    const user: WordPressUser = {
      id: i + 1,
      name: userNames[i],
      url: 'https://eco-industrie-france.com',
      description: `${userNames[i]} - Équipe EIDF`,
      link: `https://eco-industrie-france.com/author/${userNames[i].toLowerCase().replace(/\s+/g, '-')}/`,
      slug: userNames[i].toLowerCase().replace(/\s+/g, '-'),
      avatar_urls: {
        '24': `https://secure.gravatar.com/avatar/placeholder-${i}?s=24&d=mm&r=g`,
        '48': `https://secure.gravatar.com/avatar/placeholder-${i}?s=48&d=mm&r=g`,
        '96': `https://secure.gravatar.com/avatar/placeholder-${i}?s=96&d=mm&r=g`
      },
      meta: [],
      roles: i === 0 ? ['administrator'] : ['editor']
    };
    users.push(user);
  }

  return users;
}

export interface WordPressSiteInfo {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  timezone_string: string;
  namespaces: string[];
  authentication: any[];
  routes: any;
}

export function generateMockSiteInfo(): WordPressSiteInfo {
  return {
    name: 'EIDF - Eco Industrie de France',
    description: 'Fabricant français de gaines de ventilation sur mesure',
    url: 'https://eco-industrie-france.com',
    home: 'https://eco-industrie-france.com',
    gmt_offset: 1,
    timezone_string: 'Europe/Paris',
    namespaces: [
      'oembed/1.0',
      'wp/v2',
      'wp-site-health/v1'
    ],
    authentication: [],
    routes: {}
  };
}

export const mockWordPressData = {
  posts: generateMockPosts(10),
  pages: generateMockPages(5),
  users: generateMockUsers(3),
  siteInfo: generateMockSiteInfo()
};

export default mockWordPressData;