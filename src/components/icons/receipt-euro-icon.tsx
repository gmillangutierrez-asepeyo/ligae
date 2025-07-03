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
    strokeWidth="2"
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(className)}
    {...props}
  >
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M14.8 11.25a3 3 0 1 0 -1.8 0" />
    <path d="M10 12.75h4" />
    <path d="M10 15.25h4" />
  </svg>
))

ReceiptEuroIcon.displayName = "ReceiptEuroIcon"

export default ReceiptEuroIcon;
