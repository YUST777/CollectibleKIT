import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, AppActions, User, StoryPiece, GiftDesign, TonBalance, Task, DailyGameQuestion } from '@/types';

interface AppStore extends AppState, AppActions {
  // Additional state
  isLoading: boolean;
  error: string | null;
  
  // Navigation state
  navigationLevel: 'main' | 'tools' | 'games';
  currentSubTab: string | null;
  currentTertiaryTab: string | null;
  
  // Additional actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Navigation actions
  setNavigationLevel: (level: 'main' | 'tools' | 'games') => void;
  setCurrentSubTab: (tab: string | null) => void;
  setCurrentTertiaryTab: (tab: string | null) => void;
  navigateBack: () => void;
  
  // Story actions
  markStoryPieceAsSent: (pieceId: number) => void;
  
  // Gift design actions
  clearGiftDesign: (slot: number) => void;
  
  // Task actions
  completeTask: (taskId: string) => void;
  updateTaskProgress: (taskId: string, progress: number) => void;
}

const initialState: AppState = {
  user: null,
  currentTab: 'story',
  storyPieces: [],
  isProcessing: false,
  giftDesigns: {},
  tonBalance: {
    balance: 0,
    rewards: 0,
    walletConnected: false,
  },
  tasks: [
    {
      id: 'first-story',
      title: 'Create Your First Story',
      reward: 1,
      rewardType: 'credit',
      completed: false,
    },
    {
      id: 'share-stories',
      title: 'Share 3 Story Pieces',
      reward: 2,
      rewardType: 'credit',
      completed: false,
      progress: 0,
      maxProgress: 3,
    },
    {
      id: 'get-premium',
      title: 'Get Premium',
      reward: 300,
      rewardType: 'credit',
      completed: false,
    },
    {
      id: 'invite-friends',
      title: 'Invite 3 Friends',
      reward: 5,
      rewardType: 'credit',
      completed: false,
    },
    {
      id: 'promote-app',
      title: 'Promote Story Canvas',
      reward: 3,
      rewardType: 'credit',
      completed: false,
    },
  ],
  dailyGame: null,
  isModalOpen: false,
  modalContent: null,
  
  // Collection initial state
  gifts: [],
  backdrops: [],
  giftModels: {},
  patterns: {},
  gridSize: 6,
  userDesigns: {},
  savedCollections: [],
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        isLoading: false,
        error: null,
        
        // Navigation state
        navigationLevel: 'main' as const,
        currentSubTab: null,
        currentTertiaryTab: null,

        // Basic actions
        setUser: (user) => set({ user }),
        setCurrentTab: (currentTab) => set({ currentTab }),
        setStoryPieces: (storyPieces) => set({ storyPieces }),
        setIsProcessing: (isProcessing) => set({ isProcessing }),
        updateGiftDesign: (slot, design) => set((state) => ({
          giftDesigns: { ...state.giftDesigns, [slot]: design }
        })),
        setTonBalance: (tonBalance) => set({ tonBalance }),
        updateTask: (taskId, updates) => set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
          )
        })),
        setDailyGame: (dailyGame) => set({ dailyGame }),
        openModal: (modalContent) => set({ isModalOpen: true, modalContent }),
        closeModal: () => set({ isModalOpen: false, modalContent: null }),

        // Additional actions
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        
        // Navigation actions
        setNavigationLevel: (navigationLevel) => set({ navigationLevel }),
        setCurrentSubTab: (currentSubTab) => set({ currentSubTab }),
        setCurrentTertiaryTab: (currentTertiaryTab) => set({ currentTertiaryTab }),
        navigateBack: () => {
          const state = get();
          if (state.navigationLevel === 'main') {
            return; // Already at main level
          } else if (state.currentTertiaryTab) {
            // Go back from tertiary to secondary
            set({ currentTertiaryTab: null });
          } else {
            // Go back from secondary to main
            set({ 
              navigationLevel: 'main', 
              currentSubTab: null,
              currentTertiaryTab: null 
            });
          }
        },
        reset: () => set({ ...initialState, isLoading: false, error: null }),

        // Story actions
        markStoryPieceAsSent: (pieceId) => set((state) => ({
          storyPieces: state.storyPieces.map(piece =>
            piece.id === pieceId ? { ...piece, isSent: true } : piece
          )
        })),

        // Gift design actions
        clearGiftDesign: (slot) => set((state) => {
          const { [slot]: removed, ...rest } = state.giftDesigns;
          return { giftDesigns: rest };
        }),

        // Task actions
        completeTask: (taskId) => set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === taskId ? { ...task, completed: true, progress: task.maxProgress || 1 } : task
          )
        })),
        updateTaskProgress: (taskId, progress) => set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === taskId 
              ? { 
                  ...task, 
                  progress,
                  completed: progress >= (task.maxProgress || 1)
                } 
              : task
          )
        })),

        // Collection actions
        setGifts: (gifts) => set({ gifts }),
        setBackdrops: (backdrops) => set({ backdrops }),
        setGiftModels: (giftName, models) => set((state) => ({
          giftModels: { ...state.giftModels, [giftName]: models }
        })),
        setPatterns: (giftName, patterns) => set((state) => ({
          patterns: { ...state.patterns, [giftName]: patterns }
        })),
        setGridSize: (gridSize) => set({ gridSize }),
        setGiftDesign: (slot, design) => set((state) => {
          console.log('🏪 Store: Setting gift design', {
            slot,
            design,
            currentDesigns: state.userDesigns,
            newDesigns: { ...state.userDesigns, [slot]: design }
          });
          return {
            userDesigns: { ...state.userDesigns, [slot]: design }
          };
        }),
        setUserDesigns: (designs) => set({ userDesigns: designs }),
        
        // Saved collections actions
        saveCollection: async (name, designs, isPublic = false) => {
          try {
            const response = await fetch('/api/collection/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, designs, isPublic })
            });
            
            if (response.ok) {
              const savedCollection = await response.json();
              set((state) => ({
                savedCollections: [...state.savedCollections, savedCollection]
              }));
              return true;
            } else {
              const errorData = await response.json();
              console.error('❌ Save collection API error:', errorData);
              throw new Error(errorData.message || errorData.error || 'Failed to save collection');
            }
          } catch (error) {
            console.error('Error saving collection:', error);
            throw error; // Re-throw to let the UI handle the specific error
          }
        },
        
        loadCollection: (collectionId) => {
          const collection = get().savedCollections.find(c => c.id === collectionId);
          if (collection) {
            const designs: Record<number, GiftDesign> = {};
            collection.designs.forEach((design, index) => {
              designs[index + 1] = design; // Slot numbers start from 1, not 0
            });
            set({ userDesigns: designs });
            console.log(`📂 Loaded collection "${collection.name}" with ${collection.designs.length} designs`);
          }
        },

        loadCollections: async () => {
          try {
            const response = await fetch('/api/collection/load');
            if (response.ok) {
              const data = await response.json();
              set({ savedCollections: data.collections });
              console.log(`📂 Loaded ${data.collections.length} collections`);
            }
          } catch (error) {
            console.error('Error loading collections:', error);
          }
        },
        
        deleteCollection: (collectionId) => {
          set((state) => ({
            savedCollections: state.savedCollections.filter(c => c.id !== collectionId)
          }));
        },
      }),
      {
        name: 'story-canvas-cutter-storage',
        partialize: (state) => ({
          user: state.user,
          giftDesigns: state.giftDesigns,
          tonBalance: state.tonBalance,
          tasks: state.tasks,
          gifts: state.gifts,
          backdrops: state.backdrops,
          giftModels: state.giftModels,
          patterns: state.patterns,
          gridSize: state.gridSize,
          userDesigns: state.userDesigns,
          savedCollections: state.savedCollections,
        }),
      }
    ),
    {
      name: 'story-canvas-cutter-store',
    }
  )
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useCurrentTab = () => useAppStore((state) => state.currentTab);
export const useStoryPieces = () => useAppStore((state) => state.storyPieces);
export const useIsProcessing = () => useAppStore((state) => state.isProcessing);
export const useGiftDesigns = () => useAppStore((state) => state.giftDesigns);
export const useTonBalance = () => useAppStore((state) => state.tonBalance);
export const useTasks = () => useAppStore((state) => state.tasks);
export const useDailyGame = () => useAppStore((state) => state.dailyGame);
export const useModal = () => useAppStore((state) => ({
  isOpen: state.isModalOpen,
  content: state.modalContent,
}));

