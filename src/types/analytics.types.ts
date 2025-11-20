export interface VendorOverview {
  totalRevenue: number;
  totalOrders: number;
  totalBookings: number;
  totalProducts: number;
  totalServices: number;
  averageRating: number;
  totalReviews: number;
  completedBookings: number;
  completedOrders: number;
  pendingOrders: number;
  pendingBookings: number;
  activeProducts: number;
  activeServices: number;
}

export interface RevenueData {
  total: number;
  fromBookings: number;
  fromOrders: number;
  pending: number;
  inEscrow: number;
  released: number;
  byPeriod: Array<{
    date: string;
    revenue: number;
    bookings: number;
    orders: number;
  }>;
}

export interface BookingsData {
  total: number;
  completed: number;
  pending: number;
  accepted: number;
  inProgress: number;
  cancelled: number;
  rejected: number;
  completionRate: number;
  cancellationRate: number;
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byPeriod: Array<{
    date: string;
    count: number;
  }>;
  topServices: Array<{
    service: any;
    bookings: number;
    revenue: number;
  }>;
}

export interface OrdersData {
  total: number;
  completed: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  completionRate: number;
  cancellationRate: number;
  averageOrderValue: number;
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byPeriod: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  topProducts: Array<{
    product: any;
    orders: number;
    revenue: number;
    quantity: number;
  }>;
}

export interface ProductsData {
  total: number;
  active: number;
  outOfStock: number;
  lowStock: number;
  approved: number;
  pending: number;
  rejected: number;
  totalViews: number;
  totalOrders: number;
  conversionRate: number;
  topPerforming: Array<{
    product: any;
    views: number;
    orders: number;
    revenue: number;
    rating: number;
  }>;
}

export interface ServicesData {
  total: number;
  active: number;
  approved: number;
  pending: number;
  rejected: number;
  totalViews: number;
  totalBookings: number;
  conversionRate: number;
  topPerforming: Array<{
    service: any;
    views: number;
    bookings: number;
    revenue: number;
    rating: number;
  }>;
}

export interface ReviewsData {
  total: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recent: Array<any>;
  positivePercentage: number;
  negativePercentage: number;
}

export interface CustomersData {
  total: number;
  returning: number;
  new: number;
  returningRate: number;
  topCustomers: Array<{
    customer: any;
    totalSpent: number;
    orders: number;
    bookings: number;
    lastPurchase: Date;
  }>;
}

export interface PerformanceMetrics {
  responseTime: number;
  acceptanceRate: number;
  completionRate: number;
  cancellationRate: number;
  onTimeDeliveryRate: number;
  customerSatisfactionScore: number;
}

export interface VendorAnalytics {
  overview: VendorOverview;
  revenue: RevenueData;
  bookings: BookingsData;
  orders: OrdersData;
  products: ProductsData;
  services: ServicesData;
  reviews: ReviewsData;
  customers: CustomersData;
  performance: PerformanceMetrics;
}

export interface QuickStats {
  walletBalance: number;
  totalBookings: number;
  totalOrders: number;
  totalProducts: number;
  totalServices: number;
  totalReviews: number;
  averageRating: number;
}