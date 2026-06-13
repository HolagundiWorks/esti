import { Tag } from "@carbon/react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SF_BAR_DIAS } from "@esti/contracts";

function DraggableBarPill({ dia }: { dia: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-T${dia}`,
    data: { dia },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
        touchAction: "none",
        zIndex: isDragging ? 1000 : "auto",
        position: isDragging ? "relative" : "static",
      }}
    >
      <Tag type="blue" size="sm">T{dia}</Tag>
    </div>
  );
}

export function BarPalette() {
  return (
    <div className="esti-bar-palette">
      <span className="esti-label esti-label--secondary">Drag onto canvas →</span>
      {SF_BAR_DIAS.map((d) => (
        <DraggableBarPill key={d} dia={d} />
      ))}
    </div>
  );
}
