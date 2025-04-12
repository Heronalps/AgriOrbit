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
  chatWidget: Ref<HTMLElement | null>,
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
    if (chatWidget.value) {
      initialWidgetPos.value = {
        x: position.value.x,
        y: position.value.y,
      }
    }
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value || !chatWidget.value) return

    const dx = event.clientX - initialMousePos.value.x
    const dy = event.clientY - initialMousePos.value.y

    position.value.x = initialWidgetPos.value.x + dx
    position.value.y = initialWidgetPos.value.y + dy

    // Keep widget within viewport
    const minX = 0
    const minY = 0
    const maxX = window.innerWidth - dimensions.value.width
    const maxY = window.innerHeight - dimensions.value.height

    position.value.x = Math.max(minX, Math.min(maxX, position.value.x))
    position.value.y = Math.max(minY, Math.min(maxY, position.value.y))
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
    if (chatWidget.value) {
      initialWidgetDim.value = {
        width: dimensions.value.width,
        height: dimensions.value.height,
      }
    }
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
  }

  const onResize = (event: MouseEvent) => {
    if (!isResizing.value || !chatWidget.value) return

    const dx = event.clientX - initialMousePos.value.x
    const dy = event.clientY - initialMousePos.value.y

    const minWidth = 300
    const minHeight = 200 // Adjusted min height

    dimensions.value.width = Math.max(
      minWidth,
      initialWidgetDim.value.width + dx
    )
    dimensions.value.height = Math.max(
      minHeight,
      initialWidgetDim.value.height + dy
    )

    // Adjust position if resizing pushes it out of bounds (optional, good for UX)
    adjustPositionPostResize()
  }

  const stopResize = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  const adjustPositionPostResize = () => {
    if (!chatWidget.value) return
    const padding = 0 // No padding from window edges for this adjustment
    const maxX = window.innerWidth - dimensions.value.width - padding
    const maxY = window.innerHeight - dimensions.value.height - padding

    position.value.x = Math.max(padding, Math.min(position.value.x, maxX))
    position.value.y = Math.max(padding, Math.min(position.value.y, maxY))
  }

  const adjustInitialPosition = () => {
    if (!chatWidget.value) return
    const padding = 10 // Padding from window edges

    const maxX = window.innerWidth - dimensions.value.width - padding
    const maxY = window.innerHeight - dimensions.value.height - padding

    const defaultX = 10
    const defaultY = window.innerHeight - initialDimensions.height - 35

    position.value.x = Math.max(padding, Math.min(defaultX, maxX))
    position.value.y = Math.max(padding, Math.min(defaultY, maxY))
  }

  const onWindowResize = () => {
    // Re-adjust position and potentially dimensions if window resizes significantly
    adjustPositionPostResize() // Ensures widget stays within new viewport bounds
  }

  onMounted(() => {
    adjustInitialPosition()
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
    adjustInitialPosition, // Expose if needed externally, though typically managed internally
  }
}
