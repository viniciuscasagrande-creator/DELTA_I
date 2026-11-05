interface SubModuleTabsProps<T extends string> {
  tabs: Array<{ id: T; label: string; badge?: string | number }>;
  activeTab: T;
  onSelect: (id: T) => void;
}

export function SubModuleTabs<T extends string>({
  tabs,
  activeTab,
  onSelect,
}: SubModuleTabsProps<T>) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
