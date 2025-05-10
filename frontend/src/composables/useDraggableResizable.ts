import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

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
