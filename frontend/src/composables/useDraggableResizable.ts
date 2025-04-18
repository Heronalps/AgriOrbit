import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

interface Position {
  x: number
  y: number
}

interface Dimensions {
  width: number
  height: number
}

export function useDraggableResizable(
  elementRef: Ref<HTMLElement | null>, // Renamed from chatWidget
  initialPosition: Position,
  initialDimensions: Dimensions
) {
  const position = ref<Position>({ ...initialPosition })
  const dimensions = ref<Dimensions>({ ...initialDimensions })

  const isDragging = ref(false)
  const isResizing = ref(false)
  const initialMousePos = ref<Position>({ x: 0, y: 0 })
  const initialWidgetPos = ref<Position>({ x: 0, y: 0 })
  const initialWidgetDim = ref<Dimensions>({ width: 0, height: 0 })

  const startDrag = (event: MouseEvent) => {
    event.preventDefault()
    isDragging.value = true
    initialMousePos.value = { x: event.clientX, y: event.clientY }
    if (elementRef.value) { // Use elementRef
      initialWidgetPos.value = {
        x: position.value.x,
        y: position.value.y,
      }
    }
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value || !elementRef.value) return // Use elementRef

    const dx = event.clientX - initialMousePos.value.x
    const dy = event.clientY - initialMousePos.value.y

    position.value.x = initialWidgetPos.value.x + dx
    position.value.y = initialWidgetPos.value.y + dy

    // Keep widget within viewport (using adjustBounds logic)
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
    if (elementRef.value) { // Use elementRef
      initialWidgetDim.value = {
        width: dimensions.value.width,
        height: dimensions.value.height,
      }
    }
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
  }

  const onResize = (event: MouseEvent) => {
    if (!isResizing.value || !elementRef.value) return // Use elementRef

    const dx = event.clientX - initialMousePos.value.x
    const dy = event.clientY - initialMousePos.value.y

    const minWidth = 300
    const minHeight = 200

    dimensions.value.width = Math.max(
      minWidth,
      initialWidgetDim.value.width + dx
    )
    dimensions.value.height = Math.max(
      minHeight,
      initialWidgetDim.value.height + dy
    )
    adjustBounds() // Adjust bounds after resize
  }

  const stopResize = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  // Renamed and refactored from adjustInitialPosition and adjustPositionPostResize
  const adjustBounds = () => {
    if (!elementRef.value) return
    const padding = 10 // Padding from window edges

    let currentX = position.value.x
    let currentY = position.value.y
    const elementWidth = dimensions.value.width
    const elementHeight = dimensions.value.height

    // Ensure position is not off-screen to the top or left
    currentX = Math.max(padding, currentX)
    currentY = Math.max(padding, currentY)

    // Ensure position is not off-screen to the bottom or right
    const maxX = window.innerWidth - elementWidth - padding
    const maxY = window.innerHeight - elementHeight - padding

    position.value.x = Math.min(currentX, maxX)
    position.value.y = Math.min(currentY, maxY)

    // If the calculated position is less than padding (e.g. window too small), force to padding
    if (position.value.x < padding) position.value.x = padding;
    if (position.value.y < padding) position.value.y = padding;
  }

  const onWindowResize = () => {
    adjustBounds() // Re-check bounds on window resize
  }

  onMounted(() => {
    // Position is already set from initialPosition in ref definition
    // Just ensure it's within bounds on mount
    adjustBounds()
    window.addEventListener('resize', onWindowResize)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    window.removeEventListener('resize', onWindowResize)
  })

  return {
    position,
    dimensions,
    startDrag,
    startResize,
  }
}
