import WidgetCard from "./WidgetCard";

export default function ExampleWidget() {
  return (
    <WidgetCard
      title="Example Widget"
      actions={
        <>
          <i className="fas fa-ellipsis-h" aria-label="More options"></i>
          <i className="fas fa-expand" aria-label="Expand"></i>
        </>
      }
    >
      <div className="widget-empty">
        <i className="fas fa-info-circle"></i>
        <p>This is an example widget following Rentman&apos;s design pattern.</p>
      </div>
    </WidgetCard>
  );
}
