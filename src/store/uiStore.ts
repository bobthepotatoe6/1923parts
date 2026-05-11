import { create } from "zustand";

interface UiState {
  // Auth state is ephemeral per session
  isAuthenticated: boolean;
  setAuthenticated: (auth: boolean) => void;

  // Selected item state
  selectedPartId: string | null;
  setSelectedPartId: (id: string | null) => void;

  // Modals state
  isDetailModalOpen: boolean;
  setDetailModalOpen: (open: boolean) => void;
  
  isAddPartModalOpen: boolean;
  setAddPartModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  // Initialize from local storage to keep the session
  isAuthenticated: typeof window !== 'undefined' ? localStorage.getItem('1923_auth') === 'granted_1923' : false,
  setAuthenticated: (auth) => {
    if (auth) {
      localStorage.setItem('1923_auth', 'granted_1923');
    } else {
      localStorage.removeItem('1923_auth');
    }
    set({ isAuthenticated: auth });
  },

  selectedPartId: null,
  setSelectedPartId: (id) => set({ selectedPartId: id }),

  isDetailModalOpen: false,
  setDetailModalOpen: (open) => set({ isDetailModalOpen: open }),

  isAddPartModalOpen: false,
  setAddPartModalOpen: (open) => set({ isAddPartModalOpen: open }),
}));
