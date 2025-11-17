export interface RawVendorData {
  _id: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  isVendor?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  status?: string;
  vendorProfile?: {
    businessName?: string;
    businessDescription?: string;
    profileImage?: string;
    coverImage?: string;
    rating?: number;
    totalReviews?: number;
    isVerified?: boolean;
    vendorType?: 'home_service' | 'in_shop' | 'both';
    serviceCategories?: string[];
    location?: {
      address?: string;
      city?: string;
      state?: string;
      coordinates?: number[];
    };
  };
  createdAt?: string;
  updatedAt?: string;
}
export interface FormattedVendor {
  id: string;
  businessName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  image?: string;
  coverImage?: string;
  service: string;
  rating: number;
  reviews: number;
  vendorType?: string;
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status?: string;
  serviceCategories?: string[];
  location?: {
    address?: string;
    city?: string;
    state?: string;
  };
  memberSince?: string;
}
export const formatVendorType = (vendorType?: string): string => {
  switch (vendorType) {
    case 'home_service':
      return 'Home Service';
    case 'in_shop':
      return 'In-Shop';
    case 'both':
      return 'Home Service & In-Shop';
    default:
      return 'Service Available';
  }
};
export const parseVendor = (rawVendor: RawVendorData): FormattedVendor => {
  const vendorProfile = rawVendor.vendorProfile || {};
  return {
    id: rawVendor._id || rawVendor.id || '',
    businessName: vendorProfile.businessName || rawVendor.fullName || `${rawVendor.firstName || ''} ${rawVendor.lastName || ''}`.trim() || 'Unknown Vendor',
    fullName: rawVendor.fullName || `${rawVendor.firstName || ''} ${rawVendor.lastName || ''}`.trim(),
    email: rawVendor.email,
    phone: rawVendor.phone,
    image: vendorProfile.profileImage,
    coverImage: vendorProfile.coverImage,
    service: formatVendorType(vendorProfile.vendorType),
    rating: vendorProfile.rating || 0,
    reviews: vendorProfile.totalReviews || 0,
    vendorType: vendorProfile.vendorType,
    isVerified: vendorProfile.isVerified || false,
    isEmailVerified: rawVendor.isEmailVerified || false,
    isPhoneVerified: rawVendor.isPhoneVerified || false,
    status: rawVendor.status,
    serviceCategories: vendorProfile.serviceCategories,
    location: vendorProfile.location ? {
      address: vendorProfile.location.address,
      city: vendorProfile.location.city,
      state: vendorProfile.location.state
    } : undefined,
    memberSince: rawVendor.createdAt
  };
};
export const parseVendors = (rawVendors: RawVendorData[]): FormattedVendor[] => {
  if (!Array.isArray(rawVendors)) {
    console.warn('parseVendors: Expected array, got:', typeof rawVendors);
    return [];
  }
  return rawVendors.map(parseVendor);
};
export const extractVendorsFromResponse = (response: any): RawVendorData[] => {
  if (!response || !response.success) {
    return [];
  }
  let data = response.data;
  if (data && !Array.isArray(data)) {
    data = data.vendors || data.data || data.items || [];
  }
  if (!Array.isArray(data)) {
    console.warn('extractVendorsFromResponse: Data is not an array:', data);
    return [];
  }
  return data;
};
export const formatMemberSince = (dateString?: string): string => {
  if (!dateString) return 'New Member';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return 'New Member';
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};
export const getVendorStatusBadge = (status?: string): {
  text: string;
  color: string;
  bgColor: string;
} => {
  switch (status) {
    case 'active':
      return {
        text: 'Active',
        color: '#10b981',
        bgColor: '#d1fae5'
      };
    case 'pending_verification':
      return {
        text: 'Pending',
        color: '#f59e0b',
        bgColor: '#fef3c7'
      };
    case 'suspended':
      return {
        text: 'Suspended',
        color: '#ef4444',
        bgColor: '#fee2e2'
      };
    case 'inactive':
      return {
        text: 'Inactive',
        color: '#6b7280',
        bgColor: '#f3f4f6'
      };
    default:
      return {
        text: 'Unknown',
        color: '#6b7280',
        bgColor: '#f3f4f6'
      };
  }
};
export const filterVendorsByQuery = (vendors: FormattedVendor[], query: string): FormattedVendor[] => {
  if (!query.trim()) return vendors;
  const lowerQuery = query.toLowerCase();
  return vendors.filter(vendor => {
    return vendor.businessName.toLowerCase().includes(lowerQuery) || vendor.fullName?.toLowerCase().includes(lowerQuery) || vendor.serviceCategories?.some(cat => cat.toLowerCase().includes(lowerQuery)) || vendor.location?.city?.toLowerCase().includes(lowerQuery) || vendor.location?.state?.toLowerCase().includes(lowerQuery);
  });
};
export const sortVendors = (vendors: FormattedVendor[], sortBy: 'rating' | 'reviews' | 'name' | 'recent' = 'rating', order: 'asc' | 'desc' = 'desc'): FormattedVendor[] => {
  const sorted = [...vendors];
  sorted.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'rating':
        comparison = a.rating - b.rating;
        break;
      case 'reviews':
        comparison = a.reviews - b.reviews;
        break;
      case 'name':
        comparison = a.businessName.localeCompare(b.businessName);
        break;
      case 'recent':
        comparison = new Date(a.memberSince || 0).getTime() - new Date(b.memberSince || 0).getTime();
        break;
    }
    return order === 'asc' ? comparison : -comparison;
  });
  return sorted;
};