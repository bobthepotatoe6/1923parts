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

  is3DViewerOpen: boolean;
  set3DViewerOpen: (open: boolean) => void;

  isAllocateModalOpen: boolean;
  setAllocateModalOpen: (open: boolean) => void;

  isEditQuantityModalOpen: boolean;
  setEditQuantityModalOpen: (open: boolean) => void;

  selectedStepPartId: string | null;
  setSelectedStepPartId: (id: string | null) => void;
  // Filter state
  categoryFilter: string | undefined;
  setCategoryFilter: (category: string | undefined) => void;

  tagFilters: string[];
  setTagFilters: (tags: string[]) => void;
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

  is3DViewerOpen: false,
  set3DViewerOpen: (open) => set({ is3DViewerOpen: open }),

  isAllocateModalOpen: false,
  setAllocateModalOpen: (open) => set({ isAllocateModalOpen: open }),

  isEditQuantityModalOpen: false,
  setEditQuantityModalOpen: (open) => set({ isEditQuantityModalOpen: open }),

  selectedStepPartId: null,
  setSelectedStepPartId: (id) => set({ selectedStepPartId: id }),

  categoryFilter: undefined,
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  tagFilters: [],
  setTagFilters: (tags) => set({ tagFilters: tags }),
}));
