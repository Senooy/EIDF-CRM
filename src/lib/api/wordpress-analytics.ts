import { wpClientManager } from './wordpress-client';

// Interfaces pour les métriques WordPress
export interface PostMetrics {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  recentPosts: PostDetail[];
  popularPosts: PostDetail[];
  postsPerCategory: CategoryCount[];
  postsPerAuthor: AuthorCount[];
  averageWordsPerPost: number;
  postsLast30Days: number;
}

export interface PostDetail {
  id: number;
  title: string;
  slug: string;
  date: string;
  author: string;
  categories: string[];
  status: string;
  link: string;
  commentCount?: number;
  viewCount?: number; // Si un plugin de stats est installé
  excerpt?: string;
}

export interface CategoryCount {
  id: number;
  name: string;
  slug: string;
  count: number;
  percentage: number;
}

export interface AuthorCount {
  id: number;
  name: string;
  email: string;
  postCount: number;
  percentage: number;
}

export interface CommentMetrics {
  totalComments: number;
  approvedComments: number;
  pendingComments: number;
  spamComments: number;
  recentComments: CommentDetail[];
  commentsLast30Days: number;
  averageResponseTime?: number;
  commentsByPost: CommentsByPost[];
  topCommenters: Commenter[];
}

export interface CommentDetail {
  id: number;
  postId: number;
  postTitle: string;
  author: string;
  authorEmail: string;
  date: string;
  content: string;
  status: string;
  parentId: number;
}

export interface CommentsByPost {
  postId: number;
  postTitle: string;
  commentCount: number;
}

export interface Commenter {
  name: string;
  email: string;
  commentCount: number;
  lastCommentDate: string;
}

export interface UserMetrics {
  totalUsers: number;
  usersByRole: RoleCount[];
  newUsersLast30Days: number;
  activeUsers: UserDetail[];
  userGrowthTrend: GrowthData[];
}

export interface RoleCount {
  role: string;
  count: number;
  percentage: number;
}

export interface UserDetail {
  id: number;
  username: string;
  email: string;
  displayName: string;
  registeredDate: string;
  role: string;
  postCount?: number;
  lastActive?: string;
}

export interface GrowthData {
  date: string;
  count: number;
  newUsers: number;
}

export interface MediaMetrics {
  totalMedia: number;
  totalSizeBytes: number;
  mediaByType: MediaTypeCount[];
  recentUploads: MediaDetail[];
  largestFiles: MediaDetail[];
  unusedMedia?: MediaDetail[];
}

export interface MediaTypeCount {
  mimeType: string;
  count: number;
  totalSizeBytes: number;
  percentage: number;
}

export interface MediaDetail {
  id: number;
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadDate: string;
  url: string;
  altText?: string;
  attachedTo?: number;
}

export interface PageMetrics {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  parentPages: number;
  childPages: number;
  pagesHierarchy: PageHierarchy[];
  recentlyUpdated: PageDetail[];
}

export interface PageDetail {
  id: number;
  title: string;
  slug: string;
  status: string;
  parent: number;
  menuOrder: number;
  template: string;
  modifiedDate: string;
  author: string;
}

export interface PageHierarchy {
  id: number;
  title: string;
  children: PageHierarchy[];
}

// Service pour les analytics WordPress
export class WordPressAnalyticsService {
  
  // Posts Analytics
  async getPostMetrics(siteId?: number): Promise<PostMetrics> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer tous les posts
    const allPosts = await this.getAllPosts(client);
    
    // Calculer les métriques
    const totalPosts = allPosts.length;
    const publishedPosts = allPosts.filter(p => p.status === 'publish').length;
    const draftPosts = allPosts.filter(p => p.status === 'draft').length;
    
