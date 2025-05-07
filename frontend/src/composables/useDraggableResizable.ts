import { ref, onMounted, onBeforeUnmount, computed, type Ref } from 'vue'
import { useMapStore } from '../stores/mapStore' // Changed to relative path

interface Position {
  x: number
  y: number
}

interface Dimensions {
  width: number
  height: number
}

export function useDraggableResizable(
  elementRef: Ref<HTMLElement | null>,
  initialPosition: Position,
  initialDimensions: Dimensions,
) {
  const position = ref<Position>({ ...initialPosition })
  const dimensions = ref<Dimensions>({ ...initialDimensions })

  const isDragging = ref(false)
  const isResizing = ref(false)
  const initialMousePos = ref<Position>({ x: 0, y: 0 })
  const initialWidgetPos = ref<Position>({ x: 0, y: 0 })
  const initialWidgetDim = ref<Dimensions>({ width: 0, height: 0 })

  // --- BEGIN THEME LOGIC ---
  const mapStore = useMapStore()
  const prefersDarkMode = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
  let cleanupSystemThemeListener: () => void = () => {}

  function initSystemThemeListenerInternal() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      prefersDarkMode.value = event.matches

      if (mapStore.syncBasemapWithSystemTheme) {
        const newBasemapId = event.matches ? 'dark' : 'light'
        if (mapStore.selectedBasemap !== newBasemapId) {
          mapStore.setBasemap(newBasemapId)
        }
      }
    }

    darkModeMediaQuery.addEventListener('change', handleSystemThemeChange)
    
    cleanupSystemThemeListener = () => {
      darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }

  const widgetClasses = computed(() => {
    const baseClasses = 'rounded-lg shadow-lg transition-all duration-200'
    if (prefersDarkMode.value) {
      return `${baseClasses} widget-dark-theme bg-gray-800 text-white border border-gray-700`
    }
    return `${baseClasses} widget-light-theme bg-white text-gray-800 border border-gray-200`
  })

  const widgetStyles = computed(() => ({
    '--shadow': prefersDarkMode.value
      ? '0 4px 6px rgba(0, 0, 0, 0.3)'
      : '0 4px 6px rgba(0, 0, 0, 0.1)',
    '--border-radius': '0.375rem',
  }))
  // --- END THEME LOGIC ---

  const startDrag = (event: MouseEvent) => {
    event.preventDefault()
    isDragging.value = true
    initialMousePos.value = { x: event.clientX, y: event.clientY }
    if (elementRef.value) {
      initialWidgetPos.value = {
        x: position.value.x,
        y: position.value.y,
      }
    }
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value || !elementRef.value) return

    const dx = event.clientX - initialMousePos.value.x
    const dy = event.clientY - initialMousePos.value.y

    position.value.x = initialWidgetPos.value.x + dx
    position.value.y = initialWidgetPos.value.y + dy

    adjustBounds()
  }

  const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  const startResize = (event: MouseEvent) => {
    event.preventDefault()
    isResizing.value = true
    initialMousePos.value = { x: event.clientX, y: event.clientY }
    if (elementRef.value) {
      initialWidgetDim.value = {
        width: dimensions.value.width,
        height: dimensions.value.height,
      }
    }
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
  }

  const onResize = (event: MouseEvent) => {
    if (!isResizing.value || !elementRef.value) return

    const dx = event.clientX - initialMousePos.value.x
    const dy = event.clientY - initialMousePos.value.y

    const minWidth = 300
    const minHeight = 200

    dimensions.value.width = Math.max(
      minWidth,
      initialWidgetDim.value.width + dx,
    )
    dimensions.value.height = Math.max(
      minHeight,
      initialWidgetDim.value.height + dy,
    )
    adjustBounds()
  }

  const stopResize = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  const adjustBounds = () => {
    if (!elementRef.value) return
    const padding = 10

    let currentX = position.value.x
    let currentY = position.value.y
    const elementWidth = dimensions.value.width
    const elementHeight = dimensions.value.height

    currentX = Math.max(padding, currentX)
    currentY = Math.max(padding, currentY)

    const maxX = window.innerWidth - elementWidth - padding
    const maxY = window.innerHeight - elementHeight - padding

    position.value.x = Math.min(currentX, maxX)
    position.value.y = Math.min(currentY, maxY)

    if (position.value.x < padding) position.value.x = padding
    if (position.value.y < padding) position.value.y = padding
  }

  const onWindowResize = () => {
    adjustBounds()
  }

  onMounted(() => {
    adjustBounds()
    window.addEventListener('resize', onWindowResize)
    initSystemThemeListenerInternal()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    window.removeEventListener('resize', onWindowResize)
    cleanupSystemThemeListener()
  })

  return {
    position,
    dimensions,
    startDrag,
    startResize,
    prefersDarkMode,
    widgetClasses,
    widgetStyles,
  }
}
