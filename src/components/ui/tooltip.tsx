import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[100] overflow-hidden rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-md',
        'data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade',
        'data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade',
        'data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade',
        'data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

type OverflowTooltipProps = {
  children: React.ReactNode
  content?: React.ReactNode
  className?: string
}

export function OverflowTooltip(props: OverflowTooltipProps) {
  const { children, content, className } = props
  const ref = React.useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    setEnabled(el.scrollWidth > el.clientWidth)
  }, [children])
  const inner = (
    <div ref={ref} className={cn('truncate', className)}>
      {children}
    </div>
  )
  if (!enabled) return inner
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent>
        <div className="font-mono text-xs">{content ?? children}</div>
      </TooltipContent>
    </Tooltip>
  )
}