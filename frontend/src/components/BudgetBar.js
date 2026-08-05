const colors = ["#D32F2F", "#0F766E", "#F59E0B", "#475569"];

export default function BudgetBar({ allocations }) {
  return (
    <div className="budget-bar-block" data-testid="budget-allocation-visualization">
      <div className="budget-track">
        {allocations.map((item, index) => (
          <div
            key={item.category}
            className="budget-segment"
            style={{ width: `${item.percentage}%`, backgroundColor: colors[index % colors.length] }}
            title={`${item.category}: ${item.percentage}%`}
            data-testid={`budget-segment-${item.category.toLowerCase().replaceAll(" ", "-")}`}
          />
        ))}
      </div>
      <div className="budget-legend">
        {allocations.map((item, index) => (
          <span key={item.category} data-testid={`budget-legend-${item.category.toLowerCase().replaceAll(" ", "-")}`}>
            <i style={{ backgroundColor: colors[index % colors.length] }} />
            {item.category} {item.percentage}%
          </span>
        ))}
      </div>
    </div>
  );
}