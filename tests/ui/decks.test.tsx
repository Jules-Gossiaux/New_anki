import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useSQLiteContext } from 'expo-sqlite';
import DecksScreen, { UnsupportedMediaDialog } from '../../src/app/index';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => callback(),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../src/infrastructure/repositories/deckRepository', () => ({
  DeckRepository: jest.fn().mockImplementation(() => ({
    listAll: jest.fn().mockResolvedValue([]),
  })),
}));

describe('decks screen', () => {
  it('renders the empty state and primary actions', async () => {
    (useSQLiteContext as jest.Mock).mockReturnValue({});

    const screen = render(<DecksScreen />);

    await waitFor(() => {
      expect(screen.getByText('Mes decks')).toBeTruthy();
      expect(screen.getByText('Creer mon premier deck')).toBeTruthy();
      expect(screen.getByLabelText('Ouvrir les reglages')).toBeTruthy();
    });
  });

  it('renders a visible modal for unsupported media', () => {
    const onClose = jest.fn();
    const screen = render(
      <UnsupportedMediaDialog message="Les médias ne sont pas pris en charge." onClose={onClose} />,
    );

    expect(screen.getByText('Import non disponible')).toBeTruthy();
    expect(screen.getByText('Les médias ne sont pas pris en charge.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Fermer l’alerte média'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
