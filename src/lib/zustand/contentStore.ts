import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKVLoader} from 'react-native-mmkv-storage';
// import {ProvidersList, providersList} from '../constants';
import {extensionStorage, ProviderExtension} from '../storage/extensionStorage';

const storage = new MMKVLoader().initialize();

export interface Content {
  provider: ProviderExtension;
  setProvider: (type: ProviderExtension) => void;
  // Extension-based provider management
  installedProviders: ProviderExtension[];
  availableProviders: ProviderExtension[];
  setInstalledProviders: (providers: ProviderExtension[]) => void;
  setAvailableProviders: (providers: ProviderExtension[]) => void;
  activeExtensionProvider: ProviderExtension | null;
  setActiveExtensionProvider: (provider: ProviderExtension | null) => void;
}

const initialInstalled = extensionStorage.getInstalledProviders();
const initialActive = initialInstalled[0] || {
  value: 'hdhub4u',
  display_name: 'HdHub4u',
  type: 'global' as const,
  installed: true,
  disabled: false,
  version: '2.27',
  icon: 'https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/hdhub4u.png',
  source: {author: 'harsh-cinema', url: 'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main'},
  installedAt: 0,
  lastUpdated: 0,
};

const useContentStore = create<Content>()(
  persist(
    (set, _get) => ({
      provider: initialActive,
      installedProviders: initialInstalled.sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      ),
      availableProviders: [],
      activeExtensionProvider: null,

      setProvider: (provider: ProviderExtension) => set({provider}),

      setInstalledProviders: (providers: ProviderExtension[]) =>
        set({
          installedProviders: providers.sort((a, b) =>
            a.display_name.localeCompare(b.display_name),
          ),
        }),

      setAvailableProviders: (providers: ProviderExtension[]) =>
        set({availableProviders: providers}),

      setActiveExtensionProvider: (provider: ProviderExtension | null) =>
        set({activeExtensionProvider: provider}),
    }),
    {
      name: 'content-storage',
      storage: createJSONStorage(() => storage as any), // Only persist certain fields
      partialize: state => ({
        provider: state.provider,
        activeExtensionProvider: state.activeExtensionProvider,
      }),
    },
  ),
);

export default useContentStore;
