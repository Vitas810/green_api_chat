import "./Button.scss";
import type { ButtonHTMLAttributes } from "react";

function Button({ children, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button${className ? ` ${className}` : ""}`} type={type} {...props}>
      {children}
    </button>
  );
}

export default Button;