// Navigation selectors
export const useNavigationLevel = () => useAppStore((state) => state.navigationLevel);
export const useCurrentSubTab = () => useAppStore((state) => state.currentSubTab);
export const useCurrentTertiaryTab = () => useAppStore((state) => state.currentTertiaryTab);

// Actions hook
export const useAppActions = () => useAppStore((state) => ({
  setUser: state.setUser,
  setCurrentTab: state.setCurrentTab,
  setStoryPieces: state.setStoryPieces,
  setIsProcessing: state.setIsProcessing,
  updateGiftDesign: state.updateGiftDesign,
  setTonBalance: state.setTonBalance,
  updateTask: state.updateTask,
  setDailyGame: state.setDailyGame,
  openModal: state.openModal,
  closeModal: state.closeModal,
  setLoading: state.setLoading,
  setError: state.setError,
  reset: state.reset,
  markStoryPieceAsSent: state.markStoryPieceAsSent,
  clearGiftDesign: state.clearGiftDesign,
  completeTask: state.completeTask,
  updateTaskProgress: state.updateTaskProgress,
  
  // Navigation actions
  setNavigationLevel: state.setNavigationLevel,
  setCurrentSubTab: state.setCurrentSubTab,
  setCurrentTertiaryTab: state.setCurrentTertiaryTab,
  navigateBack: state.navigateBack,
  setGifts: state.setGifts,
  setBackdrops: state.setBackdrops,
  setGiftModels: state.setGiftModels,
  setPatterns: state.setPatterns,
  setGridSize: state.setGridSize,
  setGiftDesign: state.setGiftDesign,
  setUserDesigns: state.setUserDesigns,
  saveCollection: state.saveCollection,
  loadCollection: state.loadCollection,
  loadCollections: state.loadCollections,
  deleteCollection: state.deleteCollection,
}));

