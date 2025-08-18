import React, { type PropsWithChildren } from "react";

interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function Button({
  children,
  onClick,
  className,
  type = "button", // Default to 'button' to prevent unintended form submission
  ...props
}: PropsWithChildren<ButtonProps>) {
  const baseClasses = "btn"; // This class is defined in src/index.css
  const combinedClasses = `${baseClasses} ${className || ""}`.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      className={combinedClasses}
      {...props}
    >
      {children}
    </button>
  );
}
