"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Button({ className = "", variant = "secondary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={`button button--${variant} ${className}`} {...props} />;
}
export function IconButton({ label, children, active, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; active?: boolean }) {
  return <button aria-label={label} title={label} className={`icon-button ${active ? "is-active" : ""}`} {...props}>{children}</button>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} />; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select className="select" {...props} />; }
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; short?: string }[]; onChange: (v: T) => void; label: string }) {
  return <div className="segmented" role="group" aria-label={label}>{options.map(o => <button key={o.value} className={value === o.value ? "is-active" : ""} onClick={() => onChange(o.value)} title={o.label}><span className="segmented__full">{o.label}</span><span className="segmented__short">{o.short ?? o.label}</span></button>)}</div>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
