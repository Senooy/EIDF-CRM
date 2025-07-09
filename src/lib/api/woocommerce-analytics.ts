import { wpClientManager } from './wordpress-client';
import { Order, Customer, Product } from '../woocommerce';

// Interfaces pour les métriques WooCommerce avancées
export interface CartAbandonmentMetrics {
  abandonmentRate: number;
  totalAbandoned: number;
  totalCompleted: number;
  recoveryRate: number;
  averageAbandonedValue: number;
  topAbandonedProducts: AbandonedProduct[];
  abandonmentReasons: AbandonmentReason[];
  hourlyTrends: HourlyTrend[];
}

export interface AbandonedProduct {
  productId: number;
  productName: string;
  abandonmentCount: number;
  totalValue: number;
}

export interface AbandonmentReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface HourlyTrend {
  hour: number;
  abandonmentRate: number;
  orderCount: number;
}

export interface CustomerLifetimeValue {
  averageCLV: number;
  clvDistribution: CLVSegment[];
  topCustomers: CustomerCLV[];
  clvBySegment: SegmentCLV[];
  predictedCLV: PredictedCLV[];
}

export interface CLVSegment {
  segment: string;
  customerCount: number;
  averageValue: number;
  percentage: number;
}

export interface CustomerCLV {
  customerId: number;
  customerName: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
  daysSinceFirstOrder: number;
  predictedCLV?: number;
}

export interface SegmentCLV {
  segment: string;
  averageCLV: number;
  customerCount: number;
  totalRevenue: number;
}

export interface PredictedCLV {
  customerId: number;
  currentCLV: number;
  predicted3Months: number;
  predicted6Months: number;
  predicted12Months: number;
  churnProbability: number;
}

export interface CohortAnalysis {
  cohorts: Cohort[];
  retentionMatrix: RetentionData[][];
  averageRetention: RetentionTrend[];
}

export interface Cohort {
  cohortDate: string;
  customerCount: number;
  totalRevenue: number;
  retention: RetentionMonth[];
}

export interface RetentionMonth {
  month: number;
  retainedCustomers: number;
  retentionRate: number;
  revenue: number;
}

export interface RetentionData {
  cohortDate: string;
  month: number;
  retentionRate: number;
}

export interface RetentionTrend {
  month: number;
  averageRetentionRate: number;
}

export interface StockPredictions {
  criticalStock: StockAlert[];
  predictedStockouts: StockoutPrediction[];
  overstock: OverstockItem[];
  optimalReorderPoints: ReorderPoint[];
  stockTurnover: StockTurnoverMetric[];
}

export interface StockAlert {
  productId: number;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  daysUntilStockout: number;
  averageDailySales: number;
}

export interface StockoutPrediction {
  productId: number;
  productName: string;
  predictedStockoutDate: string;
  estimatedLostRevenue: number;
  recommendedOrderQuantity: number;
}

export interface OverstockItem {
  productId: number;
  productName: string;
  currentStock: number;
  monthsOfSupply: number;
  tiedUpCapital: number;
  recommendedDiscount?: number;
}

export interface ReorderPoint {
  productId: number;
  productName: string;
  optimalReorderPoint: number;
  optimalOrderQuantity: number;
  leadTimeDays: number;
}

export interface StockTurnoverMetric {
  productId: number;
  productName: string;
  turnoverRate: number;
  daysInventory: number;
  efficiency: 'High' | 'Medium' | 'Low';
}

export interface PromotionROI {
  totalPromotions: number;
  activePromotions: number;
  overallROI: number;
  promotionPerformance: PromotionPerformance[];
  bestPerformers: TopPromotion[];
  worstPerformers: TopPromotion[];
  recommendedActions: PromotionRecommendation[];
}

