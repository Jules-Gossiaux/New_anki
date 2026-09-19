export type ReviewStep = `${number}${'m' | 'h' | 'd'}`;
export type InterventionPromptMode = 'notification' | 'overlay_prompt' | 'direct';

export type ReviewSettings = {
  newCardsPerDay: number;
  reviewsPerDay: number;
  learningSteps: ReviewStep[];
  relearningSteps: ReviewStep[];
  priorityDeckId: string | null;
  interventionPromptMode: InterventionPromptMode;
  usageReminderMinutes: number;
  unlockInterventionCards: number;
  appUsageInterventionCards: number;
  showStudyNotes: boolean;
};

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  newCardsPerDay: 20,
  reviewsPerDay: 200,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
  priorityDeckId: null,
  interventionPromptMode: 'notification',
  usageReminderMinutes: 3,
  unlockInterventionCards: 3,
  appUsageInterventionCards: 5,
  showStudyNotes: true,
};

export function validateReviewSettings(settings: ReviewSettings): ReviewSettings {
  const integer = (value: number, label: string) => {
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      throw new Error(`${label} must be an integer between 0 and 10000.`);
    }
    return value;
  };
  const steps = (values: ReviewStep[], label: string) => {
    if (values.length > 10 || values.some((value) => !/^([1-9]\d*)(m|h|d)$/.test(value))) {
      throw new Error(`${label} contains an invalid step.`);
    }
    return values;
  };

  return {
    newCardsPerDay: integer(settings.newCardsPerDay, 'New cards per day'),
    reviewsPerDay: integer(settings.reviewsPerDay, 'Reviews per day'),
    learningSteps: steps(settings.learningSteps, 'Learning steps'),
    relearningSteps: steps(settings.relearningSteps, 'Relearning steps'),
    priorityDeckId: settings.priorityDeckId,
    interventionPromptMode:
      settings.interventionPromptMode === 'direct'
        ? 'direct'
        : settings.interventionPromptMode === 'overlay_prompt'
          ? 'overlay_prompt'
          : 'notification',
    usageReminderMinutes: integerInRange(
      settings.usageReminderMinutes,
      'Usage reminder duration',
      1,
      60,
    ),
    unlockInterventionCards: integerInRange(
      settings.unlockInterventionCards,
      'Unlock intervention cards',
      1,
      20,
    ),
    appUsageInterventionCards: integerInRange(
      settings.appUsageInterventionCards,
      'App usage intervention cards',
      1,
      20,
    ),
    showStudyNotes: settings.showStudyNotes,
  };
}

function integerInRange(value: number, label: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

export function getAvailableNewCardCount(
  deckNewCards: number,
  dailyLimit: number,
  studiedToday: number,
): number {
  return Math.min(deckNewCards, Math.max(0, dailyLimit - studiedToday));
}

export function getAvailableReviewCardCount(
  deckReviewCards: number,
  dailyLimit: number,
  studiedToday: number,
): number {
  return Math.min(deckReviewCards, Math.max(0, dailyLimit - studiedToday));
}
