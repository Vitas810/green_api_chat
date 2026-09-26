import type { InputHTMLAttributes } from "react";
import "./Input.scss";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

function Input({ className = "", ...props }: InputProps) {
  return <input className={`input${className ? ` ${className}` : ""}`} {...props} />;
}

export default Input;
