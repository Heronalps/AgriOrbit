// frontend/src/composables/useSystemTheme.ts
import { ref, onMounted, onBeforeUnmount, readonly } from 'vue';

export function useSystemTheme() {
  const prefersDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
  let mediaQuery: MediaQueryList | null = null;

  const listener = (event: MediaQueryListEvent) => {
    prefersDarkMode.value = event.matches;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // Ensure the value is current on mount
    prefersDarkMode.value = mediaQuery.matches;
    mediaQuery.addEventListener('change', listener);
  });

  onBeforeUnmount(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', listener);
    }
  });

  return {
    prefersDarkMode: readonly(prefersDarkMode), // Expose as readonly for safety
  };
}
