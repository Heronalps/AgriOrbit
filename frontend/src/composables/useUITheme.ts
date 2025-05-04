import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

/**
 * Composable for managing UI theme and styling preferences
 */
export function useUITheme() {
  const mapStore = useMapStore()
  const prefersDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  // Listen for system theme changes
  function initSystemThemeListener() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      prefersDarkMode.value = event.matches
      
      // Optionally sync map basemap with system theme
      if (mapStore.syncBasemapWithSystemTheme) {
        const newBasemapId = event.matches ? 'dark' : 'light'
        if (mapStore.selectedBasemap !== newBasemapId) {
          mapStore.setBasemap(newBasemapId)
        }
      }
    }
    
    darkModeMediaQuery.addEventListener('change', handleSystemThemeChange)
    
    // Return cleanup function
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }
  
  /**
   * Common class bindings for components based on current theme
   */
  const widgetClasses = computed(() => {
    const baseClasses = 'rounded-lg shadow-lg transition-all duration-200'
    
    if (prefersDarkMode.value) {
      return `${baseClasses} widget-dark-theme bg-gray-800 text-white border border-gray-700`
    }
    return `${baseClasses} widget-light-theme bg-white text-gray-800 border border-gray-200`
  })
  
  /**
   * Common styling for panels and widgets
   */
  const widgetStyles = computed(() => ({
    '--shadow': prefersDarkMode.value 
      ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
      : '0 4px 6px rgba(0, 0, 0, 0.1)',
    '--border-radius': '0.375rem',
  }))
  
  return {
    prefersDarkMode,
    widgetClasses,
    widgetStyles,
    initSystemThemeListener
  }
}
