import { create } from 'zustand';

interface VideoLayoutState {
  spotlightUserId: string | null;
  setSpotlightUserId: (userId: string | null) => void;
  layout: 'grid' | 'spotlight';
  setLayout: (layout: 'grid' | 'spotlight') => void;
}

/**
 * Store для управления layout видео
 */
export const useVideoLayoutStore = create<VideoLayoutState>((set) => ({
  spotlightUserId: null,
  layout: 'spotlight', // По умолчанию используем spotlight layout
  
  setSpotlightUserId: (userId) => set({ spotlightUserId: userId }),
  setLayout: (layout) => set({ layout }),
}));
