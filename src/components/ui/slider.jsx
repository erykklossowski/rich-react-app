import * as React from "react"
import { cn } from "../../lib/utils"

const Slider = React.forwardRef(({ className, value, onValueChange, min, max, step, ...props }, ref) => {
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    console.log('Slider value changed:', newValue)
    onValueChange([newValue])
  }

  const percentage = ((value?.[0] || 0) - min) / (max - min) * 100

  return (
    <div className={cn("relative w-full", className)}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value?.[0] || 0}
        onChange={handleChange}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`
        }}
        {...props}
      />
    </div>
  )
})

Slider.displayName = "Slider"

export { Slider } 