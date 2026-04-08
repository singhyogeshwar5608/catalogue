interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  compactOnMobile?: boolean;
}

export default function SectionHeader({ title, subtitle, action, compactOnMobile = false }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${compactOnMobile ? 'mb-2 sm:mb-6' : 'mb-6'}`}>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className={`text-gray-600 ${compactOnMobile ? 'mt-0.5 sm:mt-1' : 'mt-1'}`}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