export interface PromotionPerformance {
  promotionId: string;
  promotionName: string;
  type: 'coupon' | 'sale' | 'bundle' | 'free_shipping';
  startDate: string;
  endDate: string;
  revenue: number;
  cost: number;
  roi: number;
  ordersCount: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface TopPromotion {
  promotionId: string;
  promotionName: string;
  roi: number;
  revenue: number;
  insight: string;
}

export interface PromotionRecommendation {
  type: string;
  recommendation: string;
  expectedImpact: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface PaymentAnalytics {
  paymentMethodDistribution: PaymentMethodStat[];
  failureRate: number;
  averageProcessingTime: number;
  paymentFailures: PaymentFailure[];
  conversionByMethod: PaymentConversion[];
  fraudIndicators: FraudIndicator[];
}

export interface PaymentMethodStat {
  method: string;
  transactionCount: number;
  totalRevenue: number;
  percentage: number;
  averageOrderValue: number;
  failureRate: number;
}

export interface PaymentFailure {
  orderId: number;
  date: string;
  paymentMethod: string;
  failureReason: string;
  amount: number;
  customerEmail: string;
}

export interface PaymentConversion {
  paymentMethod: string;
  conversionRate: number;
  averageTime: number;
  dropoffRate: number;
}

export interface FraudIndicator {
  indicator: string;
  severity: 'High' | 'Medium' | 'Low';
  occurrences: number;
  description: string;
}

export interface ChannelPerformance {
  channels: SalesChannel[];
  topChannel: SalesChannel;
  channelComparison: ChannelComparison[];
  crossChannelBehavior: CrossChannelMetric[];
}

export interface SalesChannel {
  channelName: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  conversionRate: number;
  customerCount: number;
  growthRate: number;
}

export interface ChannelComparison {
  metric: string;
  channels: { [channelName: string]: number };
  bestPerformer: string;
}

export interface CrossChannelMetric {
  customerSegment: string;
  channelPreferences: { [channelName: string]: number };
  averageChannelsUsed: number;
  totalValue: number;
}

// Service pour les analytics WooCommerce avancées
export class WooCommerceAnalyticsService {
  
  // Analyse d'abandon de panier
  async getCartAbandonmentMetrics(siteId?: number, days: number = 30): Promise<CartAbandonmentMetrics> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer les commandes des X derniers jours
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const orders = await client.getOrders({
      after: startDate.toISOString(),
      per_page: 100,
      status: 'any'
    });
    
    // Séparer les commandes complétées et abandonnées
    const completedOrders = orders.filter((o: Order) => 
      ['completed', 'processing'].includes(o.status)
    );
    const abandonedOrders = orders.filter((o: Order) => 
      ['cancelled', 'failed', 'pending'].includes(o.status)
    );
    
    const totalCompleted = completedOrders.length;
    const totalAbandoned = abandonedOrders.length;
    const abandonmentRate = totalAbandoned / (totalCompleted + totalAbandoned) * 100;
    
    // Calculer la valeur moyenne abandonnée
    const totalAbandonedValue = abandonedOrders.reduce((sum: number, order: Order) => 
      sum + parseFloat(order.total), 0
    );
    const averageAbandonedValue = totalAbandoned > 0 ? totalAbandonedValue / totalAbandoned : 0;
    
    // Analyser les produits les plus abandonnés
    const productAbandonmentMap = new Map<number, AbandonedProduct>();
    abandonedOrders.forEach((order: Order) => {
      order.line_items?.forEach(item => {
        const existing = productAbandonmentMap.get(item.id) || {
          productId: item.id,
          productName: item.name,
          abandonmentCount: 0,
          totalValue: 0
        };
        existing.abandonmentCount++;
        existing.totalValue += parseFloat(item.total);
        productAbandonmentMap.set(item.id, existing);
      });
    });
    
    const topAbandonedProducts = Array.from(productAbandonmentMap.values())
      .sort((a, b) => b.abandonmentCount - a.abandonmentCount)
      .slice(0, 10);
    
    // Analyser les tendances horaires
    const hourlyMap = new Map<number, { abandoned: number; completed: number }>();
    [...completedOrders, ...abandonedOrders].forEach((order: Order) => {
      const hour = new Date(order.date_created).getHours();
      const current = hourlyMap.get(hour) || { abandoned: 0, completed: 0 };
      if (['cancelled', 'failed', 'pending'].includes(order.status)) {
        current.abandoned++;
      } else {
        current.completed++;
      }
      hourlyMap.set(hour, current);
    });
    
