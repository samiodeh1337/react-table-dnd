import Draggable from "./Draggable";
import classNames from "classnames";
import "./style.css";
import React, { useMemo, memo } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { DraggableProps } from "./Draggable";
interface BodyRowProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  [propName: string]: any;
}

const DEFAULT_STYLES: CSSProperties = {
  display: "flex",
  flex: "1 0 auto",
  minHeight: "24px",
};

const BodyRow: React.FC<BodyRowProps> = memo(({
  children,
  style,
  className,
  ...props
}) => {
  const mergedStyles = useMemo<CSSProperties>(
    () => (style ? { ...DEFAULT_STYLES, ...style } : DEFAULT_STYLES),
    [style]
  );
  const mergedClassName = classNames("tr", className);

  return (
    <Draggable {...(props as DraggableProps)} type={"row"}>
      <div className={mergedClassName} style={mergedStyles}>
        {children}
      </div>
    </Draggable>
  );
});

BodyRow.displayName = "BodyRow";
export default BodyRow;
