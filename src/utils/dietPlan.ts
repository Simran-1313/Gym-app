import { DietPlanContent, DietPlanDay, DietPlanMeal } from '../types';

function normalizeMacros(macros: unknown): DietPlanContent['macros'] {
  const m = macros as Record<string, number> | null | undefined;
  return {
    proteinG: Number(m?.proteinG) || 0,
    carbsG: Number(m?.carbsG) || 0,
    fatG: Number(m?.fatG) || 0,
  };
}

function normalizeMeal(raw: unknown): DietPlanMeal {
  const meal = raw as Record<string, unknown>;
  const name = String(meal.name ?? meal.meal ?? 'Meal');

  let items: string[] = [];
  if (Array.isArray(meal.items)) {
    items = meal.items.map((item) => String(item));
  } else if (Array.isArray(meal.foods)) {
    items = meal.foods.map((food) => {
      if (typeof food === 'string') return food;
      const f = food as Record<string, unknown>;
      const item = f.item ?? f.name ?? '';
      const qty = f.quantity ? ` (${f.quantity})` : '';
      return `${item}${qty}`.trim();
    });
  } else if (typeof meal.items === 'string') {
    items = [meal.items];
  }

  return {
    name,
    items,
    calories: Number(meal.calories) || 0,
  };
}

function normalizeDay(raw: unknown): DietPlanDay {
  const day = raw as Record<string, unknown>;
  const meals = Array.isArray(day.meals) ? day.meals.map(normalizeMeal) : [];
  return {
    day: String(day.day ?? 'Day'),
    meals,
  };
}

/**
 * Normalise AI diet plan JSON — handles new 7-day format and legacy single-day format.
 */
export function normalizeDietPlanContent(raw: unknown): DietPlanContent | null {
  if (!raw || typeof raw !== 'object') return null;

  const c = raw as Record<string, unknown>;

  if (Array.isArray(c.days) && c.days.length > 0) {
    return {
      summary:
        typeof c.summary === 'string' ? c.summary : 'Your personalised diet plan',
      calories: Number(c.calories ?? c.dailyCalories) || 0,
      macros: normalizeMacros(c.macros),
      days: c.days.map(normalizeDay),
    };
  }

  // Legacy format: { dailyCalories, macros, meals: [...] }
  if (Array.isArray(c.meals) && c.meals.length > 0) {
    return {
      summary: 'Your daily diet plan',
      calories: Number(c.dailyCalories ?? c.calories) || 0,
      macros: normalizeMacros(c.macros),
      days: [{ day: 'Today', meals: c.meals.map(normalizeMeal) }],
    };
  }

  return null;
}
