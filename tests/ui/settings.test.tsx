import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../../src/app/settings';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(() => ({
    getAllAsync: jest.fn(async () => []),
  })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('../../src/infrastructure/repositories/reviewSettingsRepository', () => ({
  ReviewSettingsRepository: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue({
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
    }),
    save: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('settings screen', () => {
  it('keeps intermediate learning-step input while typing', async () => {
    const screen = render(<SettingsScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('1m, 10m')).toBeTruthy());

    const input = screen.getByLabelText('Étapes d’apprentissage');
    fireEvent.changeText(input, '1');

    expect(screen.getByDisplayValue('1')).toBeTruthy();
  });

  it('shows a non-blocking toast after saving', async () => {
    const screen = render(<SettingsScreen />);

    await waitFor(() => expect(screen.getByText('Enregistrer')).toBeTruthy());
    fireEvent.press(screen.getByText('Enregistrer'));

    await waitFor(() => expect(screen.getByText('Réglages enregistrés')).toBeTruthy());
  });
});
