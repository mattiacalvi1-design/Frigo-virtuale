export type FridgeShelf =
  | 'latticini'
  | 'verdura'
  | 'carne_pesce'
  | 'pasta_sughi'
  | 'bevande_altro';

export type ExpiryStatus = 'expired' | 'urgent' | 'warning' | 'fresh';

export type AppTab = 'frigo' | 'scansiona' | 'ricette' | 'avvisi';

export interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  shelf: FridgeShelf;
  expiryDate: string; // YYYY-MM-DD
  addedAt: string; // ISO string
  barcode?: string;
}

export interface ScannedDraftItem {
  tempId: string;
  name: string;
  quantity: number;
  unit: string;
  shelf: FridgeShelf;
  estimatedDays: number;
  expiryDate: string; // YYYY-MM-DD
  barcode?: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  fridgeMatchTerm: string;
}

export type RecipeCategory =
  | 'Primi Piatti'
  | 'Secondi'
  | 'Contorni'
  | 'Dolci & Colazione';

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  category: RecipeCategory;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: 'Facile' | 'Media' | 'Elaborata';
  servings: number;
  imageUrl?: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  chefTip: string;
  sourceTag: string;
  isAiGenerated?: boolean;
}

export interface MatchedIngredientDetail {
  ingredient: RecipeIngredient;
  fridgeItem: FridgeItem;
  daysLeft: number;
  status: ExpiryStatus;
}

export interface RecipeMatch {
  recipe: Recipe;
  matchedItems: MatchedIngredientDetail[];
  missingIngredients: RecipeIngredient[];
  expiringUsedCount: number;
  matchPercent: number;
  urgencyScore: number;
}

export interface ExpiryAlert {
  id: string;
  item: FridgeItem;
  daysLeft: number;
  status: ExpiryStatus;
  title: string;
  message: string;
}
