import type { BudgetSnapshot } from '@/services/BudgetEngine';
import type { Dokument } from '@/store';

export interface HomeBudgetBarProps {
  budget: BudgetSnapshot;
  docs: Dokument[];
  onPress?: () => void;
}
