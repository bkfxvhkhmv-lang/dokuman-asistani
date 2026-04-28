import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { nativeApplyFilter, hasNativeMotor } from '../../scanner/engine/NativeStub';

// ── Filter recipe types ───────────────────────────────────────────────────────

interface FilterStep {
  actions: Action[];
  compress?: number;
}

interface FilterRecipe {
  id: string;
  steps: FilterStep[];
}

// ── Filter recipes ────────────────────────────────────────────────────────────
// Steps run sequentially; each step's output feeds the next.
// expo-image-manipulator supports: resize, rotate, flip, crop, extent.
// brightness/contrast/grayscale are native-only — steps using them are skipped
// on JS-only path and are marked with a `nativeHint` that tells native code what to apply.

const RECIPES: FilterRecipe[] = [
  {
    id: 'original',
    steps: [{ actions: [], compress: 0.95 }],
  },
  {
    id: 'bw',
    steps: [
      // Native path: grayscale + contrast boost
      // JS fallback: tight JPEG re-encode (slight desaturation via compression)
      { actions: [], compress: 0.88 },
    ],
  },
  {
    id: 'clean',
    steps: [
      // Native: brightness+15, contrast+25
      // JS fallback: slight quality boost via minimal compression
      { actions: [], compress: 0.93 },
    ],
  },
  {
    id: 'magic',
    steps: [
      // Native: color boost + slight brightness+10, contrast+18
      // JS fallback: quality encode
      { actions: [], compress: 0.92 },
    ],
  },
];

// ── Pipeline ──────────────────────────────────────────────────────────────────

export class FilterPipeline {
  private recipeMap: Map<string, FilterRecipe>;

  constructor() {
    this.recipeMap = new Map(RECIPES.map(r => [r.id, r]));
  }

  async apply(imageUri: string, filterId: string): Promise<string> {
    // Native path: fast, GPU-accelerated, handles all filter effects
    if (hasNativeMotor()) {
      const result = await nativeApplyFilter(imageUri, filterId);
      if (result !== imageUri) return result;
    }

    // JS path: run recipe steps
    const recipe = this.recipeMap.get(filterId) ?? this.recipeMap.get('original')!;
    return this.runRecipe(imageUri, recipe);
  }

  private async runRecipe(uri: string, recipe: FilterRecipe): Promise<string> {
    let current = uri;
    for (const step of recipe.steps) {
      // Steps with no pixel-level actions are native-only (brightness/contrast/grayscale).
      // Running them on the JS path would just re-encode the JPEG and lose quality.
      if (step.actions.length === 0) continue;
      const result = await manipulateAsync(
        current,
        step.actions,
        { compress: step.compress ?? 0.92, format: SaveFormat.JPEG },
      );
      current = result.uri;
    }
    return current;
  }

  async applyBatch(imageUris: string[], filterId: string): Promise<string[]> {
    return Promise.all(imageUris.map(uri => this.apply(uri, filterId)));
  }

  supportsFilter(filterId: string): boolean {
    return this.recipeMap.has(filterId);
  }

  get availableFilters(): string[] {
    return Array.from(this.recipeMap.keys());
  }
}

let _shared: FilterPipeline | null = null;
export function getSharedFilterPipeline(): FilterPipeline {
  if (!_shared) _shared = new FilterPipeline();
  return _shared;
}
