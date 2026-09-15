import { render, waitFor } from '@testing-library/react-native';
import { useSQLiteContext } from 'expo-sqlite';
import DecksScreen from '../../src/app/index';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(),
}));

jest.mock('expo-router', () => ({
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
});