    // Posts des 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const postsLast30Days = allPosts.filter(p => 
      new Date(p.date_gmt || p.date) > thirtyDaysAgo
    ).length;
    
    // Posts récents
    const recentPosts = allPosts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(p => this.mapToPostDetail(p));
    
    // Posts par catégorie
    const categoryMap = new Map<number, { name: string; slug: string; count: number }>();
    allPosts.forEach(post => {
      (post.categories || []).forEach(catId => {
        const current = categoryMap.get(catId) || { name: '', slug: '', count: 0 };
        categoryMap.set(catId, { ...current, count: current.count + 1 });
      });
    });
    
    // Récupérer les noms des catégories
    const categories = await client.getWordPressData('categories', { per_page: 100 });
    const postsPerCategory: CategoryCount[] = Array.from(categoryMap.entries()).map(([id, data]) => {
      const category = categories.find((c: any) => c.id === id);
      return {
        id,
        name: category?.name || 'Sans catégorie',
        slug: category?.slug || '',
        count: data.count,
        percentage: (data.count / totalPosts) * 100
      };
    }).sort((a, b) => b.count - a.count);
    
    // Posts par auteur
    const authorMap = new Map<number, number>();
    allPosts.forEach(post => {
      const count = authorMap.get(post.author) || 0;
      authorMap.set(post.author, count + 1);
    });
    
    // Récupérer les infos des auteurs
    const users = await client.getUsers({ per_page: 100 });
    const postsPerAuthor: AuthorCount[] = Array.from(authorMap.entries()).map(([id, count]) => {
      const user = users.find((u: any) => u.id === id);
      return {
        id,
        name: user?.name || 'Anonyme',
        email: user?.email || '',
        postCount: count,
        percentage: (count / totalPosts) * 100
      };
    }).sort((a, b) => b.postCount - a.postCount);
    
    // Calcul du nombre moyen de mots (approximatif basé sur le contenu HTML)
    const totalWords = allPosts.reduce((sum, post) => {
      const content = post.content?.rendered || '';
      const text = content.replace(/<[^>]*>/g, ''); // Enlever les balises HTML
      const words = text.split(/\s+/).filter(w => w.length > 0).length;
      return sum + words;
    }, 0);
    const averageWordsPerPost = totalPosts > 0 ? Math.round(totalWords / totalPosts) : 0;
    
    // Posts populaires (basé sur le nombre de commentaires si disponible)
    const popularPosts = allPosts
      .filter(p => p.status === 'publish')
      .sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0))
      .slice(0, 10)
      .map(p => this.mapToPostDetail(p));
    
    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      recentPosts,
      popularPosts,
      postsPerCategory,
      postsPerAuthor,
      averageWordsPerPost,
      postsLast30Days
    };
  }
  
  // Comments Analytics
  async getCommentMetrics(siteId?: number): Promise<CommentMetrics> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer tous les commentaires
    const allComments = await this.getAllComments(client);
    
    const totalComments = allComments.length;
    const approvedComments = allComments.filter(c => c.status === 'approved').length;
    const pendingComments = allComments.filter(c => c.status === 'hold').length;
    const spamComments = allComments.filter(c => c.status === 'spam').length;
    
    // Commentaires des 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const commentsLast30Days = allComments.filter(c => 
      new Date(c.date_gmt || c.date) > thirtyDaysAgo
    ).length;
    
    // Commentaires récents
    const recentComments = allComments
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
      .map(c => this.mapToCommentDetail(c));
    
    // Commentaires par post
    const commentsByPostMap = new Map<number, { title: string; count: number }>();
    allComments.forEach(comment => {
      const current = commentsByPostMap.get(comment.post) || { title: '', count: 0 };
      commentsByPostMap.set(comment.post, { 
        title: current.title, 
        count: current.count + 1 
      });
    });
    
    const commentsByPost: CommentsByPost[] = Array.from(commentsByPostMap.entries())
      .map(([postId, data]) => ({
        postId,
        postTitle: data.title || `Post #${postId}`,
        commentCount: data.count
      }))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 10);
    
    // Top commentateurs
    const commenterMap = new Map<string, { name: string; count: number; lastDate: string }>();
    allComments.forEach(comment => {
      const key = comment.author_email;
      const current = commenterMap.get(key) || { 
        name: comment.author_name, 
        count: 0, 
        lastDate: comment.date 
      };
      commenterMap.set(key, {
        name: comment.author_name,
        count: current.count + 1,
        lastDate: new Date(comment.date) > new Date(current.lastDate) ? comment.date : current.lastDate
      });
    });
    
    const topCommenters: Commenter[] = Array.from(commenterMap.entries())
      .map(([email, data]) => ({
        name: data.name,
        email,
        commentCount: data.count,
        lastCommentDate: data.lastDate
      }))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 10);
    
    return {
      totalComments,
      approvedComments,
      pendingComments,
      spamComments,
      recentComments,
      commentsLast30Days,
      commentsByPost,
      topCommenters
    };
  }
  
  // Users Analytics
  async getUserMetrics(siteId?: number): Promise<UserMetrics> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer tous les utilisateurs
    const allUsers = await this.getAllUsers(client);
    
    const totalUsers = allUsers.length;
    
    // Utilisateurs par rôle
    const roleMap = new Map<string, number>();
    allUsers.forEach(user => {
      const roles = user.roles || [];
      roles.forEach((role: string) => {
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });
    });
    
    const usersByRole: RoleCount[] = Array.from(roleMap.entries()).map(([role, count]) => ({
      role,
      count,
      percentage: (count / totalUsers) * 100
    })).sort((a, b) => b.count - a.count);
    
    // Nouveaux utilisateurs des 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = allUsers.filter(u => 
      new Date(u.registered_date) > thirtyDaysAgo
    ).length;
    
    // Utilisateurs actifs (les 20 plus récents)
    const activeUsers = allUsers
      .sort((a, b) => new Date(b.registered_date).getTime() - new Date(a.registered_date).getTime())
      .slice(0, 20)
      .map(u => this.mapToUserDetail(u));
    
    // Tendance de croissance (simulée pour les 30 derniers jours)
    const userGrowthTrend: GrowthData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const usersUntilDate = allUsers.filter(u => 
        new Date(u.registered_date) <= date
      ).length;
      
      const newUsersThisDay = allUsers.filter(u => {
        const regDate = new Date(u.registered_date).toISOString().split('T')[0];
        return regDate === dateStr;
      }).length;
      
      userGrowthTrend.push({
        date: dateStr,
        count: usersUntilDate,
        newUsers: newUsersThisDay
      });
    }
    
    return {
      totalUsers,
      usersByRole,
      newUsersLast30Days,
      activeUsers,
      userGrowthTrend
    };
  }
  
  // Media Analytics
  async getMediaMetrics(siteId?: number): Promise<MediaMetrics> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer tous les médias
    const allMedia = await this.getAllMedia(client);
    
    const totalMedia = allMedia.length;
    let totalSizeBytes = 0;
    
    // Médias par type
    const typeMap = new Map<string, { count: number; size: number }>();
    
    allMedia.forEach(media => {
      const size = media.media_details?.filesize || 0;
      totalSizeBytes += size;
      
      const type = media.mime_type || 'unknown';
      const current = typeMap.get(type) || { count: 0, size: 0 };
      typeMap.set(type, {
        count: current.count + 1,
        size: current.size + size
      });
    });
    
    const mediaByType: MediaTypeCount[] = Array.from(typeMap.entries()).map(([mimeType, data]) => ({
      mimeType,
      count: data.count,
      totalSizeBytes: data.size,
      percentage: (data.count / totalMedia) * 100
    })).sort((a, b) => b.count - a.count);
    
    // Uploads récents
    const recentUploads = allMedia
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
      .map(m => this.mapToMediaDetail(m));
    
    // Fichiers les plus volumineux
    const largestFiles = allMedia
      .sort((a, b) => (b.media_details?.filesize || 0) - (a.media_details?.filesize || 0))
      .slice(0, 10)
      .map(m => this.mapToMediaDetail(m));
    
    return {
      totalMedia,
      totalSizeBytes,
      mediaByType,
      recentUploads,
      largestFiles
    };
  }
  
  // Pages Analytics
  async getPageMetrics(siteId?: number): Promise<PageMetrics> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer toutes les pages
    const allPages = await this.getAllPages(client);
    
    const totalPages = allPages.length;
    const publishedPages = allPages.filter(p => p.status === 'publish').length;
    const draftPages = allPages.filter(p => p.status === 'draft').length;
    const parentPages = allPages.filter(p => p.parent === 0).length;
    const childPages = allPages.filter(p => p.parent !== 0).length;
    
    // Construire la hiérarchie des pages
    const pagesHierarchy = this.buildPageHierarchy(allPages);
    
    // Pages récemment modifiées
    const recentlyUpdated = allPages
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
      .slice(0, 10)
      .map(p => this.mapToPageDetail(p));
    
    return {
      totalPages,
      publishedPages,
      draftPages,
      parentPages,
      childPages,
      pagesHierarchy,
      recentlyUpdated
    };
  }
  
  // Méthodes utilitaires privées
  private async getAllPosts(client: any): Promise<any[]> {
    let allPosts: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await client.getPosts({ per_page: 100, page });
      const posts = Array.isArray(response) ? response : response.data || [];
      
      if (posts.length > 0) {
        allPosts = allPosts.concat(posts);
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 100) break; // Limite de sécurité
    }
    
    return allPosts;
  }
  
  private async getAllComments(client: any): Promise<any[]> {
    let allComments: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await client.getComments({ per_page: 100, page });
      const comments = Array.isArray(response) ? response : response.data || [];
      
      if (comments.length > 0) {
        allComments = allComments.concat(comments);
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 100) break;
    }
    
    return allComments;
  }
  
  private async getAllUsers(client: any): Promise<any[]> {
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await client.getUsers({ per_page: 100, page });
      const users = Array.isArray(response) ? response : response.data || [];
      
      if (users.length > 0) {
        allUsers = allUsers.concat(users);
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 50) break;
    }
    
    return allUsers;
  }
  
  private async getAllMedia(client: any): Promise<any[]> {
    let allMedia: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await client.getMedia({ per_page: 100, page });
      const media = Array.isArray(response) ? response : response.data || [];
      
      if (media.length > 0) {
        allMedia = allMedia.concat(media);
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 100) break;
    }
    
    return allMedia;
  }
  
  private async getAllPages(client: any): Promise<any[]> {
    let allPages: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await client.getPages({ per_page: 100, page });
      const pages = Array.isArray(response) ? response : response.data || [];
      
      if (pages.length > 0) {
        allPages = allPages.concat(pages);
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 50) break;
    }
    
    return allPages;
  }
  
  private mapToPostDetail(post: any): PostDetail {
    return {
      id: post.id,
      title: post.title?.rendered || '',
      slug: post.slug,
      date: post.date,
      author: post.author_name || `Author #${post.author}`,
      categories: post.categories || [],
      status: post.status,
      link: post.link,
      commentCount: post.comment_count,
      excerpt: post.excerpt?.rendered || ''
    };
  }
  
  private mapToCommentDetail(comment: any): CommentDetail {
    return {
      id: comment.id,
      postId: comment.post,
      postTitle: '', // À enrichir si nécessaire
      author: comment.author_name,
      authorEmail: comment.author_email,
      date: comment.date,
      content: comment.content?.rendered || '',
      status: comment.status,
      parentId: comment.parent
    };
  }
  
  private mapToUserDetail(user: any): UserDetail {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.name,
      registeredDate: user.registered_date,
      role: user.roles?.[0] || 'subscriber'
    };
  }
  
  private mapToMediaDetail(media: any): MediaDetail {
    return {
      id: media.id,
      title: media.title?.rendered || '',
      filename: media.media_details?.file || '',
      mimeType: media.mime_type,
      sizeBytes: media.media_details?.filesize || 0,
      uploadDate: media.date,
      url: media.source_url,
      altText: media.alt_text,
      attachedTo: media.post
    };
  }
  
  private mapToPageDetail(page: any): PageDetail {
    return {
      id: page.id,
      title: page.title?.rendered || '',
      slug: page.slug,
      status: page.status,
      parent: page.parent,
      menuOrder: page.menu_order,
      template: page.template || 'default',
      modifiedDate: page.modified,
      author: page.author_name || `Author #${page.author}`
    };
  }
  
  private buildPageHierarchy(pages: any[]): PageHierarchy[] {
    const pageMap = new Map(pages.map(p => [p.id, p]));
    const hierarchy: PageHierarchy[] = [];
    
    pages.forEach(page => {
      if (page.parent === 0) {
        hierarchy.push({
          id: page.id,
          title: page.title?.rendered || '',
          children: this.findChildren(page.id, pages, pageMap)
        });
      }
    });
    
    return hierarchy;
  }
  
  private findChildren(parentId: number, pages: any[], pageMap: Map<number, any>): PageHierarchy[] {
    return pages
      .filter(p => p.parent === parentId)
      .map(p => ({
        id: p.id,
        title: p.title?.rendered || '',
        children: this.findChildren(p.id, pages, pageMap)
      }));
  }
}

export const wpAnalytics = new WordPressAnalyticsService();