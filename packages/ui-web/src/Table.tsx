import { cx } from "./cx";

export type TableProps = {
  children: React.ReactNode;
  className?: string;
};

export function Table({ children, className = "" }: TableProps) {
  return <table className={cx("w-full border-collapse", className)}>{children}</table>;
}
