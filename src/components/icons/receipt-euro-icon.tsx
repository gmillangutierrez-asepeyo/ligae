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
    <path d="M3 2v20l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5V2H3z" />
    <path d="M8 7h8" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
  </svg>
))

ReceiptEuroIcon.displayName = "ReceiptEuroIcon"

export default ReceiptEuroIcon;
