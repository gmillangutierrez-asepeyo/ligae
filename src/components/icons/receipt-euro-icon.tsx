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
    <path d="M15.32 12.21A4.05 4.05 0 1 1 9.68 6.57" />
    <path d="M10 12h4" />
    <path d="M10 16h4" />
  </svg>
))

ReceiptEuroIcon.displayName = "ReceiptEuroIcon"

export default ReceiptEuroIcon;
