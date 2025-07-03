import { cn } from "@/lib/utils"
import * as React from "react"

const ReceiptEuroIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(className)}
    {...props}
  >
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 6h8" />
    <path d="M8 10h8" />
    <path d="M8 14h4" />
  </svg>
))

ReceiptEuroIcon.displayName = "ReceiptTextIcon"

export default ReceiptEuroIcon;