    const hourlyTrends: HourlyTrend[] = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour,
      abandonmentRate: data.abandoned / (data.abandoned + data.completed) * 100,
      orderCount: data.abandoned + data.completed
    }));
    
    // Raisons d'abandon (simulées basées sur les statuts)
    const abandonmentReasons: AbandonmentReason[] = [
      { reason: 'Paiement échoué', count: abandonedOrders.filter((o: Order) => o.status === 'failed').length, percentage: 0 },
      { reason: 'Client indécis', count: abandonedOrders.filter((o: Order) => o.status === 'pending').length, percentage: 0 },
      { reason: 'Annulation client', count: abandonedOrders.filter((o: Order) => o.status === 'cancelled').length, percentage: 0 }
    ];
    
    abandonmentReasons.forEach(reason => {
      reason.percentage = totalAbandoned > 0 ? reason.count / totalAbandoned * 100 : 0;
    });
    
    // Taux de récupération (commandes qui étaient pending puis completed)
    const recoveryRate = 0; // À implémenter avec un système de tracking plus avancé
    
    return {
      abandonmentRate,
      totalAbandoned,
      totalCompleted,
      recoveryRate,
      averageAbandonedValue,
      topAbandonedProducts,
      abandonmentReasons,
      hourlyTrends
    };
  }
  
  // Customer Lifetime Value
  async getCustomerLifetimeValue(siteId?: number): Promise<CustomerLifetimeValue> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer tous les clients et leurs commandes
    const customers = await client.getCustomers({ per_page: 100 });
    const orders = await client.getOrders({ per_page: 100, status: 'completed' });
    
    // Calculer CLV pour chaque client
    const customerCLVMap = new Map<number, CustomerCLV>();
    
    customers.forEach((customer: Customer) => {
      const customerOrders = orders.filter((o: Order) => 
        o.billing.email === customer.email
      );
      
      if (customerOrders.length > 0) {
        const totalSpent = customerOrders.reduce((sum: number, order: Order) => 
          sum + parseFloat(order.total), 0
        );
        
        const firstOrderDate = new Date(Math.min(...customerOrders.map((o: Order) => 
          new Date(o.date_created).getTime()
        )));
        
        const daysSinceFirstOrder = Math.floor(
          (new Date().getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        customerCLVMap.set(customer.id, {
          customerId: customer.id,
          customerName: `${customer.first_name} ${customer.last_name}`.trim(),
          email: customer.email,
          totalSpent,
          orderCount: customerOrders.length,
          averageOrderValue: totalSpent / customerOrders.length,
          daysSinceFirstOrder,
          predictedCLV: this.predictCLV(totalSpent, customerOrders.length, daysSinceFirstOrder)
        });
      }
    });
    
    const allCLVs = Array.from(customerCLVMap.values());
    const averageCLV = allCLVs.reduce((sum, c) => sum + c.totalSpent, 0) / allCLVs.length || 0;
    
    // Distribution CLV par segments
    const clvSegments = [
      { min: 0, max: 100, name: 'Faible valeur' },
      { min: 100, max: 500, name: 'Valeur moyenne' },
      { min: 500, max: 1000, name: 'Haute valeur' },
      { min: 1000, max: Infinity, name: 'VIP' }
    ];
    
    const clvDistribution: CLVSegment[] = clvSegments.map(segment => {
      const segmentCustomers = allCLVs.filter(c => 
        c.totalSpent >= segment.min && c.totalSpent < segment.max
      );
      
      return {
        segment: segment.name,
        customerCount: segmentCustomers.length,
        averageValue: segmentCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / segmentCustomers.length || 0,
        percentage: allCLVs.length > 0 ? segmentCustomers.length / allCLVs.length * 100 : 0
      };
    });
    
    // Top clients
    const topCustomers = allCLVs
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
    // CLV par segment (RFM simplifié)
    const clvBySegment: SegmentCLV[] = this.segmentCustomersByRFM(allCLVs);
    
    // Prédictions CLV
    const predictedCLV: PredictedCLV[] = topCustomers.slice(0, 5).map(customer => ({
      customerId: customer.customerId,
      currentCLV: customer.totalSpent,
      predicted3Months: this.predictFutureCLV(customer, 3),
      predicted6Months: this.predictFutureCLV(customer, 6),
      predicted12Months: this.predictFutureCLV(customer, 12),
      churnProbability: this.calculateChurnProbability(customer)
    }));
    
    return {
      averageCLV,
      clvDistribution,
      topCustomers,
      clvBySegment,
      predictedCLV
    };
  }
  
  // Analyse de cohortes
  async getCohortAnalysis(siteId?: number, months: number = 12): Promise<CohortAnalysis> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer toutes les commandes des X derniers mois
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const orders = await client.getOrders({
      after: startDate.toISOString(),
      per_page: 100,
      status: 'completed'
    });
    
    // Grouper les clients par mois de première commande
    const cohortMap = new Map<string, Set<string>>();
    const customerFirstOrderMap = new Map<string, Date>();
    
    orders.forEach((order: Order) => {
      const customerEmail = order.billing.email;
      const orderDate = new Date(order.date_created);
      
      if (!customerFirstOrderMap.has(customerEmail) || 
          orderDate < customerFirstOrderMap.get(customerEmail)!) {
        customerFirstOrderMap.set(customerEmail, orderDate);
        
        const cohortMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        if (!cohortMap.has(cohortMonth)) {
          cohortMap.set(cohortMonth, new Set());
        }
        cohortMap.get(cohortMonth)!.add(customerEmail);
      }
    });
    
    // Calculer la rétention pour chaque cohorte
    const cohorts: Cohort[] = [];
    
    Array.from(cohortMap.entries()).forEach(([cohortDate, customers]) => {
      const retention: RetentionMonth[] = [];
      
      for (let month = 0; month <= 12; month++) {
        const targetDate = new Date(cohortDate + '-01');
        targetDate.setMonth(targetDate.getMonth() + month);
        
        const retainedCustomers = Array.from(customers).filter(email => {
          return orders.some((order: Order) => {
            const orderDate = new Date(order.date_created);
            return order.billing.email === email &&
              orderDate.getFullYear() === targetDate.getFullYear() &&
              orderDate.getMonth() === targetDate.getMonth();
          });
        });
        
        const revenue = orders
          .filter((order: Order) => {
            const orderDate = new Date(order.date_created);
            return retainedCustomers.includes(order.billing.email) &&
              orderDate.getFullYear() === targetDate.getFullYear() &&
              orderDate.getMonth() === targetDate.getMonth();
          })
          .reduce((sum: number, order: Order) => sum + parseFloat(order.total), 0);
        
        retention.push({
          month,
          retainedCustomers: retainedCustomers.length,
          retentionRate: customers.size > 0 ? retainedCustomers.length / customers.size * 100 : 0,
          revenue
        });
      }
      
      cohorts.push({
        cohortDate,
        customerCount: customers.size,
        totalRevenue: orders
          .filter((o: Order) => customers.has(o.billing.email))
          .reduce((sum: number, o: Order) => sum + parseFloat(o.total), 0),
        retention
      });
    });
    
    // Matrice de rétention
    const retentionMatrix: RetentionData[][] = cohorts.map(cohort => 
      cohort.retention.map(r => ({
        cohortDate: cohort.cohortDate,
        month: r.month,
        retentionRate: r.retentionRate
      }))
    );
    
    // Tendance de rétention moyenne
    const averageRetention: RetentionTrend[] = [];
    for (let month = 0; month <= 12; month++) {
      const rates = cohorts
        .filter(c => c.retention.length > month)
        .map(c => c.retention[month].retentionRate);
      
      averageRetention.push({
        month,
        averageRetentionRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length || 0
      });
    }
    
    return {
      cohorts,
      retentionMatrix,
      averageRetention
    };
  }
  
  // Prédictions de stock
  async getStockPredictions(siteId?: number): Promise<StockPredictions> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer tous les produits avec leur stock
    const products = await client.getProducts({ per_page: 100, stock_status: 'instock' });
    
    // Récupérer les commandes des 90 derniers jours pour calculer la vélocité
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const orders = await client.getOrders({
      after: ninetyDaysAgo.toISOString(),
      per_page: 100,
      status: 'completed'
    });
    
    // Calculer les ventes par produit
    const salesMap = new Map<number, { quantity: number; revenue: number }>();
    orders.forEach((order: Order) => {
      order.line_items?.forEach(item => {
        const current = salesMap.get(item.id) || { quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += parseFloat(item.total);
        salesMap.set(item.id, current);
      });
    });
    
    // Analyser chaque produit
    const criticalStock: StockAlert[] = [];
    const predictedStockouts: StockoutPrediction[] = [];
    const overstock: OverstockItem[] = [];
    const optimalReorderPoints: ReorderPoint[] = [];
    const stockTurnover: StockTurnoverMetric[] = [];
    
    products.forEach((product: Product) => {
      const stock = product.stock_quantity || 0;
      const sales = salesMap.get(product.id) || { quantity: 0, revenue: 0 };
      const averageDailySales = sales.quantity / 90;
      
      // Stock critique
      const reorderPoint = averageDailySales * 14; // 14 jours de couverture
      if (stock > 0 && stock <= reorderPoint) {
        const daysUntilStockout = averageDailySales > 0 ? Math.floor(stock / averageDailySales) : Infinity;
        
        criticalStock.push({
          productId: product.id,
          productName: product.name,
          currentStock: stock,
          reorderPoint: Math.ceil(reorderPoint),
          daysUntilStockout,
          averageDailySales
        });
        
        // Prédiction de rupture
        if (daysUntilStockout < 30) {
          const stockoutDate = new Date();
          stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
          
          predictedStockouts.push({
            productId: product.id,
            productName: product.name,
            predictedStockoutDate: stockoutDate.toISOString().split('T')[0],
            estimatedLostRevenue: averageDailySales * parseFloat(product.price) * 7, // 7 jours de rupture estimés
            recommendedOrderQuantity: Math.ceil(averageDailySales * 60) // 60 jours de stock
          });
        }
      }
      
      // Surstock
      const monthsOfSupply = averageDailySales > 0 ? stock / (averageDailySales * 30) : Infinity;
      if (monthsOfSupply > 6 && stock > 0) {
        overstock.push({
          productId: product.id,
          productName: product.name,
          currentStock: stock,
          monthsOfSupply,
          tiedUpCapital: stock * parseFloat(product.regular_price) * 0.6, // Estimation du coût
          recommendedDiscount: monthsOfSupply > 12 ? 30 : 15 // % de réduction recommandé
        });
      }
      
      // Points de réapprovisionnement optimaux
      if (averageDailySales > 0) {
        const leadTime = 7; // Jours de délai fournisseur (à paramétrer)
        const safetyStock = averageDailySales * 7; // 7 jours de sécurité
        
        optimalReorderPoints.push({
          productId: product.id,
          productName: product.name,
          optimalReorderPoint: Math.ceil(averageDailySales * leadTime + safetyStock),
          optimalOrderQuantity: Math.ceil(averageDailySales * 45), // 45 jours de stock
          leadTimeDays: leadTime
        });
      }
      
      // Rotation des stocks
      const annualSales = sales.quantity * (365 / 90);
      const averageStock = stock / 2; // Approximation
      const turnoverRate = averageStock > 0 ? annualSales / averageStock : 0;
      
      stockTurnover.push({
        productId: product.id,
        productName: product.name,
        turnoverRate,
        daysInventory: turnoverRate > 0 ? 365 / turnoverRate : Infinity,
        efficiency: turnoverRate > 6 ? 'High' : turnoverRate > 3 ? 'Medium' : 'Low'
      });
    });
    
    return {
      criticalStock: criticalStock.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout),
      predictedStockouts: predictedStockouts.sort((a, b) => 
        new Date(a.predictedStockoutDate).getTime() - new Date(b.predictedStockoutDate).getTime()
      ),
      overstock: overstock.sort((a, b) => b.tiedUpCapital - a.tiedUpCapital),
      optimalReorderPoints,
      stockTurnover: stockTurnover.sort((a, b) => b.turnoverRate - a.turnoverRate)
    };
  }
  
  // ROI des promotions
  async getPromotionROI(siteId?: number): Promise<PromotionROI> {
    const client = await wpClientManager.getClient(siteId);
    
    // Récupérer les coupons
    const coupons = await client.getWooCommerceData('coupons', { per_page: 100 });
    
    // Récupérer les commandes avec coupons
    const orders = await client.getOrders({ per_page: 100 });
    
    const promotionPerformance: PromotionPerformance[] = [];
    
    coupons.forEach((coupon: any) => {
      const couponOrders = orders.filter((order: Order) => 
        order.coupon_lines?.some(c => c.code === coupon.code)
      );
      
      const revenue = couponOrders.reduce((sum: number, order: Order) => 
        sum + parseFloat(order.total), 0
      );
      
      const discount = couponOrders.reduce((sum: number, order: Order) => {
        const couponLine = order.coupon_lines?.find(c => c.code === coupon.code);
        return sum + (couponLine ? parseFloat(couponLine.discount) : 0);
      }, 0);
      
      const roi = discount > 0 ? ((revenue - discount) / discount) * 100 : 0;
      
      promotionPerformance.push({
        promotionId: coupon.id.toString(),
        promotionName: coupon.code,
        type: 'coupon',
        startDate: coupon.date_created,
        endDate: coupon.date_expires || 'N/A',
        revenue,
        cost: discount,
        roi,
        ordersCount: couponOrders.length,
        averageOrderValue: couponOrders.length > 0 ? revenue / couponOrders.length : 0,
        conversionRate: 0 // À calculer avec plus de données
      });
    });
    
    // Trier par ROI
    const sortedByROI = [...promotionPerformance].sort((a, b) => b.roi - a.roi);
    const bestPerformers = sortedByROI.slice(0, 5).map(p => ({
      promotionId: p.promotionId,
      promotionName: p.promotionName,
      roi: p.roi,
      revenue: p.revenue,
      insight: p.roi > 200 ? 'Performance exceptionnelle' : 'Bonne performance'
    }));
    
    const worstPerformers = sortedByROI.slice(-5).map(p => ({
      promotionId: p.promotionId,
      promotionName: p.promotionName,
      roi: p.roi,
      revenue: p.revenue,
      insight: p.roi < 50 ? 'À revoir ou arrêter' : 'Performance faible'
    }));
    
    // Recommandations
    const recommendedActions: PromotionRecommendation[] = [
      {
        type: 'Optimisation',
        recommendation: 'Augmenter la durée des promotions performantes',
        expectedImpact: '+15% de revenus',
        priority: 'High'
      },
      {
        type: 'Ciblage',
        recommendation: 'Limiter les promotions aux segments haute valeur',
        expectedImpact: '+25% ROI',
        priority: 'Medium'
      }
    ];
    
    const overallROI = promotionPerformance.reduce((sum, p) => sum + p.roi, 0) / promotionPerformance.length || 0;
    
    return {
      totalPromotions: coupons.length,
      activePromotions: coupons.filter((c: any) => !c.date_expires || new Date(c.date_expires) > new Date()).length,
      overallROI,
      promotionPerformance,
      bestPerformers,
      worstPerformers,
      recommendedActions
    };
  }
  
  // Méthodes utilitaires privées
  private predictCLV(currentValue: number, orderCount: number, daysSinceFirst: number): number {
    // Modèle simplifié de prédiction CLV
    const avgOrdersPerYear = (orderCount / daysSinceFirst) * 365;
    const avgOrderValue = currentValue / orderCount;
    const estimatedLifetime = 3; // 3 ans
    return avgOrderValue * avgOrdersPerYear * estimatedLifetime;
  }
  
  private predictFutureCLV(customer: CustomerCLV, months: number): number {
    const monthlyRate = customer.totalSpent / (customer.daysSinceFirstOrder / 30);
    return customer.totalSpent + (monthlyRate * months);
  }
  
  private calculateChurnProbability(customer: CustomerCLV): number {
    // Modèle simplifié de probabilité de churn
    const daysSinceLastOrder = 30; // À calculer avec les vraies données
    if (daysSinceLastOrder > 180) return 0.8;
    if (daysSinceLastOrder > 90) return 0.5;
    if (daysSinceLastOrder > 60) return 0.3;
    return 0.1;
  }
  
  private segmentCustomersByRFM(customers: CustomerCLV[]): SegmentCLV[] {
    // Segmentation RFM simplifiée
    const segments = [
      { name: 'Champions', filter: (c: CustomerCLV) => c.orderCount > 5 && c.averageOrderValue > 100 },
      { name: 'Fidèles', filter: (c: CustomerCLV) => c.orderCount > 3 },
      { name: 'Potentiels', filter: (c: CustomerCLV) => c.orderCount === 1 && c.averageOrderValue > 50 },
      { name: 'Nouveaux', filter: (c: CustomerCLV) => c.daysSinceFirstOrder < 30 },
      { name: 'À risque', filter: (c: CustomerCLV) => c.daysSinceFirstOrder > 180 }
    ];
    
    return segments.map(segment => {
      const segmentCustomers = customers.filter(segment.filter);
      const totalRevenue = segmentCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
      
      return {
        segment: segment.name,
        averageCLV: segmentCustomers.length > 0 ? totalRevenue / segmentCustomers.length : 0,
        customerCount: segmentCustomers.length,
        totalRevenue
      };
    });
  }
}

export const wooAnalytics = new WooCommerceAnalyticsService();