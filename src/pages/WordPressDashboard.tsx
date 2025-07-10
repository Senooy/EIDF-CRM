import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  MessageSquare, 
  Users, 
  Image, 
  TrendingUp,
  Activity,
  Clock,
  FolderOpen,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveSite } from '@/hooks/useActiveSite';
import { RequireSite } from '@/components/RequireSite';
import { wpAnalytics } from '@/lib/api/wordpress-analytics';
import { checkProxyStatus } from '@/lib/api/proxy-check';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import Navbar from '@/components/Layout/Navbar';
import Sidebar from '@/components/Layout/Sidebar';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function WordPressDashboard() {
  const { activeSite, hasActiveSite } = useActiveSite();
  const [proxyError, setProxyError] = useState<string | null>(null);
  
  // Check proxy status on mount
  useEffect(() => {
    checkProxyStatus().then(status => {
      if (!status.isRunning && import.meta.env.DEV) {
        setProxyError(status.error || status.message);
      }
    });
  }, []);
  
  // Queries pour les différentes métriques
  const { data: postMetrics, isLoading: loadingPosts, error: postsError } = useQuery({
    queryKey: ['wp-posts', activeSite?.id],
    queryFn: () => wpAnalytics.getPostMetrics(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const { data: commentMetrics, isLoading: loadingComments, error: commentsError } = useQuery({
    queryKey: ['wp-comments', activeSite?.id],
    queryFn: () => wpAnalytics.getCommentMetrics(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: userMetrics, isLoading: loadingUsers, error: usersError } = useQuery({
    queryKey: ['wp-users', activeSite?.id],
    queryFn: () => wpAnalytics.getUserMetrics(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: mediaMetrics, isLoading: loadingMedia, error: mediaError } = useQuery({
    queryKey: ['wp-media', activeSite?.id],
    queryFn: () => wpAnalytics.getMediaMetrics(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: pageMetrics, isLoading: loadingPages, error: pagesError } = useQuery({
    queryKey: ['wp-pages', activeSite?.id],
    queryFn: () => wpAnalytics.getPageMetrics(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isLoading = loadingPosts || loadingComments || loadingUsers || loadingMedia || loadingPages;
  const hasErrors = postsError || commentsError || usersError || mediaError || pagesError;

  // Formatter pour les tailles de fichiers
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <RequireSite>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Dashboard WordPress</h1>
              <p className="text-muted-foreground">
                Vue d'ensemble de {activeSite?.name}
              </p>
            </div>

            {/* Proxy Error Alert */}
            {proxyError && import.meta.env.DEV && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Serveur proxy non disponible</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">{proxyError}</p>
                  <p className="font-mono text-sm bg-destructive/10 p-2 rounded mt-2">
                    npm run start:proxy
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* API Error Alert */}
            {hasErrors && !proxyError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur de connexion</AlertTitle>
                <AlertDescription>
                  Certaines données n'ont pas pu être chargées. Vérifiez que :
                  <ul className="list-disc ml-6 mt-2">
                    <li>Les identifiants WordPress sont corrects</li>
                    <li>L'API REST WordPress est activée sur votre site</li>
                    <li>Les permissions d'application sont configurées</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Articles</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingPosts ? (
                    <Skeleton className="h-8 w-24" />
                  ) : postsError ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Erreur de chargement</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{postMetrics?.totalPosts || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {postMetrics?.postsLast30Days || 0} nouveaux ce mois
                      </p>
                      <Progress 
                        value={(postMetrics?.publishedPosts || 0) / (postMetrics?.totalPosts || 1) * 100} 
                        className="mt-2"
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Commentaires</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingComments ? (
                    <Skeleton className="h-8 w-24" />
                  ) : commentsError ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Erreur de chargement</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{commentMetrics?.totalComments || 0}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {commentMetrics?.pendingComments || 0} en attente
                        </Badge>
                        <Badge variant="destructive" className="text-xs">
                          {commentMetrics?.spamComments || 0} spam
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <Skeleton className="h-8 w-24" />
                  ) : usersError ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Erreur de chargement</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{userMetrics?.totalUsers || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        +{userMetrics?.newUsersLast30Days || 0} ce mois
                      </p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-500">
                          {((userMetrics?.newUsersLast30Days || 0) / (userMetrics?.totalUsers || 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Médias</CardTitle>
                  <Image className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingMedia ? (
                    <Skeleton className="h-8 w-24" />
                  ) : mediaError ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Erreur de chargement</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{mediaMetrics?.totalMedia || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(mediaMetrics?.totalSizeBytes || 0)} utilisés
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs avec visualisations */}
            <Tabs defaultValue="content" className="space-y-4">
              <TabsList>
                <TabsTrigger value="content">Contenu</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
                <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                <TabsTrigger value="media">Médias</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Distribution des articles par catégorie */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Articles par catégorie</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingPosts ? (
                        <Skeleton className="h-64 w-full" />
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={postMetrics?.postsPerCategory || []}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({name, percentage}) => `${name} (${percentage.toFixed(0)}%)`}
                            >
                              {postMetrics?.postsPerCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Articles par auteur */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top auteurs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingPosts ? (
                        <Skeleton className="h-64 w-full" />
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={postMetrics?.postsPerAuthor.slice(0, 5) || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="postCount" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Articles récents */}
                <Card>
                  <CardHeader>
                    <CardTitle>Articles récents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loadingPosts ? (
                        <>
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                        </>
                      ) : (
                        postMetrics?.recentPosts.slice(0, 5).map(post => (
                          <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{post.title}</h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(post.date).toLocaleDateString()}
                                </span>
                                <span>{post.author}</span>
                                {post.commentCount !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {post.commentCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge variant={post.status === 'publish' ? 'default' : 'secondary'}>
                              {post.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="engagement" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Commentaires récents */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Commentaires récents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {loadingComments ? (
                          <>
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                          </>
                        ) : (
                          commentMetrics?.recentComments.slice(0, 5).map(comment => (
                            <div key={comment.id} className="border-l-2 border-muted pl-4">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{comment.author}</p>
                                <Badge 
                                  variant={comment.status === 'approved' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {comment.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1"
                                 dangerouslySetInnerHTML={{ __html: comment.content }}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(comment.date).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top commentateurs */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top commentateurs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {loadingComments ? (
                          <>
                            <Skeleton key="skeleton-1" className="h-12 w-full" />
                            <Skeleton key="skeleton-2" className="h-12 w-full" />
                          </>
                        ) : (
                          commentMetrics?.topCommenters.map((commenter, index) => (
                            <div key={commenter.email} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{commenter.name}</p>
                                  <p className="text-xs text-muted-foreground">{commenter.email}</p>
                                </div>
                              </div>
                              <Badge variant="outline">{commenter.commentCount} commentaires</Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Répartition par rôle */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Utilisateurs par rôle</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingUsers ? (
                        <Skeleton className="h-64 w-full" />
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={userMetrics?.usersByRole || []}
                              dataKey="count"
                              nameKey="role"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({role, percentage}) => `${role} (${percentage.toFixed(0)}%)`}
                            >
                              {userMetrics?.usersByRole.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Croissance des utilisateurs */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Croissance des utilisateurs (30j)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingUsers ? (
                        <Skeleton className="h-64 w-full" />
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={userMetrics?.userGrowthTrend || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(date) => new Date(date).toLocaleDateString('fr-FR')}
                            />
                            <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Types de médias */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Répartition par type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingMedia ? (
                        <Skeleton className="h-64 w-full" />
                      ) : (
                        <div className="space-y-3">
                          {mediaMetrics?.mediaByType.map(type => (
                            <div key={type.mimeType}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{type.mimeType}</span>
                                <span className="text-sm text-muted-foreground">
                                  {type.count} fichiers ({formatFileSize(type.totalSizeBytes)})
                                </span>
                              </div>
                              <Progress value={type.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Fichiers volumineux */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Fichiers les plus volumineux</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {loadingMedia ? (
                          <>
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                          </>
                        ) : (
                          mediaMetrics?.largestFiles.slice(0, 5).map(file => (
                            <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate">{file.filename}</span>
                              </div>
                              <Badge variant="outline">{formatFileSize(file.sizeBytes)}</Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </RequireSite>
  );
}