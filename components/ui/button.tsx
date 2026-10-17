import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium no-underline transition-[background-color,color,border-color,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-dark",
  secondary:
    "border border-primary-dark/40 bg-surface text-primary-dark hover:border-primary-dark hover:bg-surface-alt",
  ghost: "text-primary-dark hover:bg-surface-alt",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-[0.9375rem]",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-12 px-7 text-[1.0625rem]",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
