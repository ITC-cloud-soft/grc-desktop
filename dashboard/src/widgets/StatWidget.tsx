import { StatCard } from '../components/StatCard';

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
  change?: number;
  subtitle?: string;
  loading?: boolean;
}

/**
 * Thin wrapper around StatCard that fits inside the WidgetGrid.
 * Renders full-height so the grid cell drives its dimensions.
 */
export function StatWidget({ title, value, icon, color, change, subtitle, loading }: StatWidgetProps) {
  return (
    <StatCard
      title={title}
      value={value}
      icon={icon}
      color={color}
      change={change}
      subtitle={subtitle}
      loading={loading}
    />
  );
}
