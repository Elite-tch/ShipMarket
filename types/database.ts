export type UserRole = 'explorer' | 'creator' | 'steward';

export interface User {
    id: string;
    walletAddress: string;
    role: UserRole;
    level: number;
    xp: number;
    totalTokensEarned: number;
    createdAt: Date;
    updatedAt: Date;
    twitterHandle?: string;
    discordHandle?: string;
}

// ─── SHIP Utility Marketplace ─────────────────────────────────────────────

export type ProductCategory =
    | 'course'
    | 'template'
    | 'design'
    | 'marketing'
    | 'trading'
    | 'tools'
    | 'other';

export interface DiscountTier {
    minShip: number;   // Minimum SHIP balance to qualify
    discount: number;  // Percentage discount (0-100)
    label: string;
}

export interface Product {
    id: string;
    sellerId: string;
    sellerName?: string;
    title: string;
    description: string;
    category: ProductCategory;
    icon: string;
    coverImage?: string;
    priceShip: number;
    deliveryUrl: string;
    tags: string[];
    isActive: boolean;
    totalSales: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Purchase {
    id: string;
    buyerId: string;
    sellerId: string;
    productId: string;
    productTitle: string;
    pricePaid: number;
    originalPrice: number;
    discountApplied: number;
    txSignature: string;
    purchasedAt: Date;
    deliveryUrl: string;
}

export const DISCOUNT_TIERS: DiscountTier[] = [
    { minShip: 0, discount: 0, label: 'Explorer' },
    { minShip: 100, discount: 5, label: 'Sailor' },
    { minShip: 1000, discount: 15, label: 'Captain' },
    { minShip: 10000, discount: 40, label: 'Admiral' },
];

export const PLATFORM_FEE_PCT = 5;
